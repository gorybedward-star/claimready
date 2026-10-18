# VA Claims Intelligence: hosting guide

This folder is the complete public website. There is no server, database, or build step. Any static host can serve it to thousands of veterans at little or no cost.

```
index.html             the app
site-config.js         YOUR settings: site owner, contact email, reviewer (edit this)
manifest.webmanifest   lets veterans install the app on a phone or computer
sw.js                  offline support (caches the app's own files, never anyone's data)
icons/                 app icons
fonts/                 self-hosted typefaces (SIL Open Font License; licenses included)
```

## Step 1: Fill in your site settings

Open `site-config.js` in any text editor and fill in:

- `owner`: who runs the site.
- `contact`: an email address for questions and problem reports.
- `reviewedBy`: who reviewed the guidance, and when.
- `note`: an optional sentence about your organization or mission.

They appear on the app's **About and privacy** page. Empty values are hidden. You can edit this file later without rebuilding anything.

## Step 2: Deploy (pick one)

All three serve the site over HTTPS for free at this size. HTTPS is required for installing and offline use.

1. **Netlify Drop:** go to app.netlify.com/drop and drag this whole folder onto the page. Add a custom domain in site settings.
2. **Cloudflare Pages:** create a project, choose "Upload assets," and upload this folder.
3. **GitHub Pages:** put the folder's contents in a repository, then turn on Pages under Settings → Pages.

## How veterans' information is saved

- **On the veteran's own device.** Everything is saved in the browser's local storage as they type. The app asks the browser to keep that storage from being cleared.
- **Nothing is sent to you.** No accounts, analytics, tracking, or third-party requests, including fonts, which are self-hosted. You never receive or store any veteran's information.
- **Install to keep data safe.** On iPhone and iPad, Safari can erase website data after 7 days without a visit; apps added to the Home Screen keep it. The app shows an install prompt on the dashboard, the Backup tab, and the welcome screen. On Android and desktop Chrome or Edge it offers a one-tap **Install** button. Installed, it opens like an app and works offline.
- **Backup files.**
  - The first time a veteran adds a condition, the app asks them to download a backup.
  - After that, the dashboard reminds them if they have never backed up, or if their last backup is more than 30 days old and they have changed things since.
  - A backup restores on any device.
- **Summary for a representative.** A printable one-page summary can be downloaded from the dashboard or the Backup tab.

### Limits to tell users about

- Data lives in one browser on one device. Clearing browser data, private or incognito mode, or switching browsers means restoring from a backup file.
- Two people sharing one browser profile share one folder. The app tells people on shared computers to back up and then erase.

## Accessibility

Automated WCAG 2.1 AA scans (axe-core) of every page in light and dark mode report no violations. The app also has:

- A skip link, and visible keyboard focus.
- Clickable rows that also work with Enter.
- Screen-reader focus that moves to each new page's heading.
- 44-pixel touch targets on phones.
- A **Text size** button in the header, with three sizes.

Automated scans do not replace testing with people who use screen readers or magnification, so include at least one such person in your user testing.

## Recommended security headers

Add a file named `_headers` to this folder on Netlify or Cloudflare Pages:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; manifest-src 'self'; worker-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'none'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`connect-src 'self'` lets the page reach only its own files (for offline caching), so it cannot send data to any other site.

## Updating the app

Edit the files in `src/` of the source package, run `sh build.sh`, and upload the new `dist/public/` folder. Your edited `site-config.js` is kept.

- Veterans' saved data is not affected, because the app keeps the same storage key, `vci.folder.v2`.
- Installed copies pick up the update the next time they open online.
- After each guidance review, update `RULES_CHECKED` in `src/engine.js`. That date shows on every page.

## If you later want sync across devices

Add end-to-end encrypted sync: the browser encrypts the folder with a passphrase only the veteran knows, and the server stores only unreadable data. Plan for accounts, a hosted database, and the fact that a lost passphrase cannot be recovered.
