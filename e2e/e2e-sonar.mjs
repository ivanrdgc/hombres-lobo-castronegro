// E2E de «Captain Sonar»: 4 jugadores en 2 tripulaciones (Ana narra y juega).
// God-view (el doc tiene posiciones): catálogo → empezar → navegar (anuncio
// público) → dron (cuadrante veraz) → silencio → emerger → torpedos dirigidos
// hasta hundir. Verifica la FUGA: el mapa rival no aparece en tu pantalla.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, teams: g.teams, subs: g.subs,
    turnTeam: g.turnTeam, moves: g.moves, voiceMode: g.voiceMode, winner: g.winner,
    scores: g.scores, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(120); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, turnTeam: last.turnTeam, winner: last.winner, subs: last.subs }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);
const rival = (t) => (t === 'red' ? 'blue' : 'red');
const ISLANDS = [[2, 1], [5, 6], [2, 2], [5, 5], [1, 5], [6, 2], [4, 3], [3, 4]];
const isIsland = (x, y) => ISLANDS.some(([a, b]) => a === x && b === y);
const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function legal(sub, d) {
  const [dx, dy] = DIRS[d];
  const x = sub.pos.x + dx, y = sub.pos.y + dy;
  if (x < 0 || x > 7 || y < 0 || y > 7 || isIsland(x, y)) return false;
  return !sub.trail.some((t) => t.x === x && t.y === y) && !(sub.pos.x === x && sub.pos.y === y);
}

try {
  const GROUP = 'SN ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=sonar]');
  await ana.waitForSelector('[data-a=sn-open-help]');
  ok('el catálogo ofrece Captain Sonar y su lobby carga');
  await ana.click('[data-a=sn-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=sn-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=sn-start]:not([disabled])', { timeout: 15000 });
  check(await ana.locator('[data-a=sn-voice-mode]').count() === 3, 'el modo de voz compartido ofrece 3 opciones');
  await ana.click('[data-a=sn-start]');

  let s = await waitState(ana, (x) => x.phase === 'turn', 'primer turno');
  NAMES = s.names;
  check(s.teams.red.length === 2 && s.teams.blue.length === 2, 'dos tripulaciones de 2');
  check(s.subs.red.pos.x < 3 && s.subs.blue.pos.x > 4, 'los submarinos parten en mitades opuestas');
  check(s.voiceMode === 'single', 'modo de voz por defecto: un narrador');

  // ——— FUGA: el mapa propio solo lo ve tu tripulación ———
  const redP = s.teams.red[0];
  const blueP = s.teams.blue[0];
  check(await pg(redP).locator('.snmap[data-team=red]').count() === 1, 'la tripulación Roja ve SU mapa');
  check(await pg(redP).locator('.snmap[data-team=blue]').count() === 0, '…y NO el del Azul');
  check(await pg(blueP).locator('.snmap[data-team=red]').count() === 0, 'la Azul no ve el mapa Rojo');
  await pg(blueP).click('[data-a=open-mycard]');
  await pg(blueP).waitForSelector('text=/Tu submarino/');
  check(await pg(blueP).locator('.modal .settingrow').count() >= 5, 'el 🎴 lleva la chuleta de las 5 acciones');
  await pg(blueP).click('.modal [data-a=close-modal]');
  ok('el 🎴 se abre en cualquier momento');

  // ——— Navegar: anuncio público + energía ———
  s = await st();
  let team = s.turnTeam;
  let actor = s.teams[team][0];
  const d0 = ['N', 'S', 'E', 'W'].find((d) => legal(s.subs[team], d));
  await pg(actor).waitForSelector(`[data-a=sn-move][data-p="${d0}"]:not([disabled])`, { timeout: 15000 });
  await pg(actor).click(`[data-a=sn-move][data-p="${d0}"]`);
  s = await waitState(ana, (x) => x.moves[team].length === 1, 'rumbo anunciado');
  check(s.subs[team].energy === 1, 'navegar carga +1 de energía');
  check(s.log.some((t) => /navega al/.test(t)), 'el rumbo se anuncia a toda la mesa');
  check(s.turnTeam === rival(team), 'el turno pasa al otro submarino');
  const enemyOf = team === 'red' ? blueP : redP;
  check(await pg(enemyOf).locator('.sntrack').count() === 1, 'el rival ve la tira de rumbos anunciados');

  // ——— Cargar energía navegando (dirigido god-view), luego dron veraz ———
  async function act(fn, what) {
    const ss = await st();
    if (ss.phase === 'end') return ss;
    const t = ss.turnTeam;
    const a = ss.teams[t][0];
    await pg(a).waitForSelector('[data-a=sn-surface]', { timeout: 15000 });
    await fn(pg(a), ss, t);
    return waitState(ana, (x) => x.turnTeam !== t || x.phase === 'end', what);
  }
  // Ambos equipos navegan hasta que el de turno tenga 2 ⚡ para el dron.
  for (let i = 0; i < 8; i++) {
    const ss = await st();
    if (ss.subs[ss.turnTeam].energy >= 2) break;
    await act(async (p, x, t) => {
      const d = ['N', 'S', 'E', 'W'].find((dd) => legal(x.subs[t], dd));
      if (d) await p.click(`[data-a=sn-move][data-p="${d}"]`);
      else await p.click('[data-a=sn-surface]');
    }, 'navega para cargar');
  }
  let ss = await st();
  const droneTeam = ss.turnTeam;
  const enemyQuad = (() => {
    const e = ss.subs[rival(droneTeam)].pos;
    return e.y < 4 ? (e.x < 4 ? 'Noroeste' : 'Noreste') : (e.x < 4 ? 'Suroeste' : 'Sureste');
  })();
  s = await act(async (p) => { await p.click('[data-a=sn-drone]:not([disabled])'); }, 'dron resuelto');
  check(s.log.some((t) => t.includes('Dron') && t.includes(enemyQuad)), `el dron canta el cuadrante REAL (${enemyQuad})`);

  // ——— Silencio (3 ⚡) y emerger ———
  for (let i = 0; i < 10; i++) {
    ss = await st();
    if (ss.subs[ss.turnTeam].energy >= 3) break;
    await act(async (p, x, t) => {
      const d = ['N', 'S', 'E', 'W'].find((dd) => legal(x.subs[t], dd));
      if (d) await p.click(`[data-a=sn-move][data-p="${d}"]`);
      else await p.click('[data-a=sn-surface]');
    }, 'navega para cargar silencio');
  }
  ss = await st();
  const silTeam = ss.turnTeam;
  const silDir = ['N', 'S', 'E', 'W'].find((d) => legal(ss.subs[silTeam], d));
  if (silDir) {
    s = await act(async (p) => {
      await p.click('[data-a=sn-mode-silence]:not([disabled])');
      await p.click(`[data-a=sn-silence][data-p="${silDir}"]`);
    }, 'silencio resuelto');
    const lastMoves = s.moves[silTeam];
    check(lastMoves[lastMoves.length - 1] === 'silence', 'el silencio no anuncia rumbo (🤫 en la tira)');
  }
  s = await act(async (p) => { await p.click('[data-a=sn-surface]'); }, 'emersión');
  check(s.log.some((t) => /emerge en el cuadrante/.test(t)), 'emerger canta el cuadrante y borra la estela');

  // ——— Caza dirigida: mover hacia el rival y torpedear su casilla exacta ———
  for (let guardRounds = 0; guardRounds < 120; guardRounds++) {
    ss = await st();
    if (ss.phase === 'end') break;
    const t = ss.turnTeam;
    const mySub = ss.subs[t];
    const enemy = ss.subs[rival(t)];
    const dist = man(mySub.pos, enemy.pos);
    await act(async (p, x, tt) => {
      const sub = x.subs[tt]; const en = x.subs[rival(tt)];
      if (sub.energy >= 3 && man(sub.pos, en.pos) >= 1 && man(sub.pos, en.pos) <= 4) {
        await p.click('[data-a=sn-mode-torpedo]:not([disabled])');
        await p.click(`[data-a=sn-cell][data-p="${en.pos.x},${en.pos.y}"]`);
      } else {
        // Acercarse (o cualquier legal); sin rumbo legal, emerger.
        const dirs = ['N', 'S', 'E', 'W'].filter((dd) => legal(sub, dd));
        const better = dirs.find((dd) => {
          const [dx, dy] = DIRS[dd];
          return man({ x: sub.pos.x + dx, y: sub.pos.y + dy }, en.pos) < man(sub.pos, en.pos);
        });
        if (better || dirs.length) await p.click(`[data-a=sn-move][data-p="${better || dirs[0]}"]`);
        else await p.click('[data-a=sn-surface]');
      }
    }, `caza (dist ${dist})`);
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(!!s.winner, `hay submarino ganador (${s.winner})`);
  check(s.log.some((t) => /IMPACTO DIRECTO/.test(t)), 'hubo impacto directo anunciado');
  check(s.log.some((t) => /Posiciones finales/.test(t)), 'al final se revelan las posiciones');
  await ana.waitForSelector('text=/Marcador/');
  for (const w of s.teams[s.winner]) check((s.scores[w] || 0) >= 1, `${NAMES[w]} puntúa`);
  ok('partida completa de Captain Sonar');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=sn-end-open]');
  await ana.waitForSelector('[data-a=sn-end-confirm]');
  await ana.click('[data-a=sn-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failsn-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-sonar con ${fail} fallos` : '\n✔ E2E-sonar OK');
process.exit(fail ? 1 : 0);
