#!/bin/bash
set -e
echo "Building Todowka..."
./gradlew assembleDebug
echo "Installing..."
adb install -r app/build/outputs/apk/debug/app-debug.apk
echo "Launching..."
adb shell am start com.todowka.app/.MainActivity
echo "Done!"
