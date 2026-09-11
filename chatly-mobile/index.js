import './polyfills';
import { registerGlobals } from '@livekit/react-native';
import { registerRootComponent } from 'expo';
import App from './App';

try {
  registerGlobals();
} catch (e) {
  console.warn('LiveKit registerGlobals notice:', e);
}

registerRootComponent(App);