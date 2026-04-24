#!/usr/bin/env bash
set -e

echo ""
echo " Parrot Device"
echo "  ─────────────────────────────────────────"

if ! command -v node &>/dev/null; then
  echo "  ✗  Node.js is not installed."
  echo "     Download it from https://nodejs.org/ (v18 or higher), then re-run this script."
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "  ✗  Node.js v$NODE_VER found, but v20+ is required."
  echo "     Download the latest LTS from https://nodejs.org/"
  exit 1
fi

echo "  ✔  Node.js $(node -v) found"

if ! command -v npm &>/dev/null; then
  echo "  ✗  npm not found. It should come with Node.js — try reinstalling from https://nodejs.org/"
  exit 1
fi

echo "  ✔  npm $(npm -v) found"

if [ ! -f "node_modules/.bin/vite" ]; then
  echo ""
  echo "  Installing dependencies..."
  npm install
  echo "  ✔  Dependencies installed"
else
  echo "  ✔  Dependencies already installed"
fi

echo ""
echo "  Starting development server..."
echo "  Open http://localhost:8080 in your browser"
echo "  Press Ctrl+C to stop"
echo "  ─────────────────────────────────────────"
echo ""

./node_modules/.bin/vite