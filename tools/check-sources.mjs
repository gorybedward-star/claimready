// VCI source monitor. Checks whether VA has updated the M21-1 (KnowVA) articles and 38 CFR parts VCI is built from.
// Run weekly by .github/workflows/check-sources.yml. Opens a GitHub issue when something changed or could not be read.
// It never edits the app: a person reviews each change, updates the topic, and records it in src/sources.js.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const DIR = new URL('.', import.meta.url);
const KNOWVA = process.env.KNOWVA_URL_TEMPLATE ||
  'https://www.knowva.ebenefits.va.gov/system/templates/selfservice/va_ssnew/help/customer/locale/en-US/portal/554400000001018/content/{id}/';
const ECFR = process.env.ECFR_API || 'https://www.ecfr.gov/api/versioner/v1/versions/title-38.json?part={part}';
const DELAY = Number(process.env.CHECK_DELAY_MS || 2500); // be gentle with VA's site
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

export function parseUpdated(text) {
  const m = /Updated\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),\s+(\d{4})/.exec(text || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], MON[m[1]], +m[2]));
  return d.toISOString().slice(0, 10);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const readJSON = async (name, dflt) => { try { return JSON.parse(await readFile(new URL(name, DIR), 'utf8')); } catch { return dflt; } };

async function main() {
  const src = await readJSON('sources.json', null);
  if (!src) throw new Error('tools/sources.json is missing. Copy it from the latest VCI build.');
  const state = await readJSON('state.json', { articles: {}, ecfr: {} });
  const changed = [], failed = [], topicsFor = id => Object.entries(src.topics).filter(([, a]) => a.includes(id)).map(([t]) => t);

  // 1. KnowVA articles: read the "Updated <date>" line from each rendered page.
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ userAgent: 'VCI-source-monitor (weekly check of M21-1 update dates)' });
  let ok = 0;
  for (const [id, a] of Object.entries(src.articles)) {
    if (!ok && failed.length >= 5) { failed.push({ id: '-', cite: 'Remaining KnowVA articles', error: 'skipped: the first 5 pages could not be read, so KnowVA has probably changed its address or layout' }); break; }
    const base = (state.articles[id] && state.articles[id].updated) || a.updated;
    try {
      await page.goto(KNOWVA.replace('{id}', id), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => /Updated\s+[A-Z][a-z]{2}/.test(document.body.innerText), null, { timeout: 30000 });
      const now = parseUpdated(await page.evaluate(() => document.body.innerText));
      if (!now) throw new Error('no "Updated" date found');
      if (now > base) changed.push({ kind: 'M21-1', id, cite: a.cite, name: a.name, was: base, now, url: KNOWVA.replace('{id}', id), topics: topicsFor(id) });
      ok++; state.articles[id] = { updated: now > base ? now : base, checked: new Date().toISOString().slice(0, 10) };
    } catch (e) { failed.push({ id, cite: a.cite, error: String(e.message || e).slice(0, 160) }); }
    await sleep(DELAY);
  }
  await browser.close();

  // 2. eCFR: the official versioner API lists every amendment date for a part.
  for (const { part, name } of src.ecfr || []) {
    try {
      const r = await fetch(ECFR.replace('{part}', part)); if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); const dates = (j.content_versions || []).map(v => v.amendment_date || v.date).filter(Boolean).sort();
      const now = dates[dates.length - 1]; if (!now) throw new Error('no versions returned');
      const base = state.ecfr[part];
      if (base && now > base) changed.push({ kind: 'eCFR', id: 'part-' + part, cite: '38 CFR Part ' + part, name, was: base, now, url: `https://www.ecfr.gov/current/title-38/chapter-I/part-${part}`, topics: Object.entries(src.ecfrTopics || {}).filter(([, p]) => p.includes(part)).map(([t]) => t) });
      state.ecfr[part] = now > (base || '') ? now : base;
    } catch (e) { failed.push({ id: 'part-' + part, cite: '38 CFR Part ' + part, error: String(e.message || e).slice(0, 160) }); }
  }

  await writeFile(new URL('state.json', DIR), JSON.stringify(state, null, 1) + '\n');
  const total = Object.keys(src.articles).length + (src.ecfr || []).length;
  let md = `Checked ${total} sources on ${new Date().toISOString().slice(0, 10)}.\n\n`;
  if (changed.length) md += `## Updated since VCI's version (${changed.length})\n\n| Source | Name | VCI version | Now | VCI topics |\n|---|---|---|---|---|\n` +
    changed.map(c => `| [${c.cite}](${c.url}) | ${c.name} | ${c.was || 'first check'} | **${c.now}** | ${c.topics.join(', ') || '—'} |`).join('\n') +
    `\n\n**Next steps:** open each source, copy the updated section, and send it for review. After the topic is revised, add an entry to \`VCI_UPDATES\` in \`src/sources.js\` (kind \`updated\`), update that article's \`updated\` date in \`VCI_SOURCES\`, rebuild, and upload. Until then you can add a \`pending\` entry so the app shows "Review pending."\n\n`;
  if (failed.length) md += `## Could not check (${failed.length})\n\nThe page may have moved, or KnowVA changed its layout. Open these by hand.\n\n` + failed.map(f => `- ${f.cite} (${f.id}): ${f.error}`).join('\n') + '\n';
  if (!changed.length && !failed.length) md += 'No changes found.\n';
  console.log(md);
  await writeFile(new URL('report.md', DIR), md);

  // 3. Open an issue only when there is something to act on.
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo } = process.env;
  if (token && repo && (changed.length || failed.length > total / 2)) {
    const title = changed.length ? `VA source updates found: ${changed.length} (${new Date().toISOString().slice(0, 10)})` : 'Source monitor could not read most pages';
    const r = await fetch(`https://api.github.com/repos/${repo}/issues`, { method: 'POST', headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }, body: JSON.stringify({ title, body: md, labels: ['source-update'] }) });
    console.log('Issue:', r.status);
  }
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main().catch(e => { console.error(e); process.exit(1); });
