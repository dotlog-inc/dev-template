#!/bin/sh
set -e

EXPORT_DIR="${FIREBASE_EXPORT_DIR:-/home/node/firebase_export}"
mkdir -p "$EXPORT_DIR"

ARGS="--only auth --project demo-project --export-on-exit=$EXPORT_DIR"
if [ -f "$EXPORT_DIR/firebase-export-metadata.json" ]; then
  ARGS="$ARGS --import=$EXPORT_DIR"
fi

exec firebase emulators:start $ARGS
