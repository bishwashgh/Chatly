import { ApolloClient, InMemoryCache, Observable, split, type FetchResult } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { createUploadLink } from 'apollo-upload-client';
import { tokenStorage } from './tokenStorage';

// Values are inlined by Vite at build time. Keep the reads static so the
// substitution always happens.
const configuredHttpUrl = import.meta.env.VITE_API_HTTP_URL;
const configuredWsUrl = import.meta.env.VITE_API_WS_URL;

const DEFAULT_API_HTTP_URL = 'https://chatly-backend-6qxq.onrender.com/graphql';
const DEFAULT_API_WS_URL = 'wss://chatly-backend-6qxq.onrender.com/graphql';

/**
 * Reject placeholder or malformed endpoint values instead of letting a stale
 * copy of `.env` silently break every request.
 */
function resolveEndpoint(
  raw: string | undefined,
  fallback: string,
  protocol: 'http' | 'ws',
): string {
  const value = raw?.trim();
  const allowedProtocols = protocol === 'http' ? ['http://', 'https://'] : ['ws://', 'wss://'];

  const valid =
    Boolean(value) &&
    allowedProtocols.some((prefix) => value!.startsWith(prefix)) &&
    !/[<>\s]/.test(value!) &&
    !value!.includes('your-') &&
    !value!.includes('instance.livekit.cloud') &&
    !allowedProtocols.some((prefix) => value!.slice(prefix.length).includes('//'));

  if (!valid) {
    if (value) {
      console.warn(`[Apollo] Invalid ${protocol.toUpperCase()} endpoint; using fallback`);
    }
    return fallback;
  }

  const withoutTrailingSlashes = value!.replace(/\/+$/, '');
  return withoutTrailingSlashes.endsWith('/graphql')
    ? withoutTrailingSlashes
    : `${withoutTrailingSlashes}/graphql`;
}

export const HTTP_URL = resolveEndpoint(configuredHttpUrl, DEFAULT_API_HTTP_URL, 'http');
export const WS_URL = resolveEndpoint(configuredWsUrl, DEFAULT_API_WS_URL, 'ws');

export function getGraphQLEndpoints() {
  return { http: HTTP_URL, ws: WS_URL };
}

const uploadLink = createUploadLink({
  uri: HTTP_URL,
  headers: {
    'apollo-require-preflight': 'true',
  },
});

const authLink = setContext((_operation, { headers }) => {
  const token = tokenStorage.getAccessToken();
  return {
    headers: {
      ...headers,
      'apollo-require-preflight': 'true',
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

let authFailureHandler: (() => void) | null = null;

/** Register a callback that fires when the session can no longer be refreshed. */
export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    lazy: true,
    retryAttempts: Infinity,
    shouldRetry: () => true,
    retryWait: async (retries) => {
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** retries, 10000)));
    },
    connectionParams: () => {
      const token = tokenStorage.getAccessToken();
      return { authorization: token ? `Bearer ${token}` : '' };
    },
    on: {
      connected: () => console.log('[Apollo] subscription connected'),
      closed: (event: unknown) => {
        const code = (event as { code?: number } | null | undefined)?.code;
        // 1000 is a clean close and 1006 is the normal browser socket drop
        // during a reconnect. Neither is a real failure.
        if (code !== 1000 && code !== 1006) {
          console.warn('[Apollo] subscription closed', code);
        }
      },
      error: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!/software caused connection abort|network request failed/i.test(message)) {
          console.warn('[Apollo] subscription error', error);
        }
      },
    },
  }),
);

async function performRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
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
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
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
      (error) => error.extensions?.code === 'UNAUTHENTICATED' || /unauthor/i.test(error.message),
    ) || /401/i.test(networkError?.message ?? '');

  if (!isAuthError) return;

  // Never retry the refresh mutation itself, and only retry each operation once.
  if (operation.operationName === 'RefreshToken' || operation.getContext().retried) {
    return;
  }
  operation.setContext({ retried: true });

  return new Observable<FetchResult>((observer) => {
    refreshOnce().then((ok) => {
      if (!ok) {
        tokenStorage.clear();
        authFailureHandler?.();
        observer.error(new Error('Session expired, please sign in again'));
        return;
      }
      forward(operation).subscribe({
        next: observer.next.bind(observer),
        error: observer.error.bind(observer),
        complete: observer.complete.bind(observer),
      });
    });
  });
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
    );
  },
  wsLink,
  errorLink.concat(authLink.concat(uploadLink)),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          messages: {
            // Messages are keyed by conversation, so merge by identity rather
            // than replacing the whole list on every refetch.
            merge(_existing, incoming) {
              return incoming;
            },
          },
          myConversations: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
    },
  },
});

/** Reset the cache and sockets, used when signing out. */
export async function resetApolloStore(): Promise<void> {
  await apolloClient.clearStore();
}
