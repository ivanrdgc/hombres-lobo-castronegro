// E2E de «Shadow Hunters»: 4 jugadores (Ana narra y juega). God-view (el doc
// tiene las identidades): catálogo → empezar → pista secreta (solo la leen
// quien la da y quien la recibe) → revelarse con poder → ataques a dados hasta
// el final. Verifica la FUGA: identidades ocultas para el resto; 🎴 siempre.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, chars: g.chars, hp: g.hp,
    alive: g.alive, revealed: g.revealed, turn: g.turn, pista: g.pista, killsBy: g.killsBy,
    winner: g.winner, winners: g.winners, scores: g.scores, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(120); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, turn: last.turn, winner: last.winner, hp: last.hp }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);
// Facciones espejo del motor (chars.ts) para dirigir la partida en god-view.
const FACTION = { georg: 'hunter', franklin: 'hunter', fuka: 'hunter', vampiro: 'shadow', licantropo: 'shadow', valquiria: 'shadow', allie: 'neutral', bob: 'neutral' };
const POWER_TARGET = { georg: true, franklin: true, fuka: true, vampiro: true, licantropo: false, valquiria: false, allie: false, bob: true };
// Trozo del poder de cada personaje: el panel de turno debe enseñarlo (antes
// había que recordar de memoria qué hacía tu propio personaje).
const POWER_HINT = {
  georg: '2 de daño', franklin: 'un dado de daño', fuka: 'curas 3 puntos', vampiro: 'robas 2 puntos',
  licantropo: 'te curas 3 puntos', valquiria: 'TODOS los demás vivos', allie: 'te curas del todo', bob: '2 de daño',
};

try {
  const GROUP = 'SH ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=shadow_hunters]');
  await ana.waitForSelector('[data-a=sh-open-help]');
  ok('el catálogo ofrece Shadow Hunters y su lobby carga');
  await ana.click('[data-a=sh-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=sh-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=sh-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=sh-start]');

  let s = await waitState(ana, (x) => x.phase === 'turn', 'primer turno');
  NAMES = s.names;
  check(s.playerIds.length === 4, '4 jugadores');
  const factions = s.playerIds.map((p) => FACTION[s.chars[p]]);
  check(factions.filter((f) => f === 'hunter').length === 2 && factions.filter((f) => f === 'shadow').length === 2,
    'con 4: dos Cazadores y dos Sombras');
  check(Object.values(s.hp).every((h) => h === 8), 'todos con 8 puntos de vida');
  check(s.log.some((t) => /^🎬 Turno de /.test(t)), 'el diario dice de quién es el turno desde la primera línea');

  // ——— FUGA: identidades ajenas ocultas; 🎴 muestra la tuya en cualquier momento ———
  const someone = s.playerIds.find((p) => p !== s.turn);
  const hidden = await pg(someone).locator('.shid.back').count();
  check(hidden === 3, `las identidades ajenas van ocultas (${hidden} de 3)`);
  check(await pg(someone).locator('.shid.priv').count() === 1, 'la tuya se ve solo en tu tablero (privada)');
  await pg(someone).click('[data-a=open-mycard]');
  await pg(someone).waitForSelector('text=/Tu personaje/');
  check(await pg(someone).locator('.modal .settingrow').count() >= 16, 'el 🎴 lleva la chuleta de los 8 personajes Y las 8 cartas de pista');
  const cardTxt = await pg(someone).locator('.modal').innerText();
  check(/Sois 4:[\s\S]*Cazadores[\s\S]*Sombras/.test(cardTxt), 'el 🎴 dice el reparto REAL de esta partida (4 → 2 y 2)');
  await pg(someone).click('.modal [data-a=close-modal]');
  ok('el 🎴 enseña tu personaje en cualquier momento');
  check(/Sois 4:/.test(await pg(someone).innerText('body')), 'el reparto también se ve bajo el tablero');

  // ——— El panel de turno DICE lo que hace cada acción (B25/B26) ———
  s = await st();
  const actor0 = s.turn;
  await pg(actor0).waitForSelector('[data-a=sh-mode-pista]', { timeout: 15000 });
  const panel0 = await pg(actor0).innerText('.actionpanel');
  check(/dado de 6 y otro de 4/.test(panel0) && /DIFERENCIA/.test(panel0), 'el panel explica los dados del ataque sin tener que recordarlos');
  check(/1 de cada 6/.test(panel0), 'y dice lo que se arriesga (el fallo por empate)');
  check(/8 cartas/.test(panel0) && /EN SECRETO/.test(panel0), 'la pista explica que la carta se enseña en secreto');
  check(/Tu poder/.test(panel0) && panel0.includes(POWER_HINT[s.chars[actor0]]), 'tu propio poder está a la vista en el panel (ya no se recuerda de memoria)');
  check(await pg(actor0).locator('[data-a=sh-ref]').count() === 1, 'la referencia de personajes y pistas se consulta desde el propio panel');
  check(await pg(actor0).locator('[data-a=sh-do]').count() === 0, 'sin acción elegida no hay botón de confirmar');

  // ——— Pista secreta: la leen quien la da y quien la recibe; el resto, el resultado ———
  const giver = s.turn;
  const receiver = s.playerIds.find((p) => p !== giver);
  await pg(giver).click('[data-a=sh-mode-pista]');
  check(await pg(giver).locator('[data-a=sh-do][disabled]').count() === 1, 'elegida la acción, confirmar sigue bloqueado hasta elegir objetivo');
  const tgtTxt = await pg(giver).innerText('[data-a=sh-pista-target][data-p="' + receiver + '"]');
  check(/❤️ \d+ de 8/.test(tgtTxt), 'cada objetivo lleva su vida en el propio botón');
  await pg(giver).click(`[data-a=sh-pista-target][data-p="${receiver}"]`);
  // Nada irreversible de un solo toque: el botón final NOMBRA la consecuencia.
  const doTxt = await pg(giver).innerText('[data-a=sh-do]');
  check(doTxt.includes(NAMES[receiver]), 'el botón de confirmar nombra a quién le das la pista');
  await pg(giver).click('[data-a=sh-do]');
  s = await waitState(ana, (x) => !!x.pista, 'pista registrada');
  check(s.pista.by === giver && s.pista.target === receiver, 'la pista queda registrada (quién la dio y a quién)');
  await pg(receiver).waitForSelector('[data-a=sh-pista-ok]', { timeout: 15000 });
  check(await pg(receiver).locator('text=/Si eres|Si NO eres/').count() >= 1, 'quien la recibe LEE el texto de la carta');
  const pistaTxt = await pg(receiver).innerText('.pistacard');
  check(/solo la leéis dos/.test(pistaTxt), 'la carta dice en pantalla que solo la leéis vosotros dos');
  check(/pierdes 1 punto|te curas 1 punto|No te afecta|dejado a 0/.test(pistaTxt), 'y dice qué efecto acaba de aplicarse (en segunda persona)');
  check(await pg(giver).locator('[data-a=sh-pista-ok]').count() === 1, 'quien la dio también la lee');
  const third = s.playerIds.find((p) => p !== giver && p !== receiver);
  check(await pg(third).locator('[data-a=sh-pista-ok]').count() === 0, 'nadie más ve el texto de la pista');
  check(s.log.some((t) => /entrega una pista/.test(t)), 'la mesa solo oye el resultado');
  // El que la DA pulsa primero (es el jugador activo: siempre iba por delante):
  // la carta debe seguir en la pantalla del que la recibe hasta que él la lea.
  await pg(giver).click('[data-a=sh-pista-ok]');
  s = await waitState(ana, (x) => !!x.pista && (x.pista.ack || []).includes(giver), 'acuse de recibo del que la dio');
  check(!!s.pista, 'la pista NO se borra cuando solo la ha cerrado quien la dio');
  check(await pg(receiver).locator('[data-a=sh-pista-ok]').count() === 1, 'quien la recibe sigue teniendo su «Entendido» (y el texto)');
  check(await pg(receiver).locator('text=/Si eres|Si NO eres/').count() >= 1, 'y sigue LEYENDO el texto de la carta');
  await pg(giver).waitForSelector('[data-a=sh-pista-ok]', { state: 'detached', timeout: 10000 });
  ok('quien ya la leyó deja de ver el botón (la carta sigue en su pantalla)');
  await pg(receiver).click('[data-a=sh-pista-ok]');
  await waitState(ana, (x) => !x.pista, 'la pista se retira cuando la han leído los dos');
  ok('la pista solo desaparece cuando la han acusado ambos');

  // ——— Revelarse: identidad pública + poder ———
  s = await st();
  const revealer = s.turn;
  const rchar = s.chars[revealer];
  await pg(revealer).waitForSelector('[data-a=sh-mode-reveal]:not([disabled])', { timeout: 15000 });
  await pg(revealer).click('[data-a=sh-mode-reveal]');
  if (POWER_TARGET[rchar]) {
    const tgt = s.playerIds.find((p) => p !== revealer && s.alive[p]);
    await pg(revealer).click(`[data-a=sh-reveal-target][data-p="${tgt}"]`);
  }
  check(/Al confirmar/.test(await pg(revealer).innerText('.actionpanel')), 'antes de confirmar se lee en claro lo que va a pasar');
  await pg(revealer).click('[data-a=sh-do]');
  s = await waitState(ana, (x) => x.revealed[revealer] || x.phase === 'end', 'revelado');
  check(s.revealed[revealer], 'el personaje queda revelado');
  check(s.log.some((t) => /se revela/.test(t)), 'la voz anuncia la revelación');
  if (s.phase !== 'end') {
    const other = s.playerIds.find((p) => p !== revealer);
    check(await pg(other).locator('.shid.pub').count() >= 1, 'la identidad revelada se ve pública en todos los tableros');
    // Saber que Bea es «Vampiro» no sirve si hay que recordar de qué bando es.
    const pubTxt = await pg(other).locator('.shid.pub').first().innerText();
    check(/Cazador|Sombra|Neutral/.test(pubTxt), 'la pastilla destapada dice también DE QUÉ BANDO es');
    const boardTxt = await pg(other).innerText('.shboard');
    check(/❤️ \d+ de 8/.test(boardTxt), 'el tablero lleva la vida de cada uno sobre el total');
    check(/Destapados/.test(await pg(other).innerText('body')), 'y bajo el tablero, cuántos van destapados de cada bando');
  }

  // ——— Ataques dirigidos (god-view) hasta el final: caza de Sombras ———
  for (let guard = 0; guard < 200; guard++) {
    s = await st();
    if (s.phase === 'end') break;
    if (s.pista) { // hace falta el acuse de LOS DOS para que se retire
      await pg(s.pista.target).click('[data-a=sh-pista-ok]').catch(() => {});
      await pg(s.pista.by).click('[data-a=sh-pista-ok]').catch(() => {});
    }
    const actor = s.turn;
    const shadows = s.playerIds.filter((p) => s.alive[p] && FACTION[s.chars[p]] === 'shadow' && p !== actor);
    const target = shadows[0] || s.playerIds.find((p) => s.alive[p] && p !== actor);
    await pg(actor).waitForSelector('[data-a=sh-mode-attack]', { timeout: 15000 });
    await pg(actor).click('[data-a=sh-mode-attack]');
    await pg(actor).click(`[data-a=sh-attack-target][data-p="${target}"]`);
    await pg(actor).click('[data-a=sh-do]');
    await waitState(ana, (x) => x.turn !== actor || x.phase === 'end', 'pasa el turno');
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(!!s.winner, `hay facción ganadora (${s.winner})`);
  check(s.log.some((t) => /Ganan|Empate/.test(t)), 'la voz anuncia el desenlace');
  // El diario se lee de oído: sin flechas ni tres cifras seguidas.
  check(s.log.some((t) => /ataca a .*: saca \d y \d/.test(t)), 'los ataques se cantan «saca X y Y»');
  check(!s.log.some((t) => /→/.test(t)), 'ninguna línea del diario lleva flechas');
  check(s.log.filter((t) => /^🎬 Turno de /.test(t)).length >= 3, 'cada turno se anuncia en el diario');
  check(Object.values(s.revealed).every(Boolean), 'al final se destapan todas las identidades');
  await ana.waitForSelector('text=/Marcador/');
  for (const w of s.winners) check((s.scores[w] || 0) >= 1, `${NAMES[w]} puntúa`);
  ok('partida completa de Shadow Hunters');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  check(await ana.locator('[data-a=table-open]').count() === 1, 'el menú ⋯ ofrece «🪑 La mesa» (rescate del móvil sin batería)');
  await ana.click('[data-a=sh-end-open]');
  await ana.waitForSelector('[data-a=sh-end-confirm]');
  await ana.click('[data-a=sh-end-confirm]');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failsh-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-shadow-hunters con ${fail} fallos` : '\n✔ E2E-shadow-hunters OK');
process.exit(fail ? 1 : 0);
