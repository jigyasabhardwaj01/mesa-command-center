// Phase 0: open Nexus in a headed browser so the USER logs in by hand.
// Read-only: this script never fills credentials or submits anything.
// It records request metadata (no bodies, no headers, no cookies) to help identify the platform.
import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.NEXUS_BASE_URL!;
const statePath = process.env.NEXUS_STORAGE_STATE_PATH || './.auth/nexus-state.json';
const doneFlag = './.auth/done';
fs.mkdirSync('./.auth', { recursive: true });
fs.rmSync(doneFlag, { force: true });

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const log: string[] = [];
ctx.on('response', (r) => {
  const req = r.request();
  log.push(JSON.stringify({ m: req.method(), s: r.status(), t: req.resourceType(), ct: r.headers()['content-type'], u: r.url().split('?')[0] }));
});
await page.goto(base);
console.log('BROWSER OPEN: log in manually, then create ./.auth/done');
while (!fs.existsSync(doneFlag)) {
  await new Promise((r) => setTimeout(r, 1000));
  fs.writeFileSync('./.auth/network-log.jsonl', log.join('\n'));
}
await ctx.storageState({ path: statePath });
fs.chmodSync(statePath, 0o600);
console.log('SESSION SAVED');
await browser.close();
