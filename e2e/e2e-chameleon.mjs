// E2E de «El Camaleón»: 4 jugadores (Ana narra y juega). Verifica de punta a
// punta: catálogo → reparto (rejilla pública + palabra secreta a todos menos al
// Camaleón) → pistas POR TURNOS (el botón de votar solo aparece al terminar la
// vuelta; «↩️ Atrás» y «volver a las pistas» deshacen los toques de más) →
// voto secreto que la app destapa con su recuento → los tres desenlaces:
// ronda 1, pillan al Camaleón y FALLA la palabra → gana el grupo; ronda 2, la
// mesa señala a un inocente → el Camaleón ESCAPA; ronda 3, EMPATE en el voto →
// el Camaleón escapa también (+2). Y que el Camaleón nunca repite ronda.
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
    guess: g.guess, winner: g.winner, scores: g.scores, clueIdx: g.clueIdx, starterIdx: g.starterIdx,
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
}
// La vuelta de pistas: la app lleva el turno y hasta que no han hablado los N
// no aparece el botón de votar (antes, un toque de cualquiera cortaba la fase).
async function cluesAndVote(st, { checks = false } = {}) {
  const p = pg(st.playerIds[0]);
  await p.waitForSelector('[data-a=ch-clue-next]', { timeout: 15000 });
  if (checks) {
    check(await p.locator('[data-a=ch-start-vote]').count() === 0, 'sin todas las pistas NO hay botón de votar');
    check(await p.locator('[data-a=ch-turn]').count() === st.playerIds.length, 'la lista de turnos muestra a los 4');
    // La referencia se consulta SIN salir de la pantalla en la que se decide.
    check(await p.locator('[data-a=ch-clue-ref]').count() === 1, 'el turno de pistas lleva su chuleta plegada («qué es una buena pista»)');
    // «↩️ Atrás» deshace un turno adelantado por error.
    await p.click('[data-a=ch-clue-next]');
    await waitState(pages.ana, (s) => s.clueIdx === 1, 'primer turno dado');
    await p.click('[data-a=ch-clue-back]');
    await waitState(pages.ana, (s) => s.clueIdx === 0, 'el botón de atrás devuelve el turno');
    ok('el turno de pistas avanza y se puede retroceder');
  }
  for (let i = 0; i < st.playerIds.length; i++) {
    await p.click('[data-a=ch-clue-next]');
    await waitState(pages.ana, (s) => s.clueIdx === i + 1, `pista ${i + 1} dada`);
  }
  await p.waitForSelector('[data-a=ch-start-vote]', { timeout: 15000 });
  await p.click('[data-a=ch-start-vote]');
  await waitState(pages.ana, (s) => s.phase === 'vote', 'fase de voto');
  if (checks) {
    // Nadie ha votado aún: se puede volver a las pistas (R1).
    await p.waitForSelector('[data-a=ch-back-clues]', { timeout: 15000 });
    await p.click('[data-a=ch-back-clues]');
    await waitState(pages.ana, (s) => s.phase === 'clue', 'vuelta a las pistas sin votos');
    ok('desde el voto sin votos se puede volver a las pistas');
    await p.click('[data-a=ch-start-vote]');
    await waitState(pages.ana, (s) => s.phase === 'vote', 'de nuevo en el voto');
  }
}
// El voto es lo único irreversible de la ronda: antes de confirmar hay que ver
// a quién señalas y qué pasa si acertáis o si os equivocáis (y poder cambiar).
async function voteUiChecks(st) {
  const voter = st.playerIds.find((pid) => pid !== st.chameleonId);
  const target = st.playerIds.find((pid) => pid !== voter);
  const p = pg(voter);
  await p.waitForSelector('[data-a=ch-vote]', { timeout: 15000 });
  check(await p.locator('[data-a=ch-vote-confirm][disabled]').count() === 1, 'sin señalar a nadie, el botón de votar está apagado');
  check(await p.locator('[data-a=ch-vote-stake]').count() === 0, 'las consecuencias solo aparecen tras señalar');
  await p.click(`.player[data-a=ch-vote][data-p="${target}"]`);
  await p.waitForSelector('[data-a=ch-vote-stake]', { timeout: 8000 });
  const stake = await p.locator('[data-a=ch-vote-stake]').innerText();
  const who = NAMES[target];
  check(stake.includes(who) && /Camale/i.test(stake) && /inocente/i.test(stake),
    'antes de confirmar se dice a quién señalas y qué pasa si acertáis o falláis');
  check((await p.locator('[data-a=ch-vote-confirm]').innerText()).includes(who), 'el botón del voto nombra a quién señalas');
  await p.click('[data-a=ch-vote-change]');
  await p.waitForSelector('[data-a=ch-vote-stake]', { state: 'detached', timeout: 8000 });
  ok('el voto se decide en dos pasos, con las consecuencias por delante');
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
  await cluesAndVote(st, { checks: true });
  await voteUiChecks(st);
  // Todos los NO-camaleón votan al Camaleón; el Camaleón vota a otro.
  await voteAll(st, (pid) => (pid === st.chameleonId ? st.playerIds.find((x) => x !== pid) : st.chameleonId));
  st = await waitState(ana, (s) => s.phase === 'guess' || s.phase === 'end', 'voto resuelto');
  check(st.caught === true && st.phase === 'guess', 'la mesa PILLA al Camaleón → pasa a adivinar');
  // El Camaleón falla la palabra a propósito (elige una casilla distinta).
  const wrong = (st.secret + 1) % 16;
  const cp = pg(st.chameleonId);
  await cp.waitForSelector(`.cell[data-a=ch-cell][data-p="${wrong}"]:not([disabled])`, { timeout: 15000 });
  check(await cp.locator('[data-a=ch-guess-confirm][disabled]').count() === 1, 'sin marcar casilla, el Camaleón no puede apostar');
  await cp.click(`.cell[data-a=ch-cell][data-p="${wrong}"]`);
  check((await cp.locator('[data-a=ch-guess-confirm]').innerText()).includes(st.grid[wrong]), 'el botón del Camaleón nombra la palabra que apuesta');
  await cp.click('[data-a=ch-guess-confirm]:not([disabled])');
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 1');
  check(st.winner === 'group', 'pillado y fallando la palabra → gana el grupo');
  check(st.playerIds.filter((p) => p !== st.chameleonId).every((p) => st.scores[p] === 1), 'cada jugador del grupo suma 1');
  await ana.waitForSelector('text=/Marcador/');
  await ana.waitForSelector('text=/El recuento/');
  check(await ana.locator('text=/La mesa señaló a/').count() > 0, 'el final destapa el recuento del voto');
  ok('el final destapa la palabra secreta, el recuento y el marcador');
  const cham1 = st.chameleonId;
  const scores1 = { ...st.scores };

  // ——— Ronda 2: señalan a un inocente → el Camaleón ESCAPA ———
  await pg(st.playerIds[0]).click('[data-a=ch-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 2, 'ronda 2 repartida');
  NAMES = st.names;
  check(st.chameleonId !== cham1, 'la ronda 2 reparte un Camaleón DISTINTO');
  const scapegoat = st.playerIds.find((p) => p !== st.chameleonId);
  await revealAll(st);
  await cluesAndVote(st);
  await voteAll(st, (pid) => (pid === scapegoat ? st.chameleonId : scapegoat));
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 2');
  check(st.accusedId === scapegoat && st.winner === 'chameleon', 'señalan a un inocente → el Camaleón escapa y gana');
  check((st.scores[st.chameleonId] || 0) - (scores1[st.chameleonId] || 0) === 2, 'el Camaleón que no cae se lleva 2 puntos');

  // ——— Ronda 3: EMPATE en el voto → nadie es señalado y el Camaleón escapa ———
  const prev = { ...st.scores };
  const cham2 = st.chameleonId;
  await pg(st.playerIds[0]).click('[data-a=ch-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 3, 'ronda 3 repartida');
  NAMES = st.names;
  check(st.chameleonId !== cham2, 'la ronda 3 tampoco repite Camaleón');
  await revealAll(st);
  await cluesAndVote(st);
  // 2 votos a playerIds[1] y 2 a playerIds[2]: empate en cabeza (sin autovotos).
  await voteAll(st, (pid) => st.playerIds[st.playerIds.indexOf(pid) % 2 === 0 ? 1 : 2]);
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 3');
  check(st.accusedId === null && st.winner === 'chameleon', 'empate en el voto → nadie señalado y el Camaleón escapa');
  check((st.scores[st.chameleonId] || 0) - (prev[st.chameleonId] || 0) === 2, 'el empate le da 2 puntos al Camaleón');
  check(await ana.locator('text=/Empate en cabeza/').count() > 0, 'el final explica POR QUÉ se ganó (empate)');
  ok('partida completa de El Camaleón (tres desenlaces)');

  // «🪑 La mesa» desde DENTRO de la partida: el rescate cuando un móvil se
  // queda sin batería y la ronda espera por él (B26).
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=table-open]');
  await ana.waitForSelector('[data-a=table-player]', { timeout: 10000 });
  check(await ana.locator('[data-a=table-player]').count() === 4, 'el menú ⋯ abre «🪑 La mesa» con los 4 dispositivos');
  await ana.click('.modal [data-a=close-modal]');

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
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
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
