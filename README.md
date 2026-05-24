# Android Builder MCP

> **MCP server for [OpenCode](https://opencode.ai)** — Build Android APKs on **arm64 devices** (Termux + proot-distro + Ubuntu) directly from your AI coding assistant.

[![GitHub](https://img.shields.io/badge/GitHub-alwansan/android--builder--mcp-blue?logo=github)](https://github.com/alwansan/android-builder-mcp)

---

## 🚀 Quick Install (one command)

```bash
curl -fsSL https://raw.githubusercontent.com/alwansan/android-builder-mcp/main/install.sh | bash
```

That's it. The installer handles everything — from zero to a working MCP server in ~10 minutes (depending on internet speed and device).

---

## 📋 What the installer does (8 steps)

| Step | Component | Installed by | Notes |
|------|-----------|-------------|-------|
| 0 | System deps | `apt` | curl, unzip, tar, binutils, git |
| 1 | **Node.js** 18+ | `apt` / `pkg` | Required for MCP server runtime |
| 2 | **JDK 17** | `apt` / `pkg` | Required for Android builds |
| 3 | **Box64** | `apt` or source compile | x86-64 → arm64 translation for SDK tools |
| 4 | **Gradle** 8.10.2 | `apt` or manual download | Build system |
| 5 | **Android SDK** + NDK | sdkmanager + direct download | Platforms, build-tools, platform-tools, NDK |
| 6 | Environment | `~/.bashrc` | JAVA_HOME, ANDROID_HOME, PATH |
| 7 | **MCP Server** | `git clone` + `npm` | Clones repo, installs deps, compiles TypeScript |
| 8 | Verification | — | Checks all 8 components |

### SDK components auto-installed

- **Platforms**: android-36
- **Build tools**: 35.0.0 (x86-64, runs via Box64) + 34.0.4 (arm64, fallback)
- **Platform tools**: adb
- **NDK**: 27.3.13750724 (for Chaquopy / native .so compilation)

---

## 🛠️ All 14 MCP Tools

| Tool | Description |
|------|-------------|
| `build_apk` | Build APKs (debug/release) from Gradle projects |
| `create_android_project` | Create new Android projects from templates (basic) |
| `fix_aapt2` | Fix aapt2 architecture mismatch on arm64 — replaces x86-64 binary in AGP cache with Box64 wrapper |
| `check_environment` | Check JDK, SDK, Gradle, build tools, and architecture |
| `install_sdk` | Install/update Android SDK and build tools |
| `doctor` | Full environment health check (8 checks) |
| `diagnose_build` | Analyze Gradle build errors and suggest fixes |
| `search_permissions` | Search Android permissions DB by name / protection level / group |
| `get_manifest_element` | Get Android manifest element requirements |
| `sdk_mapping` | SDK version → API level mapping |
| `android_doc_search` | Search developer.android.com |
| `install_apk` | Install APK on connected device via ADB |
| `read_logcat` | Read Android system logs (filtered by app) |
| `list_devices` | List connected ADB devices |

---

## 🏗️ Architecture

```
OpenCode (MCP client)
    ↓
android-builder-mcp (MCP server) — stdio JSON-RPC
    ├── build_apk          → Gradle wrapper → AGP → aapt2 (Box64) → APK
    ├── create_android_project → template → project files
    ├── fix_aapt2          → find AGP jar → replace aapt2 with Box64 wrapper
    ├── doctor             → check all 8 components
    ├── diagnose_build     → parse build log → suggest fixes
    ├── search_permissions → SQLite DB → permissions info
    ├── get_manifest_element → hardcoded manifest rules
    ├── sdk_mapping        → hardcoded SDK→API version map
    ├── android_doc_search → curl + rendering (developer.android.com)
    ├── install_apk        → adb install
    ├── read_logcat        → adb logcat
    ├── list_devices       → adb devices
    └── install_sdk        → sdkmanager + direct download
```

```
Files:
  src/index.ts              → Tool registration, entry point
  src/utils/gradle.ts        → Build logic, Box64 wrapper patching, SDK auto-download
  src/utils/sdk.ts           → Environment detection
  src/utils/aapt.ts          → aapt2 fix logic
  src/tools/project.ts       → Project templates
  src/tools/build.ts         → Build + env tools
  src/tools/diagnostic.ts    → Doctor + diagnostics
  src/tools/device.ts        → ADB tools
  src/tools/knowledge.ts     → SDK mapping, permissions DB, manifest elements, docs search
  install.sh                 → One-command installer (8 steps)
```

---

## 🔧 Why Box64? (The arm64 Android SDK Problem)

Google **does not provide** arm64 native Android SDK build-tools. All binaries (aapt2, zipalign, aidl) are x86-64 only.

This is the core problem this project solves:

```
Common approach (fails):
  Gradle → AGP → aapt2 (x86-64) → ❌ Exec format error on arm64

Our approach (works):
  Gradle → AGP → Box64 → aapt2 (x86-64 translated) → ✅ works
```

### How it works

1. **Box64** is installed (x86-64 → arm64 binary translator, lighter than QEMU)
2. x86-64 **build-tools 35.0.0** are downloaded from Google
3. AGP ships aapt2 inside `aapt2-*-linux.jar` (in Gradle cache). We **patch** this jar:
   - Extract the binary
   - Replace it with a shell wrapper: `#!/bin/sh\nexec /usr/bin/box64 /path/to/aapt2 "$@"`
   - Re-pack the jar
4. Gradle extracts the wrapper, Box64 runs the real x86-64 aapt2

### Fallback: arm64 build-tools 34.0.4

From [AndroidIDE](https://github.com/AndroidIDEOfficial/androidide-tools). Works for `compileSdk ≤ 34` only.

### Rejected solutions

| Approach | Why rejected |
|----------|-------------|
| `binfmt_misc` + QEMU | Requires kernel support — not available in proot-distro |
| `android.aapt2FromMavenOverride` | Deprecated in AGP 8.0, ignored by AGP 8.13+ |
| `aapt2_linux` arm64 from AndroidIDE | Only available up to v34.0.4 (API 34 max) |

---

## 📋 Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| Architecture | **arm64** (aarch64) | arm64 |
| Environment | Termux + proot-distro (Ubuntu) | Termux + proot-distro (Ubuntu 22.04+) |
| RAM | 2 GB | 4 GB+ |
| Storage | 4 GB free | 8 GB+ (SDK + NDK + Gradle cache) |
| Internet | Broadband | Broadband (~2 GB download for full install) |

> **Note**: This is designed for **arm64**. It works on x86-64 too but Box64 installation is skipped.

---

## ⚙️ Manual Setup

```bash
# 1. Clone
git clone https://github.com/alwansan/android-builder-mcp.git
cd android-builder-mcp

# 2. Install deps & build
npm install
npm run build

# 3. Add to OpenCode config (~/.config/opencode/opencode.jsonc)
{
  "mcp": {
    "android-builder": {
      "type": "local",
      "command": ["node", "/path/to/android-builder-mcp/dist/index.js"],
      "enabled": true,
      "timeout": 600000
    }
  }
}
# Or use the OpenCode CLI:
# opencode mcp add android-builder -- node /path/to/android-builder-mcp/dist/index.js

# 4. Restart OpenCode and verify
# Ask: check_environment
```

---

## 🚦 Build Performance (arm64 + Box64)

| Project | AGP | Build Time | APK Size | Notes |
|---------|-----|-----------|----------|-------|
| Empty template | 8.5.2 | 85s | 5.3 MB | First build (downloads deps) |
| TasbihCounter | 8.13.0 | 84s | 6.4 MB | compileSdk=36 |
| B-Ultra (Chaquopy + Flask + yt-dlp) | 9.1.1 | 158s | 59 MB | Python 3.13 embedded |

Box64 adds ~2-3x overhead vs native x86-64. IO-bound operations see less impact.

---

## 🔍 Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Exec format error` with aapt2 | x86-64 aapt2 running directly on arm64 | Run `fix_aapt2` tool — patches AGP cache jars |
| `Daemon startup failed` | aapt2 binary incompatible with arch | Ensure Box64 installed + AGP jar patched |
| `resource mipmap/ic_launcher not found` | Template references missing icon | Remove `android:icon` from manifest or add resource |
| `android.aapt2FromMavenOverride` warning | Deprecated Gradle property | Remove the line (AGP 8+ ignores it) |
| Gradle not found | Not in PATH | Run `source ~/.bashrc` or install Gradle |
| SDK platform missing | compileSdk not installed | Run `fix_aapt2` → auto-downloads missing components |
| `box64: command not found` | Box64 not installed | `apt-get install -y box64` or run install.sh |
| Symlink error on `/mnt/sdcard` | FUSE/FAT filesystem | MCP auto-copies project to `/tmp` for build |
| `buildPython FAILED` (Chaquopy) | Wrong Python path | Set `buildPython "/data/data/com.termux/files/usr/bin/python"` |

---

## 📄 License

GPL-3.0
