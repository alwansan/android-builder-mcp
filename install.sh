#!/bin/bash
set -eu

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
    print_success "✓ Architecture: ARM64 ($ARCH)"
else
    print_err "✗ Architecture: $ARCH (not ARM64)"
    print_err "This MCP is designed for ARM64 devices."
    exit 1
fi

install_nodejs() {
    if command -v node >/dev/null 2>&1; then
        print_success "✓ Node.js already installed: $(node --version)"
        return 0
    fi
    print_info "Installing Node.js..."
    apt update -qq && apt install -y nodejs npm 2>/dev/null || pkg install -y nodejs-lts 2>/dev/null
}

install_jdk() {
    if command -v java >/dev/null 2>&1; then
        print_success "✓ JDK already installed: $(java -version 2>&1 | head -1)"
        return 0
    fi
    print_info "Installing JDK 17..."
    apt install -y openjdk-17-jdk 2>/dev/null || pkg install -y openjdk-17 2>/dev/null
}

install_gradle() {
    if command -v gradle >/dev/null 2>&1; then
        print_success "✓ Gradle already installed"
        return 0
    fi
    print_info "Installing Gradle..."
    apt install -y gradle 2>/dev/null || {
        curl -fsSL -o /tmp/gradle-bin.zip "https://services.gradle.org/distributions/gradle-8.10.2-bin.zip"
        mkdir -p ~/gradle && unzip -q /tmp/gradle-bin.zip -d ~/gradle
        rm -f /tmp/gradle-bin.zip
    }
}

install_android_sdk() {
    ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
    SDK_VERSION="34.0.4"
    SDK_ARCH="aarch64"
    if [ -f "$ANDROID_HOME/build-tools/$SDK_VERSION/aapt2" ]; then
        print_success "✓ Android SDK already installed at $ANDROID_HOME"
        return 0
    fi
    print_info "Installing Android SDK at $ANDROID_HOME..."
    mkdir -p "$ANDROID_HOME"
    curl -fsSL -o /tmp/android-sdk.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/sdk/android-sdk.tar.xz"
    tar xf /tmp/android-sdk.tar.xz -C "$ANDROID_HOME" 2>/dev/null || true
    rm -f /tmp/android-sdk.tar.xz
    curl -fsSL -o /tmp/build-tools.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${SDK_VERSION}/build-tools-${SDK_VERSION}-${SDK_ARCH}.tar.xz"
    mkdir -p "$ANDROID_HOME/build-tools/${SDK_VERSION}"
    tar xf /tmp/build-tools.tar.xz -C "$ANDROID_HOME/build-tools/${SDK_VERSION}"
    rm -f /tmp/build-tools.tar.xz
    curl -fsSL -o /tmp/platform-tools.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${SDK_VERSION}/platform-tools-${SDK_VERSION}-${SDK_ARCH}.tar.xz"
    tar xf /tmp/platform-tools.tar.xz -C "$ANDROID_HOME"
    rm -f /tmp/platform-tools.tar.xz
    print_success "✓ Android SDK installed"
}

setup_environment() {
    echo "export ANDROID_HOME=${ANDROID_HOME:-$HOME/android-sdk}" >> ~/.bashrc
    echo 'export PATH=$ANDROID_HOME/build-tools/34.0.4:$ANDROID_HOME/platform-tools:$PATH' >> ~/.bashrc
    grep -q "JAVA_HOME" ~/.bashrc 2>/dev/null || echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64' >> ~/.bashrc
}

install_mcp() {
    print_info "Installing MCP Server..."
    npm install
    npm run build
    print_success "✓ MCP Server built"
}

echo ""
print_info "Step 1: Installing Node.js..."; install_nodejs
print_info "Step 2: Installing JDK..."; install_jdk
print_info "Step 3: Installing Gradle..."; install_gradle
print_info "Step 4: Installing Android SDK..."; install_android_sdk
print_info "Step 5: Setting up environment..."; setup_environment
print_info "Step 6: Installing MCP Server..."; install_mcp
echo ""
echo "========================================================"
echo "  ✅ Installation complete!"
echo ""
echo "  Restart OpenCode and run: opencode mcp list"
echo "  Repo: https://github.com/alwansan/android-builder-mcp"
echo "========================================================"
