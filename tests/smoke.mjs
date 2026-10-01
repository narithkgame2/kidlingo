// Smoke test: opens dist/kidlingo.html in Chromium and clicks through every screen.
// npm i -D playwright && npx playwright install chromium && node tests/smoke.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const page_url = 'file://' + fileURLToPath(new URL('../dist/kidlingo.html', import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 400, height: 820 } });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(page_url);
const back = () => p.click('#homeBtn');
// words lesson + audio
await p.click('[data-go=themes]'); await p.click('[data-arg=animals]');
await p.click('#lc'); await p.waitForTimeout(250);
const audio = await p.evaluate(() => ({ clips: Object.keys(CLIPS).length, playing: !player.paused, err: lastErr }));
if (!audio.clips || !audio.playing) errors.push('audio did not play: ' + JSON.stringify(audio));
await p.click('#qm'); await p.click('#nx'); await back();
// phrases
await back(); await p.click('[data-go=phrases]'); await p.click('[data-arg=ie]'); await back(); await back();
// tracing, both scripts
await p.click('[data-go=kana]'); await p.click('[data-k=あ]'); await back();
await p.click('[data-s=kata]'); await p.click('[data-k=ネ]'); await back(); await back();
// stickers + parent mode (solve the gate)
await p.click('[data-go=stickers]'); await back();
await p.click('#lockBtn');
const q = await p.textContent('.gate-q'); const [a, bb] = q.match(/\d+/g).map(Number);
await p.fill('#gateIn', String(a * bb)); await p.click('#gOK');
await p.waitForSelector('.parent');
await b.close();
if (errors.length) { console.error('FAIL', errors); process.exit(1); }
console.log('OK', audio);
