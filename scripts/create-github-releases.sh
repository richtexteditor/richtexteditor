#!/usr/bin/env bash
# Create the GitHub Releases that this repo has never had (0 releases, while npm
# has shipped 91 versions). Run from the repo root.
#
# NOT run automatically: creating releases is public and hard to undo. Review
# release-notes/*.md first, then run this yourself.
#
# Requires: gh auth login
set -euo pipefail

cd "$(dirname "$0")/.."

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

# Oldest first, so the GitHub releases list ends up newest-first.
for f in $(ls release-notes/v*.md); do
  ver="$(basename "$f" .md)"          # e.g. v2.6.4
  if gh release view "$ver" >/dev/null 2>&1; then
    echo "skip   $ver (already exists)"
    continue
  fi
  title="RichTextEditor ${ver#v}"
  echo "create $ver  $title"
  # --notes-file keeps the text byte-identical to the reviewed markdown.
  gh release create "$ver" --title "$title" --notes-file "$f" --verify-tag 2>/dev/null     || gh release create "$ver" --title "$title" --notes-file "$f" --target master
done

echo
echo "Done. Review at: https://github.com/richtexteditor/richtexteditor/releases"
