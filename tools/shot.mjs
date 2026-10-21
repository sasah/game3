// Headless screenshot of a prototype page.
// Usage: node tools/shot.mjs <url> <out.png> [width] [height] [timeoutMs]
// The page should set window.__shotReady = true when a frame is ready (prototypes do with ?shot=1).
import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const root = execSync('npm root -g').toString().trim();
const { chromium } = require(root + '/playwright');

const [url, out, w = '960', h = '540', timeout = '180000'] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: Number(timeout), polling: 250 });
} catch (e) {
  logs.push('[shot] timed out waiting for __shotReady');
}
await page.screenshot({ path: out });
const stats = await page.evaluate(() => window.__stats || null);
if (stats) logs.push('[stats] ' + JSON.stringify(stats));
console.log(`[shot] ${out} in ${Date.now() - t0} ms`);
console.log(logs.join('\n'));
await browser.close();
