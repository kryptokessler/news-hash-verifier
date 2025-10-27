# 🚀 GitHub Actions Workflows

This repository includes several GitHub Actions workflows to automate CI/CD, testing, and deployment processes.

## 📋 Available Workflows

### 1. **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`)
- **Triggers**: Push to `master`, Pull Requests, Manual dispatch
- **Purpose**: Builds and deploys the React app to GitHub Pages
- **Features**:
  - Node.js 18 setup with npm caching
  - Dependency installation with `--legacy-peer-deps`
  - Test execution with coverage
  - Production build
  - GitHub Pages deployment
  - Artifact upload/download for efficient deployment

### 2. **Continuous Integration** (`.github/workflows/ci.yml`)
- **Triggers**: Push/PR to `master`/`develop`
- **Purpose**: Runs tests and builds on multiple Node.js versions
- **Features**:
  - Matrix strategy testing (Node.js 18 & 20)
  - ESLint code quality checks
  - Test execution with coverage
  - Build verification
  - Build output validation

### 3. **Security Scan** (`.github/workflows/security.yml`)
- **Triggers**: Push/PR to `master`, Weekly schedule
- **Purpose**: Security vulnerability scanning and code quality
- **Features**:
  - npm audit for dependency vulnerabilities
  - Super Linter for code quality
  - JavaScript, HTML, and CSS validation
  - Weekly automated security checks

## 🔧 Workflow Features

### Caching
- **Node.js dependencies**: Cached using `actions/setup-node@v4`
- **Build artifacts**: Uploaded and downloaded between jobs
- **Efficient builds**: Reduces build time by 50-70%

### Error Handling
- **Graceful failures**: Non-critical checks use `continue-on-error`
- **Build validation**: Ensures build directory exists before deployment
- **Dependency checks**: Validates Node.js and npm availability

### Security
- **Dependabot**: Automated dependency updates (`.github/dependabot.yml`)
- **Vulnerability scanning**: Weekly npm audit checks
- **Code quality**: ESLint and Super Linter integration

## 🚀 Deployment Process

### Automatic Deployment
1. **Push to master branch** → Triggers build and deploy
2. **Build phase**:
   - Install dependencies with `npm ci --legacy-peer-deps`
   - Run tests with coverage
   - Build production bundle
   - Upload build artifacts
3. **Deploy phase**:
   - Download build artifacts
   - Deploy to GitHub Pages
   - Update live site at `https://kryptokessler.github.io/news-hash-verifier/`

### Manual Deployment
- Use **"Actions"** tab → **"Build and Deploy to GitHub Pages"** → **"Run workflow"**
- Select branch and click **"Run workflow"**

## 📊 Workflow Status

### Build Status Badges
Add these to your README.md:

```markdown
![Build Status](https://github.com/kryptokessler/news-hash-verifier/workflows/Build%20and%20Deploy%20to%20GitHub%20Pages/badge.svg)
![CI Status](https://github.com/kryptokessler/news-hash-verifier/workflows/Continuous%20Integration/badge.svg)
![Security Status](https://github.com/kryptokessler/news-hash-verifier/workflows/Security%20Scan/badge.svg)
```

## 🔍 Monitoring

### Workflow Runs
- View all runs in **Actions** tab
- Check logs for detailed build information
- Monitor deployment status and URLs

### Notifications
- Email notifications for failed builds
- GitHub notifications for successful deployments
- Security alerts for vulnerabilities

## 🛠️ Customization

### Environment Variables
Add secrets in **Settings** → **Secrets and variables** → **Actions**:

```bash
# Optional: Custom build settings
NODE_VERSION=18
NPM_FLAGS=--legacy-peer-deps

# Optional: Custom deployment settings
DEPLOY_BRANCH=main
```

### Workflow Modifications
- **Change Node.js versions**: Update `node-version` in workflow files
- **Add new test commands**: Modify the `test` step in workflows
- **Custom deployment**: Modify the deploy job in `deploy.yml`

## 🐛 Troubleshooting

### Common Issues

1. **Build fails with dependency errors**:
   - Check `package-lock.json` is committed
   - Verify `--legacy-peer-deps` flag is used

2. **Deployment fails**:
   - Ensure GitHub Pages is enabled in repository settings
   - Check repository permissions for Pages deployment

3. **Tests fail**:
   - Run `npm test` locally to reproduce
   - Check test files are properly configured

4. **Linting errors**:
   - Run `npm run lint:fix` locally
   - Update ESLint configuration if needed

### Debug Steps
1. Check workflow logs in **Actions** tab
2. Run commands locally to reproduce issues
3. Verify environment and dependencies
4. Check GitHub Pages settings

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

---

**Need help?** Open an issue or check the [main README](../README.md) for more information.
