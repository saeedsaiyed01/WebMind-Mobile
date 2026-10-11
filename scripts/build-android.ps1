param([string]$Architectures = 'arm64-v8a,x86_64')
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) { throw 'Set JAVA_HOME (JDK 17) and ANDROID_HOME (Android SDK) first.' }
  if (-not $env:WEBMIND_KEYSTORE_PATH -or -not $env:WEBMIND_KEYSTORE_PASSWORD) { throw 'Set WEBMIND_KEYSTORE_PATH and WEBMIND_KEYSTORE_PASSWORD to your release signing key. Alias: webmind.' }
  $env:NODE_ENV = 'production'
  npx tsc --noEmit
  if ($LASTEXITCODE) { throw 'TypeScript check failed.' }
  npx expo prebuild --platform android --no-install
  if ($LASTEXITCODE) { throw 'Android prebuild failed.' }
  Push-Location android
  try { ./gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --max-workers=2 --console=plain; if ($LASTEXITCODE) { throw 'Android compilation failed.' } } finally { Pop-Location }
  New-Item -ItemType Directory -Force artifacts | Out-Null
  $appVersion = (Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json).version
  $artifactPath = Join-Path artifacts "WebMind-v$appVersion.apk"
  Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination $artifactPath -Force
  Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256
} finally { Pop-Location }
