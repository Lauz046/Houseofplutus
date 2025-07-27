import { ApolloClient, InMemoryCache, HttpLink, NormalizedCacheObject } from '@apollo/client';
import { useMemo } from 'react';

let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

function createApolloClient() {
  const isServer = typeof window === 'undefined';
  
  // Better environment variable handling
  let uri = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;
  if (!uri) {
    // Fallback for different environments
    if (process.env.NODE_ENV === 'production') {
      // This will be set by Vercel environment variable
      uri = 'https://houseofplutus.onrender.com/query';
    } else {
      uri = 'http://localhost:8090/query';
    }
  }
  
  console.log('Creating Apollo client:', { 
    isServer, 
    uri, 
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT 
  });
  
  return new ApolloClient({
    ssrMode: isServer,
    link: new HttpLink({
      uri,
      credentials: 'omit', // Changed from 'same-origin' to 'omit' for cross-origin requests
      fetch: isServer ? undefined : fetch,
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
}

export function initializeApollo(initialState: any = null) {
  // For SSR, always create a new client
  if (typeof window === 'undefined') {
    const client = createApolloClient();
    if (initialState) {
      client.cache.restore(initialState);
    }
    return client;
  }
  
  // For client-side, use singleton pattern
  const _apolloClient = apolloClient ?? createApolloClient();
  if (initialState) {
    _apolloClient.cache.restore(initialState);
  }
  if (!apolloClient) apolloClient = _apolloClient;
  return _apolloClient;
}

export function useApollo(initialState: any) {
  return useMemo(() => initializeApollo(initialState), [initialState]);
} 