// E2E de «Good Cop Bad Cop»: 4 jugadores (Ana narra y juega). God-view (el doc
// tiene las cartas): catálogo → empezar → investigar (privado) → saltar el turno
// de un ausente → armarse → apuntar → disparar (con confirmación) a un no-líder
// (sigue) → cazar al líder rival (fin) → revancha.
// Verifica la FUGA: en el tablero TODAS las cartas van tapadas (también las
// tuyas: el 🎴 es el sitio para verlas) y el peek solo lo ve quien miró.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, cards: g.cards,
    alive: g.alive, armed: g.armed, aimAt: g.aimAt, turn: g.turn, peeks: g.peeks || {},
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
const bandOf = (cards) => (cards.filter((c) => c.kind === 'crook').length > cards.length / 2 ? 'crook' : 'honest');
const leaderOf = (s, band) => s.playerIds.find((pid) => s.cards[pid].some((c) => c.role === (band === 'honest' ? 'agent' : 'kingpin')));

// Ejecuta una acción con el jugador de turno s.turn.
async function turnDo(s, fn) {
  const p = pg(s.turn);
  await p.waitForSelector('[data-a=gc-mode-investigate]', { timeout: 15000 });
  await fn(p, s.turn);
}
// Investigar es: elegir acción → elegir a quién → elegir qué carta → CONFIRMAR
// (nombrando la consecuencia). Se usa mucho como relleno para pasar turnos.
async function investigateWith(p, target, cardSel = '[data-a=gc-inv-card]:not([disabled])') {
  await p.click('[data-a=gc-mode-investigate]');
  await p.click(`[data-a=gc-inv-target][data-p="${target}"]`);
  await p.locator(cardSel).first().click();
  await p.click('[data-a=gc-inv-confirm]:not([disabled])');
}

try {
  const GROUP = 'GC ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=good_cop]');
  await ana.waitForSelector('[data-a=gc-open-help]');
  ok('el catálogo ofrece Good Cop Bad Cop y su lobby carga');
  await ana.click('[data-a=gc-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=gc-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=gc-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=gc-start]');

  let s = await waitState(ana, (x) => x.phase === 'turn', 'primer turno');
  NAMES = s.names;
  check(s.playerIds.length === 4, '4 jugadores');
  const agent = leaderOf(s, 'honest');
  const kingpin = leaderOf(s, 'crook');
  check(!!agent && !!kingpin, 'hay un Agente y un Jefe');
  check(bandOf(s.cards[agent]) === 'honest' && bandOf(s.cards[kingpin]) === 'crook', 'los líderes son de su bando');
  check(s.log.some((t) => /🎬 Turno de/.test(t)), 'la voz dice desde el principio de quién es el turno');
  check(/\d+ honestos 👮 y \d+ corruptos 🦹/.test(s.log[0]), 'el reparto (cuántos de cada bando) es público');

  // ——— FUGA: NADIE ve cartas de cara en el tablero, ni siquiera las suyas ———
  const someone = s.playerIds.find((p) => p !== s.turn);
  const backs = await pg(someone).locator('.gccard.back').count();
  check(backs === s.playerIds.length * 3, `todas las cartas van tapadas en el tablero, también las tuyas (${backs} dorsos)`);
  await pg(someone).click('[data-a=open-mycard]');
  await pg(someone).waitForSelector('text=/Tus cartas de integridad/');
  ok('el 🎴 enseña tus cartas en cualquier momento');
  await pg(someone).click('.modal [data-a=close-modal]');

  // ——— La ayuda se puede consultar EN partida (no solo desde el lobby) ———
  await pg(someone).click('[data-a=game-menu]');
  await pg(someone).click('[data-a=gc-help-open]');
  await pg(someone).waitForSelector('text=/Cómo se juega/');
  ok('el menú ⋯ abre el «cómo se juega» a media partida');
  await pg(someone).click('.modal [data-a=close-modal]');

  // ——— «🪑 La mesa» desde dentro de la partida (rescate de un móvil apagado) ———
  await pg(someone).click('[data-a=game-menu]');
  await pg(someone).click('[data-a=table-open]');
  await pg(someone).waitForSelector('.modal [data-a=table-player]');
  ok('el menú ⋯ ofrece «🪑 La mesa» con los dispositivos');
  await pg(someone).click('.modal [data-a=close-modal]');

  // ——— Los números públicos, en pantalla (no de memoria) ———
  const tally = await pg(someone).locator('.gctally').innerText();
  check(/honestos/.test(tally) && /corruptos/.test(tally) && /en pie/.test(tally),
    'el tablero muestra cuántos hay de cada bando y cuántos quedan en pie');

  // ——— Turno 1: investigar (el peek solo lo ve quien miró) ———
  s = await st();
  const investigator = s.turn;
  const invTarget = s.playerIds.find((p) => p !== investigator);
  await turnDo(s, async (p) => {
    // El panel dice lo que hace cada acción y por qué las bloqueadas lo están.
    check(await p.locator('[data-a=gc-mode-aim][disabled]').count() === 1, 'sin arma, «apuntar» sale bloqueado');
    check(/Necesitas ir armado/.test(await p.locator('[data-a=gc-mode-aim]').innerText()), 'y el botón bloqueado explica POR QUÉ, en pantalla');
    check(await p.locator('[data-a=gc-ref]').count() === 1, 'la chuleta se consulta desde el propio panel de acción');
    await investigateWith(p, invTarget, '[data-a=gc-inv-card][data-p="0"]');
  });
  s = await waitState(ana, (x) => (x.peeks[investigator] || []).length > 0, 'peek registrado');
  check(s.peeks[investigator][0].target === invTarget, 'la investigación queda registrada para quien miró');
  check(s.log.some((t) => /investiga la carta 1 de/.test(t)), 'el diario dice QUÉ carta se ha investigado');
  // La tarjeta sale PLEGADA (el móvil acaba sobre la mesa).
  check(await pg(investigator).locator('[data-a=gc-peek-open]').count() === 1, 'quien investigó ve su tarjeta privada plegada');
  const otherP = s.playerIds.find((p) => p !== investigator);
  check(await pg(otherP).locator('[data-a=gc-peek-open]').count() === 0, 'nadie más ve el resultado');
  await pg(investigator).click('[data-a=gc-peek-open]');
  await pg(investigator).click('[data-a=gc-peek-ok]');
  // …y queda guardada: antes, si otro investigaba, se perdía para siempre.
  await pg(investigator).click('[data-a=open-mycard]');
  await pg(investigator).waitForSelector('text=/Lo que has investigado/');
  ok('el 🎴 conserva el historial de lo investigado');
  await pg(investigator).click('.modal [data-a=close-modal]');

  // ——— Desatasco: cualquier otro salta el turno de quien no responde ———
  s = await st();
  const absent = s.turn;
  const nudger = s.playerIds.find((p) => p !== absent && s.alive[p]);
  await pg(nudger).click('[data-a=gc-skip-turn]');
  s = await waitState(ana, (x) => x.turn !== absent, 'turno saltado');
  check(s.log.some((t) => /salta el turno de/.test(t)), 'la mesa puede saltar el turno de un ausente');

  // ——— Cazar: el turno que toque, arma → apunta a un NO líder → dispara ———
  // (para verificar que la partida SIGUE), y después al líder rival (fin).
  const nonLeader = s.playerIds.find((p) => p !== agent && p !== kingpin);
  let aimedChecked = false; // el aviso «⚠️ te apuntan» se comprueba una vez
  async function armAimShoot(target) {
    // El jugador de turno arma; en sus siguientes turnos apunta y dispara.
    let ss = await st();
    // Si le toca al propio objetivo, que haga de relleno (nadie puede apuntarse
    // a sí mismo, así que el tirador debe ser OTRO).
    while (ss.phase === 'turn' && ss.turn === target) {
      const t = ss.playerIds.find((p) => p !== ss.turn && ss.alive[p]);
      await turnDo(ss, (p) => investigateWith(p, t));
      await waitState(ana, (x) => x.turn !== ss.turn || x.phase === 'end', 'el objetivo cede el turno');
      ss = await st();
      if (ss.phase === 'end') return ss;
    }
    const shooter = ss.turn;
    // Armarse no lleva objetivo, pero gasta el turno: se confirma igualmente.
    await turnDo(ss, async (p) => {
      await p.click('[data-a=gc-arm]:not([disabled])');
      await p.click('[data-a=gc-arm-confirm]:not([disabled])');
    });
    ss = await waitState(ana, (x) => x.armed[shooter], 'armado');
    // Esperar a que vuelva su turno, actuando de relleno con los demás (investigan).
    for (let guard = 0; guard < 12; guard++) {
      ss = await st();
      if (ss.phase === 'end') return ss;
      if (ss.turn === shooter) break;
      const t = ss.playerIds.find((p) => p !== ss.turn && ss.alive[p]);
      await turnDo(ss, (p) => investigateWith(p, t));
      await waitState(ana, (x) => x.turn !== ss.turn || x.phase === 'end', 'pasa el relleno');
    }
    ss = await st();
    if (ss.phase === 'end') return ss;
    await turnDo(ss, async (p) => {
      await p.click('[data-a=gc-mode-aim]:not([disabled])');
      await p.click(`[data-a=gc-aim-target][data-p="${target}"]`);
      await p.click('[data-a=gc-aim-confirm]:not([disabled])');
    });
    ss = await waitState(ana, (x) => x.aimAt[shooter] === target || x.phase === 'end', 'apuntado');
    if (!aimedChecked && ss.aimAt[shooter] === target && ss.alive[target]) {
      aimedChecked = true;
      await pg(target).waitForSelector('[data-a=gc-aimed-at-me]', { timeout: 9000 })
        .then(() => ok('a quien apuntan lo ve avisado en su propia fila'))
        .catch(() => bad('a quien apuntan lo ve avisado en su propia fila'));
    }
    for (let guard = 0; guard < 12; guard++) {
      ss = await st();
      if (ss.phase === 'end' || ss.turn === shooter) break;
      const t = ss.playerIds.find((p) => p !== ss.turn && ss.alive[p]);
      await turnDo(ss, (p) => investigateWith(p, t));
      await waitState(ana, (x) => x.turn !== ss.turn || x.phase === 'end', 'pasa el relleno');
    }
    ss = await st();
    if (ss.phase === 'end') return ss;
    // Disparar pide confirmación: mata en el acto y puede acabar la partida.
    await turnDo(ss, async (p) => {
      await p.click('[data-a=gc-shoot]:not([disabled])');
      await p.click('[data-a=gc-shoot-confirm]:not([disabled])');
    });
    return waitState(ana, (x) => !x.alive[target] || x.phase === 'end', 'disparo resuelto');
  }

  s = await armAimShoot(nonLeader);
  if (s.phase !== 'end') {
    check(!s.alive[nonLeader], 'cae un no-líder y sus cartas se destapan');
    check(s.cards[nonLeader].every((c) => c.up), 'las cartas del caído quedan boca arriba');
    check(!s.armed[nonLeader] && !s.aimAt[nonLeader], 'el caído suelta la pistola y deja de apuntar');
    check(s.phase === 'turn', 'la partida SIGUE tras caer un no-líder');
    s = await armAimShoot(kingpin);
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(!!s.winner, `hay bando ganador (${s.winner})`);
  check(s.log.some((t) => /Ganan/.test(t)), 'la voz anuncia el desenlace');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Good Cop Bad Cop');

  // ——— Revancha: el diario NO arrastra la partida anterior ———
  const logBefore = s.log.length;
  await ana.click('[data-a=gc-again]');
  s = await waitState(ana, (x) => x.phase === 'turn', 'revancha repartida');
  check(s.log.length < logBefore && /Nueva partida/.test(s.log[0]), 'la revancha empieza con el diario limpio');
  check(s.log.some((t) => /🎬 Turno de/.test(t)), 'la revancha también dice quién empieza');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=gc-end-open]');
  await ana.waitForSelector('[data-a=gc-end-confirm]');
  await ana.click('[data-a=gc-end-confirm]');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failgc-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-good-cop con ${fail} fallos` : '\n✔ E2E-good-cop OK');
process.exit(fail ? 1 : 0);
