# VCI update monitor: setup

Once a week this checks every source VCI's Education topics are built from:

- **Every M21-1 article listed in `tools/sources.json` on KnowVA.** It opens each article in a headless browser and reads its "Updated" date.
- **38 CFR Parts 3, 4, and 20** through eCFR's official public interface.

If VA has changed anything since the version VCI was written from, it opens a **GitHub issue**. The issue lists each changed source, its old and new dates, and which VCI topics use it. It never edits the app; a person reviews every change.

## One-time setup (about 10 minutes)

1. **Add the files to your site's GitHub repository**, at the top level next to `index.html`:
   - `.github/workflows/check-sources.yml`
   - `tools/check-sources.mjs`, `tools/package.json`, `tools/sources.json`

   Tip: GitHub's web uploader can skip folders whose names start with a dot. If `.github` doesn't appear after uploading, choose **Add file → Create new file**, type `.github/workflows/check-sources.yml` as the name, and paste the file's contents.
2. **Allow the monitor to save results and open issues.** Go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, and save.
3. **Run it once.** Go to the **Actions** tab, select **Check VA sources for updates**, and click **Run workflow**. It takes about 15–20 minutes. The first run records today's eCFR dates as the starting point.
4. **Get notified.** Click **Watch** at the top of the repository and choose **All activity**, or at least Issues, so new issues reach your email.

After that it runs every Monday on its own.

## When an issue appears

1. Open each changed source from the links in the issue.
2. Copy the updated section and send it for review, the same way you add Education topics now.
3. Once the topic is revised, record it in `src/sources.js`:
   - Add an entry to `VCI_UPDATES`: the date, the topic id, kind `updated`, a one-line summary, and (optional) short phrases in `marks` to highlight the changed lines.
   - Change that article's `updated` date in `VCI_SOURCES` to the new date.
4. Rebuild and upload the new site files. The app then shows the change in **What's changed**, an **Updated** badge on the topic card, and a **What changed** box at the top of the topic with the changed lines highlighted.

**Can't review it right away?** Add a `VCI_UPDATES` entry with kind `pending`. The topic then shows **Review pending** so no one relies on outdated guidance until it's revised. Replace it with an `updated` entry once done.

## If something goes wrong

- **"Could not check" in the issue:** a page didn't load or had no "Updated" date. VA may have moved or retired the article; open it by hand.
- **"The first 5 pages could not be read":** KnowVA probably changed its web address or layout. The address pattern is at the top of `tools/check-sources.mjs` and can also be set with the `KNOWVA_URL_TEMPLATE` setting.
- **Be a good neighbor:** the monitor waits between pages and runs weekly. Check KnowVA's terms of use, and don't run it more often than needed.
