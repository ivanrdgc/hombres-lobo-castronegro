// E2E de «Skull»: 3 jugadores (Ana narra y juega). God-view (el doc tiene las
// pilas ocultas): catálogo → empezar → colocación de salida → apuesta y pujas →
// revelado (flor a flor) → dos retos → victoria. Cubre los DOS caminos: el reto
// ganado y el fallado (subida de apuesta, calavera y pérdida de disco).
// Verifica también la FUGA: solo ves tu propia pila.
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
    stacks: g.stacks, inv: g.inv, marks: g.marks, alive: g.alive, winner: g.winner,
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

// Pasar es irreversible: la interfaz pide un segundo toque (B25/B26).
async function pass(pid, timeout = 15000) {
  await pg(pid).click('[data-a=sk-pass-ask]', { timeout });
  await pg(pid).click('[data-a=sk-pass]', { timeout });
}

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
    await pass(bidder);
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
    await pass(b);
    s = await waitState(ana, (x) => x.phase !== 'bid' || x.turn !== b, 'pasa');
  }
  s = await waitState(ana, (x) => x.phase === 'reveal', 'revelar');
  await pg(starter).click(`[data-a=sk-flip][data-p="${starter}"]`);
  s = await waitState(ana, (x) => x.phase === 'roundEnd', 'primer reto ganado');
  check(s.marks[starter] === 1, 'el reto suma una marca');
  ok('turno 1: apuesta, pujas, revelado y marca');

  // ——— Ronda 2: el camino AMARGO (subir la apuesta, calavera y perder disco) ———
  await pg(starter).click('[data-a=sk-next-round]');
  s = await waitState(ana, (x) => x.phase === 'setup' && x.round === 2, 'ronda 2');
  check(s.starter === starter, 'la ronda siguiente la empieza quien ganó el reto');
  // Esta vez el jugador siguiente al inicial siembra su CALAVERA; los demás, flores.
  const skullPid = s.playerIds[(s.playerIds.indexOf(starter) + 1) % s.playerIds.length];
  for (const pid of s.playerIds) {
    await pg(pid).click(pid === skullPid ? '[data-a=sk-place-skull]' : '[data-a=sk-place-flower]', { timeout: 15000 });
    await waitState(ana, (x) => (x.stacks[pid] || []).length >= 1, `${NAMES[pid]} coloca`);
  }
  s = await waitState(ana, (x) => x.phase === 'play', 'turno del inicial (ronda 2)');
  await pg(starter).click('[data-a=sk-bid-num][data-p="1"]').catch(() => {});
  await pg(starter).click('[data-a=sk-bid-open]');
  s = await waitState(ana, (x) => x.phase === 'bid', 'apuesta 1 abierta');
  // El siguiente SUBE a 2 y el tercero pasa (se ve en el tablero quién pasó).
  const raiser = s.turn;
  await pg(raiser).click('[data-a=sk-raise-num][data-p="2"]');
  await pg(raiser).click('[data-a=sk-raise]');
  s = await waitState(ana, (x) => x.bid?.n === 2, 'sube la apuesta a 2');
  check(s.bid.by === raiser, 'subir la apuesta cambia de apostador');
  const passer = s.turn;
  // Lo público de la puja, en pantalla (B25/B26): tope, apuesta y quién sigue.
  const facts = await pg(passer).locator('.skfacts').innerText().catch(() => '');
  check(/Discos en la mesa/.test(facts) && /Siguen en la subasta/.test(facts) && /Ya han pasado/.test(facts),
    'la puja enseña discos en la mesa (tope), apuesta a batir y quién sigue vivo en la subasta');
  const row0 = await pg(passer).locator('.skrow').first().innerText().catch(() => '');
  check(/en la mesa/.test(row0) && /✋/.test(row0), 'cada fila del tablero dice la altura de la pila y los discos en mano');
  // Pasar pide un segundo toque y se puede echar atrás: primero lo cancelamos.
  await pg(passer).click('[data-a=sk-pass-ask]');
  await pg(passer).waitForSelector('[data-a=sk-pass-cancel]', { timeout: 8000 });
  await pg(passer).click('[data-a=sk-pass-cancel]');
  check(!(await st()).passed[passer], 'cancelar la confirmación NO te saca de la subasta');
  await pass(passer);
  s = await waitState(ana, (x) => !!x.passed[passer], 'el tercero pasa');
  const passChip = await pg(starter).waitForSelector(`[data-a=sk-passed][data-p="${passer}"]`, { timeout: 8000 }).catch(() => null);
  check(!!passChip, 'el tablero marca con «🤐 pasó» a quien ya ha pasado');
  // Le vuelve el turno al inicial: sube al TOPE (3 discos) y se revela sin más pujas.
  s = await waitState(ana, (x) => x.turn === starter && x.phase === 'bid', 'turno de puja del inicial');
  await pg(starter).click('[data-a=sk-raise-num][data-p="3"]');
  await pg(starter).click('[data-a=sk-raise]');
  s = await waitState(ana, (x) => x.phase === 'reveal', 'apostar al tope revela sin más pujas');
  check(s.reveal.by === starter, 'quien pujó al tope es quien se la juega');
  // Levanta la suya (flor) y sigue por la pila con la calavera: falla.
  await pg(starter).click(`[data-a=sk-flip][data-p="${starter}"]`);
  await waitState(ana, (x) => (x.reveal?.flipped || []).length >= 1, 'levanta su propia flor');
  await pg(starter).click(`[data-a=sk-flip][data-p="${skullPid}"]`);
  s = await waitState(ana, (x) => x.phase === 'roundEnd', 'reto fallado');
  check(s.lastResult?.success === false, 'topar una calavera falla el reto');
  check(s.inv[starter].flowers + s.inv[starter].skulls === 3, 'quien falla pierde un disco (de 4 a 3)');
  check(s.starter === starter, 'tras fallar, empieza la ronda quien perdió el disco');
  // El 🎴 debe abrirse aunque la pila siga en la mesa con el inventario ya bajado.
  await pg(starter).click('[data-a=open-mycard]');
  await pg(starter).waitForSelector('text=/Tus discos/');
  await pg(starter).click('.modal [data-a=close-modal]');
  ok('ronda 2: subida de apuesta, calavera, pérdida de disco y 🎴 sano');

  // ——— Ronda 3: gana el segundo reto y la partida ———
  await pg(starter).click('[data-a=sk-next-round]');
  const r2 = await winARound();
  s = r2.s;
  check(s.phase === 'end' && s.winner === r2.starter, 'dos retos → gana la partida');
  check(s.marks[r2.starter] >= 2, 'el ganador acumuló dos retos');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Skull');

  // Limpieza (y de paso, el rescate «🪑 La mesa» del menú ⋯).
  await ana.click('[data-a=game-menu]');
  check(await ana.locator('[data-a=table-open]').count() === 1, 'el menú ⋯ ofrece «🪑 La mesa»');
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
