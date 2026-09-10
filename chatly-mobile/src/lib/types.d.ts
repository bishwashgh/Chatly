declare module 'apollo-upload-client' {
  import type { ApolloLink } from '@apollo/client';

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