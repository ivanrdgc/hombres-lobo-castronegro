// E2E de «Wavelength»: 3 jugadores (Ana, Bea, Carlos) + Dani, el dispositivo
// que PONE LA VOZ SIN JUGAR (el que suele quedarse en el centro de la mesa).
// Cooperativo, god-view (el doc tiene el objetivo secreto del dial): catálogo →
// empezar con meta → ronda (cambiar espectro, pista escrita, marcador
// COMPARTIDO y doble confirmación) → saltar una ronda desde ⋯ → última ronda →
// resumen final → terminar. Vigila la FUGA del objetivo: la diana solo puede
// pintarse en el móvil del Psíquico, nunca en el del narrador ni en el de un
// espectador.
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
    clueText: g.clueText, pick: g.pick, marker: g.marker, lastScore: g.lastScore,
    scores: g.scores, psychicRounds: g.psychicRounds, teamScore: g.teamScore,
    scored: g.scored, goal: g.goal,
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
// Arrastra el marcador del dial hasta ~pct del ancho (pointerdown + pointerup:
// el dial publica la marca al SOLTAR).
async function moveDial(page, pct) {
  const box = await page.locator('[data-a=wl-bar]').boundingBox();
  await page.mouse.move(box.x + box.width * pct, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * pct, box.y + box.height / 2);
  await page.mouse.up();
}
// La diana (bandas .zone) es el secreto de la ronda: contarlas delata la fuga.
const zones = (page) => page.locator('.zone').count();

try {
  const GROUP = 'WL ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos', 'Dani']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (4)');
  const dani = pages.dani;

  await ana.click('button[data-a=select-game][data-p=wavelength]');
  await ana.waitForSelector('[data-a=wl-open-help]');
  ok('el catálogo ofrece Wavelength y su lobby carga');
  await ana.click('[data-a=wl-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=wl-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  check(await ana.locator('.modal >> text=/Saltar ronda/').count() >= 1, 'la ayuda cuenta cómo se acaba y las salidas del menú ⋯');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  // Dani pone la voz pero NO juega: se queda fuera del asiento y coge el 🔊.
  await ana.click('.player[data-a=start-player][data-p=p-dani]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-dani].off');
  await ana.click('button[data-a=pick-narrator][data-p=p-dani]');
  await ana.waitForSelector('button.primary[data-a=pick-narrator][data-p=p-dani]');
  // Meta: una vuelta a la mesa (3 jugadores → 3 rondas).
  await ana.click('[data-a=wl-goal][data-p="0"]');
  await ana.waitForSelector('[data-a=wl-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=wl-start]');

  let s = await waitState(ana, (x) => x.phase === 'clue', 'primera ronda (pista)');
  NAMES = s.names;
  check(s.playerIds.length === 3, '3 jugadores en la partida (Dani solo pone la voz)');
  check(!!s.goal && s.goal.kind === 'rounds' && s.goal.n === 3, `la meta viaja en la partida (${s.goal && s.goal.label})`);
  await dani.waitForSelector('[data-a=game-menu]');
  ok('el dispositivo de la voz entra en la partida sin jugar');
  const firstPsychic = psychicOf(s);

  // B19/B21: el botón flotante 🎴 abre «mi carta + referencia» en CUALQUIER fase.
  await ana.click('[data-a=open-mycard]');
  await ana.waitForSelector('text=/Tu papel en esta ronda/');
  check(await ana.locator('text=/Puntos por cercanía/').count() >= 1, 'el 🎴 muestra tu papel y la chuleta del juego');
  await ana.click('.modal [data-a=close-modal]');
  await ana.waitForSelector('[data-a=open-mycard]');
  ok('el 🎴 se abre y se cierra en mitad de la fase de pista');

  // B26: «🪑 La mesa» desde DENTRO de la partida (rescate del móvil sin batería:
  // aquí la ronda se atasca si el Psíquico deja de dar señales).
  await dani.click('[data-a=game-menu]');
  await dani.click('[data-a=table-open]');
  await dani.waitForSelector('.modal [data-a=table-player]');
  check(await dani.locator('.modal [data-a=table-player]').count() === 4, 'el menú ⋯ ofrece «🪑 La mesa» con los cuatro dispositivos');
  await dani.click('.modal [data-a=close-modal]');

  // La cabecera dice a cuánto está la meta (no solo el número de ronda).
  check(await dani.locator('text=/Ronda 1 de 3/').count() >= 1, 'la cabecera lleva el progreso hacia la meta');

  // ——— Ronda 1: cambiar espectro, pista escrita, marca compartida ———
  s = await waitState(ana, (x) => x.phase === 'clue' && x.round === 1, 'ronda 1 en fase de pista');
  let psychic = psychicOf(s);
  let other = s.playerIds.find((pid) => pid !== psychic);
  const other2 = s.playerIds.find((pid) => pid !== psychic && pid !== other);
  check(await pg(psychic).locator('[data-a=wl-clue-done]').count() === 1, `solo el Psíquico (${NAMES[psychic]}) da la pista`);
  check(await pg(other).locator('[data-a=wl-clue-done]').count() === 0, 'el resto no puede dar la pista');
  // FUGA: la diana solo se pinta en el móvil del Psíquico. Ni el equipo, ni el
  // dispositivo de la voz que NO juega (está en el centro de la mesa).
  check(await zones(pg(psychic)) > 0, 'el Psíquico SÍ ve la diana en su dial');
  check(await zones(pg(other)) === 0, 'el equipo NO ve la diana (objetivo secreto)');
  check(await zones(dani) === 0, 'FUGA: el dispositivo de la voz que no juega NO ve la diana (pista)');
  // El Psíquico ve QUÉ se espera de él: el valor del objetivo y la chuleta de
  // la pista, sin salir de la pantalla en la que decide.
  const aim = `text=/Tu objetivo está en ${s.target}/`;
  check(await pg(psychic).locator(aim).count() >= 1, `el Psíquico ve su objetivo en números (${s.target})`);
  check(await pg(other).locator(aim).count() === 0, 'FUGA: el equipo no ve el número del objetivo');
  check(await pg(psychic).locator('[data-a=wl-ref-clue]').count() === 1, 'el panel del Psíquico lleva su chuleta «qué vale como pista»');

  // Salida no destructiva del Psíquico: otro espectro sin gastar la ronda.
  const spec0 = s.spectrumId;
  await pg(psychic).click('[data-a=wl-new-spectrum]');
  s = await waitState(ana, (x) => x.spectrumId !== spec0, 'el Psíquico cambia de espectro');
  check(s.round === 1 && s.phase === 'clue' && psychicOf(s) === psychic, '🔀 cambiar espectro no gasta la ronda ni rota el Psíquico');

  await pg(psychic).fill('[data-a=wl-clue-text]', 'una sauna');
  await pg(psychic).click('[data-a=wl-clue-done]');
  s = await waitState(ana, (x) => x.phase === 'guess' && x.round === 1, 'ronda 1 en fase de adivinar');
  check(s.clueText === 'una sauna', 'la pista escrita se publica a toda la mesa');
  check(await pg(other).locator('text=/una sauna/').count() >= 1, 'el equipo puede releer la pista durante el debate');
  check(await zones(dani) === 0, 'FUGA: el dispositivo de la voz tampoco ve la diana al adivinar');
  check(await zones(pg(other)) === 0, 'el equipo sigue sin ver la diana al adivinar');

  // Sin marca movida no se puede fijar (un toque accidental ya no cierra la ronda).
  check(s.pick === null, 'la ronda empieza SIN marca puesta');
  check(await pg(other).locator('[data-a=wl-guess-confirm][disabled]').count() === 1, 'no se puede fijar hasta mover el marcador');
  check(await pg(psychic).locator('[data-a=wl-guess-confirm]').count() === 0, 'el Psíquico no fija la marca');

  check(await pg(other).locator('[data-a=wl-ref-guess]').count() === 1, 'el panel del equipo lleva la chuleta de lo que puntúa cada franja');

  await moveDial(pg(other), 0.8);
  s = await waitState(ana, (x) => x.pick !== null, 'la marca del equipo se publica');
  const rough = s.pick;
  // Ajuste fino: la banda central mide ±4 y con el pulgar no se clava. (El ±1
  // suma sobre la marca que ya está publicada: se espera a verla en pantalla.)
  await pg(other).waitForFunction((v) => document.querySelector('[data-a=wl-value]')?.textContent === String(v), rough);
  await pg(other).click('[data-a=wl-nudge][data-p="1"]');
  s = await waitState(ana, (x) => x.pick === rough + 1, 'el botón +1 afina la marca');
  const shared = s.pick;
  check(shared === rough + 1, `el ±1 mueve la marca un punto sin arrastrar (${rough} → ${shared})`);
  const seen2 = await pg(other2).evaluate(() => window.__hlc.group.game.pick);
  check(seen2 === shared, `el marcador es COMPARTIDO: el resto del equipo ve el mismo (${shared})`);
  // Quién lo ha movido: en la mesa se ve la mano; en el móvil hay que decirlo.
  check(await pg(other).locator('text=/lo has puesto/').count() >= 1, 'quien mueve la marca ve que la puso él');
  check(await pg(other2).locator(`text=/lo movió ${NAMES[other]}/`).count() >= 1, `el resto del equipo ve quién la movió (${NAMES[other]})`);
  // Doble toque: el primero arma, el segundo fija.
  await pg(other).click('[data-a=wl-guess-confirm]');
  await pg(other).waitForSelector('[data-a=wl-guess-cancel]');
  check((await hlc(ana)).phase === 'guess', 'el primer toque NO cierra la ronda: pide confirmación');
  await pg(other).click('[data-a=wl-guess-confirm]');
  s = await waitState(ana, (x) => x.phase === 'result' && x.round === 1, 'ronda 1 en resultado');
  check(s.marker === shared, 'se fija la marca que veía toda la mesa');
  check(s.lastScore === expectScore(s.target, s.marker), `la puntuación cuadra con la cercanía (obj ${s.target}, marca ${s.marker} → ${s.lastScore})`);
  check((s.scores[psychic] || 0) >= s.lastScore, 'los puntos se los lleva el Psíquico de la ronda');
  check((s.psychicRounds[psychic] || 0) === 1 && s.scored === 1, 'el marcador cuenta las rondas que ha llevado cada Psíquico');
  check(await pg(other).locator('text=/una sauna/').count() >= 1, 'el resultado recuerda cuál era la pista');
  check(await ana.locator('[data-a=wl-finish]').count() === 0, 'con la meta sin cumplir no se ofrece el resumen final');

  // ——— Ronda 2: saltarla desde el menú ⋯ (cualquiera puede) ———
  await pg(psychic).click('[data-a=wl-again]');
  s = await waitState(ana, (x) => x.round === 2 && x.phase === 'clue', 'la segunda ronda arranca');
  check(psychicOf(s) !== firstPsychic, 'el Psíquico ROTA en la nueva ronda');
  const psychic2 = psychicOf(s);
  const notPsychic2 = s.playerIds.find((pid) => pid !== psychic2);
  await pg(notPsychic2).click('[data-a=game-menu]');
  await pg(notPsychic2).click('[data-a=wl-skip-open]');
  await pg(notPsychic2).waitForSelector('[data-a=wl-skip-confirm]');
  await pg(notPsychic2).click('[data-a=wl-skip-confirm]');
  s = await waitState(ana, (x) => x.round === 3 && x.phase === 'clue', 'la ronda saltada pasa el turno');
  check(s.scored === 1 && psychicOf(s) !== psychic2, '⏭️ saltar ronda no puntúa, rota el Psíquico y no borra el marcador');
  check(s.log.some((l) => /saltada/i.test(l)), 'el diario deja constancia de la ronda saltada');

  // ——— Ronda 3: se cumple la meta y sale el resumen final ———
  psychic = psychicOf(s);
  other = s.playerIds.find((pid) => pid !== psychic);
  await pg(psychic).click('[data-a=wl-clue-done]');
  s = await waitState(ana, (x) => x.phase === 'guess' && x.round === 3, 'ronda 3 en fase de adivinar');
  check(await zones(dani) === 0, 'FUGA: el dispositivo de la voz sigue sin ver la diana en la última ronda');
  await moveDial(pg(other), 0.35);
  await waitState(ana, (x) => x.pick !== null, 'marca de la ronda 3');
  await pg(other).click('[data-a=wl-guess-confirm]');
  await pg(other).waitForSelector('[data-a=wl-guess-cancel]');
  await pg(other).click('[data-a=wl-guess-confirm]');
  s = await waitState(ana, (x) => x.phase === 'result' && x.round === 3, 'ronda 3 en resultado');
  check(s.teamScore >= 0 && s.scored === 2, `el total del equipo se acumula (${s.teamScore} en ${s.scored} rondas puntuadas)`);
  check(await ana.locator('[data-a=wl-finish]').count() === 1, 'cumplida la meta, la mesa puede ver el resumen final');
  await ana.click('[data-a=wl-finish]');
  s = await waitState(ana, (x) => x.phase === 'end', 'resumen final');
  check(await ana.locator('text=/puntos de equipo/').count() >= 1, 'el resumen final muestra el total del equipo antes de borrar nada');
  check(await ana.locator('[data-a=wl-score-row]').count() === 3, 'el resumen lista a los tres en orden de mesa');
  check(await dani.locator('text=/puntos de equipo/').count() >= 1, 'el dispositivo de la voz también ve el resumen');
  ok('partida completa de Wavelength con meta, ronda saltada y resumen');

  // Limpieza.
  await ana.click('[data-a=wl-back-lobby]');
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
