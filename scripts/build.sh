#!/bin/bash
set -eu
echo "Building Android Builder MCP..."
if ! command -v node &> /dev/null; then echo "Error: Node.js required"; exit 1; fi
npm install
echo "TypeScript compilation..."
./node_modules/.bin/tsc
echo ""
echo "Build complete!"
echo "Run: node dist/index.js"
