// --- Polyfills for Hermes Engine & React Native ---

// 1. WeakRef polyfill for Hermes (required by livekit-client)
if (typeof global.WeakRef === 'undefined') {
  class WeakRefPolyfill {
    constructor(target) {
      this._target = target;
    }
    deref() {
      return this._target;
    }
  }
  global.WeakRef = WeakRefPolyfill;
  if (typeof globalThis !== 'undefined') {
    globalThis.WeakRef = WeakRefPolyfill;
  }
  if (typeof window !== 'undefined') {
    window.WeakRef = WeakRefPolyfill;
  }
}

// 2. FinalizationRegistry polyfill for Hermes
if (typeof global.FinalizationRegistry === 'undefined') {
  class FinalizationRegistryPolyfill {
    constructor(cleanupCallback) {
      this._cleanupCallback = cleanupCallback;
    }
    register() {}
    unregister() {}
  }
  global.FinalizationRegistry = FinalizationRegistryPolyfill;
  if (typeof globalThis !== 'undefined') {
    globalThis.FinalizationRegistry = FinalizationRegistryPolyfill;
  }
  if (typeof window !== 'undefined') {
    window.FinalizationRegistry = FinalizationRegistryPolyfill;
  }
}

// 3. TextDecoder/TextEncoder polyfills for Apollo HTTP multipart responses
import { TextDecoder, TextEncoder } from 'text-encoding';

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
  if (typeof globalThis !== 'undefined') {
    globalThis.TextDecoder = TextDecoder;
  }
}
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  if (typeof globalThis !== 'undefined') {
    globalThis.TextEncoder = TextEncoder;
  }
}