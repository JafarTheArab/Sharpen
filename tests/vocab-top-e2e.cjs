// Word Power at level 10: expert words and every question kind, including typing. Server on 8766 first.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/out'; fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.addInitScript(() => localStorage.setItem('sharpen.v1', JSON.stringify({ v: 1, games: { vocab: { level: 10, history: [], last: null } } })));
  await p.goto(process.env.URL || 'http://localhost:8766/');
  await p.click('.skill:has-text("Vocabulary")'); await p.click('#go');
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    await p.waitForSelector('.choice, .type-in');
    const ask = await p.textContent('.ask');
    const kind = Object.entries({ meaning: 'mean?', blank: 'fits', reverse: 'means this?', spell: 'spelling', type: 'Type' }).find(([, t]) => ask.includes(t))[0];
    if (!seen.has(kind)) await p.screenshot({ path: `${OUT}/v10-${kind}.png` });
    if (kind === 'type') {
      await p.fill('.type-in', i % 2 ? 'wrongword' : 'x');
      await p.click('.typed .btn.primary');
    } else {
      await (await p.$$('.choice'))[i % 4].click();
    }
    if (!seen.has(kind)) await p.screenshot({ path: `${OUT}/v10-${kind}-answered.png` });
    seen.add(kind);
    await p.click('.play > .btn.primary.wide');
  }
  await p.waitForSelector('.result .score');
  console.log('kinds seen:', [...seen].join(', '));
  await b.close();
  if (errs.length) { console.error(errs); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
