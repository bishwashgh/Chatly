import { ApolloClient, InMemoryCache, split, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { createUploadLink, ReactNativeFile } from 'apollo-upload-client';
import { tokenStorage } from './secureStore';

// Expo public variables are baked into the bundle. Keep these as direct
// references so Expo can inline the current values during bundling.
const configuredHttpUrl = process.env.EXPO_PUBLIC_API_HTTP_URL;
const configuredWsUrl = process.env.EXPO_PUBLIC_API_WS_URL;

// A stale or partially edited
// value must not silently take down every HTTP request and subscription.
const DEFAULT_API_HTTP_URL = 'https://chatly-backend-6qxq.onrender.com/graphql';
const DEFAULT_API_WS_URL = 'wss://chatly-backend-6qxq.onrender.com/graphql';

function resolveEndpoint(
  raw: string | undefined,
  fallback: string,
  protocol: 'http' | 'ws',
): string {
  const value = raw?.trim();
  const allowedProtocols = protocol === 'http' ? ['http://', 'https://'] : ['ws://', 'wss://'];
  const valid = value &&
    allowedProtocols.some((prefix) => value.startsWith(prefix)) &&
    !/[<>\s]/.test(value) &&
    !value.includes('your-') &&
    !value.includes('instance.livekit.cloud') &&
    !allowedProtocols.some((prefix) => value.slice(prefix.length).includes('//'));

  if (!valid) {
    if (value) console.warn(`[Apollo] Invalid ${protocol.toUpperCase()} endpoint; using configured fallback`);
    return fallback;
  }

  const withoutTrailingSlashes = value.replace(/\/+$/, '');
  return withoutTrailingSlashes.endsWith('/graphql') ? withoutTrailingSlashes : `${withoutTrailingSlashes}/graphql`;
}

const HTTP_URL = resolveEndpoint(configuredHttpUrl, DEFAULT_API_HTTP_URL, 'http');
const WS_URL = resolveEndpoint(configuredWsUrl, DEFAULT_API_WS_URL, 'ws');
console.log('[Apollo] GraphQL endpoints configured:', HTTP_URL, WS_URL);

export function getGraphQLEndpoints() {
  return { http: HTTP_URL, ws: WS_URL };
}

/**
 * React Native represents picked files as plain { uri, name, type } objects
 * or ReactNativeFile instances. We configure apollo-upload-client to extract them
 * into multipart FormData parts so the GraphQL server receives Upload! scalars.
 */
function isReactNativeFile(value: any): boolean {
  return (
    value != null &&
    (value instanceof ReactNativeFile ||
      (typeof value === 'object' &&
        typeof value.uri === 'string' &&
        (typeof value.name === 'string' || typeof value.type === 'string')))
  );
}

const uploadLink = createUploadLink({
  uri: HTTP_URL,
  headers: {
    'apollo-require-preflight': 'true',
  },
  isExtractableFile: (value: any) =>
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    isReactNativeFile(value),
  formDataAppendFile: (formData: any, fieldName: string, file: any) => {
    formData.append(String(fieldName), {
      uri: file.uri,
      name: file.name || `upload-${Date.now()}`,
      type: file.type || 'application/octet-stream',
    } as any);
  },
});

const authLink = setContext(async (_, { headers }) => {
  const token = await tokenStorage.getAccessToken();
  return {
    headers: {
      ...headers,
      'apollo-require-preflight': 'true',
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    lazy: true,
    retryAttempts: Infinity,
    shouldRetry: () => true,
    retryWait: async (retries) => {
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** retries, 10000)));
    },
    connectionParams: async () => {
      const token = await tokenStorage.getAccessToken();
      return { authorization: token ? `Bearer ${token}` : '' };
    },
    on: {
      connected: () => console.log('[Apollo] GraphQL subscription connected'),
      closed: (event) => console.warn('[Apollo] GraphQL subscription closed', event?.code),
      error: (error) => console.warn('[Apollo] GraphQL subscription error', error),
    },
  }),
);

// --- Token refresh handling ---

let authFailureHandler: (() => void) | null = null;

/** Register a callback that fires when the session can no longer be refreshed (e.g. log out). */
export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'mutation RefreshToken($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { accessToken refreshToken } }',
        variables: { refreshToken },
      }),
    });
    const json = await res.json();
    const data = json?.data?.refreshToken;
    if (!data?.accessToken || !data?.refreshToken) return false;
    await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  const isAuthError =
    graphQLErrors?.some(
      (e) => e.extensions?.code === 'UNAUTHENTICATED' || /unauthor/i.test(e.message),
    ) || /401/i.test(networkError?.message ?? '');

  if (!isAuthError) return;
  // Never retry the refresh mutation itself, and only retry each operation once.
  if (operation.operationName === 'RefreshToken' || operation.getContext().retried) {
    if (!operation.getContext().retried) {
      operation.setContext({ retried: true });
    }
    return;
  }
  operation.setContext({ retried: true });

  return new Observable((observer) => {
    refreshOnce().then((ok) => {
      if (!ok) {
        tokenStorage.clear();
        authFailureHandler?.();
        observer.error(new Error('Session expired, please sign in again'));
        return;
      }
      forward(operation).subscribe(observer);
    });
  });
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  errorLink.concat(authLink.concat(uploadLink)),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});