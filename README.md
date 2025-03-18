# GSmopener
Below are the steps you need along with the terminal commands you can run:

Update your package.json to use the local Expo CLI:

Change your scripts to call npx expo … instead of globally installed expo-cli.
Generate native projects from your managed project (if not already done):

Run: npx expo prebuild
To build and install the app on a connected Android device/emulator (for testing) in release mode, run:

npx expo run:android --variant release
To create a production APK using EAS Build (recommended for production): • (Optional) Install the EAS CLI globally if you haven't already:
  npm install -g eas-cli
• Configure your project for EAS:
  npx eas build:configure
• Run the production build:
  npx eas build --platform android --profile production

Below is the package.json update for script changes:

package.json+6-6
Now, from your terminal run the following commands in order:

## Reset Native Projects

1. Manually delete the `android/` and `ios/` folders.
2. Run the following command in your project root:
   ```
   npx expo prebuild
   ```
   This will regenerate fresh native folders.
3. If you face Android SDK issues, update `/workspaces/GSmopener/android/local.properties` with the correct `sdk.dir` path.
4. To build and run your app:
   - For Android: `npx expo run:android`
   - For iOS: `npx expo run:ios`


   eas build -p android