// E2E de «Codenames»: 4 jugadores (2 equipos, Ana narra y juega). God-view (el
// doc tiene el mapa secreto): catálogo → empezar → pista validada → el agente
// selecciona y CONFIRMA casillas → transeúnte, casilla regalada al rival y
// ASESINO → revancha. Verifica además la FUGA (el agente NO ve el mapa; el Jefe
// sí), la POSTURA del móvil (B28: el mapa del Jefe nace tapado, se abre de un
// toque, se puede volver a tapar y el aviso de pantalla secreta no se va), la
// PUERTA ÚNICA (B34: al ser juego de equipo, tu papel vive en la pantalla y la
// pastilla flotante es solo «📖 Reglas»), la escotilla anti-atasco del Jefe y
// qué dice la voz.
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
    clue: g.clue, guessesLeft: g.guessesLeft, guessesMade: g.guessesMade, remaining: g.remaining,
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
// Qué habría dicho la voz (transcript del modo test; Ana es el altavoz).
const saidTimes = (re) => pages.ana.evaluate((src) =>
  (window.__hlcNarration || []).filter((e) => new RegExp(src).test(e.text)).length, re.source);
async function waitSaid(re, n, timeout = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await saidTimes(re) >= n) return true;
    await pages.ana.waitForTimeout(150);
  }
  return false;
}

// El aviso de por qué NO se puede enviar la pista, esperando a su texto: la
// nota está siempre en pantalla (el botón gris nunca se queda mudo), así que
// mirar solo si existe no distinguiría un motivo del siguiente.
const clueBad = (page, re) => page.waitForFunction((src) => {
  const el = document.querySelector('[data-a=cn-clue-bad]');
  return !!el && new RegExp(src).test(el.textContent || '');
}, re.source, { timeout: 10000 });

// El mapa del Jefe es MANO (B28): nace TAPADO —en el reparto los móviles suelen
// estar boca arriba— y un toque lo abre para el resto de la partida.
async function openMap(spy) {
  const p = pg(spy);
  await p.waitForSelector('[data-a=cn-map-open], .cnboard.priv', { timeout: 20000 });
  const cover = p.locator('[data-a=cn-map-open]');
  if (await cover.count()) await cover.click();
  await p.waitForSelector('.cnboard.priv .cncell.spy', { timeout: 15000 });
}
// La pista tiene que ser UNA palabra y no estar en el tablero: «enigma» no es
// ninguna de las 25 (el banco son sustantivos concretos).
async function giveClue(spy, num, word = 'enigma') {
  const p = pg(spy);
  await p.fill('[data-a=cn-clue-word]', word, { timeout: 15000 });
  await p.click(`[data-a=cn-clue-num][data-p="${num}"]`, { timeout: 15000 });
  await p.click('[data-a=cn-clue-give]:not([disabled])');
}
// Dos pasos: tocar selecciona; el botón de abajo confirma.
async function touch(agent, cell) {
  const p = pg(agent);
  await p.click(`.cncell[data-a=cn-cell][data-p="${cell}"]`, { timeout: 15000 });
  await p.click('[data-a=cn-confirm]:not([disabled])', { timeout: 15000 });
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
  // Lobby (B29): un solo trabajo —de qué va, y tres caminos— y el aviso de
  // POSTURA antes de repartir nada.
  check(await ana.locator('[data-a=cn-posture]').count() === 1, 'el lobby dice cómo se sostiene el móvil (postura de equipo)');
  check(await ana.locator('[data-a=open-demo]').count() === 1 && await ana.locator('[data-a=open-start]').count() === 1,
    'el lobby deja los tres caminos: aprender, consultar y empezar');
  await ana.click('[data-a=cn-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=cn-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=cn-start]:not([disabled])', { timeout: 15000 });
  check(await ana.locator('[data-a=cn-start-warn]').count() === 1, 'antes de repartir se avisa de que los Jefes reciben un mapa secreto');
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
  // Las dos posturas (B28), cada una con su pantalla: el Jefe estrena su mapa
  // TAPADO —en el reparto los móviles suelen estar boca arriba— con el aviso
  // fijo de que no lo puede ver nadie; el agente estrena el tablero público,
  // que no tiene nada que tapar.
  await pg(spyA).waitForSelector('[data-a=cn-shield]', { timeout: 20000 });
  await pg(agentA).waitForSelector('.cnboard.pub', { timeout: 20000 });
  check(await pg(spyA).locator('[data-a=cn-clue-give]').count() === 1, `solo el Jefe (${NAMES[spyA]}) da la pista`);
  check(await pg(agentA).locator('[data-a=cn-clue-give]').count() === 0, 'un agente no puede dar la pista');
  check(await spyColoredCells(pg(spyA)) === 0, 'el mapa del Jefe nace TAPADO: al repartir no lo ve nadie');
  ok('el Jefe lleva un aviso permanente de pantalla secreta');
  check(await pg(agentA).locator('[data-a=cn-shield]').count() === 0 && await pg(agentA).locator('[data-a=cn-map-open]').count() === 0,
    'el agente no tiene mapa que tapar: su tablero es público');
  await openMap(spyA);
  check(await spyColoredCells(pg(spyA)) > 0, 'el Jefe SÍ ve el mapa (casillas coloreadas sin destapar)');
  check(await spyColoredCells(pg(agentA)) === 0, 'el agente NO ve el mapa (ninguna casilla coloreada sin destapar)');
  check(await pg(spyA).locator('.cncell.spy .cntag').count() === 25, 'el mapa del Jefe marca cada casilla con su emoji');
  // Y puede volver a taparlo para soltar el móvil.
  await pg(spyA).click('[data-a=cn-map-hide]');
  await pg(spyA).waitForSelector('[data-a=cn-map-open]', { timeout: 10000 });
  check(await spyColoredCells(pg(spyA)) === 0, '«🙈 Taparlo» esconde el mapa cuando el Jefe suelta el móvil');
  await openMap(spyA);

  // ——— La voz arranca diciendo quién empieza (línea 0 del diario) ———
  check(await waitSaid(/Comienza Codenames/, 1), 'la voz locuta el arranque (qué equipo empieza)');

  // ——— Las reglas se consultan sin salir del panel, y «La mesa» está en el ⋯ ———
  check(await pg(agentA).locator('[data-a=cn-ref]').count() === 1, 'el panel lleva «📖 Las reglas» plegadas donde se decide');

  // ——— Puerta única a tu carta (B34) ———
  // Codenames es de EQUIPO: tu papel VIVE en la pantalla (la banda) y el mapa
  // del Jefe también, así que la pastilla flotante es SOLO las reglas y no
  // puede ofrecer una segunda puerta a lo mismo con otro nombre.
  check(await pg(agentA).locator('[data-a=cn-band]').count() === 1, 'tu papel se dice en la pantalla, en una sola banda');
  const fabTxt = await pg(agentA).locator('[data-a=open-mycard]').innerText();
  check(/reglas/i.test(fabTxt) && !/mi carta/i.test(fabTxt), 'la pastilla flotante se llama «Reglas», no «Mi carta»');
  await pg(agentA).click('[data-a=open-mycard]');
  await pg(agentA).waitForSelector('.modal [data-a=cn-all-rules]', { timeout: 10000 });
  check(await pg(agentA).locator('.modal [data-a=cn-band]').count() === 0, 'el modal de las reglas no repite tu papel');
  check(await pg(agentA).locator('.modal [data-a=cn-play-howto]').count() === 0, 'dentro de la partida las reglas no traen ▶️ (la voz está narrando)');
  await pg(agentA).click('button[data-a=close-modal]');

  await pg(agentA).click('[data-a=game-menu]');
  await pg(agentA).click('[data-a=table-open]');
  await pg(agentA).waitForSelector('[data-a=table-player]');
  ok('el menú ⋯ abre «🪑 La mesa» (rescate de un móvil apagado)');
  await pg(agentA).click('button[data-a=close-modal]');

  // ——— La pista se valida antes de enviarla ———
  check(await pg(spyA).locator('[data-a=cn-clue-give][disabled]').count() === 1, 'con el campo vacío no se puede dar la pista');
  await clueBad(pg(spyA), /Escribe la palabra/);
  await pg(spyA).fill('[data-a=cn-clue-word]', 'dos palabras');
  await clueBad(pg(spyA), /UNA sola palabra/);
  check(await pg(spyA).locator('[data-a=cn-clue-give][disabled]').count() === 1, 'una pista de dos palabras se rechaza');
  await pg(spyA).fill('[data-a=cn-clue-word]', await pg(spyA).locator('.cncell .cnword').first().innerText());
  await clueBad(pg(spyA), /está en el tablero/);
  check(await pg(spyA).locator('[data-a=cn-clue-give][disabled]').count() === 1, 'una palabra del tablero se rechaza');

  // ——— Turno 1: acierto propio (en dos pasos) y pase ———
  await giveClue(spyA, 9);
  s = await waitState(ana, (x) => x.phase === 'guess' && x.turn === teamA, 'el equipo A puede tocar');
  check(s.clue?.num === 9 && s.guessesLeft === 10, 'la pista fija número + 1 intentos');
  check(await waitSaid(/da la pista/, 1), 'la voz canta la pista');
  // «🔁 Repetir» vuelve a locutar la última línea (la pista).
  await ana.click('[data-a=game-menu]'); await ana.click('[data-a=cn-repeat]');
  check(await waitSaid(/da la pista/, 2), '«🔁 Repetir» vuelve a decir la pista');
  // Regla oficial: no se puede pasar sin haber destapado al menos una vez.
  check(await pg(agentA).locator('[data-a=cn-pass][disabled]').count() === 1, 'antes del primer toque, «Pasar» está deshabilitado');
  const ownA = s.map.findIndex((c, i) => c === teamA && !s.revealed[i]);
  await pg(agentA).click(`.cncell[data-a=cn-cell][data-p="${ownA}"]`);
  await pg(agentA).waitForSelector('[data-a=cn-unselect]');
  s = await st();
  check(!s.revealed[ownA], 'un toque en el tablero NO destapa: solo selecciona');
  await pg(agentA).click('[data-a=cn-confirm]');
  s = await waitState(ana, (x) => x.revealed[ownA], 'se destapa la casilla propia tras confirmar');
  check(s.turn === teamA, 'acertar una propia deja seguir en el mismo turno');
  await pg(agentA).click('[data-a=cn-pass]');
  s = await waitState(ana, (x) => x.turn === other(teamA) && x.phase === 'clue', 'pasar cede el turno');
  ok('acierto propio + pase: el turno cambia de equipo');

  // ——— Recarga del altavoz: retoma por la última línea, no relee el diario ———
  const lines = (await st()).log.length;
  await ana.reload();
  // Si Ana es Jefa, tras recargar su mapa vuelve a estar tapado (a propósito):
  // vale cualquiera de las dos pantallas para dar la partida por cargada.
  await ana.waitForSelector('.cncell, [data-a=cn-map-open]', { timeout: 20000 });
  await ana.waitForTimeout(1500);
  const reread = await ana.evaluate(() => (window.__hlcNarration || []).length);
  check(reread <= 1, `tras recargar, el altavoz no relee las ${lines} líneas del diario (dijo ${reread})`);

  // ——— Escotilla: si el Jefe de turno no actúa, cualquiera salta su turno ———
  const teamB = other(teamA);
  await pg(agentA).waitForTimeout(5200); // en modo test el atasco salta a los 4 s
  await pg(agentA).click('[data-a=game-menu]');
  await pg(agentA).waitForSelector('[data-a=cn-skip-clue]', { timeout: 15000 });
  await pg(agentA).click('[data-a=cn-skip-clue]');
  s = await waitState(ana, (x) => x.turn === teamA && x.phase === 'clue', 'saltar el turno del Jefe atascado');
  ok('con el Jefe atascado, la mesa puede saltarle el turno');

  // ——— Transeúnte: corta el turno ———
  await giveClue(spyA, 3);
  s = await waitState(ana, (x) => x.phase === 'guess' && x.turn === teamA, 'el equipo A puede tocar');
  const neutral = s.map.findIndex((c, i) => c === 'neutral' && !s.revealed[i]);
  await touch(agentA, neutral);
  s = await waitState(ana, (x) => x.revealed[neutral], 'se destapa el transeúnte');
  check(s.turn === teamB && s.phase === 'clue', 'tocar un transeúnte corta el turno');

  // ——— Casilla regalada al rival ———
  const spyB = s.spymaster[teamB];
  const agentB = agentOf(s, teamB);
  await openMap(spyB);
  await pg(agentB).waitForSelector('.cnboard.pub', { timeout: 20000 });
  check(await spyColoredCells(pg(agentB)) === 0, 'el agente del otro equipo tampoco ve el mapa de SU Jefe');
  await giveClue(spyB, 9);
  await waitState(ana, (x) => x.phase === 'guess' && x.turn === teamB, 'el equipo B puede tocar');
  // La pista es pública y se lee grande en TODAS las pantallas (postura de mesa).
  await pg(agentB).waitForSelector('[data-a=cn-clue-band]', { timeout: 15000 });
  check(await pg(spyA).locator('[data-a=cn-clue-band]').count() === 1,
    'la pista se ve en grande en todas las pantallas, también en las del rival');
  s = await st();
  const gift = s.map.findIndex((c, i) => c === teamA && !s.revealed[i]);
  const beforeA = s.remaining[teamA];
  await touch(agentB, gift);
  s = await waitState(ana, (x) => x.revealed[gift], 'se destapa la casilla del rival');
  check(s.remaining[teamA] === beforeA - 1 && s.turn === teamA, 'destapar una del rival se la regala y cierra el turno');

  // ——— El ASESINO acaba la partida en el acto ———
  await giveClue(spyA, 9);
  await waitState(ana, (x) => x.phase === 'guess' && x.turn === teamA, 'el equipo A puede tocar');
  const assassin = (await st()).map.indexOf('assassin');
  await touch(agentA, assassin);
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina con el asesino');
  check(s.winner === teamB, 'tocar al asesino hace ganar al equipo rival');
  check(s.log.some((t) => /ASESINO/.test(t)), 'el diario canta el asesino');
  check(s.playerIds.filter((pid) => s.teams[pid] === teamB).every((pid) => s.scores[pid] === 1), 'todo el equipo ganador suma 1 punto');
  check(await spyColoredCells(pg(agentA)) > 0, 'al terminar, TODOS ven el mapa completo');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Codenames');

  // ——— Revancha: reparto nuevo, marcador acumulado ———
  const scoresBefore = s.scores;
  await ana.click('[data-a=cn-again]');
  s = await waitState(ana, (x) => x.phase === 'clue' && !x.winner, 'la revancha reparte otra vez');
  check(s.revealed.every((r) => !r), 'la revancha empieza con el tablero sin destapar');
  check(s.playerIds.every((pid) => (s.scores[pid] || 0) === (scoresBefore[pid] || 0)), 'la revancha conserva el marcador');
  check(s.log.some((t) => /Nueva partida/.test(t)), 'el diario anuncia la revancha');
  // Mapa nuevo = mismo cuidado que la primera vez: vuelve a nacer tapado.
  const covered = await pg(s.spymaster[s.turn]).waitForSelector('[data-a=cn-map-open]', { timeout: 15000 }).catch(() => null);
  check(!!covered, 'la revancha vuelve a tapar el mapa del Jefe');
  ok('revancha de Codenames');

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
