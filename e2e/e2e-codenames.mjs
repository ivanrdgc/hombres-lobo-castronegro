// E2E de «Codenames»: 4 jugadores (2 equipos, Ana narra y juega). God-view (el
// doc tiene el mapa secreto): catálogo → empezar → el Jefe da pista, el agente
// toca casillas → cambio de turno al pasar → el otro equipo destapa las suyas y
// gana. Verifica además la FUGA: el agente NO ve el mapa; el Jefe sí.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, teams: g.teams,
    spymaster: g.spymaster, map: g.map, revealed: g.revealed, starting: g.starting, turn: g.turn,
    clue: g.clue, guessesLeft: g.guessesLeft, remaining: g.remaining,
    winner: g.winner, scores: g.scores, log: (g.log || []).map((l) => l.txt),
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
const other = (t) => (t === 'red' ? 'blue' : 'red');
const agentOf = (s, team) => s.playerIds.find((pid) => s.teams[pid] === team && s.spymaster[team] !== pid);
const spyColoredCells = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.cncell')].filter((c) => /\bspy\b/.test(c.className)).length);

async function giveClue(spy, num) {
  const p = pg(spy);
  await p.click(`[data-a=cn-clue-num][data-p="${num}"]`, { timeout: 15000 });
  await p.click('[data-a=cn-clue-give]');
}
async function touch(agent, cell) {
  await pg(agent).click(`.cncell[data-a=cn-cell][data-p="${cell}"]`, { timeout: 15000 });
}

try {
  const GROUP = 'CN ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=codenames]');
  await ana.waitForSelector('[data-a=cn-open-help]');
  ok('el catálogo ofrece Codenames y su lobby carga');
  await ana.click('[data-a=cn-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=cn-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=cn-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=cn-start]');

  let s = await waitState(ana, (x) => x.phase === 'clue', 'primera pista');
  NAMES = s.names;
  check(s.playerIds.length === 4, '4 jugadores');
  check(s.map.filter((c) => c === 'assassin').length === 1 && s.map.filter((c) => c === 'neutral').length === 7, 'mapa con 1 asesino y 7 neutrales');
  check(s.remaining[s.starting] === 9 && s.remaining[other(s.starting)] === 8, 'el equipo inicial tiene 9 casillas y el otro 8');

  // ——— Fuga: el agente NO ve el mapa; el Jefe sí ———
  const teamA = s.turn;
  const spyA = s.spymaster[teamA];
  const agentA = agentOf(s, teamA);
  check(await pg(spyA).locator('[data-a=cn-clue-give]').count() === 1, `solo el Jefe (${NAMES[spyA]}) da la pista`);
  check(await pg(agentA).locator('[data-a=cn-clue-give]').count() === 0, 'un agente no puede dar la pista');
  check(await spyColoredCells(pg(spyA)) > 0, 'el Jefe SÍ ve el mapa (casillas coloreadas sin destapar)');
  check(await spyColoredCells(pg(agentA)) === 0, 'el agente NO ve el mapa (ninguna casilla coloreada sin destapar)');

  // ——— Turno 1: acierto propio y pase ———
  await giveClue(spyA, 9);
  s = await waitState(ana, (x) => x.phase === 'guess' && x.turn === teamA, 'el equipo A puede tocar');
  check(s.clue?.num === 9 && s.guessesLeft === 10, 'la pista fija número + 1 intentos');
  // Regla oficial: no se puede pasar sin haber tocado al menos una vez.
  check(await pg(agentA).locator('[data-a=cn-pass][disabled]').count() === 1, 'antes del primer toque, «Pasar» está deshabilitado');
  const ownA = s.map.findIndex((c, i) => c === teamA && !s.revealed[i]);
  await touch(agentA, ownA);
  s = await waitState(ana, (x) => x.revealed[ownA], 'se destapa la casilla propia');
  check(s.turn === teamA, 'acertar una propia deja seguir en el mismo turno');
  await pg(agentA).click('[data-a=cn-pass]');
  s = await waitState(ana, (x) => x.turn === other(teamA) && x.phase === 'clue', 'pasar cede el turno');
  ok('acierto propio + pase: el turno cambia de equipo');

  // ——— Turno 2: el equipo B destapa todas las suyas y gana ———
  const teamB = other(teamA);
  const spyB = s.spymaster[teamB];
  const agentB = agentOf(s, teamB);
  await giveClue(spyB, 9);
  s = await waitState(ana, (x) => x.phase === 'guess' && x.turn === teamB, 'el equipo B puede tocar');
  for (let guard = 0; guard < 12; guard++) {
    s = await st();
    if (s.phase === 'end') break;
    const own = s.map.findIndex((c, i) => c === teamB && !s.revealed[i]);
    if (own < 0) break;
    const before = s.revealed.filter(Boolean).length;
    await touch(agentB, own);
    s = await waitState(ana, (x) => x.revealed.filter(Boolean).length > before || x.phase === 'end', 'se destapa otra casilla');
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(s.winner === teamB, `gana el equipo B (${teamB}) al destapar todas sus casillas`);
  check(s.playerIds.filter((pid) => s.teams[pid] === teamB).every((pid) => s.scores[pid] === 1), 'todo el equipo ganador suma 1 punto');
  check(s.log.some((t) => /Gana el equipo/.test(t)), 'la voz anuncia el ganador');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Codenames');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=cn-end-open]');
  await ana.waitForSelector('[data-a=cn-end-confirm]');
  await ana.click('[data-a=cn-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Codenames');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failcn-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-codenames con ${fail} fallos` : '\n✔ E2E-codenames OK');
process.exit(fail ? 1 : 0);
