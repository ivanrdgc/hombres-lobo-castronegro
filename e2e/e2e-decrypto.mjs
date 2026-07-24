// E2E de «Decrypto»: 4 jugadores (2 equipos, Ana narra y juega). God-view (el
// doc tiene palabras y código): catálogo → empezar → transmisión (pistas →
// intercepción del rival → descifrado propio → fichas) hasta ganar por 2
// intercepciones. Verifica la FUGA: cada equipo solo ve sus palabras.
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
    phase: g.phase, round: g.round, playerIds: g.playerIds, names: g.names, teams: g.teams,
    encoderIdx: g.encoderIdx, active: g.active, code: g.code, clues: g.clues,
    tokens: g.tokens, winner: g.winner, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(120); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, round: last.round, active: last.active, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);
const other = (t) => (t === 'red' ? 'blue' : 'red');
const teamMembers = (s, t) => s.playerIds.filter((p) => s.teams[p] === t);
const encoderOf = (s, t) => teamMembers(s, t)[s.encoderIdx[t] % teamMembers(s, t).length];

async function setCode(page, code) {
  for (let pos = 0; pos < 3; pos++) await page.click(`[data-a=de-digit][data-p="${pos}-${code[pos]}"]`, { timeout: 15000 });
}

// Juega una transmisión completa. `intercept`: si true, el rival ACIERTA el
// código; el propio equipo siempre acierta. Devuelve el estado en 'reveal'.
async function transmit(s, { rivalIntercepts }) {
  const active = s.active;
  const code = s.code;
  const enc = encoderOf(s, active);
  await pg(enc).click('[data-a=de-clue-0]', { timeout: 15000 });
  await pg(enc).fill('[data-a=de-clue-0]', 'pista uno');
  await pg(enc).fill('[data-a=de-clue-1]', 'pista dos');
  await pg(enc).fill('[data-a=de-clue-2]', 'pista tres');
  await pg(enc).click('[data-a=de-clue-give]:not([disabled])');
  s = await waitState(pages.ana, (x) => x.phase === 'intercept' || x.phase === 'decode', 'pistas registradas');
  if (s.phase === 'intercept') {
    const rival = teamMembers(s, other(active)).find((p) => true);
    const guess = rivalIntercepts ? code : [code[1], code[0], code[2]];
    await pg(rival).waitForSelector('[data-a=de-intercept]', { timeout: 15000 });
    await setCode(pg(rival), guess);
    await pg(rival).click('[data-a=de-intercept]:not([disabled])');
    s = await waitState(pages.ana, (x) => x.phase === 'decode', 'a descifrar');
  }
  // Descifra el propio equipo (no el encriptador): acierta siempre.
  const decoder = teamMembers(s, active).find((p) => p !== enc);
  await pg(decoder).waitForSelector('[data-a=de-decode]', { timeout: 15000 });
  await setCode(pg(decoder), code);
  await pg(decoder).click('[data-a=de-decode]:not([disabled])');
  return waitState(pages.ana, (x) => x.phase === 'reveal' || x.phase === 'end', 'resultado');
}

try {
  const GROUP = 'DE ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=decrypto]');
  await ana.waitForSelector('[data-a=de-open-help]');
  ok('el catálogo ofrece Decrypto y su lobby carga');
  await ana.click('[data-a=de-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=de-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=de-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=de-start]');

  let s = await waitState(ana, (x) => x.phase === 'clue', 'primera transmisión');
  NAMES = s.names;
  check(s.playerIds.length === 4, '4 jugadores');

  // ——— Fuga: cada equipo solo ve SUS palabras (4 en el TeamPanel del jugador) ———
  const redP = teamMembers(s, 'red')[0];
  const bluP = teamMembers(s, 'blue')[0];
  const redWords = await pg(redP).locator('.deword').allInnerTexts();
  const bluWords = await pg(bluP).locator('.deword').allInnerTexts();
  check(redWords.length === 4 && bluWords.length === 4, 'cada jugador ve sus 4 palabras clave');
  check(!redWords.some((w) => bluWords.includes(w)), 'un equipo NO ve las palabras del rival (sin solapamiento)');

  // ——— Ronda 1: rojo y azul transmiten (sin intercepción en la ronda 1) ———
  s = await transmit(s, { rivalIntercepts: false });
  check(s.round === 1 && s.active === 'red', 'ronda 1: transmite primero el rojo');
  await pg(s.playerIds[0]).click('[data-a=de-next]');
  s = await waitState(ana, (x) => x.phase === 'clue' && x.active === 'blue', 'transmite el azul');
  s = await transmit(s, { rivalIntercepts: false });
  await pg(s.playerIds[0]).click('[data-a=de-next]');
  s = await waitState(ana, (x) => x.round === 2 && x.active === 'red', 'ronda 2 (ya hay intercepción)');
  ok('ronda 1 completa; en la 2 ya se puede interceptar');

  // ——— Ronda 2+: el AZUL intercepta al rojo dos veces → gana el azul ———
  for (let guard = 0; guard < 6 && !s.winner; guard++) {
    s = await st();
    if (s.phase === 'end') break;
    // Cuando transmite el rojo, el azul intercepta; cuando transmite el azul, nadie.
    s = await transmit(s, { rivalIntercepts: s.active === 'red' });
    if (s.phase === 'end') break;
    await pg(s.playerIds[0]).click('[data-a=de-next]').catch(() => {});
    await waitState(pages.ana, (x) => x.phase !== 'reveal', 'siguiente transmisión').catch(() => {});
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(s.winner === 'blue', 'el azul gana al interceptar dos veces');
  check(s.tokens.blue.intercepts >= 2, 'el azul acumuló 2 intercepciones');
  check(s.log.some((t) => /gana/i.test(t)), 'la voz anuncia el ganador');
  await ana.waitForSelector('text=/Equipos/');
  ok('partida completa de Decrypto');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=de-end-open]');
  await ana.waitForSelector('[data-a=de-end-confirm]');
  await ana.click('[data-a=de-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Decrypto');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failde-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-decrypto con ${fail} fallos` : '\n✔ E2E-decrypto OK');
process.exit(fail ? 1 : 0);
