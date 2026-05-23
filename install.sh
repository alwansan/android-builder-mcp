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
