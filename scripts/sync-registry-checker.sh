#!/bin/sh
# Copies the EigenReel gate into the registry template, so the registry's "check" workflow runs the same static checks
# as the Chalkboard (demo/github/README.md, "Keeping the checker in sync"). spec.js is the whole static gate and tex.js
# its TeX tokenizer; both are read by .eigenreel/check-entries.mjs under node, with acorn and KaTeX from npm (KaTeX
# pinned in .eigenreel/package.json to tex.js's VER). Run this from anywhere after changing spec.js or tex.js, commit
# the result here, then copy demo/github/registry/.eigenreel/ into the registry repository and commit it there too.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEST="$ROOT/demo/github/registry/.eigenreel"

for f in spec.js tex.js; do cp "$ROOT/$f" "$DEST/$f"; done

VER=$(sed -n "s/^const VER='\([^']*\)'.*/\1/p" "$ROOT/tex.js")
grep -q "\"katex\": \"$VER\"" "$DEST/package.json" || echo "warning: tex.js loads KaTeX $VER; pin the same version in $DEST/package.json" >&2
echo "Copied spec.js and tex.js into $DEST"
