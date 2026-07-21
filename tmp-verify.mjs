import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
await page.waitForTimeout(8000);

for (const i of [0, 2, 3, 4]) {
  await page.evaluate((n) => window.scrollTo(0, window.innerHeight * n), i);
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${OUT}/karta-${i}.png` });
}

// Overflow treści przy większych fontach — sprawdź każdą sekcję.
const clipped = await page.evaluate(() =>
  [...document.querySelectorAll('.helix-panel')].map((p) => ({
    id: p.id || p.className.split(' ')[0],
    clipped: p.scrollHeight > p.clientHeight + 2,
  })),
);
console.log('overflow:', JSON.stringify(clipped));
console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors) : 'none');
await browser.close();
