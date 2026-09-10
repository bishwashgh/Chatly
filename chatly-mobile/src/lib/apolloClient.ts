import { ApolloClient, InMemoryCache, split, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { createUploadLink } from 'apollo-upload-client';
import { tokenStorage } from './secureStore';

const HTTP_URL = process.env.EXPO_PUBLIC_API_HTTP_URL ?? 'http://localhost:4000/graphql';
const WS_URL = process.env.EXPO_PUBLIC_API_WS_URL ?? 'ws://localhost:4000/graphql';

const uploadLink = createUploadLink({ uri: HTTP_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await tokenStorage.getAccessToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: async () => {
      const token = await tokenStorage.getAccessToken();
      return { authorization: token ? `Bearer ${token}` : '' };
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