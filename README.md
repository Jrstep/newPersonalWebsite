# Personal Website

This is a static website hosted on GitHub Pages.

## Setup for GitHub Pages

1. Push this repository to GitHub
2. Go to your repository settings
3. Navigate to "Pages" in the left sidebar
4. Under "Source", select the branch you want to deploy (usually `main` or `master`)
5. Select the root folder (`/`)
6. Click "Save"

Your site will be available at `https://[your-username].github.io/[repository-name]/`

## Custom Domain Setup (john-stephenson.com)

The `CNAME` file is already configured for your custom domain. Follow these steps:

### 1. Configure DNS Settings in Cloudflare

**For Cloudflare users (simpler!):**

1. Log into your Cloudflare dashboard
2. Select your domain (`john-stephenson.com`)
3. Go to **DNS** → **Records**

**For the root domain (john-stephenson.com):**
- Click **Add record**
- Type: `CNAME` (Cloudflare supports CNAME flattening, so you can use CNAME for root!)
- Name: `@` (or just leave blank)
- Target: `[your-github-username].github.io` (replace with your actual GitHub username)
- Proxy status: **DNS only** (gray cloud, not orange) - Important! GitHub Pages doesn't work with Cloudflare proxy
- TTL: Auto
- Click **Save**

**For www subdomain (optional):**
- Click **Add record**
- Type: `CNAME`
- Name: `www`
- Target: `[your-github-username].github.io`
- Proxy status: **DNS only** (gray cloud)
- TTL: Auto
- Click **Save**

**Important:** Make sure the proxy status is **DNS only** (gray cloud icon), not **Proxied** (orange cloud). GitHub Pages doesn't work with Cloudflare's proxy enabled.

### 2. Enable Custom Domain in GitHub

1. Go to your repository on GitHub
2. Settings → Pages
3. Under "Custom domain", enter: `john-stephenson.com`
4. Check "Enforce HTTPS" (this will be available after DNS propagates)
5. Click "Save"

### 3. Wait for DNS Propagation

DNS changes can take anywhere from a few minutes to 48 hours to propagate. You can check if it's working by:
- Visiting `http://john-stephenson.com` (should redirect to HTTPS)
- Using a DNS checker tool like `dnschecker.org`

Once DNS is configured and GitHub recognizes your domain, your site will be live at `https://john-stephenson.com`!

## Local Development

Simply open `index.html` in your web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

