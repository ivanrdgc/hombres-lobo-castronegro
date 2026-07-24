// E2E de las SALIDAS a mitad de partida de «Two Rooms and a Boom» (salida
// elegante, commit de esta tanda): sacar a un jugador normal durante el voto de
// rehén anula los votos que lo señalaban (su sala revota); si abandona el
// PRESIDENTE, su bando se rinde (gana el rojo) y se puntúa; y en la revancha,
// una baja por debajo de 6 disuelve la partida sin ganador. 7 jugadores,
// god-view (el doc tiene bandos/roles) para elegir a quién sacar.
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
    teams: g.teams, roles: g.roles, room: g.room, seen: g.seen,
    hVotes: g.hVotes || {}, picks: g.picks || {}, winner: g.winner, winReason: g.winReason,
    scores: g.scores, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(150); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, winner: last.winner, n: last.playerIds?.length }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const roleId = (s, role) => s.playerIds.find((pid) => s.roles[pid] === role);

// Dejar la partida DESDE DENTRO (menú ⋯ → «Dejar la partida» del propio pid).
async function leaveMatch(pid) {
  const p = pg(pid);
  await p.click('[data-a=game-menu]');
  await p.click('[data-a=tr-leave-open]');
  await p.waitForSelector('[data-a=tr-leave-confirm]');
  await p.click('[data-a=tr-leave-confirm]');
}

try {
  const GROUP = 'TRL ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos', 'David', 'Eva', 'Fran', 'Gema', 'Hugo']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (8)');
  await ana.click('button[data-a=select-game][data-p=two_rooms]');
  await ana.waitForSelector('[data-a=open-start]');
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=tr-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=tr-start]');

  // ——— Reparto y ronda 1 ———
  let s = await waitState(ana, (x) => x.phase === 'reveal', 'reparto');
  NAMES = s.names;
  for (const pid of s.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=tr-reveal]', { timeout: 15000 });
    await p.click('[data-a=tr-reveal]');
    await p.waitForSelector('[data-a=tr-seen]');
    await p.click('[data-a=tr-seen]');
    await p.waitForTimeout(60);
  }
  await waitState(ana, (x) => x.playerIds.every((pid) => x.seen[pid]), 'todos confirman');
  await pg(s.playerIds[0]).click('[data-a=tr-begin]');
  s = await waitState(ana, (x) => x.phase === 'hostages', 'fin del reloj de la ronda 1', 30000);
  ok('ronda 1 llega al voto de rehén');

  // ——— Sacar a un jugador NORMAL que ya tenía votos ———
  // Objetivo: un 'none' que NO esté solo en su sala; le votan dos vecinos.
  const isNone = (pid) => s.roles[pid] === 'none';
  const target = s.playerIds.find((pid) => isNone(pid)
    && s.playerIds.filter((q) => s.room[q] === s.room[pid]).length >= 3);
  const roomOfT = s.room[target];
  const voters = s.playerIds.filter((pid) => pid !== target && s.room[pid] === roomOfT).slice(0, 2);
  for (const v of voters) {
    const p = pg(v);
    // La papeleta va cerrada (el voto es secreto dentro de la sala): se abre.
    await p.click('[data-a=tr-ballot]', { timeout: 15000 });
    await p.click(`.player[data-a=tr-hostage][data-p="${target}"]`, { timeout: 15000 });
    await p.click('[data-a=tr-hostage-confirm]:not([disabled])');
    await waitState(ana, (x) => x.hVotes[v] !== undefined, `voto de ${NAMES[v]}`);
  }
  const watcher = () => pg(s.playerIds.find((pid) => pid !== target));
  await leaveMatch(target);
  s = await waitState(watcher(), (x) => !x.playerIds.includes(target), 'el jugador sale de la partida');
  check(s.phase === 'hostages', 'la partida SIGUE en el voto de rehén (no se termina)');
  check(voters.every((v) => s.hVotes[v] === undefined), 'los votos que lo señalaban caen (sus vecinos revotan)');
  check(s.playerIds.length === 7, 'quedan 7 jugadores');
  check(s.log.some((t) => t.includes('deja la partida')), 'el diario cuenta la salida');

  // ——— Abandona el PRESIDENTE: el azul se rinde ———
  const pres = roleId(s, 'president');
  const watcher2 = pg(s.playerIds.find((pid) => pid !== pres));
  await leaveMatch(pres);
  s = await waitState(watcher2, (x) => x.phase === 'end', 'la partida se cierra sola');
  check(s.winner === 'red', 'gana el ROJO en el acto (rendición del azul)');
  check(s.playerIds.filter((pid) => s.teams[pid] === 'red').every((pid) => s.scores[pid] === 1), 'el bando rojo puntúa');
  check(s.log.some((t) => /PRESIDENTE/.test(t) && /abandona/.test(t)), 'el diario explica la rendición');
  // El cartel final no puede cantar un «¡BOOM!» que no ha ocurrido.
  check(/abandonó/.test(s.winReason || '') && !/BOOM/.test(s.winReason || ''), 'el cartel final cuenta la rendición, no un BOOM inventado');
  check(await watcher2.locator('h3', { hasText: 'abandonó' }).count() > 0, 'la pantalla del final enseña ese motivo');

  // ——— Revancha con 6 y disolución por debajo del mínimo ———
  const inGamePage = () => pg(s.playerIds[0]);
  await inGamePage().click('[data-a=tr-again]');
  s = await waitState(inGamePage(), (x) => x.phase === 'reveal', 'revancha en reparto');
  check(s.playerIds.length === 6, 'la revancha arranca con los 6 restantes');
  const out2 = s.playerIds.find((pid) => s.roles[pid] === 'none');
  const watcher3 = pg(s.playerIds.find((pid) => pid !== out2));
  await leaveMatch(out2);
  s = await waitState(watcher3, (x) => x.phase === 'end' && x.winner === null, 'disolución sin ganador');
  check(s.log.some((t) => t.includes('se disuelve')), 'el diario explica la disolución');
  await pg(s.playerIds[0]).waitForSelector('[data-a=tr-again][disabled]', { timeout: 8000 });
  ok('sin quórum no se ofrece revancha');

  // Limpieza.
  await pg(s.playerIds[0]).click('[data-a=tr-back-lobby]');
  await pg(s.playerIds[0]).waitForSelector('[data-a=open-start]', { timeout: 30000 }).catch(() => {});
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failtrl-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-two-rooms-leave con ${fail} fallos` : '\n✔ E2E-two-rooms-leave OK');
process.exit(fail ? 1 : 0);
