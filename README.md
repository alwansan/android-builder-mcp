# Android Builder MCP

> **MCP server for OpenCode** to build Android APKs on **arm64 devices** (Termux + proot-distro + Ubuntu)

## Features

| Tool | Description |
|------|-------------|
| `build_apk` | Build APKs (debug/release) from Gradle projects |
| `create_android_project` | Create new Android projects from templates |
| `fix_aapt2` | Fix aapt2 architecture mismatch on arm64 |
| `check_environment` | Check JDK, SDK, Gradle, build tools |
| `install_sdk` | Install Android SDK for arm64 |
| `search_permissions` | Search Android permissions database |
| `android_doc_search` | Search developer.android.com |
| `diagnose_build` | Analyze build errors and suggest fixes |
| `doctor` | Full environment health check |
| `install_apk` | Install APK via ADB |
| `read_logcat` | Read Android system logs |
| `list_devices` | List connected ADB devices |

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/alwansan/android-builder-mcp/main/install.sh | bash
```

## Manual Setup

```bash
git clone https://github.com/alwansan/android-builder-mcp.git
cd android-builder-mcp
npm install
npm run build
```

Then add to `~/.config/opencode/opencode.jsonc`:

```json
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
```

## License
GPL-3.0
