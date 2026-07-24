// E2E de «Wavelength»: 3 jugadores (Ana narra y juega). Cooperativo, god-view
// (el doc tiene el objetivo secreto del dial): catálogo → empezar → ronda
// (el Psíquico da la pista, el equipo fija la marca, se puntúa por cercanía) →
// segunda ronda (rota el Psíquico) → terminar.
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
    psychicIdx: g.psychicIdx, spectrumId: g.spectrumId, target: g.target, clue: g.clue,
    marker: g.marker, lastScore: g.lastScore, scores: g.scores, teamScore: g.teamScore,
    log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(120); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, round: last.round }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const psychicOf = (s) => s.playerIds[s.psychicIdx % s.playerIds.length];
// Puntuación esperada (misma tabla que el motor).
const expectScore = (target, marker) => { const d = Math.abs(target - marker); return d <= 4 ? 4 : d <= 9 ? 3 : d <= 15 ? 2 : 0; };

try {
  const GROUP = 'WL ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=wavelength]');
  await ana.waitForSelector('[data-a=wl-open-help]');
  ok('el catálogo ofrece Wavelength y su lobby carga');
  await ana.click('[data-a=wl-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=wl-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=wl-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=wl-start]');

  let s = await waitState(ana, (x) => x.phase === 'clue', 'primera ronda (pista)');
  NAMES = s.names;
  check(s.playerIds.length === 3, '3 jugadores en la partida');
  const firstPsychic = psychicOf(s);

  for (let r = 1; r <= 2; r++) {
    s = await waitState(ana, (x) => x.phase === 'clue' && x.round === r, `ronda ${r} en fase de pista`);
    const psychic = psychicOf(s);
    // Solo el Psíquico ve el botón de «ya di la pista».
    check(await pg(psychic).locator('[data-a=wl-clue-done]').count() === 1, `ronda ${r}: solo el Psíquico (${NAMES[psychic]}) da la pista`);
    const other = s.playerIds.find((pid) => pid !== psychic);
    check(await pg(other).locator('[data-a=wl-clue-done]').count() === 0, 'el resto no puede dar la pista');
    // FUGA: la diana (bandas .zone del dial) solo se pinta en el móvil del Psíquico.
    check(await pg(psychic).locator('.zone').count() > 0, 'el Psíquico SÍ ve la diana en su dial');
    check(await pg(other).locator('.zone').count() === 0, 'el equipo NO ve la diana (objetivo secreto)');
    await pg(psychic).click('[data-a=wl-clue-done]');
    s = await waitState(ana, (x) => x.phase === 'guess' && x.round === r, `ronda ${r} en fase de adivinar`);
    // El equipo (un no-Psíquico) fija la marca; el Psíquico no puede.
    check(await pg(psychic).locator('[data-a=wl-guess-confirm]').count() === 0, 'el Psíquico no fija la marca');
    await pg(other).click('[data-a=wl-guess-confirm]');
    s = await waitState(ana, (x) => x.phase === 'result' && x.round === r, `ronda ${r} en resultado`);
    check(s.marker !== null && s.lastScore !== null, `ronda ${r}: se fija la marca y se puntúa`);
    check(s.lastScore === expectScore(s.target, s.marker), `ronda ${r}: la puntuación cuadra con la cercanía (obj ${s.target}, marca ${s.marker} → ${s.lastScore})`);
    check((s.scores[psychic] || 0) >= s.lastScore, 'los puntos se los lleva el Psíquico de la ronda');
    if (r < 2) {
      await pg(psychic).click('[data-a=wl-again]');
      s = await waitState(ana, (x) => x.round === 2 && x.phase === 'clue', 'la segunda ronda arranca');
      check(psychicOf(s) !== firstPsychic, 'el Psíquico ROTA en la nueva ronda');
    }
  }
  check(s.teamScore >= 0, `el total del equipo se acumula (${s.teamScore})`);
  ok('dos rondas completas de Wavelength');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=wl-end-open]');
  await ana.waitForSelector('[data-a=wl-end-confirm]');
  await ana.click('[data-a=wl-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Wavelength');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failwl-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-wavelength con ${fail} fallos` : '\n✔ E2E-wavelength OK');
process.exit(fail ? 1 : 0);
