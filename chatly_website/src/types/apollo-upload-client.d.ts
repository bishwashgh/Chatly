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
    isExtractableFile?: (value: unknown) => boolean;
    FormData?: unknown;
    formDataAppendFile?: (formData: FormData, fieldName: string, file: unknown) => void;
    headers?: Record<string, string>;
    credentials?: string;
    fetch?: typeof fetch;
    fetchOptions?: unknown;
  }

  export function createUploadLink(options?: CreateUploadLinkOptions): ApolloLink;
}
