# WebMind Mobile validation

## Version 1.1.0

- Mobile unit tests: 12 pass (streaming, errors, cancellation, auth expiry, stale conversation protection, native OAuth callbacks, saved appearance selection, and text contrast in both palettes).
- Backend OAuth tests: 5 pass (signed state, verifier binding, expiration, replay protection, denial recovery, and existing website compatibility).
- The OAuth backend change is deployed from WebMind commit `de7aa5ae8e1a029e61ee2cc043958c542db5cafb`; its mobile-start endpoint returned HTTP 200 with the expected origin and state/verifier sizes.
- Lint and TypeScript passed after the UI and appearance refactor.
- Production web export and deterministic UI interactions passed: email signup stays in the app; theme persistence and system changes; draft preservation; 360/390/430 px layouts; model and attachment sheets; retries retaining attachments; Markdown/code rendering; stopping a response; and conversation history. No browser runtime errors. Coverage lives in `tests/ui-regression.cjs`.
- Expo Doctor: 21/21 passed with the native keyboard module installed.
- The signed 1.1.0 APK was installed as an update on an Android 15 x86-64 emulator. Native checks passed for session restoration, the composer and send control above the visible keyboard, draft preservation across appearance changes, dark model selection, attachment search above the keyboard, and light appearance persistence after force-stop/relaunch. Screenshots were inspected; no native crashes were recorded.
- The optimized build limits native ABIs to ARM64 and x86-64, enables R8 and resource shrinking, uses direct imports for three font weights and Feather icons, and removes the unused gradient module. JavaScript bundle compression stays disabled to retain memory-mapped Hermes startup.
- The Markdown parser was upgraded to 14.3.2 through a scoped dependency override. The remaining npm advisories involve the SDK/build toolchain; no incompatible SDK downgrade was applied.
- Real Google account consent and a purchase have not been exercised.

The remaining record below describes the original 1.0.0 release, not 1.1.0 verification.

Built against committed WebMind source `2f69ba040c1c13b19b5599c8c4965b3ef9b5f00a`, matching GitHub HEAD when implementation began. Original frontend and backend files were not modified.

## Automated checks

- Expo Doctor: 21 of 21 checks passed.
- ESLint: passed.
- TypeScript: passed.
- API tests: 6 passed, covering chunked NDJSON, Unicode, progress phases, credit failures, cancellation, legacy JSON, authenticated mutations, and expired sessions.

## Existing deployment checks

An isolated QA account was used against `https://web-mind-be.vercel.app/api/v1`.

- Sign-up and sign-in returned valid sessions.
- Note creation, retrieval, and editing succeeded.
- A PDF upload succeeded and returned extracted text.
- Attached-memory chat correctly answered the saved project codename, persisted conversation history, and deducted one credit.
- Live model catalog and plan/account activity were retrieved.
- Browser UI smoke test passed sign-in, library search and empty results, memory detail, attached chat, model selection, and account navigation. No browser runtime errors or horizontal overflow at 360, 390, or 430 pixels wide.

## Scope and limits

The release contains its JavaScript bundle, native libraries, fonts, and artwork. It requires internet access to the existing backend. No user account or production user content was changed during testing.

Google OAuth and payment return URLs remain website-based in the existing backend. Android intent handlers are included, but verified website App Links are not configured here. Email/password login is supported independently. A real purchase, inbox OTP delivery, and Google account authentication were not performed during validation.

Edited memory content is not reindexed by the existing backend. This server behavior is preserved.

## Android release

- Version: 1.0.0 (version code 1).
- Package: `space.webmind.mobile`.
- Minimum Android: API 24 / Android 7.0; target API 36.
- Architectures: ARM64 (`arm64-v8a`) and x86-64.
- Size: 69,276,718 bytes (about 66 MB).
- SHA-256: `3b076149cecc05f98970d49da8ee5426c1d2960d75be674917beb6e2151b12c7`.
- Release APK signature verified with Android `apksigner` (APK Signature Scheme v2).
- Signing certificate SHA-256: `a557f4e283b837ce5e6ab00a01511f0f31be32b0712a76d931acce67bc3a634a`.
- Gradle release build passed; the delivery includes the final chat-history loading fix.

Native checks passed on an Android 15 x86-64 emulator: release installation and launch without Metro, email/password sign-in, secure session restoration after force-stop, library navigation, memory details, creation/editing/deletion, Android PDF picker and multipart upload with confirmed extracted text, attached-memory AI chat, model selection, and account navigation. The final APK was installed as an update and retested. The same saved conversation was reopened twice after starting new chats, with the composer enabled each time. The native screenshots were inspected visually.

A physical ARM64 device and iOS build were not tested. Browser checks ran at three phone widths. Some native automation used Android reduced-motion settings for reliable accessibility-tree inspection.
