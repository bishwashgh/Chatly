const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

// @livekit/react-native + react-native-webrtc ship no Expo config plugin, so
// this one wires up the native permissions the SDK needs on both platforms.
module.exports = function withLiveKitPermissions(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.INTERNET',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
    ];

    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] ?? [];
    for (const name of permissions) {
      const exists = manifest.manifest['uses-permission'].some(
        (item) => item.$ && item.$['android:name'] === name,
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }

    // Allow plain-HTTP to the local API server during development.
    const application = manifest.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }

    return config;
  });

  config = withInfoPlist(config, (config) => {
    config.modResults.NSCameraUsageDescription =
      config.modResults.NSCameraUsageDescription ??
      'Chatly uses the camera for video calls and sending photos.';
    config.modResults.NSMicrophoneUsageDescription =
      config.modResults.NSMicrophoneUsageDescription ??
      'Chatly uses the microphone for voice notes and audio calls.';
    return config;
  });

  return config;
};