# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ---------------------------------------------------------------------------
# Release minification (android.enableProguardInReleaseBuilds=true)
# ---------------------------------------------------------------------------

# WebRTC / LiveKit: these Java classes are also reached from native code by class
# and method name, which R8 cannot see. The libraries ship their own consumer
# rules; repeating the keep here means a transitive dependency that forgets them
# cannot strip the call stack at runtime.
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# Add any project specific keep options here:
#
# If the release build fails with:
#   "Missing classes detected while running R8. Please add the missing classes or
#    apply additional keep rules that are generated in
#    .../build/outputs/mapping/release/missing_rules.txt"
# then open that generated missing_rules.txt and paste its rules here verbatim.
#
# Useful reports from a release build (app/build/outputs/mapping/release/):
#   mapping.txt   - deobfuscate a release stack trace
#   usage.txt     - what R8 removed
#   resources.txt - what resource shrinking removed
#   configuration.txt - every keep rule in effect
