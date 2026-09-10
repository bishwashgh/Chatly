import { TextDecoder, TextEncoder } from 'text-encoding';

// Hermes doesn't provide TextDecoder/TextEncoder, which Apollo's HTTP link
// needs when the server returns multipart/mixed GraphQL responses.
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}