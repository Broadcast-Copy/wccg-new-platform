#!/bin/bash
# Deploy script that avoids ENAMETOOLONG on Windows
set -e

DEPLOY_DIR="D:/wccg-deploy-tmp"
REPO_URL="https://github.com/Broadcast-Copy/wccg-new-platform.git"
OUT_DIR="D:/wccg-new-platform/apps/web/out"

# Clean up any previous deploy dir
rm -rf "$DEPLOY_DIR"

# Clone just the gh-pages branch (shallow)
git clone --branch gh-pages --single-branch --depth 1 "$REPO_URL" "$DEPLOY_DIR"

# Remove old content (but keep .git)
cd "$DEPLOY_DIR"
# Move .git out, nuke everything, move .git back
mv .git /tmp/gh-pages-git-$$
rm -rf *
rm -f .nojekyll .gitignore 2>/dev/null
mv /tmp/gh-pages-git-$$ .git

# Copy new build output
cp -r "$OUT_DIR"/* .
cp "$OUT_DIR/.nojekyll" . 2>/dev/null || true

# Set git identity for this temp repo
git config user.name "biggleem"
git config user.email "biggleem@users.noreply.github.com"

# Commit and push
git add -A
git commit -m "deploy" --allow-empty
git push origin gh-pages

# Clean up
cd /
rm -rf "$DEPLOY_DIR"

echo "Deploy complete!"
