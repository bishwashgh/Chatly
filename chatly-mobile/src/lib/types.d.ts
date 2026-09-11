declare module 'apollo-upload-client' {
  import type { ApolloLink } from '@apollo/client';

  export class ReactNativeFile {
    uri: string;
    name?: string;
    type?: string;
    constructor(file: { uri: string; name?: string; type?: string });
  }

  export interface CreateUploadLinkOptions {
    uri?: string;
    isExtractableFile?: (value: any) => boolean;
    FormData?: any;
    formDataAppendFile?: (formData: any, fieldName: string, file: any) => void;
    headers?: Record<string, string>;
    credentials?: string;
    fetch?: typeof fetch;
    fetchOptions?: any;
  }

  export function createUploadLink(options?: CreateUploadLinkOptions): ApolloLink;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_HTTP_URL?: string;
      EXPO_PUBLIC_API_WS_URL?: string;
      EXPO_PUBLIC_LIVEKIT_URL?: string;
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
      [key: string]: string | undefined;
    }
  }
}