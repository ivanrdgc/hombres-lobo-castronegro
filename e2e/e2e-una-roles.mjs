// E2E Una Noche · TODOS los roles de acción en una misma partida (7 jugadores,
// mazo de 10: Doble, 2 Lobos, Esbirro, 2 Masones, Vidente, Ladrón, Alborotadora
// y Borracho). Cada paso es real o fantasma según el reparto y NUNCA debe
// colgarse. Al final se verifica el INVARIANTE del motor (las cartas en sillas
// + centro son una permutación exacta del mazo), un EMPATE (condena doble) y
// que los ganadores coinciden con las reglas OFICIALES recalculadas aparte.
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
    composition: g.composition, seen: g.seen, lynched: g.lynched,
    pendingHunter: g.pendingHunter, deaths: g.deaths, winners: g.winners, acts: g.acts,
  };
});
async function waitState(page, fn, what, timeout = 90000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, step: last.steps?.[last.stepIdx], winners: last.winners }));
  throw new Error('timeout esperando: ' + what);
}
let hlcNames = {};
const pg = (pid) => pages[(hlcNames[pid] || pid).toLowerCase()];

const vis = async (p, sel) => (await p.locator(sel).count()) > 0;
const clk = async (p, sel) => { try { await p.locator(sel).first().click({ timeout: 4000 }); } catch { /* desapareció */ } };
const firstSel = async (p) => clk(p, '.player[data-a=una-sel]');
async function twoSel(p) {
  const n = await p.locator('.player[data-a=una-sel]').count();
  for (let i = 0; i < Math.min(2, n); i++) await p.locator('.player[data-a=una-sel]').nth(i).click({ timeout: 4000 }).catch(() => {});
}

// B28 · postura 🍽️ MESA: el panel del paso vive tras «👁 Abrir mi panel», que
// es el mismo botón en todos los móviles (al resto le dice «no es tu turno»).
async function openPanel(p) {
  if (await vis(p, '[data-a=una-open]:not([disabled])')) { await clk(p, '[data-a=una-open]'); await p.waitForTimeout(120); }
}

// Acción genérica del paso en curso (solo actúa quien ve botones).
async function actStep(p, step) {
  await openPanel(p);
  if (step === 'doble') {
    if (await vis(p, '[data-a=una-doble-copy]')) { await firstSel(p); await clk(p, '[data-a=una-doble-copy]'); await p.waitForTimeout(200); }
    // B25: primero se elige QUÉ se mira (jugador / centro) y luego a quién.
    if (await vis(p, '[data-a=una-dsee-mode][data-p=player]')) { await clk(p, '[data-a=una-dsee-mode][data-p=player]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-dsee-player]')) { await firstSel(p); await clk(p, '[data-a=una-dsee-player]'); }
    else if (await vis(p, '[data-a=una-drob]')) { await firstSel(p); await clk(p, '[data-a=una-drob]'); }
    else if (await vis(p, '[data-a=una-dtm]')) { await twoSel(p); await clk(p, '[data-a=una-dtm]'); }
    else if (await vis(p, '[data-a=una-ddrink]')) { await clk(p, '[data-a=una-ddrink][data-p="0"]'); }
    await p.waitForTimeout(150);
    if (await vis(p, '[data-a=una-doble-ok]')) await clk(p, '[data-a=una-doble-ok]');
  } else if (step === 'lobos') {
    // El lobo solitario mira una carta del centro antes de confirmar.
    if (await vis(p, '[data-a=una-wolf-peek]')) { await clk(p, '[data-a=una-wolf-peek][data-p="1"]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-wolf-ok]')) await clk(p, '[data-a=una-wolf-ok]');
  } else if (step === 'esbirro') { if (await vis(p, '[data-a=una-minion-ok]')) await clk(p, '[data-a=una-minion-ok]'); }
  else if (step === 'masones') { if (await vis(p, '[data-a=una-mason-ok]')) await clk(p, '[data-a=una-mason-ok]'); }
  else if (step === 'vidente') {
    // B25: «¿qué quieres mirar?» → objetivo → confirmar.
    if (await vis(p, '[data-a=una-seer-mode][data-p=player]')) { await clk(p, '[data-a=una-seer-mode][data-p=player]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-seer-player]')) { await firstSel(p); await clk(p, '[data-a=una-seer-player]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-seer-ok]')) await clk(p, '[data-a=una-seer-ok]');
  } else if (step === 'ladron') {
    if (await vis(p, '[data-a=una-rob]')) { await firstSel(p); await clk(p, '[data-a=una-rob]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-rob-ok]')) await clk(p, '[data-a=una-rob-ok]');
  } else if (step === 'alborotadora') {
    if (await vis(p, '[data-a=una-tm]')) { await twoSel(p); await clk(p, '[data-a=una-tm]'); }
  } else if (step === 'borracho') { if (await vis(p, '[data-a=una-drink]')) await clk(p, '[data-a=una-drink][data-p="2"]'); }
  else if (step === 'insomne') {
    if (await vis(p, '[data-a=una-insomne-look]')) { await clk(p, '[data-a=una-insomne-look]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-insomne-ok]')) await clk(p, '[data-a=una-insomne-ok]');
  }
}

// Reglas OFICIALES de One Night recalculadas aparte (contraste con el motor).
function expectedWinners(finals, deaths, pids) {
  const dead = new Set(deaths);
  const isWolf = (p) => finals[p] === 'lobo';
  const anyWolfInPlay = pids.some(isWolf);
  const wolfDied = pids.some((p) => dead.has(p) && isWolf(p));
  const tannerDied = pids.some((p) => dead.has(p) && finals[p] === 'tanner');
  const minionInPlay = pids.some((p) => finals[p] === 'esbirro');
  const out = [];
  if (tannerDied) out.push('tanner');
  if (wolfDied) out.push('pueblo');
  if (!wolfDied && !tannerDied) {
    if (anyWolfInPlay) out.push('lobos');
    else if (!deaths.length) out.push('pueblo');
    else if (minionInPlay) out.push(pids.some((p) => dead.has(p) && finals[p] !== 'esbirro') ? 'lobos' : 'pueblo');
    else out.push('nadie');
  }
  return out.length ? [...new Set(out)] : ['nadie'];
}
// Carta final por silla (regla oficial de la carta de El Doble).
const finalsOf = (st) => Object.fromEntries(st.playerIds.map((pid) => {
  const card = st.slots[pid];
  return [pid, card === 'doble' ? (st.acts.dobleRole || 'aldeano') : card];
}));

try {
  const GROUP = 'UnaR ' + Date.now().toString(36).slice(-5);
  const NAMES = ['Bea', 'Carlos', 'David', 'Elena', 'Fabio', 'Gema'];
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of NAMES) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (7)');
  await ana.click('button[data-a=select-game][data-p=una_noche]');
  await ana.waitForSelector('[data-a=una-open-deck]');

  // Mazo de 10: recomendado de 7 y ajuste → doble + 2 lobos + esbirro +
  // 2 masones + vidente + ladrón + alborotadora + borracho.
  await ana.click('[data-a=una-open-deck]');
  await ana.waitForSelector('[data-a=una-deck-fit]');
  await ana.click('[data-a=una-deck-fit]'); await ana.waitForTimeout(300);
  for (const sel of ['[data-a=una-deck-dec][data-p=cazador]', '[data-a=una-deck-dec][data-p=tanner]', '[data-a=una-deck-dec][data-p=insomne]',
    '[data-a=una-deck-inc][data-p=doble]', '[data-a=una-deck-inc][data-p=mason]', '[data-a=una-deck-inc][data-p=mason]']) {
    await ana.click(sel); await ana.waitForTimeout(250);
  }
  await ana.click('button[data-a=close-modal]');
  ok('mazo de 10 con TODOS los roles de acción salvo Insomne (ya cubierto en e2e-una-noche)');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=una-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=una-start]');

  // ——— Reparto ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  hlcNames = st.names;
  check(st.playerIds.length === 7 && st.center.length === 3, '7 jugadores + 3 cartas al centro');
  console.log('  roles:', st.playerIds.map((id) => `${st.names[id]}=${st.originalRole[id]}`).join(', '), '· centro:', st.center.join(','));
  for (const pid of st.playerIds) {
    const p = pg(pid);
    // B28: la carta se mira tras un gesto del dueño (cortina de privacidad).
    await p.waitForSelector('[data-a=una-open-card]', { timeout: 15000 });
    await p.click('[data-a=una-open-card]');
    await p.waitForSelector('[data-a=una-seen]', { timeout: 15000 });
    await p.click('[data-a=una-seen]'); await p.waitForTimeout(120);
  }
  st = await waitState(ana, (s) => s.playerIds.every((pid) => (s.seen || {})[pid]), 'todos confirman');
  await pg(st.playerIds[0]).waitForSelector('[data-a=una-begin-night]', { timeout: 15000 });
  await pg(st.playerIds[0]).click('[data-a=una-begin-night]');

  // ——— Noche: el guion incluye TODOS los pasos del mazo, en orden oficial ———
  st = await waitState(ana, (s) => s.phase === 'night', 'noche');
  const wantSteps = ['durmiendo', 'doble', 'lobos', 'esbirro', 'masones', 'vidente', 'ladron', 'alborotadora', 'borracho', 'amanecer'];
  check(JSON.stringify(st.steps) === JSON.stringify(wantSteps), 'guion nocturno exacto y en orden de despertar: ' + st.steps.join('→'));
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    st = await hlc(ana);
    if (!st || st.phase !== 'night') break;
    const step = st.steps[st.stepIdx];
    if (step !== 'durmiendo' && step !== 'amanecer') {
      for (const pid of st.playerIds) await actStep(pg(pid), step);
    }
    await ana.waitForTimeout(300);
  }
  st = await waitState(ana, (s) => s.phase === 'day', 'amanece sin colgarse en ningún paso');
  ok('la noche entera avanza (real o fantasma) sin quedarse colgada');

  // INVARIANTE del motor: sillas + centro = permutación EXACTA del mazo.
  const inPlay = [...st.playerIds.map((pid) => st.slots[pid]), ...st.center].sort();
  const deck = Object.entries(st.composition).flatMap(([r, n]) => Array(n).fill(r)).sort();
  check(JSON.stringify(inPlay) === JSON.stringify(deck), 'invariante: las cartas nunca se duplican ni se pierden en los intercambios');
  const dobleDealt = Object.values(st.originalRole).includes('doble');
  // R3: copie lo que copie (también un rol de grupo o pasivo), El Doble CIERRA
  // su turno a mano tras leer en qué se ha convertido.
  if (dobleDealt) check(!!st.acts.dobleRole && !!st.acts.dobleActionDone, 'El Doble copió y cerró su turno viendo qué era: ' + st.acts.dobleRole);
  else ok('El Doble quedó en el centro: su paso sonó igualmente (fantasma)');

  // ——— Día: EMPATE (condena doble registrada por una persona) ———
  const finals = finalsOf(st);
  const v1 = st.playerIds[1]; const v2 = st.playerIds[2]; // sin Cazador en el mazo: sin flecha
  const rp = pg(st.playerIds[0]);
  await rp.waitForSelector(`.player[data-a=una-sel][data-p="${v1}"]`, { timeout: 15000 });
  await rp.click(`.player[data-a=una-sel][data-p="${v1}"]`);
  await rp.click(`.player[data-a=una-sel][data-p="${v2}"]`);
  await rp.waitForSelector('text=/Condenar a 2/');
  ok('el botón refleja el empate («Condenar a 2»)');
  await rp.click('[data-a=una-vote]');
  st = await waitState(ana, (s) => s.phase === 'end', 'empate resuelto sin flecha');
  check((st.deaths || []).length === 2 && st.deaths.includes(v1) && st.deaths.includes(v2), 'caen LOS DOS empatados');

  // Ganadores del motor vs reglas oficiales recalculadas aparte.
  const want = expectedWinners(finals, st.deaths, st.playerIds).sort();
  check(JSON.stringify((st.winners || []).slice().sort()) === JSON.stringify(want),
    `ganadores oficiales: ${JSON.stringify(st.winners)} (esperado ${JSON.stringify(want)})`);

  // Historial completo en la pantalla final: un bloque por jugador.
  await ana.waitForSelector('text=/Qué hizo cada uno esta noche/');
  const blocks = await ana.locator('.histblock').count();
  check(blocks === 7, `historial de acciones de TODOS (${blocks}/7 bloques)`);

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=una-end-open]');
  await ana.waitForSelector('[data-a=una-end-confirm]');
  await ana.click('[data-a=una-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=/Dispositivos/');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failunar-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-una-roles con ${fail} fallos` : '\n✔ E2E-una-roles OK');
process.exit(fail ? 1 : 0);
