// E2E de «Two Rooms and a Boom»: 6 jugadores (Ana narra y juega; rondas de
// 3/2/1 min → 12/8/4 s en modo test). Verifica de punta a punta por la UI real
// + Firestore: catálogo → reparto (bandos+roles secretos, dos salas) → tres
// rondas contrarreloj → voto de rehén de cada sala e intercambio → desenlace
// (¿acabó el Bombardero junto al Presidente?). La secrecía es solo de UI: el
// doc tiene bandos y roles, así que el test (god-view) valida el dictamen final.
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
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, playerIds: g.playerIds,
    names: g.names, teams: g.teams, roles: g.roles, room: g.room, seen: g.seen,
    hVotes: g.hVotes || {}, pick: g.pick, winner: g.winner, scores: g.scores,
    logLen: (g.log || []).length, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(150); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, round: last.round, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);
const membersOf = (s, r) => s.playerIds.filter((pid) => s.room[pid] === r);
const sig = (s) => `${s.phase}|${s.round}|${s.logLen}|${Object.keys(s.hVotes).length}`;
const roleId = (s, role) => s.playerIds.find((pid) => s.roles[pid] === role);

async function voteHostages() {
  for (let i = 0; i < 16; i++) {
    const s = await st();
    if (s.phase !== 'hostages') return;
    const pending = s.playerIds.filter((pid) => s.hVotes[pid] === undefined);
    if (!pending.length) return;
    const voter = pending[0];
    const target = membersOf(s, s.room[voter])[0]; // toda la sala vota al primero (determinista)
    const before = sig(s);
    const page = pg(voter);
    await page.click(`.player[data-a=tr-hostage][data-p="${target}"]`, { timeout: 15000 });
    await page.click('[data-a=tr-hostage-confirm]:not([disabled])');
    await waitState(pages.ana, (x) => sig(x) !== before, 'voto de rehén registrado');
  }
}

try {
  const GROUP = 'TR ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos', 'David', 'Eva', 'Fran']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (6)');

  await ana.click('button[data-a=select-game][data-p=two_rooms]');
  await ana.waitForSelector('[data-a=tr-open-help]');
  ok('el catálogo ofrece Two Rooms y su lobby carga');
  await ana.click('[data-a=tr-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=tr-play-howto]').count() >= 5, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=tr-start]:not([disabled])', { timeout: 15000 });
  // Selector de modo de voz (novedad): un narrador / uno por sala / todos.
  await ana.waitForSelector('[data-a=tr-voice-mode][data-p=all]', { timeout: 8000 });
  check(await ana.locator('[data-a=tr-voice-mode]').count() === 3, 'hay tres modos de voz a elegir');
  await ana.click('[data-a=tr-voice-mode][data-p=perRoom]');
  await ana.waitForSelector('[data-a=tr-pick-narrator2]', { timeout: 5000 });
  ok('«uno por sala» ofrece elegir también la voz de la Sala 2');
  await ana.click('[data-a=tr-voice-mode][data-p=single]'); // jugamos con un narrador
  await ana.click('[data-a=tr-start]');

  // ——— Reparto ———
  let s = await waitState(ana, (x) => x.phase === 'reveal', 'reparto');
  NAMES = s.names;
  check(s.playerIds.length === 6, '6 jugadores');
  check(Object.values(s.teams).filter((t) => t === 'blue').length === 3 && Object.values(s.teams).filter((t) => t === 'red').length === 3, 'bandos 3 azul / 3 rojo');
  check(!!roleId(s, 'president') && s.teams[roleId(s, 'president')] === 'blue', 'hay un Presidente azul');
  check(!!roleId(s, 'bomber') && s.teams[roleId(s, 'bomber')] === 'red', 'hay un Bombardero rojo');
  check(membersOf(s, 0).length === 3 && membersOf(s, 1).length === 3, 'las dos salas tienen 3 cada una');
  console.log('  presidente:', roleId(s, 'president'), '· bombardero:', roleId(s, 'bomber'));

  for (const pid of s.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=tr-reveal]', { timeout: 15000 });
    await p.click('[data-a=tr-reveal]');
    await p.waitForSelector('[data-a=tr-seen]');
    await p.click('[data-a=tr-seen]');
    await p.waitForTimeout(80);
  }
  await waitState(ana, (x) => x.playerIds.every((pid) => x.seen[pid]), 'todos ven su carta');
  await pg(s.playerIds[0]).click('[data-a=tr-begin]');
  ok('reparto confirmado');

  // ——— Tres rondas ———
  for (let r = 1; r <= 3; r++) {
    await waitState(ana, (x) => x.phase === 'discuss' && x.round === r, `ronda ${r} en marcha`, 30000);
    s = await waitState(ana, (x) => x.phase === 'hostages' && x.round === r, `fin del tiempo de la ronda ${r}`, 30000);
    check(true, `ronda ${r}: el reloj llega a cero y toca mandar rehenes`);
    await voteHostages();
    if (r < 3) {
      // B22: tras el intercambio hay COLOCACIÓN sin reloj; se confirma con botón.
      s = await waitState(ana, (x) => x.round === r + 1 && x.phase === 'move', `colocación tras la ronda ${r}`, 30000);
      check(s.log.some((t) => /Colocaos/.test(t)), 'la voz pide colocarse (sin reloj)');
      await pg(s.playerIds[0]).click('[data-a=tr-begin]');
      s = await waitState(ana, (x) => x.round === r + 1 && x.phase === 'discuss', `arranca la ronda ${r + 1}`, 30000);
    } else {
      s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina', 30000);
    }
    check(s.log.filter((t) => /Intercambio/.test(t)).length === r, `se han hecho ${r} intercambio(s)`);
  }

  // ——— Desenlace ———
  s = await st();
  const pres = roleId(s, 'president');
  const bomb = roleId(s, 'bomber');
  const expected = s.room[pres] === s.room[bomb] ? 'red' : 'blue';
  check(s.winner === expected, `el dictamen es correcto: ${expected === 'red' ? 'mismo cuarto → BOOM (rojo)' : 'cuartos distintos → azul'}`);
  check(s.playerIds.filter((pid) => s.teams[pid] === s.winner).every((pid) => s.scores[pid] === 1), 'todo el bando ganador suma 1 punto');
  check(s.log.some((t) => /El Presidente era/.test(t)), 'la voz destapa Presidente y Bombardero y anuncia el ganador');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Two Rooms and a Boom');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=tr-end-open]');
  await ana.waitForSelector('[data-a=tr-end-confirm]');
  await ana.click('[data-a=tr-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Two Rooms');
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=/Dispositivos/');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failtr-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-two-rooms con ${fail} fallos` : '\n✔ E2E-two-rooms OK');
process.exit(fail ? 1 : 0);
