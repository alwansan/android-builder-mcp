#!/bin/bash
set -eu

# ============================================================
# Android Builder MCP - One-command installer for arm64
# ============================================================
# Usage: curl -fsSL https://raw.githubusercontent.com/alwansan/android-builder-mcp/main/install.sh | bash
# ============================================================

Color_Off='\033[0m'
Red='\033[0;31m'
Green='\033[0;32m'
Yellow='\033[0;33m'
Blue='\033[0;34m'

print_info()    { printf "${Blue}%s${Color_Off}\n" "$1"; }
print_err()     { printf "${Red}%s${Color_Off}\n" "$1"; }
print_warn()    { printf "${Yellow}%s${Color_Off}\n" "$1"; }
print_success() { printf "${Green}%s${Color_Off}\n" "$1"; }

echo ""
echo "========================================================"
echo "  Android Builder MCP - Installation"
echo "  OpenCode MCP for building APKs on arm64"
echo "========================================================"
echo ""

ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    print_success "Architecture: ARM64 ($ARCH)"
else
    print_err "Architecture: $ARCH (this MCP requires ARM64)"
    exit 1
fi

# Detect environment (proot-distro Ubuntu on Termux)
IS_TERMUX=false
IS_PROOT=false
if [ -n "${PROOT_L2S_DIR:-}" ] || [ -n "${PROOT_TMP_DIR:-}" ] || grep -q "TracerPid:.*[0-9]" /proc/self/status 2>/dev/null; then
    IS_PROOT=true
fi
if [ -d "/data/data/com.termux" ] && [ "$IS_PROOT" = false ]; then
    IS_TERMUX=true
fi
if [ -n "${TERMUX_VERSION:-}" ]; then
    IS_TERMUX=true
fi
print_info "Environment: $([ "$IS_TERMUX" = true ] && echo "Termux" || echo "Linux") + $([ "$IS_PROOT" = true ] && echo "proot-distro" || echo "native")"

# Detect package manager
if command -v apt >/dev/null 2>&1; then PKG="apt"
elif command -v pkg >/dev/null 2>&1; then PKG="pkg"
elif command -v apt-get >/dev/null 2>&1; then PKG="apt-get"
else print_err "No package manager found"; exit 1; fi
print_info "Package manager: $PKG"

INSTALL_DIR="${INSTALL_DIR:-$HOME/android-builder-mcp}"

# Step 1: Install Node.js
install_nodejs() {
    if command -v node >/dev/null 2>&1; then
        NODE_VER=$(node --version 2>&1)
        if echo "$NODE_VER" | grep -q "v18\|v2[0-9]\|v3[0-9]"; then
            print_success "Node.js: $NODE_VER"
            return 0
        fi
    fi
    print_info "Installing Node.js (18+)..."
    if [ "$PKG" = "pkg" ]; then
        $PKG install -y nodejs-lts
    else
        $PKG update -qq 2>/dev/null || true
        $PKG install -y nodejs npm
    fi
    if command -v node >/dev/null 2>&1; then
        print_success "Node.js: $(node --version)"
    else
        print_err "Node.js installation failed"
        print_info "  Install manually: https://nodejs.org"
        exit 1
    fi
}

# Step 2: Install JDK 17
install_jdk() {
    if command -v java >/dev/null 2>&1; then
        JAVA_VER=$(java -version 2>&1 | head -1)
        print_success "JDK: $JAVA_VER"
        return 0
    fi
    print_info "Installing JDK 17..."
    if [ "$PKG" = "pkg" ]; then
        $PKG install -y openjdk-17
    else
        $PKG update -qq 2>/dev/null || true
        $PKG install -y openjdk-17-jdk
    fi
    if command -v java >/dev/null 2>&1; then
        print_success "JDK installed: $(java -version 2>&1 | head -1)"
    fi
}

# Step 3: Install Gradle
install_gradle() {
    if command -v gradle >/dev/null 2>&1; then
        print_success "Gradle: $(gradle --version 2>&1 | grep Gradle | head -1)"
        return 0
    fi
    print_info "Installing Gradle..."
    if [ "$PKG" = "apt" ] || [ "$PKG" = "apt-get" ]; then
        $PKG install -y gradle 2>/dev/null && {
            print_success "Gradle: $(gradle --version 2>&1 | grep Gradle | head -1)"
            return 0
        }
    fi
    # Manual download fallback
    print_info "  Downloading Gradle 8.10.2..."
    mkdir -p "$HOME/gradle"
    curl -fsSL -o /tmp/gradle-bin.zip "https://services.gradle.org/distributions/gradle-8.10.2-bin.zip"
    unzip -q /tmp/gradle-bin.zip -d "$HOME/gradle"
    rm -f /tmp/gradle-bin.zip
    export PATH="$HOME/gradle/gradle-8.10.2/bin:$PATH"
    print_success "Gradle 8.10.2 installed at \$HOME/gradle/gradle-8.10.2"
}

# Step 4: Install Android SDK + Build Tools for arm64
install_android_sdk() {
    ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
    SDK_VERSION="34.0.4"
    SDK_ARCH="aarch64"
    if [ "$ARCH" = "armv7l" ]; then SDK_ARCH="arm"; fi

    if [ -f "$ANDROID_HOME/build-tools/$SDK_VERSION/aapt2" ]; then
        print_success "Android SDK at $ANDROID_HOME"
        return 0
    fi

    print_info "Installing Android SDK..."
    mkdir -p "$ANDROID_HOME/build-tools/$SDK_VERSION"

    # Download build-tools for arm64
    print_info "  Downloading build-tools $SDK_VERSION for $SDK_ARCH..."
    curl -fsSL -o /tmp/bt.tar.xz \
        "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${SDK_VERSION}/build-tools-${SDK_VERSION}-${SDK_ARCH}.tar.xz"
    tar xf /tmp/bt.tar.xz -C "$ANDROID_HOME/build-tools/$SDK_VERSION"
    # Fix nested structure: the archive contains build-tools/$SDK_VERSION/build-tools/$SDK_VERSION/
    if [ -d "$ANDROID_HOME/build-tools/$SDK_VERSION/build-tools" ]; then
        print_info "  Fixing nested archive structure..."
        mv "$ANDROID_HOME/build-tools/$SDK_VERSION/build-tools/$SDK_VERSION/"* \
           "$ANDROID_HOME/build-tools/$SDK_VERSION/"
        rm -rf "$ANDROID_HOME/build-tools/$SDK_VERSION/build-tools"
    fi
    rm -f /tmp/bt.tar.xz

    # Download platform-tools for arm64
    print_info "  Downloading platform-tools $SDK_VERSION for $SDK_ARCH..."
    curl -fsSL -o /tmp/pt.tar.xz \
        "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${SDK_VERSION}/platform-tools-${SDK_VERSION}-${SDK_ARCH}.tar.xz"
    tar xf /tmp/pt.tar.xz -C "$ANDROID_HOME"
    rm -f /tmp/pt.tar.xz

    # Verify
    if [ -f "$ANDROID_HOME/build-tools/$SDK_VERSION/aapt2" ]; then
        print_success "Build tools installed (aapt2: $ANDROID_HOME/build-tools/$SDK_VERSION/aapt2)"
    else
        print_warn "aapt2 not found. Trying apt install..."
        $PKG install -y aapt 2>/dev/null || true
    fi
    if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        print_success "Platform tools installed (adb)"
    else
        print_warn "adb not found in platform-tools"
    fi
}

# Step 5: Set up environment variables
setup_environment() {
    ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
    PROFILE_FILE="$HOME/.bashrc"
    [ -f "$HOME/.zshrc" ] && PROFILE_FILE="$HOME/.zshrc"

    # Detect JAVA_HOME
    JAVA_HOME_VALUE=""
    if command -v java >/dev/null 2>&1; then
        JAVA_BIN=$(readlink -f "$(which java)" 2>/dev/null || which java)
        JAVA_DIR=$(dirname "$(dirname "$JAVA_BIN")" 2>/dev/null || echo "")
        if [ -n "$JAVA_DIR" ] && [ -f "$JAVA_DIR/bin/java" ]; then
            JAVA_HOME_VALUE="$JAVA_DIR"
        fi
    fi
    for dir in /usr/lib/jvm/java-17-openjdk-arm64 /usr/lib/jvm/java-17-openjdk \
               /usr/lib/jvm/java-1.17.0-openjdk /data/data/com.termux/files/usr/lib/jvm/java-17-openjdk; do
        if [ -f "$dir/bin/java" ]; then JAVA_HOME_VALUE="$dir"; break; fi
    done

    grep -q "ANDROID_HOME" "$PROFILE_FILE" 2>/dev/null || {
        echo "" >> "$PROFILE_FILE"
        echo "# Android Builder MCP" >> "$PROFILE_FILE"
        [ -n "$JAVA_HOME_VALUE" ] && echo "export JAVA_HOME=$JAVA_HOME_VALUE" >> "$PROFILE_FILE"
        echo "export ANDROID_HOME=$ANDROID_HOME" >> "$PROFILE_FILE"
        echo 'export PATH=$ANDROID_HOME/build-tools/34.0.4:$ANDROID_HOME/platform-tools:$PATH' >> "$PROFILE_FILE"
        # Add Gradle if manually installed
        GRADLE_BIN="$HOME/gradle/gradle-8.10.2/bin"
        [ -f "$GRADLE_BIN/gradle" ] && echo "export PATH=\$PATH:$GRADLE_BIN" >> "$PROFILE_FILE"
        print_success "Environment added to $PROFILE_FILE"
    }
}

# Step 6: Set up Gradle properties for aapt2 fix
setup_gradle_properties() {
    mkdir -p "$HOME/.gradle"
    PROP="$HOME/.gradle/gradle.properties"

    # Find aapt2
    AAPT2=$(command -v aapt2 2>/dev/null || echo "")
    if [ -z "$AAPT2" ] && [ -n "${ANDROID_HOME:-}" ]; then
        AAPT2=$(find "$ANDROID_HOME/build-tools" -name aapt2 2>/dev/null | head -1) || true
    fi

    if [ -n "$AAPT2" ] && ! grep -q "android.aapt2FromMavenOverride" "$PROP" 2>/dev/null; then
        echo "" >> "$PROP"
        echo "# Android Builder MCP - aapt2 override for ARM64" >> "$PROP"
        echo "android.aapt2FromMavenOverride=$AAPT2" >> "$PROP"
        echo "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m" >> "$PROP"
        print_success "Gradle properties configured for ARM64"
    fi
}

# Step 7: Install the MCP Server
install_mcp() {
    print_info "Installing Android Builder MCP..."
    if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/package.json" ]; then
        print_info "  Updating existing installation..."
        cd "$INSTALL_DIR"
        git pull --ff-only 2>/dev/null || true
    elif [ -d "$INSTALL_DIR" ]; then
        print_info "  Recreating directory..."
        rm -rf "$INSTALL_DIR"
        git clone --depth=1 https://github.com/alwansan/android-builder-mcp.git "$INSTALL_DIR"
    else
        print_info "  Cloning repository..."
        git clone --depth=1 https://github.com/alwansan/android-builder-mcp.git "$INSTALL_DIR"
    fi

    cd "$INSTALL_DIR"
    print_info "  Installing npm dependencies..."
    npm install --ignore-scripts 2>&1 || { print_err "npm install failed."; exit 1; }

    print_info "  Building TypeScript..."
    if [ -f "node_modules/.bin/tsc" ]; then
        ./node_modules/.bin/tsc 2>&1 || { print_err "TypeScript compilation failed."; exit 1; }
    elif command -v npx &>/dev/null; then
        npx tsc 2>&1 || { print_err "TypeScript compilation failed."; exit 1; }
    else
        npm run build 2>&1 || { print_err "TypeScript compilation failed."; exit 1; }
    fi

    print_success "MCP Server built at $INSTALL_DIR/dist/index.js"
}

# Main
main() {
    echo ""
    print_info "Step 1/7: Node.js"        && install_nodejs
    print_info "Step 2/7: JDK"            && install_jdk
    print_info "Step 3/7: Gradle"         && install_gradle
    print_info "Step 4/7: Android SDK"    && install_android_sdk
    print_info "Step 5/7: Environment"    && setup_environment
    print_info "Step 6/7: Gradle config"  && setup_gradle_properties
    print_info "Step 7/7: MCP Server"     && install_mcp

    echo ""
    echo "========================================================"
    echo "  Installation complete!"
    echo ""
    echo "  To add to OpenCode, run:"
    echo ""
    echo "    opencode mcp add android-builder -- node $INSTALL_DIR/dist/index.js"
    echo ""
    echo "  Or manually add to ~/.config/opencode/opencode.jsonc:"
    echo ""
    echo '    {'
    echo '      "mcp": {'
    echo '        "android-builder": {'
    echo '          "type": "local",'
    echo "          \"command\": [\"node\", \"$INSTALL_DIR/dist/index.js\"],"
    echo '          "enabled": true,'
    echo '          "timeout": 600000'
    echo '        }'
    echo '      }'
    echo '    }'
    echo ""
    echo "  After adding, restart OpenCode and use:"
    echo "    - check_environment  - verify everything works"
    echo "    - build_apk          - build an Android project"
    echo "    - doctor             - full health check"
    echo ""
    echo "  Repo: https://github.com/alwansan/android-builder-mcp"
    echo "========================================================"
    echo ""
}

main "$@"
