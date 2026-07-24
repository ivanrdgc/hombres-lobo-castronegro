// TEMPORAL (se borra al terminar): capturas de Ávalon en móvil para la pasada de UI.
import { chromium } from 'playwright';
const BASE = process.env.BASE;
const OUT = process.env.OUT || '.';
const browser = await chromium.launch();
const pages = {};
async function mk(label) {
  const ctx = await browser.newContext({ locale: 'es-ES', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { window.__hlcTest = true; });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  x pageerror', label, e.message));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const g = window.__hlc.group?.game;
  return !g ? null : { phase: g.phase, playerIds: g.playerIds, names: g.names, roles: g.roles, leaderIdx: g.leaderIdx, quest: g.quest, results: g.results, voteTrack: g.voteTrack, team: g.team, seen: g.seen, winner: g.winner };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(200); }
  throw new Error('timeout: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const leaderPid = (st) => st.playerIds[st.leaderIdx % st.playerIds.length];
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); console.log('  shot', name); };
const EVIL = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'];

const GROUP = 'Shot ' + Date.now().toString(36).slice(-5);
const ana = await mk('ana');
await ana.goto(BASE + '/');
await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
const url = ana.url();
for (const n of ['Bea', 'Carlos', 'Diego', 'Eva']) {
  const p = await mk(n.toLowerCase());
  await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
  await p.waitForSelector('text=/Dispositivos/');
}
await ana.waitForSelector('text=Dispositivos (5)');
await ana.click('button[data-a=select-game][data-p=avalon]');
await ana.waitForSelector('[data-a=av-open-help]');
await ana.click('[data-a=open-start]');
await ana.waitForSelector('[data-a=av-start]:not([disabled])', { timeout: 15000 });
await ana.click('[data-a=av-start]');
let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
NAMES = st.names;
for (const pid of st.playerIds) {
  const p = pg(pid);
  await p.waitForSelector('[data-a=av-reveal]', { timeout: 15000 });
  await p.click('[data-a=av-reveal]');
  await p.waitForSelector('[data-a=av-seen]');
  await p.click('[data-a=av-seen]');
  await p.waitForTimeout(100);
}
st = await waitState(ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos confirman');
await pg(st.playerIds[0]).click('[data-a=av-begin]');
st = await waitState(ana, (s) => s.phase === 'propose', 'propuesta');
const goods = st.playerIds.filter((pid) => !EVIL.includes(st.roles[pid]));
const assassin = st.playerIds.find((pid) => st.roles[pid] === 'assassin');

let shots1 = false;
const t0 = Date.now();
while (Date.now() - t0 < 180000) {
  st = await hlc(ana);
  if (!st || st.phase === 'assassin' || st.phase === 'end') break;
  if (st.phase === 'propose') {
    const leader = leaderPid(st);
    const otherPid = st.playerIds.find((p) => p !== leader);
    await pg(leader).waitForSelector('[data-a=av-propose]');
    if (!shots1) {
      await shot(pg(leader), '1-propose-lider');
      await shot(pg(otherPid), '2-propose-espera');
    } else if (st.quest === 3) {
      await shot(pg(leader), '9-propose-con-historial');
    }
    const size = [2, 3, 2, 3, 3][st.quest - 1];
    const team = goods.slice(0, size);
    for (const pid of team) await pg(leader).click(`.player[data-a=av-sel][data-p="${pid}"]`);
    if (!shots1) { await pg(leader).locator('[data-a=av-ref]').click(); await shot(pg(leader), '3-propose-elegido-y-referencia'); shots1 = true; }
    await pg(leader).click('[data-a=av-propose]:not([disabled])');
    await waitState(ana, (s) => s.phase === 'vote', 'voto');
  } else if (st.phase === 'vote') {
    for (const pid of st.playerIds) { const p = pg(pid); if (await p.locator('[data-a=av-vote][data-p=si]').count()) await p.click('[data-a=av-vote][data-p=si]'); }
    await waitState(ana, (s) => s.phase !== 'vote', 'voto resuelto');
  } else if (st.phase === 'voteReveal') {
    await pg(st.playerIds[0]).click('[data-a=av-vote-continue]');
    await waitState(ana, (s) => s.phase !== 'voteReveal', 'tras destape');
  } else if (st.phase === 'quest') {
    for (const pid of st.team) { const p = pg(pid); await p.waitForSelector('[data-a=av-quest][data-p=ok]'); await p.click('[data-a=av-quest][data-p=ok]'); await p.waitForTimeout(80); }
    await waitState(ana, (s) => s.phase === 'result', 'resultado');
  } else if (st.phase === 'result') {
    if (st.quest === 1) { await pg(st.playerIds[0]).click('[data-a=av-quest-node][data-p="1"]'); await shot(pg(st.playerIds[0]), '8-resultado-y-ficha-mision'); await pg(st.playerIds[0]).click('[data-a=av-quest-node][data-p="1"]'); }
    await pg(st.playerIds[0]).click('[data-a=av-result-continue]');
    await waitState(ana, (s) => s.phase !== 'result', 'tras resultado');
  }
  await ana.waitForTimeout(150);
}
st = await waitState(ana, (s) => s.phase === 'assassin' || s.phase === 'end', 'fase del asesino');
if (st.phase === 'assassin') {
  const ap = pg(assassin);
  await ap.waitForSelector('[data-a=av-assassinate]');
  await shot(ap, '10-asesino');
}
await browser.close();
console.log('listo');
