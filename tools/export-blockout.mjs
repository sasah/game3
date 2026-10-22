// Renders a blockout page headlessly and saves its guide and depth images.
// Usage: node tools/export-blockout.mjs <url> <outDir>
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const [url, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__export, null, { timeout: 180000 });
const out = await page.evaluate(() => window.__export);
for (const [name, dataUrl] of Object.entries(out)) {
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', `${outDir}/${name}.png`);
}
await browser.close();
