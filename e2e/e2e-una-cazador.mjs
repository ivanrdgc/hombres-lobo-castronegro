// E2E Una Noche · Cazador, Curtidor y empates con flecha (4 jugadores, mazo de
// 7: 2 Lobos, Cazador, Curtidor, Vidente y 2 Aldeanos). El guion es ADAPTATIVO:
// lee el estado tras la noche y elige la condena que ejercite el camino más
// jugoso disponible (empate con Cazador → flecha; Curtidor; lobo), y SIEMPRE
// contrasta los ganadores con las reglas oficiales recalculadas aparte.
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
    seen: g.seen, lynched: g.lynched, pendingHunter: g.pendingHunter,
    deaths: g.deaths, winners: g.winners, acts: g.acts,
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, step: last.steps?.[last.stepIdx], pendingHunter: last.pendingHunter, winners: last.winners }));
  throw new Error('timeout esperando: ' + what);
}
let hlcNames = {};
const pg = (pid) => pages[(hlcNames[pid] || pid).toLowerCase()];
const vis = async (p, sel) => (await p.locator(sel).count()) > 0;
const clk = async (p, sel) => { try { await p.locator(sel).first().click({ timeout: 4000 }); } catch { /* desapareció */ } };

// B28 · postura 🍽️ MESA: el panel del paso vive tras «👁 Abrir mi turno».
async function openPanel(p) {
  if (await vis(p, '[data-a=una-open]:not([disabled])')) { await clk(p, '[data-a=una-open]'); await p.waitForTimeout(120); }
}

async function actStep(p, step) {
  await openPanel(p);
  if (step === 'lobos') {
    if (await vis(p, '[data-a=una-wolf-peek]')) { await clk(p, '[data-a=una-wolf-peek][data-p="0"]'); await p.waitForTimeout(150); }
    if (await vis(p, '[data-a=una-wolf-ok]')) await clk(p, '[data-a=una-wolf-ok]');
  } else if (step === 'vidente') {
    // Cobertura del «No mirar nada» (regla oficial: la Vidente PUEDE mirar).
    if (await vis(p, '[data-a=una-seer-skip]')) await clk(p, '[data-a=una-seer-skip]');
    if (await vis(p, '[data-a=una-seer-ok]')) await clk(p, '[data-a=una-seer-ok]');
  }
}

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
const finalsOf = (st) => Object.fromEntries(st.playerIds.map((pid) => {
  const card = st.slots[pid];
  return [pid, card === 'doble' ? (st.acts.dobleRole || 'aldeano') : card];
}));

try {
  const GROUP = 'UnaC ' + Date.now().toString(36).slice(-5);
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
  await ana.click('button[data-a=select-game][data-p=una_noche]');
  await ana.waitForSelector('[data-a=una-open-deck]');

  // Mazo de 7: 2 lobos, Cazador, Curtidor, Vidente, 2 Aldeanos.
  await ana.click('[data-a=una-open-deck]');
  await ana.waitForSelector('[data-a=una-deck-fit]');
  await ana.click('[data-a=una-deck-fit]'); await ana.waitForTimeout(300);
  for (const sel of ['[data-a=una-deck-dec][data-p=ladron]', '[data-a=una-deck-dec][data-p=alborotadora]', '[data-a=una-deck-dec][data-p=insomne]',
    '[data-a=una-deck-inc][data-p=tanner]', '[data-a=una-deck-inc][data-p=aldeano]', '[data-a=una-deck-inc][data-p=aldeano]']) {
    await ana.click(sel); await ana.waitForTimeout(250);
  }
  await ana.click('button[data-a=close-modal]');
  ok('mazo de 7 con Cazador y Curtidor');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=una-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=una-start]');

  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  hlcNames = st.names;
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

  st = await waitState(ana, (s) => s.phase === 'night', 'noche');
  const t0 = Date.now();
  let seerSkipped = false;
  while (Date.now() - t0 < 120000) {
    st = await hlc(ana);
    if (!st || st.phase !== 'night') break;
    const step = st.steps[st.stepIdx];
    if (step === 'vidente' && !seerSkipped && st.acts.videnteDone) seerSkipped = true;
    if (step !== 'durmiendo' && step !== 'amanecer') {
      for (const pid of st.playerIds) await actStep(pg(pid), step);
    }
    await ana.waitForTimeout(300);
  }
  st = await waitState(ana, (s) => s.phase === 'day', 'amanece');
  const videnteDealt = Object.values(st.originalRole).includes('vidente');
  if (videnteDealt) {
    check(st.acts.videnteDone && !st.acts.videnteView, 'la Vidente usó «No mirar nada» (oficial: puede no mirar)');
  } else ok('la Vidente quedó en el centro (paso fantasma)');

  // ——— Día ADAPTATIVO según el reparto final ———
  const finals = finalsOf(st);
  console.log('  finales:', st.playerIds.map((id) => `${st.names[id]}=${finals[id]}`).join(', '));
  const holder = (role) => st.playerIds.find((pid) => finals[pid] === role) || null;
  const hunter = holder('cazador');
  const tanner = holder('tanner');
  const wolf = holder('lobo');
  const rp = pg(st.playerIds[0]);
  await rp.waitForSelector('.player[data-a=una-sel]', { timeout: 15000 });

  if (hunter) {
    // EMPATE que incluye al Cazador: caen los dos y la flecha aún vuela.
    const other = st.playerIds.find((pid) => pid !== hunter) || st.playerIds[0];
    await rp.click(`.player[data-a=una-sel][data-p="${hunter}"]`);
    await rp.click(`.player[data-a=una-sel][data-p="${other}"]`);
    await rp.click('[data-a=una-vote]');
    st = await waitState(ana, (s) => s.pendingHunter === hunter, 'el Cazador condenado abre su flecha');
    ok('empate con Cazador: pendiente de flecha (como en Los Hombres Lobo)');
    const hp = pg(hunter);
    await hp.waitForSelector('.actionpanel:has-text("Cazador")', { timeout: 15000 });
    // Su parrilla EXCLUYE a los ya caídos (no puede disparar a un muerto).
    const selectable = await hp.locator('.player[data-a=una-sel]').count();
    check(selectable === st.playerIds.length - 2, `la flecha solo apunta a vivos (${selectable} objetivos, caídos fuera)`);
    const target = st.playerIds.find((pid) => pid !== hunter && pid !== other && finals[pid] === 'tanner')
      || st.playerIds.find((pid) => pid !== hunter && pid !== other);
    await hp.click(`.player[data-a=una-sel][data-p="${target}"]`);
    await hp.waitForSelector('[data-a=una-hunter-shoot]:not([disabled])');
    await hp.click('[data-a=una-hunter-shoot]');
    st = await waitState(ana, (s) => s.phase === 'end', 'fin tras la flecha');
    check(st.deaths.length === 3 && st.deaths.includes(target), 'caen los 2 empatados + la víctima de la flecha');
  } else if (tanner) {
    await rp.click(`.player[data-a=una-sel][data-p="${tanner}"]`);
    await rp.click('[data-a=una-vote]');
    st = await waitState(ana, (s) => s.phase === 'end', 'fin (Curtidor linchado)');
    check(st.winners.includes('tanner'), 'el Curtidor gana al ser linchado');
  } else {
    const victim = wolf || st.playerIds[1];
    await rp.click(`.player[data-a=una-sel][data-p="${victim}"]`);
    await rp.click('[data-a=una-vote]');
    st = await waitState(ana, (s) => s.phase === 'end', 'fin (condena simple)');
  }

  const want = expectedWinners(finals, st.deaths || [], st.playerIds).sort();
  check(JSON.stringify((st.winners || []).slice().sort()) === JSON.stringify(want),
    `ganadores según reglas oficiales: ${JSON.stringify(st.winners)} (esperado ${JSON.stringify(want)})`);

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
    try { if (!p.isClosed()) await p.screenshot({ path: `failunac-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-una-cazador con ${fail} fallos` : '\n✔ E2E-una-cazador OK');
process.exit(fail ? 1 : 0);
