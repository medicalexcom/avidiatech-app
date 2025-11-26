#!/usr/bin/env bash
set -euo pipefail

# Usage:
#  Preview only: ./move-settings-components.sh
#  Move + apply import replacements: ./move-settings-components.sh apply
#
# This script:
#  - moves specific UI component files from src/app/settings -> src/components/settings with git mv
#  - commits the move
#  - shows files that reference the old path
#  - if run with "apply", will update import paths and commit those changes
#
# IMPORTANT: ensure you run this on a branch with no uncommitted changes.

echo "=== move-settings-components.sh ==="

# Check git repo clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: You have uncommitted changes. Please commit or stash before running this script."
  git status --porcelain
  exit 1
fi

current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "On branch: $current_branch"

# Create destination
mkdir -p src/components/settings

# Files to move (only these UI components)
files=("ProfileForm.tsx" "OrganizationForm.tsx" "ApiKeysManager.tsx" "WebhooksManager.tsx")
moved_any=false

for f in "${files[@]}"; do
  src="src/app/settings/$f"
  dst="src/components/settings/$f"
  if [ -f "$src" ]; then
    echo "Moving: $src -> $dst"
    git mv "$src" "$dst"
    moved_any=true
  else
    echo "Not found (skipping): $src"
  fi
done

if [ "$moved_any" = false ]; then
  echo "No files were moved. Nothing to commit."
else
  echo "Committing moved files..."
  git add -A
  git commit -m "chore(settings): move UI components to src/components/settings (preserve history)"
  echo "Committed move."
fi

echo
echo "=== Preview: files referencing old path src/app/settings ==="
git grep -n --line-number "src/app/settings" || true
git grep -n --line-number "@/app/settings" || true
echo "========================================"
echo

if [ "${1:-}" = "apply" ]; then
  echo "Applying import path replacements (this will modify files):"

  # Replace occurrences of "@/app/settings/" -> "@/components/settings/"
  # and "src/app/settings/" -> "src/components/settings/"
  # Note: make backups with .bak so you can inspect before removing.
  set +e
  files_to_update=$(git grep -l -e "@/app/settings/" -e "src/app/settings/" || true)
  set -e

  if [ -z "$files_to_update" ]; then
    echo "No files found that reference the old app/settings path. Nothing to replace."
  else
    echo "Files to update:"
    echo "$files_to_update"
    echo

    # Replace in-place and create .bak backups
    echo "$files_to_update" | xargs -r -n1 -I{} sh -c 'sed -i.bak "s#@/app/settings/#@/components/settings/#g; s#/src/app/settings/#/src/components/settings/#g; s#\"/app/settings/#\"/components/settings/#g; s#'\''/app/settings/#'\''/components/settings/#g" "{}" && echo "updated: {}" || true'

    echo
    echo "Review the .bak backups if needed. Now committing replacements..."
    git add -A
    git commit -m "refactor(imports): update imports to src/components/settings"
    echo "Committed import replacements."

    # Remove .bak files (uncomment the next line if you want automatic removal)
    # git ls-files '*.bak' | xargs -r rm
    echo "Backup .bak files remain in the tree for review. Remove them when ready."
  fi
else
  echo "To automatically replace import paths from src/app/settings -> src/components/settings re-run with:"
  echo "  ./move-settings-components.sh apply"
fi

echo
echo "DONE: Move step complete. Next steps:"
echo "  - Run 'npm run dev' or 'npm run build' locally to verify"
echo "  - If everything is fine, push your branch: git push"
echo "  - If you ran with 'apply', inspect .bak files and remove them if not needed:"
echo "      git ls-files '*.bak' | xargs -r rm"
echo
