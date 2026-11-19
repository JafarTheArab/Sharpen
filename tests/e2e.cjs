// Plays a full daily workout in a phone-sized Chromium. Serve the folder first:
//   python3 -m http.server 8766   then   node tests/e2e.cjs
// Screenshots go to tests/out/.
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://localhost:8766/';
const OUT = __dirname + '/out';
fs.mkdirSync(OUT, { recursive: true });
const AREA = { 'Word Power': 'Vocabulary', 'Mental Math': 'Quick Math', 'List Recall': 'Memory', 'Clear Writing': 'Writing' };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  await page.clock.install(); // fast-forward the math timer and study time
  await page.goto(URL);
  await page.waitForSelector('#startWorkout');
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await shot('1-home');

  const seen = [];
  for (let g = 0; g < 3; g++) {
    await page.click(g === 0 ? '#startWorkout' : '#next');
    await page.waitForSelector('#go');
    const name = await page.textContent('.intro h1');
    if (!seen.length) await shot('2-intro');
    seen.push(name);
    await page.click('#go');
    await playGame(page, name, shot);
    await shot(`4-result-${name.replace(/\s/g, '')}`);
    console.log(`${name}: ${await page.textContent('.result .score')} (${await page.textContent('.result .summary')})`);
  }
  await page.click('#next'); // Finish workout
  await page.waitForSelector('.done-card');
  await shot('5-done');
  const streakText = await page.textContent('.done-card .streak');
  if (!/1 day/.test(streakText)) throw new Error('streak should be 1: ' + streakText);
  await page.click('#home');
  await page.waitForSelector('.done-note');
  await shot('6-home-done');

  // Extra practice on the game not in today's workout, then quit midway
  const extra = Object.keys(AREA).find((n) => !seen.includes(n));
  await page.click(`.skill:has-text("${AREA[extra]}")`);
  await page.click('#go');
  await page.click('.close');
  await page.waitForSelector('.done-note');

  // Reload keeps progress
  await page.reload();
  await page.waitForSelector('.done-note');

  // Landscape
  await page.setViewportSize({ width: 844, height: 390 });
  await page.click('.skill:has-text("Quick Math")');
  await page.click('#go');
  await page.waitForSelector('.math-q');
  await shot('7-landscape-math');
  await playGame(page, 'Mental Math', () => {});
  await shot('8-result-math-landscape');
  console.log(`Mental Math: ${await page.textContent('.result .score')} (${await page.textContent('.result .summary')})`);

  await browser.close();
  if (errors.length) { console.error('Page errors:', errors); process.exit(1); }
  console.log('Played:', seen.join(', '), '\nE2E passed. Screenshots in tests/out/');
})().catch((e) => { console.error(e); process.exit(1); });

async function playGame(page, name, shot) {
  let shotTaken = false;
  for (let step = 0; step < 300; step++) {
    if (await page.$('.result .score')) return;
    if (name === 'Mental Math') {
      if (await page.$('.choice:not([disabled])')) {
        const q = await page.textContent('.math-q');
        if (!shotTaken) { await shot('3-play-math'); shotTaken = true; }
        const btns = await page.$$('.choice');
        await btns[step % 5 === 4 ? await wrongIndex(page, q) : await rightIndex(page, q)].click();
      }
      await page.clock.runFor(1000);
      continue;
    }
    if (name === 'List Recall') {
      await page.waitForSelector('.tiles.study, .result .score');
      if (await page.$('.result .score')) return;
      const words = await page.$$eval('.tiles.study .tile', (t) => t.map((x) => x.textContent));
      if (!shotTaken) await shot('3-play-memory-study');
      await page.clock.runFor(30000);
      await page.waitForSelector('.tile.pick');
      const pick = step % 2 ? words : words.slice(1);
      for (const w of pick) await page.click(`.tile.pick:text-is("${w}")`);
      if (pick.length < words.length) await page.click('.tile.pick:not(.on)');
      if (!shotTaken) { await shot('3-play-memory-recall'); shotTaken = true; }
      await page.click('.btn.primary.wide');
      continue;
    }
    // Word Power / Clear Writing
    await page.waitForSelector('.choice, .result .score');
    if (await page.$('.result .score')) return;
    const btns = await page.$$('.choice');
    await btns[step % btns.length].click();
    if (!shotTaken) { await shot(`3-play-${name.replace(/\s/g, '')}`); shotTaken = true; }
    await page.click('.btn.primary.wide');
  }
  throw new Error('game did not finish: ' + name);
}

const solve = (page, q) => page.evaluate((q) => {
  const opts = [...document.querySelectorAll('.choice')].map((b) => b.textContent);
  const n = (s) => Number(s.replace(/[$,%]/g, ''));
  let m, v;
  if ((m = q.match(/^(\d+) \+ (\d+)$/))) v = +m[1] + +m[2];
  else if ((m = q.match(/^(\d+) − (\d+)$/))) v = m[1] - m[2];
  else if ((m = q.match(/^(\d+) × (\d+)$/))) v = m[1] * m[2];
  else if ((m = q.match(/^(\d+) ÷ (\d+)$/))) v = m[1] / m[2];
  else if ((m = q.match(/^(\d+)% of (\d+)$/))) v = (m[1] * m[2]) / 100;
  else if ((m = q.match(/^Half of (\d+)$/))) v = m[1] / 2;
  else if ((m = q.match(/^(\d+)% tip on a \$(\d+) bill$/))) v = (m[1] * m[2]) / 100;
  else if ((m = q.match(/^\$(\d+) item, (\d+)% off/))) v = (m[1] * (100 - m[2])) / 100;
  else if ((m = q.match(/^\$(\d+) split (\d+) ways$/))) v = m[1] / m[2];
  else if ((m = q.match(/^From (\d+) to (\d+) is/))) v = (Math.abs(m[2] - m[1]) / m[1]) * 100;
  const i = opts.findIndex((o) => Math.abs(n(o) - v) < 0.001);
  if (i < 0) throw new Error('No right answer shown for ' + q + ' among ' + opts.join(' | '));
  return i;
}, q);
const rightIndex = solve;
const wrongIndex = async (page, q) => ((await solve(page, q)) + 1) % 4;
