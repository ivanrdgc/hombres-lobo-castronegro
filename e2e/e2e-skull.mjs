// E2E de «Skull»: 3 jugadores (Ana narra y juega). God-view (el doc tiene las
// pilas ocultas): catálogo → empezar → colocación de salida → apuesta y pujas →
// revelado (flor a flor) → dos retos → victoria. Verifica también la FUGA: solo
// ves tu propia pila.
import { chromium } from 'playwright';
const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const check = (c, m) => (c ? ok(m) : bad(m));
const browser = await chromium.launch();
const pages = {};
async function mk(label) {
  const ctx = await browser.newContext({ locale: 'es-ES' });
  await ctx.addInitScript(() => { window.__hlcTest = true; });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] ${e.message}`));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const g = window.__hlc.group?.game;
  return !g ? null : {
    phase: g.phase, round: g.round, playerIds: g.playerIds, names: g.names,
    turn: g.turn, starter: g.starter, bid: g.bid, passed: g.passed, reveal: g.reveal,
    stacks: g.stacks, marks: g.marks, alive: g.alive, winner: g.winner,
    lastResult: g.lastResult, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(120); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, turn: last.turn, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);

// Coloca la salida de todos con FLORES (así el revelado propio siempre acierta).
async function placeAllFlowers(s) {
  for (const pid of s.playerIds) {
    if (!s.alive[pid]) continue;
    await pg(pid).click('[data-a=sk-place-flower]', { timeout: 15000 });
    await waitState(pages.ana, (x) => (x.stacks[pid] || []).length >= 1, `${NAMES[pid]} coloca`);
  }
}

// Una ronda completa donde el jugador inicial gana el reto: apuesta 1, todos
// pasan, levanta su propia flor. Devuelve el estado tras la ronda.
async function winARound() {
  let s = await waitState(pages.ana, (x) => x.phase === 'setup', 'colocación');
  await placeAllFlowers(s);
  s = await waitState(pages.ana, (x) => x.phase === 'play', 'turno del inicial');
  const starter = s.turn;
  // El inicial apuesta 1 (botón número 1 + apostar).
  await pg(starter).click('[data-a=sk-bid-num][data-p="1"]', { timeout: 15000 }).catch(() => {});
  await pg(starter).click('[data-a=sk-bid-open]');
  s = await waitState(pages.ana, (x) => x.phase === 'bid' || x.phase === 'reveal', 'apuesta abierta');
  // Los demás pasan (si hay fase de puja).
  for (let i = 0; i < 4 && s.phase === 'bid'; i++) {
    s = await st();
    if (s.phase !== 'bid') break;
    const bidder = s.turn;
    await pg(bidder).click('[data-a=sk-pass]', { timeout: 15000 });
    s = await waitState(pages.ana, (x) => x.turn !== bidder || x.phase !== 'bid', 'pasa la puja');
  }
  s = await waitState(pages.ana, (x) => x.phase === 'reveal', 'a revelar');
  check(s.reveal.by === starter, 'quien apostó (nadie subió) es quien revela');
  // Levanta su propia flor (apostó 1): botón sk-flip sobre su pila.
  await pg(starter).click(`[data-a=sk-flip][data-p="${starter}"]`, { timeout: 15000 });
  s = await waitState(pages.ana, (x) => x.phase === 'roundEnd' || x.phase === 'end', 'reto resuelto');
  check(s.lastResult?.success === true, 'levanta una flor y gana el reto');
  return { s, starter };
}

try {
  const GROUP = 'SK ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (3)');

  await ana.click('button[data-a=select-game][data-p=skull]');
  await ana.waitForSelector('[data-a=sk-open-help]');
  ok('el catálogo ofrece Skull y su lobby carga');
  await ana.click('[data-a=sk-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=sk-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=sk-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=sk-start]');

  let s = await waitState(ana, (x) => x.phase === 'setup', 'colocación de salida');
  NAMES = s.names;
  check(s.playerIds.length === 3, '3 jugadores');

  // ——— Fuga: solo ves tu propia pila ———
  await placeAllFlowers(s);
  s = await waitState(ana, (x) => x.phase === 'play', 'todos han colocado');
  const someone = s.playerIds[1];
  const ownFaces = await pg(someone).evaluate(() =>
    [...document.querySelectorAll('.skrow')].map((r) => [...r.querySelectorAll('.skdisc')].map((d) => d.textContent.trim())));
  // La fila propia muestra 🌸/💀; las ajenas, dorsos 🎴. Al menos una fila con dorso.
  check(ownFaces.some((row) => row.some((c) => c === '🎴')), 'las pilas ajenas se ven tapadas (🎴)');
  check(ownFaces.some((row) => row.some((c) => c === '🌸' || c === '💀')), 'la pila propia se ve destapada');

  // ——— Turno 1: el inicial gana un reto (apuesta 1, pasan, levanta su flor) ———
  const starter = s.turn;
  await pg(starter).click('[data-a=sk-bid-num][data-p="1"]').catch(() => {});
  await pg(starter).click('[data-a=sk-bid-open]');
  s = await waitState(ana, (x) => x.phase === 'bid' || x.phase === 'reveal', 'apuesta 1 abierta');
  for (let i = 0; i < 4 && s.phase === 'bid'; i++) {
    s = await st();
    if (s.phase !== 'bid') break;
    const b = s.turn;
    await pg(b).click('[data-a=sk-pass]');
    s = await waitState(ana, (x) => x.phase !== 'bid' || x.turn !== b, 'pasa');
  }
  s = await waitState(ana, (x) => x.phase === 'reveal', 'revelar');
  await pg(starter).click(`[data-a=sk-flip][data-p="${starter}"]`);
  s = await waitState(ana, (x) => x.phase === 'roundEnd', 'primer reto ganado');
  check(s.marks[starter] === 1, 'el reto suma una marca');
  ok('turno 1: apuesta, pujas, revelado y marca');

  // ——— Segunda ronda: gana el segundo reto y la partida ———
  await pg(starter).click('[data-a=sk-next-round]');
  const r2 = await winARound();
  s = r2.s;
  check(s.phase === 'end' && s.winner === r2.starter, 'dos retos → gana la partida');
  check(s.marks[r2.starter] >= 2, 'el ganador acumuló dos retos');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Skull');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=sk-end-open]');
  await ana.waitForSelector('[data-a=sk-end-confirm]');
  await ana.click('[data-a=sk-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Skull');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failsk-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-skull con ${fail} fallos` : '\n✔ E2E-skull OK');
process.exit(fail ? 1 : 0);
