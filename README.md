# WebMind Mobile

A standalone React Native Android app built from WebMind commit `2f69ba040c1c13b19b5599c8c4965b3ef9b5f00a` (the GitHub HEAD verified on October 10, 2026). The existing `Frontend` and `Backend` are unchanged.

## Install

Download [WebMind-v1.0.0.apk](https://github.com/saeedsaiyed01/WebMind-Mobile/releases/download/v1.0.0/WebMind-v1.0.0.apk) from [GitHub Releases](https://github.com/saeedsaiyed01/WebMind-Mobile/releases/tag/v1.0.0), then open it on an Android phone and allow installation from your file manager when Android prompts. Android 7.0 or newer is required. The APK supports ARM64 phones and x86-64 emulators. It contains its JavaScript, fonts, and native libraries; Expo Go and Metro are not required. Internet access is required for backend features.

Sign in using an existing WebMind email/password account, or create an account. The same account, memories, conversation history, model catalog, credits, and subscription are shared with the website.

## Included

- Native sign-in, sign-up, email verification/password recovery, secure session persistence, and sign-out.
- Workspace overview with live memory counts, credits, and recent conversations.
- Searchable memory library with notes, website links, tweets, and PDF documents.
- Create, inspect, edit, share, and delete memories; native PDF picker with 20 MB validation.
- PDF uploads use Expo's File API for the SDK 57 fetch implementation.
- Multi-model AI chat with saved-memory attachments, Markdown answers, sharing, history, and conversation deletion.
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
```

The web preview uses port 5173, which the existing backend allows through CORS. Native Android requests do not need browser CORS configuration. This is a mobile app project, not a replacement for the website.

The default API is `https://web-mind-be.vercel.app/api/v1`. To use another deployment, set `EXPO_PUBLIC_API_URL` to its full API prefix before bundling. No server secrets are included in the app.

## Build an APK

Install JDK 17 and Android SDK platform 36, build tools 36/35, NDK 27.1.12297006, and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME`. Use a release keystore with alias `webmind`; set `WEBMIND_KEYSTORE_PATH` and `WEBMIND_KEYSTORE_PASSWORD` in the build environment, then run:

```powershell
npm ci
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1
```

The script checks TypeScript, regenerates the native project from `app.config.js`, bundles the app, builds a signed release, and writes the APK to `artifacts`. `eas.json` also provides an internal APK build profile for an authenticated Expo account.

The delivery signing key and password are retained privately by the owner, outside this repository. Keep both to sign future updates; neither is bundled or committed.

## Existing backend constraints

Google OAuth currently redirects to the website. Android URL handlers are included for `webmind.space`, `www.webmind.space`, and `web-mind.vercel.app`, as well as `webmind://`. A seamless Google return requires verified Android App Links on the website or a backend redirect to the mobile scheme. That configuration has not been changed. Email/password authentication is independently functional; Google-account users can use the existing password-recovery flow to set a password.

Checkout uses the existing payment provider and returns to the website. Return to the app to refresh account credits after the backend webhook completes. No live purchase was made during validation.

The committed backend updates memory text without rebuilding its vector index. The app preserves that behavior; edited text can therefore differ from the indexed content until the backend supports reindexing. Provider outages, expired API keys, subscription processing, and email delivery remain backend responsibilities.

See `VALIDATION.md` for verified flows and artifact details.
