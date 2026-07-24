// E2E de «Decrypto»: 4 jugadores (2 equipos, Ana narra y juega). God-view (el
// doc tiene palabras y código): catálogo → empezar → transmisión (pistas →
// intercepción del rival → descifrado propio → fichas) hasta ganar por 2
// intercepciones. Verifica la FUGA: cada equipo solo ve sus palabras.
// Y la POSTURA (B28, juego 👥 equipo): aviso de quién puede mirar, nada secreto
// en la franja de arriba, y misma silueta interceptando que descifrando.
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

// Silueta del selector de código: cuántas casillas y de cuántas columnas es la
// rejilla. Interceptar y descifrar tienen que dar EXACTAMENTE lo mismo, o el
// equipo de enfrente lee de lejos lo que estás haciendo (B28, chivatos).
const pickerShape = (page) => page.evaluate(() => {
  const opts = document.querySelectorAll('.codepick .cpopt').length;
  const grid = document.querySelector('.codepick .cpopts');
  const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
  const rows = document.querySelectorAll('.codepick .cprow').length;
  return { opts, cols, rows };
});
const boxOf = async (page, sel) => page.locator(sel).first().boundingBox();

// Juega una transmisión completa. `intercept`: si true, el rival ACIERTA el
// código; el propio equipo siempre acierta. Devuelve el estado en 'reveal'.
let checkedDecodeUi = false;
let checkedClueUi = false;
let checkedInterceptUi = false;
let decodeShape = null; // silueta del selector al DESCIFRAR, para comparar
async function transmit(s, { rivalIntercepts }) {
  const active = s.active;
  const code = s.code;
  const enc = encoderOf(s, active);
  await pg(enc).click('[data-a=de-clue-0]', { timeout: 15000 });
  await pg(enc).fill('[data-a=de-clue-0]', 'pista uno');
  await pg(enc).fill('[data-a=de-clue-1]', 'pista dos');
  await pg(enc).fill('[data-a=de-clue-2]', 'pista tres');
  if (!checkedClueUi) {
    checkedClueUi = true;
    // U6: el encriptador lee en claro lo que va a transmitir (pista → cifra y
    // palabra) ANTES de soltarlo; el botón sigue apagado hasta las tres.
    const say = await pg(enc).locator('[data-a=de-clue-say]').innerText();
    check(/pista uno/i.test(say) && say.includes(code.join('-')), 'el encriptador ve en claro lo que va a transmitir antes de darlo');
    // P1 (postura): el código sigue a mano, pero avisado y en pequeño; y el aviso
    // de arriba le dice que esa pantalla no la puede ver NADIE, ni los suyos.
    const codeBox = await pg(enc).locator('[data-a=de-code]').innerText();
    check(code.every((d) => codeBox.includes(String(d))), 'el encriptador tiene su código a la vista, dentro del recuadro avisado');
    check(await pg(enc).locator('[data-a=de-shield][data-p=solo]').count() === 1, 'al encriptador se le avisa de que el código no lo ve nadie, ni los suyos');
    const mate = teamMembers(s, active).find((p) => p !== enc);
    check(await pg(mate).locator('[data-a=de-shield][data-p=team]').count() === 1, 'a sus compañeros se les avisa de que la pantalla es solo para el equipo');
  }
  await pg(enc).click('[data-a=de-clue-give]:not([disabled])');
  s = await waitState(pages.ana, (x) => x.phase === 'intercept' || x.phase === 'decode', 'pistas registradas');
  if (s.phase === 'intercept') {
    const rival = teamMembers(s, other(active)).find((p) => true);
    const guess = rivalIntercepts ? code : [code[1], code[0], code[2]];
    await pg(rival).waitForSelector('[data-a=de-intercept]', { timeout: 15000 });
    if (!checkedInterceptUi) {
      checkedInterceptUi = true;
      // P2 (chivatos): interceptar y descifrar dan la MISMA silueta —3 filas, 12
      // casillas, rejilla de 2 columnas—, así que desde el otro lado de la mesa
      // no se puede leer qué está haciendo el equipo de enfrente.
      const shape = await pickerShape(pg(rival));
      check(shape.opts === 12 && shape.rows === 3 && shape.cols === 2, 'interceptando salen 3 filas de 4 casillas en 2 columnas');
      if (decodeShape) check(shape.cols === decodeShape.cols && shape.opts === decodeShape.opts && shape.rows === decodeShape.rows,
        'interceptar y descifrar tienen la MISMA silueta (no se lee de lejos qué haces)');
      const w = await pg(rival).locator('[data-a=de-digit][data-p="0-1"] .cpw').innerText();
      check(w.includes('¿?'), 'quien intercepta no ve las palabras del rival: solo «¿?»');
    }
    await setCode(pg(rival), guess);
    await pg(rival).click('[data-a=de-intercept]:not([disabled])');
    s = await waitState(pages.ana, (x) => x.phase === 'decode', 'a descifrar');
  }
  // Descifra el propio equipo (no el encriptador): acierta siempre.
  const decoder = teamMembers(s, active).find((p) => p !== enc);
  await pg(decoder).waitForSelector('[data-a=de-decode]', { timeout: 15000 });
  const firstUi = !checkedDecodeUi;
  if (firstUi) {
    checkedDecodeUi = true;
    // U5: al encriptador se le pide silencio (antes veía el cartel del rival).
    const silenced = await pg(enc).waitForSelector('text=/ahora/i', { timeout: 10000 }).catch(() => null);
    check(!!silenced && /calla/i.test(await pg(enc).innerText('body')), 'al encriptador se le dice que calle mientras su equipo descifra');
    // U3: cada fila del selector es una pista, no una «Cifra n» anónima.
    const row = await pg(decoder).locator('.cplabel').first().innerText();
    check(/pista/i.test(row) && /pista uno/i.test(row), 'el selector rotula cada fila con la pista que se está colocando');
    const digit = await pg(decoder).locator('[data-a=de-digit][data-p="0-1"]').innerText();
    check(digit.trim().length > 1, 'quien descifra ve el nombre de la palabra en los botones 1-4');
    decodeShape = await pickerShape(pg(decoder));
  }
  await setCode(pg(decoder), code);
  if (firstUi) {
    // U6: nada se registra a ciegas: con las tres cifras puestas se lee la
    // apuesta entera en claro («…«pista uno» → palabra nº 4…»).
    const say = await pg(decoder).locator('[data-a=de-guess-say]').innerText();
    check(/palabra nº/i.test(say) && say.includes(code.join('-')), 'al completar el código se lee la apuesta en claro, pista por pista');
  }
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
  // B29: el lobby tiene un solo trabajo y tres caminos (jugar, aprender,
  // consultar); el nombre del juego sale UNA vez, en la cabecera.
  check(await ana.locator('h2:has-text("Decrypto")').count() === 1 && await ana.locator('.card h3').count() === 0, 'el lobby no repite el nombre del juego debajo de la cabecera');
  for (const a of ['open-start', 'open-demo', 'de-open-help']) check(await ana.locator(`[data-a=${a}]`).count() === 1, `el lobby ofrece «${a}»`);
  // P0 (postura): la mesa sabe cómo se sostiene el móvil antes de repartir.
  check(/rival/i.test(await ana.locator('[data-a=de-posture]').innerText()), 'el lobby avisa de la postura: pantalla de equipo, tapada al rival');
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

  // ——— U7: marcador público (fichas y quién juega en cada equipo, sin title=) ———
  check(await pg(redP).locator('[data-a=de-tokens]').count() === 2, 'el marcador enseña las fichas de los dos equipos');
  const redBoard = await pg(redP).locator('[data-a=de-tokens][data-p=red]').innerText();
  check(/vosotros/i.test(redBoard), 'el marcador dice cuál es TU equipo y quién va en él');

  // ——— P3 (postura): arriba solo lo público; lo secreto, al pie ———
  const bShield = await boxOf(pg(redP), '[data-a=de-shield]');
  const bBoard = await boxOf(pg(redP), '[data-a=de-board]');
  const bWords = await boxOf(pg(redP), '[data-a=de-words]');
  check(!!bShield && !!bBoard && bShield.y < bBoard.y, 'el aviso de «quién puede mirar» va lo primero');
  check(!!bWords && !!bBoard && bWords.y > bBoard.y + bBoard.height, 'las 4 palabras van por debajo de lo público: nada secreto en la franja de arriba');

  // ——— Ronda 1: rojo y azul transmiten (sin intercepción en la ronda 1) ———
  s = await transmit(s, { rivalIntercepts: false });
  check(s.round === 1 && s.active === 'red', 'ronda 1: transmite primero el rojo');
  await pg(s.playerIds[0]).click('[data-a=de-next]');
  s = await waitState(ana, (x) => x.phase === 'clue' && x.active === 'blue', 'transmite el azul');
  s = await transmit(s, { rivalIntercepts: false });
  await pg(s.playerIds[0]).click('[data-a=de-next]');
  s = await waitState(ana, (x) => x.round === 2 && x.active === 'red', 'ronda 2 (ya hay intercepción)');
  ok('ronda 1 completa; en la 2 ya se puede interceptar');

  // ——— U1: la hoja de pistas (4 filas por equipo, ya emparejadas) ———
  await pg(redP).waitForFunction(() => document.querySelectorAll('[data-a=de-sheet-clue]').length === 6, null, { timeout: 15000 }).catch(() => {});
  check(await pg(redP).locator('[data-a=de-sheet]').count() === 2, 'la hoja de pistas trae un bloque por equipo');
  check(await pg(redP).locator('[data-a=de-sheet] [data-a=de-sheet-clue]').count() === 6, 'la hoja acumula las 6 pistas de la ronda 1');
  check(await pg(redP).locator('[data-a=de-sheet][data-p=red] .dhrow').count() === 4, 'cada equipo tiene sus 4 filas, una por palabra');
  // U2: el encriptador ve lo que su equipo ya dijo para cada número (dos códigos
  // de 3 cifras sobre 4 comparten al menos 2 números, así que siempre hay algo).
  const enc2 = encoderOf(s, 'red');
  await pg(enc2).waitForSelector('[data-a=de-clue-0]', { timeout: 15000 });
  check(await pg(enc2).locator('[data-a=de-past-clues]').count() >= 1, 'el encriptador ve las pistas previas de su equipo para ese número');
  // R3: el tope de rondas es visible.
  check(/Ronda 2 de 8/.test(await pg(redP).innerText('body')), 'la cabecera dice en qué ronda vais de las 8');

  // ——— Ronda 2+: el AZUL intercepta al rojo dos veces → gana el azul ———
  for (let guard = 0; guard < 6 && !s.winner; guard++) {
    s = await st();
    if (s.phase === 'end') break;
    // Cuando transmite el rojo, el azul intercepta; cuando transmite el azul, nadie.
    s = await transmit(s, { rivalIntercepts: s.active === 'red' });
    if (s.phase === 'end') break;
    // R2: la transmisión que decide la partida TAMBIÉN se destapa; antes se
    // saltaba a la pantalla final sin que nadie viera el código.
    if (s.tokens.blue.intercepts >= 2 || s.tokens.red.intercepts >= 2) {
      check(s.phase === 'reveal', 'la transmisión ganadora se destapa antes del final');
      check(/desenlace/i.test(await pg(s.playerIds[0]).locator('[data-a=de-next]').innerText()), 'el botón avisa de que lo siguiente es el desenlace');
    }
    await pg(s.playerIds[0]).click('[data-a=de-next]').catch(() => {});
    await waitState(pages.ana, (x) => x.phase !== 'reveal', 'siguiente transmisión').catch(() => {});
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(s.winner === 'blue', 'el azul gana al interceptar dos veces');
  check(s.tokens.blue.intercepts >= 2, 'el azul acumuló 2 intercepciones');
  check(s.log.some((t) => /gana/i.test(t)), 'la voz anuncia el ganador');
  await ana.waitForSelector('text=/Cómo ha quedado/');
  // U4 + H2: al final se destapan las 8 palabras (el «ahhh, era Faro») y se ve
  // el marcador de la mesa; la hoja de pistas sigue en pantalla.
  await pg(redP).waitForSelector('[data-a=de-final-words]', { timeout: 15000 });
  check(await pg(redP).locator('[data-a=de-final-words] .deword').count() === 8, 'al final se destapan también las palabras del rival');
  await pg(redP).waitForSelector('text=/Marcador de la mesa/');
  check(await pg(redP).locator('[data-a=de-sheet]').count() === 2, 'la hoja de pistas sigue visible en el final');
  ok('partida completa de Decrypto');

  // Limpieza (y U8: desde la partida se llega a «🪑 La mesa» para rescatar un
  // móvil apagado, que dentro de la partida la URL ya no lleva al lobby).
  await ana.click('[data-a=game-menu]');
  check(await ana.locator('[data-a=table-open]').count() === 1, 'el menú ⋯ ofrece «🪑 La mesa»');
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
