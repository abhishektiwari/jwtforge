# NPM Release Instructions

This guide explains how to release `jwtforge` to NPM.

## Release Checklist

Before releasing, ensure:

- [ ] All tests pass
- [ ] Code is reviewed and merged to `main`
- [ ] `README.md` is up to date
- [ ] No breaking changes without major version bump
- [ ] All dependencies are up to date (`npm update` and/or `npm upgrade`)

## Step-by-Step Release Process

### 1. Login to NPM

```bash
npm login
```

Enter your NPM credentials when prompted.

### 2. Verify Package Contents

Check what will be published:

```bash
npm pack --dry-run
```

This shows all files that will be included in the package.

### 3. Update Version

Choose the appropriate version bump:

```bash
# Patch release (bug fixes): 1.0.0 → 1.0.1
npm version patch

# Minor release (new features): 1.0.0 → 1.1.0
npm version minor

# Major release (breaking changes): 1.0.0 → 2.0.0
npm version major
```

This command automatically:
- Updates `package.json` version
- Creates a git commit with the version change
- Creates a git tag

### 4. Review Changes

```bash
git log -1
git show HEAD
```

Verify the version bump is correct.

### 5. Publish to NPM

```bash
npm publish
```

If publishing a scoped package:

```bash
npm publish --access public
```

### 6. Verify Publication

Check that the package was published successfully:

```bash
npm view jwtforge@latest
```

Visit: https://www.npmjs.com/package/jwtforge

### 7. Push Changes to GitHub

```bash
git push origin main
git push origin v1.x.x  # Push the tag created by npm version
```

### 8. Create GitHub Release (Optional)

```bash
gh release create v1.x.x \
  --title "Release v1.x.x" \
  --notes "Your release notes here"
```

Or create manually on GitHub:
1. Go to [Releases](https://github.com/abhishektiwari/jwtforge/releases)
2. Click "Draft a new release"
3. Select the tag you just pushed
4. Add title and description
5. Click "Publish release"

## Complete Release Example

```bash
# 1. Make sure everything is committed
git status

# 2. Create patch release
npm version patch

# 3. Publish to NPM
npm publish

# 4. Push to GitHub
git push origin main
git push origin --tags

# 5. Verify
npm view jwtforge@latest
```

## Version Numbering Guide

Use [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
  - Example: Remove CLI command, change API structure
  - `npm version major`

- **MINOR** (0.X.0): Backward-compatible new features
  - Example: Add new CLI command, new token option
  - `npm version minor`

- **PATCH** (0.0.X): Bug fixes and patches
  - Example: Fix token generation, improve performance
  - `npm version patch`

## Pre-release Versions

For beta/alpha releases:

```bash
npm version prerelease --preid=beta
# Creates: 1.0.0-beta.0 → 1.0.0-beta.1

npm publish --tag beta
```

Users can then install with:

```bash
npm install jwtforge@beta
```

## Troubleshooting

### Package Not Found After Publishing

Wait 1-2 minutes for NPM registry to sync.

### "You do not have permission to publish this package"

Check that:
- You're logged in: `npm whoami`
- You have permissions on the package
- You're on the correct registry: `npm config get registry`

### Undo a Bad Release

If you need to unpublish (only allowed within 72 hours):

```bash
npm unpublish jwtforge@1.0.0 --force
```

Then fix and republish. **Note:** This is a last resort.

## Automation (Optional)

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Then generate NPM token at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens) and add as GitHub secret.

## Useful Commands

```bash
# View current published version
npm view jwtforge version

# View all published versions
npm view jwtforge versions

# View package details
npm view jwtforge

# Check your NPM account info
npm whoami

# Check NPM login status
npm config get registry
```

## References

- [NPM Publish Docs](https://docs.npmjs.com/cli/publish)
- [Semantic Versioning](https://semver.org/)
- [NPM CLI Documentation](https://docs.npmjs.com/cli)

## Questions?

For issues or questions about the release process:
- Check NPM documentation
- Review existing releases: [Releases](https://github.com/abhishektiwari/jwtforge/releases)
- Open an issue: [GitHub Issues](https://github.com/abhishektiwari/jwtforge/issues)
