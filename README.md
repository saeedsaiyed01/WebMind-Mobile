# WebMind Mobile

A standalone Expo SDK 57 / React Native mobile app that shares WebMind accounts, memories, AI models, and conversations with the website.

## Install

Download [WebMind 1.1.0 for Android](https://github.com/saeedsaiyed01/WebMind-Mobile/releases/tag/v1.1.0), then open the APK on an Android phone and allow installation from your file manager when Android prompts. It contains its JavaScript, fonts, and native libraries; Expo Go and Metro are not required. Internet access is required for backend features. Updates use the original signing key. See [validation details](VALIDATION.md) for checks, artifact size, checksum, and remaining validation limits.

Sign in using an existing WebMind email/password account, or create an account. The same account, memories, conversation history, model catalog, credits, and subscription are shared with the website.

## Included

- Native sign-in, sign-up, email verification/password recovery, secure session persistence, and sign-out.
- Native Google sign-in with a short-lived, single-use code and a verifier stored securely on the requesting device.
- Graphite and ivory appearance with restrained warm accents; saved System, Light, and Dark modes.
- Workspace overview with live memory counts, credits, and recent conversations.
- Searchable memory library with notes, website links, tweets, and PDF documents.
- Create, inspect, edit, share, and delete memories; native PDF picker with 20 MB validation.
- PDF uploads use Expo's File API for the SDK 57 fetch implementation.
- Multi-model AI chat with saved-memory attachments, Markdown answers, sharing, history, and conversation deletion.
- Compact composer, virtualized messages, selectable text, code copying, and keyboard-aware native sheets.
- Real backend working/searching/solving events with subtle animated feedback, cancellation, retries, and credit errors.
- Existing hosted checkout, payment-status lookup, plan details, and recent account activity.
- React Native Paper, Reanimated, Gesture Handler, Gorhom Bottom Sheet, safe areas, native haptics, Manrope/DM Sans, and a custom WebMind launcher mark.
- Reduced-motion support, accessible control labels, keyboard-aware forms, refresh/recovery states, and guarded conversation switching.

## Run and verify

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run web
# In a second terminal, after the preview has started:
$env:WEBMIND_PREVIEW_URL = 'http://localhost:5173'
npm run test:ui
```

The web preview uses port 5173, which the existing backend allows through CORS. Native Android requests do not need browser CORS configuration. This is a mobile app project, not a replacement for the website.

The default API is `https://web-mind-be.vercel.app/api/v1`. To use another deployment, set `EXPO_PUBLIC_API_URL` to its full API prefix before bundling. No server secrets are included in the app.

## Build an APK

Use the cloud build for delivery:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

The preview profile builds a signed APK. The production profile builds an Android App Bundle for a store submission. Local signing credentials belong in ignored `credentials.json`; never commit the keystore or passwords. An added native keyboard module requires a new binary rather than an OTA-only update.

Install JDK 17 and Android SDK platform 36, build tools 36/35, NDK 27.1.12297006, and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME`. Use a release keystore with alias `webmind`; set `WEBMIND_KEYSTORE_PATH` and `WEBMIND_KEYSTORE_PASSWORD` in the build environment, then run:

```powershell
npm ci
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

The script checks TypeScript, regenerates the native project from `app.config.js`, bundles the app, builds a signed release, and writes the APK to `artifacts`. `eas.json` also provides an internal APK build profile for an authenticated Expo account.

The delivery signing key and password are retained privately by the owner, outside this repository. Keep both to sign future updates; neither is bundled or committed.

## Existing backend constraints

Mobile Google authentication uses the backend's `/auth/google/mobile-start` and `/auth/google/mobile-exchange` endpoints. The callback returns to `webmind:///` with a one-time code and matching state. The existing website Google flow is preserved. Google opens the system authentication browser; account creation with email stays inside the app.

Checkout uses the existing payment provider and returns to the website. Return to the app to refresh account credits after the backend webhook completes. No live purchase was made during validation.

The committed backend updates memory text without rebuilding its vector index. The app preserves that behavior; edited text can therefore differ from the indexed content until the backend supports reindexing. Provider outages, expired API keys, subscription processing, and email delivery remain backend responsibilities.

See `VALIDATION.md` for verified flows and artifact details.
