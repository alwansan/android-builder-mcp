# Android Builder MCP — Project Map

> MCP server for OpenCode that builds Android APKs on arm64 (Termux + proot-distro + Ubuntu).
> GitHub: https://github.com/alwansan/android-builder-mcp

---

## Architecture

```
install.sh → Node.js + JDK + Gradle + Box64 + Android SDK + MCP Server
                  ↓
         OpenCode (MCP client)
                  ↓
    android-builder-mcp (MCP server)
         ├── check_environment
         ├── build_apk          ← core build logic
         ├── create_android_project
         ├── fix_aapt2          ← Box64 + AGP jar patching
         ├── doctor             ← health check
         ├── diagnose_build     ← error analysis
         ├── search_permissions
         ├── get_manifest_element
         ├── sdk_mapping
         ├── android_doc_search
         ├── install_apk (ADB)
         ├── read_logcat
         ├── list_devices
         └── install_sdk
```

## Key Files

| File | Purpose |
|---|---|
| `src/index.ts` | Tool registration, entry point |
| `src/utils/gradle.ts` | Build logic: `buildApk()`, `patchAapt2InGradleCache()`, `findBox64()`, SDK auto-download |
| `src/utils/sdk.ts` | `detectEnvironment()`, `detectJavaHome()` |
| `src/utils/aapt.ts` | `fixAapt2()` – aapt2 fix logic with Box64 support |
| `src/tools/project.ts` | `create_android_project` – project templates |
| `src/tools/build.ts` | `build_apk`, `check_environment` tool definitions |
| `src/tools/diagnostic.ts` | `doctor`, `diagnose_build` |
| `install.sh` | One-command installer (8 steps) |
| `package.json` | Dependencies: MCP SDK, Zod, TypeScript |

## ARM64 Strategy

Google does NOT provide arm64 Android SDK build-tools. All native binaries (aapt2, zipalign, aidl) are x86-64 only. We solve this with:

### Approach: Box64 + AGP Jar Patching (current, working)
1. Install **Box64** (x86-64 → arm64 translation layer)
2. Download **x86-64 build-tools** (e.g., 35.0.0) from Google
3. **Patch AGP cached jars**: Replace `aapt2` binary inside AGP's `aapt2-*-linux.jar` with a wrapper script: `#!/bin/sh\nexec /usr/bin/box64 /path/to/aapt2 "$@"`
4. Gradle runs normally, AGP extracts the wrapper script instead of native aapt2, Box64 translates x86-64 aapt2 to arm64

### Fallback: Arm64 build-tools 34.0.4
- From AndroidIDE (https://github.com/AndroidIDEOfficial/androidide-tools)
- Works for compileSdk ≤ 34 only (android.jar 34+ is incompatible with older aapt2)

### Rejected: binfmt_misc
- Used by felix021's gist (May 2026) – works on real chroots with kernel binfmt support
- **Not viable** in proot-distro: proot does not support binfmt_misc registration

### Rejected: `android.aapt2FromMavenOverride`
- Deprecated in AGP 8.0, **ignored** by AGP 8.13+ – cannot rely on it
- Removed from `ensureGradleProperties()` as of v0.1.0

## Recent Changes

### 2026-05-23 — Template fixes & install.sh rewrite
- **project.ts**: Removed `kotlinOptions` block, removed `@mipmap/ic_launcher` from manifest (resource didn't exist), resolved `local.properties` SDK path from env, moved `dependencies {}` block inside template literal
- **install.sh**: Complete rewrite with 8 steps:
  - Step 0: System deps (curl, unzip, tar, binutils/readelf)
  - Step 3: Box64 installation (apt or compile from source)
  - Step 5: Auto-download SDK platforms + build-tools (arm64 34.0.4 + x86-64 35.0.0)
  - Step 5: sdkmanager install via cmdline-tools
  - Step 8: Verification
- **gradle.ts**: Removed deprecated `aapt2FromMavenOverride` from `ensureGradleProperties()`, added `ensureSdkComponents()` for auto-download of missing SDK platforms
- **Known issue**: Box64 0.2.6 from apt is old; compile-from-source gets 0.4.3+ with better performance

### 2026-05-22 — Box64 integration & aapt2 jar patching
- `patchAapt2InGradleCache()`: Replaces aapt2 inside AGP jars with Box64 wrapper script
- `findBox64()`, `findX64Aapt2()`, `createBox64WrapperScript()` helper functions
- `fix_aapt2` tool updated: auto-detects Box64, uses x86-64 aapt2+Box64 when available
- `buildApk()` updated: calls `ensureGradleProperties()` + `patchAapt2InGradleCache()` before build; retries on aapt2 errors

### 2026-05-21 — Initial project creation
- All 14 MCP tools created and registered
- TasbihCounter APK built successfully (6.4MB, AGP 8.13.0, compileSdk=36, 83.7s)
- SDK 36 + build-tools 35.0.0 downloaded from Google

## Build Performance (arm64 + Box64)

| Project | AGP | Build Time | APK Size | Notes |
|---|---|---|---|---|
| TasbihCounter | 8.13.0 | 83.7s | 6.4 MB | compileSdk=36, first successful build |
| TestProject456 | 8.5.2 | 103.8s | 5.3 MB | Fresh created project, `--clean` |

Box64 overhead: 2-3x vs native x86-64 (per community benchmarks). IO-bound operations see less impact.

## Development Workflow

1. Edit files in `/mnt/sdcard/AndroidIDEProjects/android-workspace/mcp/android-builder-mcp/src/`
2. Copy to build root: `cp src/* /root/android-builder-mcp/src/`
3. Compile: `cd /root/android-builder-mcp && ./node_modules/.bin/tsc`
4. Deploy dist back to workspace
5. Restart MCP server in AndroidIDE
6. Test via OpenCode

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `resource mipmap/ic_launcher not found` | Template references missing icon | Remove `android:icon` or add mipmap resources |
| `aapt2` errors with `Exec format error` | Arm64 trying to run x86-64 aapt2 directly | Run `fix_aapt2` or rebuild with Box64 |
| `Daemon startup failed` | aapt2 binary incompatible with arch | Ensure Box64 is installed and wrapper script is in AGP cache jar |
| `android.aapt2FromMavenOverride` warning | Deprecated property in gradle.properties | Remove the line (AGP 8+ ignores it anyway) |
| Gradle not found | Not installed or not in PATH | Run `apt install gradle` or download manually |
| SDK platform missing | `compileSdk` not available | MCP auto-downloads via `ensureSdkComponents()`, or run `sdkmanager "platforms;android-36"` |
| `box64: command not found` | Box64 not installed | `apt-get install -y box64` or compile from source |
