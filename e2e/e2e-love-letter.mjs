// E2E de «Love Letter»: 3 jugadores (Ana narra y juega). God-view (el doc tiene
// las manos): catálogo → empezar → el jugador de turno juega cartas (Guardia
// que acierta y elimina, etc.) hasta que gana una ronda → verifica el favor y
// la FUGA (solo ves tu propia carta). Dirige jugando siempre desde god-view.
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

// El jugador de turno juega, dirigido por god-view: si tiene Guardia y hay un
// objetivo vivo no protegido, adivina su carta REAL (para acertar); si no,
// juega su carta de menor valor sin objetivo o sobre el primero válido.
async function playTurn(s) {
  const me = s.turn;
  const hand = s.hands[me];
  const p = pg(me);
  const alive = s.playerIds.filter((x) => x.alive?.[x] ?? s.alive[x]);
  const targets = s.playerIds.filter((x) => x !== me && s.alive[x] && !s.protected[x]);
  const guardIdx = hand.indexOf('guard');
  if (guardIdx >= 0 && targets.length) {
    const tgt = targets[0];
    const realCard = s.hands[tgt][0];
    const guess = realCard === 'guard' ? 'baron' : realCard; // si tiene Guardia no se puede adivinar; fallará (da igual)
    await p.click(`[${CARD_A}][data-p="${guardIdx}"]`, { timeout: 15000 });
    await p.click(`[data-a=ll-target][data-p="${tgt}"]`);
    await p.click(`[data-a=ll-guess][data-p="${guess}"]`);
    await p.click('[data-a=ll-play]:not([disabled])');
    return;
  }
  // Sin Guardia útil: juega la primera carta jugable (índice 0 salvo Condesa forzada).
  // Elige objetivo si lo pide (primero válido); si es Príncipe sin otros, a sí mismo.
  const idx = 0;
  await p.click(`[${CARD_A}][data-p="${idx}"]`, { timeout: 15000 });
  // Si aparece selección de objetivo, elige el primero disponible.
  const tbtn = p.locator('[data-a=ll-target]').first();
  if (await tbtn.count()) await tbtn.click().catch(() => {});
  const gbtn = p.locator('[data-a=ll-guess]').first();
  if (await gbtn.count()) await gbtn.click().catch(() => {});
  await p.click('[data-a=ll-play]:not([disabled])', { timeout: 15000 }).catch(async () => {
    // Si esa carta no era jugable (Condesa forzada), prueba la otra.
    await p.click(`[${CARD_A}][data-p="1"]`).catch(() => {});
    const t2 = p.locator('[data-a=ll-target]').first();
    if (await t2.count()) await t2.click().catch(() => {});
    await p.click('[data-a=ll-play]:not([disabled])');
  });
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

  // Fuga: cada jugador solo ve su carta (comprobamos que el DOM del de turno
  // muestra SUS cartas y no las ajenas — indirecto: el panel de turno existe).
  check(await pg(s.turn).locator('[data-a=ll-card]').count() >= 1, 'el jugador de turno ve sus cartas para jugar');
  const otherP = s.playerIds.find((p) => p !== s.turn);
  check(await pg(otherP).locator('[data-a=ll-card]').count() === 0, 'quien no es de turno no tiene botones de jugar');

  // Juega turnos (dirigidos) hasta que termine una ronda (roundEnd o end).
  for (let guardN = 0; guardN < 40; guardN++) {
    s = await st();
    if (s.phase === 'roundEnd' || s.phase === 'end') break;
    if (s.phase !== 'turn') { await ana.waitForTimeout(150); continue; }
    // Limpia un posible aviso del Sacerdote en la pantalla del que miró.
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
