// E2E de «Love Letter»: 3 jugadores (Ana narra y juega). God-view (el doc tiene
// las manos): catálogo → empezar → el panel de turno en dos pasos (carta con su
// efecto → objetivo/adivinanza) hasta que alguien gana una ronda → verifica el
// favor, el aviso del eliminado y la FUGA (quien espera no ve NINGUNA carta:
// la suya está tapada tras «👁 Ver mi carta»). Dirige siempre desde god-view.
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
    hands: g.hands, alive: g.alive, protected: g.protected, turn: g.turn,
    deck: (g.deck || []).length, tokens: g.tokens, need: g.need, winner: g.winner,
    roundResult: g.roundResult, log: (g.log || []).map((l) => l.txt),
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
const CARD_A = 'data-a=ll-card';
const ES = {
  guard: 'Guardia', priest: 'Sacerdote', baron: 'Barón', handmaid: 'Doncella',
  prince: 'Príncipe', king: 'Rey', countess: 'Condesa', princess: 'Princesa',
};
const NEEDS_TARGET = { guard: 1, priest: 1, baron: 1, prince: 1, king: 1 };

// Objetivos válidos de una carta (mismas reglas que el motor: vivos y sin la
// protección de la Doncella; el Príncipe puede apuntarse a sí mismo).
const targetsFor = (s, me, card) =>
  s.playerIds.filter((x) => s.alive[x] && !s.protected[x] && (card === 'prince' ? true : x !== me));

// Qué carta juega el bot: la Condesa si el motor la fuerza, si no el Guardia
// (acelera: elimina) y si no, cualquiera que no sea la Princesa.
function chooseIdx(hand, s, me) {
  if (hand.includes('countess') && (hand.includes('king') || hand.includes('prince'))) return hand.indexOf('countess');
  const gi = hand.indexOf('guard');
  if (gi >= 0 && targetsFor(s, me, 'guard').length) return gi;
  const pi = hand.indexOf('princess');
  return pi === 0 && hand.length > 1 ? 1 : 0;
}

// El jugador de turno juega, dirigido por god-view. El panel va en dos pasos:
// 1) tocar la carta (tarjeta con su efecto), 2) objetivo y —con el Guardia—
// adivinanza, y confirmar.
async function playTurn(s) {
  const me = s.turn;
  const hand = s.hands[me];
  const p = pg(me);
  const idx = chooseIdx(hand, s, me);
  const card = hand[idx];
  await p.click(`[${CARD_A}][data-p="${idx}"]`, { timeout: 15000 });
  await p.waitForSelector('[data-a=ll-play]', { timeout: 15000 });
  const targets = NEEDS_TARGET[card] ? targetsFor(s, me, card) : [];
  if (targets.length) {
    const tgt = targets[0];
    await p.click(`[data-a=ll-target][data-p="${tgt}"]`, { timeout: 15000 });
    if (card === 'guard') {
      const real = s.hands[tgt][0];
      const guess = real === 'guard' ? 'baron' : real; // «Guardia» no se puede adivinar: fallará
      await p.click(`[data-a=ll-guess][data-p="${guess}"]`, { timeout: 15000 });
    }
  }
  await p.click('[data-a=ll-play]:not([disabled])', { timeout: 15000 });
}

try {
  const GROUP = 'LL ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=love_letter]');
  await ana.waitForSelector('[data-a=ll-open-help]');
  ok('el catálogo ofrece Love Letter y su lobby carga');
  await ana.click('[data-a=ll-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=ll-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=ll-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=ll-start]');

  let s = await waitState(ana, (x) => x.phase === 'turn', 'primer turno');
  NAMES = s.names;
  check(s.playerIds.length === 3, '3 jugadores');
  check(s.hands[s.turn].length === 2, 'el jugador de turno tiene 2 cartas');
  check(s.playerIds.filter((p) => p !== s.turn).every((p) => s.hands[p].length === 1), 'los demás tienen 1 carta');

  // El panel de turno enseña las DOS cartas con su efecto y la referencia de
  // las 8, sin salir de la pantalla donde se decide.
  const turnPage = pg(s.turn);
  check(await turnPage.locator('[data-a=ll-card]').count() === 2, 'el jugador de turno ve sus dos cartas para elegir');
  const firstCard = await turnPage.locator('[data-a=ll-card]').first().innerText();
  check(/valor \d/.test(firstCard) && firstCard.length > 60, 'cada carta muestra valor, copias y su efecto entero');
  check(await turnPage.locator('[data-a=ll-ref]').count() === 1, 'la referencia de las 8 cartas se consulta desde el panel');
  check(await turnPage.locator('[data-a=ll-target]').count() === 0, 'el objetivo no se pide hasta elegir carta');

  // Fuga: quien espera no tiene botones de jugar NI ve carta ajena alguna (su
  // propia carta está tapada tras «👁 Ver mi carta»).
  const otherP = s.playerIds.find((p) => p !== s.turn);
  check(await pg(otherP).locator('[data-a=ll-card]').count() === 0, 'quien no es de turno no tiene botones de jugar');
  const waitTxt = await pg(otherP).evaluate(() => document.body.innerText);
  const leaked = [...new Set([...s.hands[s.turn], ...s.hands[otherP]])].map((c) => ES[c]).filter((n) => waitTxt.includes(n));
  check(leaked.length === 0, `la pantalla de quien espera no enseña ninguna carta${leaked.length ? ` (se cuela: ${leaked.join(', ')})` : ''}`);
  check(await pg(otherP).locator('[data-a=ll-show-card]').count() === 1, 'quien espera puede destapar SU carta a propósito');
  await pg(otherP).click('[data-a=ll-show-card]');
  await pg(otherP).waitForSelector('[data-a=ll-hide-card]', { timeout: 10000 });
  const shownTxt = await pg(otherP).evaluate(() => document.body.innerText);
  check(shownTxt.includes(ES[s.hands[otherP][0]]), 'al destaparla ve SU carta (y solo la suya)');
  await pg(otherP).click('[data-a=ll-hide-card]');

  // Juega turnos (dirigidos) hasta que termine una ronda (roundEnd o end).
  let bannerSeen = null;
  for (let guardN = 0; guardN < 40; guardN++) {
    s = await st();
    if (s.phase === 'roundEnd' || s.phase === 'end') break;
    if (s.phase !== 'turn') { await ana.waitForTimeout(150); continue; }
    // Al eliminado se le dice en la pantalla principal que es solo por esta ronda.
    const dead = s.playerIds.find((p) => !s.alive[p]);
    if (dead && bannerSeen === null) {
      bannerSeen = await pg(dead).locator('[data-a=ll-out-banner]').count() > 0;
      check(bannerSeen, 'el eliminado ve el aviso «fuera de ESTA ronda» en su pantalla');
    }
    // Limpia los vistazos privados pendientes (Sacerdote o duelo del Barón).
    for (const pid of s.playerIds) {
      const okp = pg(pid); const pk = okp.locator('[data-a=ll-peek-ok]');
      if (await pk.count()) await pk.click().catch(() => {});
    }
    const before = `${s.phase}|${s.turn}|${s.log.length}`;
    await playTurn(s);
    await waitState(ana, (x) => `${x.phase}|${x.turn}|${x.log.length}` !== before, 'avanza el turno').catch(() => {});
  }
  s = await waitState(ana, (x) => x.phase === 'roundEnd' || x.phase === 'end', 'fin de ronda');
  check(!!s.roundResult, 'la ronda tiene un ganador');
  const champ = s.roundResult.winner;
  check((s.tokens[champ] || 0) >= 1, `${NAMES[champ]} suma un favor por ganar la ronda`);
  check(s.log.some((t) => /gana la ronda/.test(t)), 'la voz anuncia el fin de la ronda');
  ok('una ronda completa de Love Letter');

  // El menú ⋯ ofrece «🪑 La mesa» (B26): el rescate cuando a alguien se le muere
  // el móvil y la partida se queda esperándolo.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=ll-table-open]');
  await ana.waitForSelector('.modal [data-a=table-player]', { timeout: 10000 });
  check(await ana.locator('.modal [data-a=table-player]').count() === 3, 'el menú ⋯ abre «🪑 La mesa» con los 3 dispositivos');
  await ana.click('.modal [data-a=close-modal]');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=ll-end-open]');
  await ana.waitForSelector('[data-a=ll-end-confirm]');
  await ana.click('[data-a=ll-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Love Letter');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failll-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-love-letter con ${fail} fallos` : '\n✔ E2E-love-letter OK');
process.exit(fail ? 1 : 0);
