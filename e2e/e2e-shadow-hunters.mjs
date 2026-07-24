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
  check(Object.values(s.hp).every((h) => h === 10), 'todos con 10 puntos de vida');

  // ——— FUGA: identidades ajenas ocultas; 🎴 muestra la tuya en cualquier momento ———
  const someone = s.playerIds.find((p) => p !== s.turn);
  const hidden = await pg(someone).locator('.shid.back').count();
  check(hidden === 3, `las identidades ajenas van ocultas (${hidden} de 3)`);
  check(await pg(someone).locator('.shid.priv').count() === 1, 'la tuya se ve solo en tu tablero (privada)');
  await pg(someone).click('[data-a=open-mycard]');
  await pg(someone).waitForSelector('text=/Tu personaje/');
  check(await pg(someone).locator('.modal .settingrow').count() >= 8, 'el 🎴 lleva la chuleta de TODOS los personajes');
  await pg(someone).click('.modal [data-a=close-modal]');
  ok('el 🎴 enseña tu personaje en cualquier momento');

  // ——— Pista secreta: la leen quien la da y quien la recibe; el resto, el resultado ———
  s = await st();
  const giver = s.turn;
  const receiver = s.playerIds.find((p) => p !== giver);
  await pg(giver).waitForSelector('[data-a=sh-mode-pista]', { timeout: 15000 });
  await pg(giver).click('[data-a=sh-mode-pista]');
  await pg(giver).click(`[data-a=sh-pista-target][data-p="${receiver}"]`);
  s = await waitState(ana, (x) => !!x.pista, 'pista registrada');
  check(s.pista.by === giver && s.pista.target === receiver, 'la pista queda registrada (quién la dio y a quién)');
  await pg(receiver).waitForSelector('[data-a=sh-pista-ok]', { timeout: 15000 });
  check(await pg(receiver).locator('text=/Si eres|Si NO eres/').count() >= 1, 'quien la recibe LEE el texto de la carta');
  check(await pg(giver).locator('[data-a=sh-pista-ok]').count() === 1, 'quien la dio también la lee');
  const third = s.playerIds.find((p) => p !== giver && p !== receiver);
  check(await pg(third).locator('[data-a=sh-pista-ok]').count() === 0, 'nadie más ve el texto de la pista');
  check(s.log.some((t) => /entrega una pista/.test(t)), 'la mesa solo oye el resultado');
  await pg(receiver).click('[data-a=sh-pista-ok]');
  await pg(giver).click('[data-a=sh-pista-ok]').catch(() => {});

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
  s = await waitState(ana, (x) => x.revealed[revealer] || x.phase === 'end', 'revelado');
  check(s.revealed[revealer], 'el personaje queda revelado');
  check(s.log.some((t) => /se revela/.test(t)), 'la voz anuncia la revelación');
  if (s.phase !== 'end') {
    const other = s.playerIds.find((p) => p !== revealer);
    check(await pg(other).locator('.shid.pub').count() >= 1, 'la identidad revelada se ve pública en todos los tableros');
  }

  // ——— Ataques dirigidos (god-view) hasta el final: caza de Sombras ———
  for (let guard = 0; guard < 200; guard++) {
    s = await st();
    if (s.phase === 'end') break;
    if (s.pista) { // por si un relleno diera pista (no debería, pero por robustez)
      await pg(s.pista.target).click('[data-a=sh-pista-ok]').catch(() => {});
      await pg(s.pista.by).click('[data-a=sh-pista-ok]').catch(() => {});
    }
    const actor = s.turn;
    const shadows = s.playerIds.filter((p) => s.alive[p] && FACTION[s.chars[p]] === 'shadow' && p !== actor);
    const target = shadows[0] || s.playerIds.find((p) => s.alive[p] && p !== actor);
    await pg(actor).waitForSelector('[data-a=sh-mode-attack]', { timeout: 15000 });
    await pg(actor).click('[data-a=sh-mode-attack]');
    await pg(actor).click(`[data-a=sh-attack-target][data-p="${target}"]`);
    await waitState(ana, (x) => x.turn !== actor || x.phase === 'end', 'pasa el turno');
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(!!s.winner, `hay facción ganadora (${s.winner})`);
  check(s.log.some((t) => /Ganan/.test(t)), 'la voz anuncia el desenlace');
  check(Object.values(s.revealed).every(Boolean), 'al final se destapan todas las identidades');
  await ana.waitForSelector('text=/Marcador/');
  for (const w of s.winners) check((s.scores[w] || 0) >= 1, `${NAMES[w]} puntúa`);
  ok('partida completa de Shadow Hunters');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
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
