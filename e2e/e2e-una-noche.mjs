// E2E de «Una Noche en Castronegro»: partida completa a 4 jugadores con un
// mazo que incluye El Doble (👯), 2 lobos, Vidente, Ladrón, Alborotadora e
// Insomne (7 cartas = 4 jugadores + 3 centro). Verifica el cableado de punta a
// punta: catálogo → mazo (n+3) → reparto → noche por pasos (con fantasmas para
// los roles del centro) → amanecer → voto simultáneo → final con ganadores.
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
  await ctx.addInitScript(() => { window.__hlcTest = true; }); // e2e veloz: sin audio, colchones mínimos
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] ${e.message}`));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const g = window.__hlc.group?.game;
  return !g ? null : {
    phase: g.phase, stepIdx: g.stepIdx, steps: g.steps, playerIds: g.playerIds,
    originalRole: g.originalRole, slots: g.slots, center: g.center, names: g.names,
    seen: g.seen, votes: g.votes, votesRevealed: g.votesRevealed, deaths: g.deaths,
    winners: g.winners, acts: g.acts,
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, step: last.steps?.[last.stepIdx], winners: last.winners }));
  throw new Error('timeout esperando: ' + what);
}
const pg = (pid) => pages[(hlcNames[pid] || pid).toLowerCase()];
let hlcNames = {};

const vis = async (p, sel) => (await p.locator(sel).count()) > 0;
const clk = async (p, sel) => { try { await p.locator(sel).first().click({ timeout: 4000 }); } catch { /* desapareció */ } };
const firstSel = async (p) => clk(p, '.player[data-a=una-sel]');
async function twoSel(p) {
  const n = await p.locator('.player[data-a=una-sel]').count();
  for (let i = 0; i < Math.min(2, n); i++) await p.locator('.player[data-a=una-sel]').nth(i).click({ timeout: 4000 }).catch(() => {});
}

// Acción genérica de un dispositivo para el paso en curso (solo hace algo si su
// pantalla muestra el panel: los no-actores tienen un panel neutral sin botones).
async function actStep(p, step) {
  if (step === 'doble') {
    if (await vis(p, '[data-a=una-doble-copy]')) { await firstSel(p); await clk(p, '[data-a=una-doble-copy]'); await p.waitForTimeout(200); }
    if (await vis(p, '[data-a=una-dsee-player]')) { await firstSel(p); await clk(p, '[data-a=una-dsee-player]'); }
    else if (await vis(p, '[data-a=una-drob]')) { await firstSel(p); await clk(p, '[data-a=una-drob]'); }
    else if (await vis(p, '[data-a=una-dtm]')) { await twoSel(p); await clk(p, '[data-a=una-dtm]'); }
    else if (await vis(p, '[data-a=una-ddrink]')) { await clk(p, '[data-a=una-ddrink][data-p="0"]'); }
    await p.waitForTimeout(150);
    if (await vis(p, '[data-a=una-doble-ok]')) await clk(p, '[data-a=una-doble-ok]');
  } else if (step === 'lobos') { if (await vis(p, '[data-a=una-wolf-ok]')) await clk(p, '[data-a=una-wolf-ok]'); }
  else if (step === 'esbirro') { if (await vis(p, '[data-a=una-minion-ok]')) await clk(p, '[data-a=una-minion-ok]'); }
  else if (step === 'masones') { if (await vis(p, '[data-a=una-mason-ok]')) await clk(p, '[data-a=una-mason-ok]'); }
  else if (step === 'vidente') {
    if (await vis(p, '[data-a=una-seer-player]')) { await firstSel(p); await clk(p, '[data-a=una-seer-player]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-seer-ok]')) await clk(p, '[data-a=una-seer-ok]');
  } else if (step === 'ladron') {
    if (await vis(p, '[data-a=una-rob]')) { await firstSel(p); await clk(p, '[data-a=una-rob]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-rob-ok]')) await clk(p, '[data-a=una-rob-ok]');
  } else if (step === 'alborotadora') { if (await vis(p, '[data-a=una-tm-skip]')) await clk(p, '[data-a=una-tm-skip]'); }
  else if (step === 'borracho') { if (await vis(p, '[data-a=una-drink]')) await clk(p, '[data-a=una-drink][data-p="0"]'); }
  else if (step === 'insomne') {
    if (await vis(p, '[data-a=una-insomne-look]')) { await clk(p, '[data-a=una-insomne-look]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-insomne-ok]')) await clk(p, '[data-a=una-insomne-ok]');
  }
}

try {
  const GROUP = 'Una ' + Date.now().toString(36).slice(-5);
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

  // Catálogo → Una Noche.
  await ana.click('button[data-a=select-game][data-p=una_noche]');
  await ana.waitForSelector('[data-a=una-open-help]');
  ok('el catálogo ofrece Una Noche y su lobby carga');
  await ana.click('[data-a=una-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  await ana.click('button[data-a=close-modal]');

  // Empezar → mazo (7 cartas): recomendado y luego cambio cazador→doble.
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=una-start]');
  await ana.click('[data-a=una-fit]');
  await ana.click('[data-a=una-dec][data-p=cazador]');
  await ana.click('[data-a=una-inc][data-p=doble]');
  await ana.waitForSelector('[data-a=una-start]:not([disabled])', { timeout: 15000 });
  ok('mazo válido (7 cartas = 4 jugadores + 3 centro), con El Doble');
  await ana.click('[data-a=una-start]');

  // ——— Reparto ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  hlcNames = st.names;
  check(st.playerIds.length === 4, 'los 4 juegan');
  check(st.center.length === 3, '3 cartas en el centro');
  console.log('  roles:', st.playerIds.map((id) => `${st.names[id]}=${st.originalRole[id]}`).join(', '), '· centro:', st.center.join(','));
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=una-seen]', { timeout: 15000 });
    await p.click('[data-a=una-seen]');
    await p.waitForTimeout(150);
  }
  st = await waitState(ana, (s) => s.playerIds.every((pid) => (s.seen || {})[pid]), 'todos ven su carta');
  ok('los 4 confirman su carta inicial');
  await pg(st.playerIds[0]).waitForSelector('[data-a=una-begin-night]', { timeout: 15000 });
  await pg(st.playerIds[0]).click('[data-a=una-begin-night]');

  // ——— Noche: cada dispositivo actúa en el paso en curso (idempotente) ———
  st = await waitState(ana, (s) => s.phase === 'night', 'empieza la noche');
  const seenSteps = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    st = await hlc(ana);
    if (!st || st.phase !== 'night') break;
    const step = st.steps[st.stepIdx];
    seenSteps.add(step);
    if (step !== 'durmiendo' && step !== 'amanecer') {
      for (const pid of st.playerIds) await actStep(pg(pid), step);
    }
    await ana.waitForTimeout(350);
  }
  check(seenSteps.has('doble'), 'la noche pasó por el paso de El Doble (real o fantasma)');
  const dobleDealt = Object.values(st.originalRole).includes('doble');
  if (dobleDealt) check(!!st.acts.dobleRole, 'El Doble (repartido a un jugador) copió un rol: ' + st.acts.dobleRole);
  else ok('El Doble cayó en el centro: paso fantasma (nadie copia), como debe ser');

  // ——— Día: voto simultáneo. Concentramos los votos en un jugador para
  // provocar una muerte real (todos a playerIds[1], salvo él, que vota a [0]). ———
  st = await waitState(ana, (s) => s.phase === 'day', 'amanece (día)');
  ok('amanece y empieza el día');
  const victim = st.playerIds[1];
  for (const pid of st.playerIds) {
    const target = pid === victim ? st.playerIds[0] : victim;
    const p = pg(pid);
    await p.waitForSelector(`.player[data-a=una-sel][data-p="${target}"]`, { timeout: 15000 });
    await p.click(`.player[data-a=una-sel][data-p="${target}"]`);
    await p.click('[data-a=una-vote]');
    await p.waitForTimeout(150);
  }

  // ——— Final ———
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la partida');
  check(Array.isArray(st.winners) && st.winners.length > 0, 'hay bando(s) ganador(es): ' + JSON.stringify(st.winners));
  check((st.deaths || []).length >= 1, 'el voto concentrado provoca una muerte: ' + JSON.stringify((st.deaths || []).map((d) => st.names[d])));
  check(await ana.locator('[data-a=una-again]').count() > 0, 'la pantalla final ofrece otra partida');
  check(await ana.locator('text=/Las cartas, al final/').count() > 0, 'se revelan las cartas iniciales→finales');
  ok('partida completa de Una Noche');

  // Otra partida (revancha) re-reparte.
  await ana.click('[data-a=una-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal', 'revancha repartida');
  ok('la revancha reparte de nuevo con los mismos jugadores');

  // Terminar → lobby de Una Noche; limpieza de la mesa.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=una-end-open]');
  await ana.waitForSelector('[data-a=una-end-confirm]');
  await ana.click('[data-a=una-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Una Noche');
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=/Dispositivos/');
  await ana.click('[data-a=confirm-delete-group]');
  await ana.click('button[data-a=delete-group-confirm]');
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failuna-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-una-noche con ${fail} fallos` : '\n✔ E2E-una-noche OK');
process.exit(fail ? 1 : 0);
