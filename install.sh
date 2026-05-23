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
IS_ARM64=false
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    IS_ARM64=true
    print_success "Architecture: ARM64 ($ARCH)"
else
    print_warn "Architecture: $ARCH (intended for ARM64, but continuing)"
fi

# Detect environment
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
ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"

# Step 0: System dependencies
install_system_deps() {
    print_info "Checking system dependencies..."
    MISSING=""
    for cmd in curl unzip tar which git; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            MISSING="$MISSING $cmd"
        fi
    done
    # Also check readelf (from binutils)
    if ! command -v readelf >/dev/null 2>&1; then
        MISSING="$MISSING binutils"
    fi
    if [ -n "$MISSING" ]; then
        print_info "  Installing missing tools:$MISSING"
        $PKG update -qq 2>/dev/null || true
        # shellcheck disable=SC2086
        $PKG install -y $MISSING 2>/dev/null || {
            # Fallback: install essential packages
            $PKG install -y curl unzip tar binutils coreutils git 2>/dev/null || true
        }
    fi
    print_success "System dependencies ready"
}

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
        $PKG install -y openjdk-17-jdk openjdk-17-jre 2>/dev/null || \
        $PKG install -y openjdk-17-jdk
    fi
    if command -v java >/dev/null 2>&1; then
        print_success "JDK installed: $(java -version 2>&1 | head -1)"
    fi
}

# Step 3: Install Box64 (for running x86-64 Android SDK tools on arm64)
install_box64() {
    if ! $IS_ARM64; then
        print_info "Box64: not needed (non-ARM64)"
        return 0
    fi
    if command -v box64 >/dev/null 2>&1; then
        print_success "Box64: $(box64 --version 2>&1 | head -1)"
        return 0
    fi
    print_info "Installing Box64 (x86-64 emulation for arm64)..."
    if $PKG install -y box64 2>/dev/null; then
        print_success "Box64 installed via apt ($(box64 --version 2>&1 | head -1))"
        return 0
    fi
    print_warn "Box64 not in apt. Compiling from source..."
    $PKG install -y cmake gcc g++ git python3-dev 2>/dev/null || true
    cd /tmp
    git clone --depth 1 https://github.com/ptitSeb/box64.git
    cd box64 && mkdir -p build && cd build
    cmake .. -DARM64=1 -DCMAKE_BUILD_TYPE=RelWithDebInfo
    make -j$(nproc)
    sudo make install 2>/dev/null || make install
    cd / && rm -rf /tmp/box64
    if command -v box64 >/dev/null 2>&1; then
        print_success "Box64 compiled and installed ($(box64 --version 2>&1 | head -1))"
    else
        print_warn "Box64 compilation failed. Builds with compileSdk>=35 may fail."
    fi
}

# Step 4: Install Gradle
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
        print_warn "  Gradle apt package unavailable. Downloading manually..."
    fi
    print_info "  Downloading Gradle 8.10.2..."
    mkdir -p "$HOME/gradle"
    curl -fsSL -o /tmp/gradle-bin.zip "https://services.gradle.org/distributions/gradle-8.10.2-bin.zip"
    if [ -f /tmp/gradle-bin.zip ]; then
        unzip -q /tmp/gradle-bin.zip -d "$HOME/gradle"
        rm -f /tmp/gradle-bin.zip
        export PATH="$HOME/gradle/gradle-8.10.2/bin:$PATH"
        print_success "Gradle 8.10.2 installed at \$HOME/gradle/gradle-8.10.2"
    else
        print_err "Gradle download failed. Install manually: https://gradle.org/install"
    fi
}

# Step 5: Install Android SDK + Build Tools
install_android_sdk() {
    if [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ] && \
       { [ -f "$ANDROID_HOME/build-tools/35.0.0/aapt2" ] || [ -f "$ANDROID_HOME/build-tools/34.0.4/aapt2" ]; }; then
        print_success "Android SDK at $ANDROID_HOME"
        [ -f "$ANDROID_HOME/build-tools/35.0.0/aapt2" ] && print_success "  build-tools 35.0.0 (x86-64 + Box64)"
        [ -f "$ANDROID_HOME/build-tools/34.0.4/aapt2" ] && print_success "  build-tools 34.0.4 (arm64)"
        [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ] && print_success "  platform android-36"
        return 0
    fi

    mkdir -p "$ANDROID_HOME"

    # Install arm64 build-tools as fallback (from AndroidIDE)
    if ! [ -f "$ANDROID_HOME/build-tools/34.0.4/aapt2" ]; then
        print_info "Installing arm64 build-tools 34.0.4 (fallback)..."
        mkdir -p "$ANDROID_HOME/build-tools/34.0.4"
        if curl -fsSL -o /tmp/bt.tar.xz \
            "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v34.0.4/build-tools-34.0.4-aarch64.tar.xz"; then
            tar xf /tmp/bt.tar.xz -C "$ANDROID_HOME/build-tools/34.0.4"
            # Fix nested structure
            if [ -d "$ANDROID_HOME/build-tools/34.0.4/build-tools" ]; then
                mv "$ANDROID_HOME/build-tools/34.0.4/build-tools/34.0.4/"* \
                   "$ANDROID_HOME/build-tools/34.0.4/"
                rm -rf "$ANDROID_HOME/build-tools/34.0.4/build-tools"
            fi
            rm -f /tmp/bt.tar.xz
            print_success "  arm64 build-tools 34.0.4 installed"
        else
            print_warn "  Could not download arm64 build-tools (network issue)"
        fi
    fi

    # Install platform-tools
    if ! [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        print_info "Installing platform-tools..."
        if [ "$IS_TERMUX" = true ]; then
            pkg install -y android-tools 2>/dev/null || true
        fi
        if ! [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
            curl -fsSL -o /tmp/pt.tar.xz \
                "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v34.0.4/platform-tools-34.0.4-aarch64.tar.xz" 2>/dev/null || true
            if [ -f /tmp/pt.tar.xz ]; then
                tar xf /tmp/pt.tar.xz -C "$ANDROID_HOME"
                rm -f /tmp/pt.tar.xz
                print_success "  platform-tools installed"
            fi
        fi
    fi

    # Download platform android-36
    if ! [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ]; then
        print_info "Downloading platform android-36..."
        mkdir -p "$ANDROID_HOME/platforms"

        # Try sdkmanager first
        install_sdkmanager
        if command -v sdkmanager >/dev/null 2>&1; then
            yes | sdkmanager "platforms;android-36" 2>/dev/null || true
        fi

        # Fallback: download from Google repository
        if ! [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ]; then
            print_info "  Downloading platform zip from Google..."
            curl -fsSL -o /tmp/android-36.zip \
                "https://dl.google.com/android/repository/android-36_r02.zip" 2>/dev/null || true
            if [ -f /tmp/android-36.zip ]; then
                unzip -q /tmp/android-36.zip -d "$ANDROID_HOME/platforms/"
                rm -f /tmp/android-36.zip
            fi
        fi
        if [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ]; then
            print_success "  Platform android-36 installed"
        else
            print_warn "  Platform android-36 download failed. Build may fail for compileSdk=36."
        fi
    fi

    # Download x86-64 build-tools 35.0.0 for Box64
    if $IS_ARM64 && command -v box64 >/dev/null 2>&1; then
        if ! [ -f "$ANDROID_HOME/build-tools/35.0.0/aapt2" ]; then
            print_info "Downloading x86-64 build-tools 35.0.0 (for Box64)..."
            mkdir -p "$ANDROID_HOME/build-tools/35.0.0"

            # Try sdkmanager first
            install_sdkmanager
            if command -v sdkmanager >/dev/null 2>&1; then
                print_info "  Installing via sdkmanager..."
                yes | sdkmanager "build-tools;35.0.0" 2>/dev/null || true
            fi

            # Fallback: download aapt2 directly from Google Maven
            if ! [ -f "$ANDROID_HOME/build-tools/35.0.0/aapt2" ]; then
                print_info "  Downloading aapt2 from Google Maven..."
                curl -fsSL -o /tmp/aapt2.zip \
                    "https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/8.5.2-11948202/aapt2-8.5.2-11948202-linux.jar" 2>/dev/null || \
                curl -fsSL -o /tmp/aapt2.zip \
                    "https://dl.google.com/android/maven2/com/android/tools/build/aapt2/8.5.2-11948202/aapt2-8.5.2-11948202-linux.jar" 2>/dev/null || true
                if [ -f /tmp/aapt2.zip ]; then
                    cd /tmp && unzip -qo aapt2.zip -d "$ANDROID_HOME/build-tools/35.0.0/" 2>/dev/null && rm -f aapt2.zip
                    chmod +x "$ANDROID_HOME/build-tools/35.0.0/aapt2" 2>/dev/null || true
                fi
            fi

            if [ -f "$ANDROID_HOME/build-tools/35.0.0/aapt2" ]; then
                print_success "  build-tools 35.0.0 installed (x86-64, runs via Box64)"
            else
                print_warn "  Could not download build-tools 35.0.0. Builds with compileSdk>=35 will use arm64 34.0.4"
            fi
        fi
    fi

    # Summary
    echo ""
    print_info "SDK Installation Summary:"
    [ -f "$ANDROID_HOME/build-tools/34.0.4/aapt2" ] && print_success "  arm64 build-tools 34.0.4: OK"
    [ -f "$ANDROID_HOME/build-tools/35.0.0/aapt2" ] && print_success "  x86-64 build-tools 35.0.0 (Box64): OK"
    [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ] && print_success "  platform android-36: OK"
    [ -f "$ANDROID_HOME/platform-tools/adb" ] && print_success "  platform-tools (adb): OK"
}

# Helper: install sdkmanager
install_sdkmanager() {
    if command -v sdkmanager >/dev/null 2>&1; then
        return 0
    fi
    local CMDLINE_DIR="$ANDROID_HOME/cmdline-tools/latest"
    if [ -f "$CMDLINE_DIR/bin/sdkmanager" ]; then
        ln -sf "$CMDLINE_DIR/bin/sdkmanager" /usr/local/bin/sdkmanager 2>/dev/null || true
        return 0
    fi
    print_info "  Installing Android command-line tools..."
    mkdir -p "$ANDROID_HOME/cmdline-tools"
    curl -fsSL -o /tmp/cmdline-tools.zip \
        "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" 2>/dev/null || true
    if [ -f /tmp/cmdline-tools.zip ]; then
        unzip -qo /tmp/cmdline-tools.zip -d /tmp/cmdline-tools/
        mkdir -p "$ANDROID_HOME/cmdline-tools/latest"
        if [ -d /tmp/cmdline-tools/cmdline-tools ]; then
            mv /tmp/cmdline-tools/cmdline-tools/* "$ANDROID_HOME/cmdline-tools/latest/"
        fi
        rm -rf /tmp/cmdline-tools /tmp/cmdline-tools.zip
        ln -sf "$CMDLINE_DIR/bin/sdkmanager" /usr/local/bin/sdkmanager 2>/dev/null || true
        print_success "  sdkmanager installed"
    else
        print_warn "  Could not download cmdline-tools (network issue)"
    fi
}

# Step 6: Set up environment variables
setup_environment() {
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
        echo 'export PATH=$ANDROID_HOME/build-tools/35.0.0:$ANDROID_HOME/build-tools/34.0.4:$ANDROID_HOME/platform-tools:$PATH' >> "$PROFILE_FILE"
        # Add Gradle if manually installed
        GRADLE_BIN="$HOME/gradle/gradle-8.10.2/bin"
        [ -f "$GRADLE_BIN/gradle" ] && echo "export PATH=\$PATH:$GRADLE_BIN" >> "$PROFILE_FILE"
        print_success "Environment added to $PROFILE_FILE"
    }

    # Source the profile for current shell
    # shellcheck disable=SC1090
    [ -f "$PROFILE_FILE" ] && source "$PROFILE_FILE" 2>/dev/null || true
}

# Step 7: Install the MCP Server
install_mcp() {
    print_info "Installing Android Builder MCP..."
    if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/package.json" ]; then
        print_info "  Updating existing installation..."
        cd "$INSTALL_DIR"
        git pull --ff-only 2>/dev/null || true
    else
        if [ -d "$INSTALL_DIR" ]; then
            print_info "  Recreating directory..."
            rm -rf "$INSTALL_DIR"
        fi
        print_info "  Cloning repository..."
        git clone --depth=1 https://github.com/alwansan/android-builder-mcp.git "$INSTALL_DIR"
    fi

    cd "$INSTALL_DIR"
    print_info "  Installing npm dependencies (typescript, zod, MCP SDK)..."
    npm install 2>&1 || { print_err "npm install failed."; exit 1; }

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

# Step 8: Verify installation
verify_installation() {
    echo ""
    print_info "=== Verification ==="
    local FAIL=0

    command -v node >/dev/null 2>&1 && print_success "  Node.js: $(node --version)" || { print_err "  Node.js: MISSING"; FAIL=1; }
    command -v java >/dev/null 2>&1 && print_success "  JDK: $(java -version 2>&1 | head -1)" || { print_err "  JDK: MISSING"; FAIL=1; }
    command -v gradle >/dev/null 2>&1 && print_success "  Gradle: $(gradle --version 2>&1 | grep Gradle | head -1)" || print_warn "  Gradle: not in PATH (may be manually installed)"
    [ -f "$ANDROID_HOME/platforms/android-36/android.jar" ] && print_success "  Platform android-36: OK" || print_warn "  Platform android-36: MISSING"

    if $IS_ARM64; then
        command -v box64 >/dev/null 2>&1 && print_success "  Box64: $(box64 --version 2>&1 | head -1)" || print_warn "  Box64: MISSING (needed for compileSdk>=35)"
    fi

    echo ""
    if [ $FAIL -eq 0 ]; then
        print_success "Installation verified successfully!"
    else
        print_warn "Some components are missing. Check warnings above."
    fi
}

# Main
main() {
    echo ""
    print_info "Step 0/8: System dependencies" && install_system_deps
    print_info "Step 1/8: Node.js"           && install_nodejs
    print_info "Step 2/8: JDK"               && install_jdk
    print_info "Step 3/8: Box64"             && install_box64
    print_info "Step 4/8: Gradle"            && install_gradle
    print_info "Step 5/8: Android SDK"       && install_android_sdk
    print_info "Step 6/8: Environment"       && setup_environment
    print_info "Step 7/8: MCP Server"        && install_mcp
    print_info "Step 8/8: Verify"            && verify_installation

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
