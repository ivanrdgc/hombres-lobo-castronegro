// E2E de «El Camaleón»: 4 jugadores (Ana narra y juega). Verifica de punta a
// punta: catálogo → reparto (rejilla pública + palabra secreta a todos menos al
// Camaleón) → pistas → voto secreto que la app destapa → dos desenlaces:
// ronda 1, pillan al Camaleón y FALLA la palabra → gana el grupo; ronda 2, la
// mesa señala a un inocente → el Camaleón ESCAPA y gana.
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
    phase: g.phase, round: g.round, playerIds: g.playerIds, names: g.names, grid: g.grid, secret: g.secret,
    chameleonId: g.chameleonId, seen: g.seen, votes: g.votes, accusedId: g.accusedId, caught: g.caught,
    guess: g.guess, winner: g.winner, scores: g.scores,
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(200); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, winner: last.winner, accused: last.accusedId }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];

async function revealAll(st) {
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=ch-reveal]', { timeout: 15000 });
    await p.click('[data-a=ch-reveal]');
    await p.waitForSelector('[data-a=ch-seen]');
    await p.click('[data-a=ch-seen]');
    await p.waitForTimeout(120);
  }
  await waitState(pages.ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos ven su carta');
  await pg(st.playerIds[0]).click('[data-a=ch-begin]');
  await waitState(pages.ana, (s) => s.phase === 'clue', 'fase de pistas');
  await pg(st.playerIds[0]).click('[data-a=ch-start-vote]');
  await waitState(pages.ana, (s) => s.phase === 'vote', 'fase de voto');
}
// Cada votante señala a `pick(pid)`; selecciona el chip y confirma.
async function voteAll(st, pick) {
  for (const pid of st.playerIds) {
    const target = pick(pid);
    const p = pg(pid);
    await p.waitForSelector(`.player[data-a=ch-vote][data-p="${target}"]`, { timeout: 15000 });
    await p.click(`.player[data-a=ch-vote][data-p="${target}"]`);
    await p.click('[data-a=ch-vote-confirm]:not([disabled])');
    await p.waitForTimeout(120);
  }
}

try {
  const GROUP = 'Cam ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos', 'David']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (4)');

  await ana.click('button[data-a=select-game][data-p=chameleon]');
  await ana.waitForSelector('[data-a=ch-open-help]');
  ok('el catálogo ofrece El Camaleón y su lobby carga');
  await ana.click('[data-a=ch-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=ch-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=ch-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=ch-start]');

  // ——— Ronda 1: pillan al Camaleón y FALLA → gana el grupo ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  NAMES = st.names;
  check(st.playerIds.length === 4 && st.grid.length === 16, '4 jugadores y rejilla de 16 palabras');
  check(st.playerIds.includes(st.chameleonId), 'hay un Camaleón repartido');
  console.log('  camaleón:', st.chameleonId, '· secreta:', st.grid[st.secret]);
  await revealAll(st);
  // Todos los NO-camaleón votan al Camaleón; el Camaleón vota a otro.
  await voteAll(st, (pid) => (pid === st.chameleonId ? st.playerIds.find((x) => x !== pid) : st.chameleonId));
  st = await waitState(ana, (s) => s.phase === 'guess' || s.phase === 'end', 'voto resuelto');
  check(st.caught === true && st.phase === 'guess', 'la mesa PILLA al Camaleón → pasa a adivinar');
  // El Camaleón falla la palabra a propósito (elige una casilla distinta).
  const wrong = (st.secret + 1) % 16;
  const cp = pg(st.chameleonId);
  await cp.waitForSelector(`.cell[data-a=ch-cell][data-p="${wrong}"]:not([disabled])`, { timeout: 15000 });
  await cp.click(`.cell[data-a=ch-cell][data-p="${wrong}"]`);
  await cp.click('[data-a=ch-guess-confirm]:not([disabled])');
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 1');
  check(st.winner === 'group', 'pillado y fallando la palabra → gana el grupo');
  check(st.playerIds.filter((p) => p !== st.chameleonId).every((p) => st.scores[p] === 1), 'cada jugador del grupo suma 1');
  await ana.waitForSelector('text=/Marcador/');
  ok('el final destapa la palabra secreta y el marcador');

  // ——— Ronda 2: señalan a un inocente → el Camaleón ESCAPA ———
  await pg(st.playerIds[0]).click('[data-a=ch-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 2, 'ronda 2 repartida');
  NAMES = st.names;
  const scapegoat = st.playerIds.find((p) => p !== st.chameleonId);
  await revealAll(st);
  await voteAll(st, (pid) => (pid === scapegoat ? st.chameleonId : scapegoat));
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 2');
  check(st.accusedId === scapegoat && st.winner === 'chameleon', 'señalan a un inocente → el Camaleón escapa y gana');
  ok('partida completa de El Camaleón (dos desenlaces)');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=ch-end-open]');
  await ana.waitForSelector('[data-a=ch-end-confirm]');
  await ana.click('[data-a=ch-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de El Camaleón');
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=/Dispositivos/');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _l = await _p.waitForSelector('[data-a=leave]', { timeout: 9000 }).catch(() => null); if (_l) { await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failcam-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-chameleon con ${fail} fallos` : '\n✔ E2E-chameleon OK');
process.exit(fail ? 1 : 0);
