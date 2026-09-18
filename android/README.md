# v3rcy Android / Google Play

This project wraps the production v3rcy web app at `https://v3rcy.com` in a native Android shell.

## Build

From this directory, use Android Studio or run:

```bash
gradle assembleDebug bundleRelease
```

The GitHub Actions workflow builds a debug APK and a release AAB on Android-project changes.

## Before publishing to Google Play

1. Replace the placeholder launcher artwork with final 512px store branding and adaptive icons.
2. Create a protected upload keystore and configure signing in Gradle/GitHub Actions; never commit the keystore or passwords.
3. Prepare the Play listing: screenshots,  feature graphic, privacy policy, content rating, target audience, and data-safety declarations.
4. Test authentication, file uploads, deep links, offline behavior, and back navigation on physical devices.
5. Set the final application ID and versioning before the first production upload, because the application ID cannot be changed afterward.
