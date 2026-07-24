// E2E Hombres Lobo · la Abnegada Sirvienta ACEPTA (intercambio de roles) y la
// sucesión del Alguacil, encadenados en un mismo juicio (5 jugadores, 1 lobo).
//  D1: se elige Alguacil a un aldeano; el pueblo LO condena; antes de revelar
//      su carta, la Sirvienta interviene desde su propia carta: asume su rol
//      (empezando de cero) y el muerto es enterrado como Sirvienta; después,
//      como Alguacil caído, señala sucesor.
//  N2: el lobo devora a la ex-Sirvienta → paridad → ganan los lobos.
import { chromium } from 'playwright';
const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const check = (c, m) => (c ? ok(m) : bad(m));
const browser = await chromium.launch();
const pages = {};

// B28 · postura 🍽️ MESA: de noche TODAS las pantallas se ven iguales y el panel
// de acción solo aparece tras el gesto de su dueño («👁 Abrir mi turno»).
async function openTurn(pg, sel, timeout = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await pg.locator(sel).count()) return;
    const gate = pg.locator('[data-a=open-night-turn]');
    if (await gate.count()) await gate.click().catch(() => {});
    await pg.waitForTimeout(200);
  }
  await pg.waitForSelector(sel, { timeout: 3000 });
}

async function mk(label) {
  const ctx = await browser.newContext({ locale: 'es-ES' });
  await ctx.addInitScript(() => { window.__hlcTest = true; }); // e2e veloz: sin audio, colchones mínimos
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] ${e.message}`));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const s = window.__hlc;
  const g = s.group?.game;
  return {
    phase: g?.phase, stepIdx: g?.stepIdx, steps: g?.steps || [], night: g?.night, dayNum: g?.dayNum,
    votesLeft: g?.votesLeft, winner: g?.winner, pending: g?.pending || [], alguacilId: g?.alguacilId,
    log: (g?.log || []).map((l) => l.txt),
    players: s.players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame })),
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], pending: last?.pending, votesLeft: last?.votesLeft }));
  throw new Error('timeout esperando: ' + what);
}
const pageOf = (p) => pages[p.name.toLowerCase()];

try {
  const GROUP = 'Sirv ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/hombres_lobo');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Coco', 'Dani', 'Elsa']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (5)');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-settings]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  // Roles: SOLO sirvienta + el cargo de Alguacil (electo, no es carta).
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('.roletoggle');
  const onRoles = await ana.$$eval('.roletoggle.on[data-a=toggle-role]', (els) => els.map((e) => e.getAttribute('data-p')));
  for (const r of onRoles.filter((x) => x && x !== 'sirvienta')) {
    await ana.click(`.roletoggle.on[data-p=${r}]`);
    await ana.waitForSelector(`.roletoggle[data-p=${r}]:not(.on)`, { timeout: 10000 });
  }
  if (!(await ana.locator('.roletoggle.on[data-p=sirvienta]').count())) {
    await ana.click('.roletoggle[data-p=sirvienta]');
    await ana.waitForSelector('.roletoggle.on[data-p=sirvienta]');
  }
  if (!(await ana.locator('.roletoggle.on[data-p=alguacil]').count())) {
    await ana.click('.roletoggle[data-p=alguacil]');
    await ana.waitForSelector('.roletoggle.on[data-p=alguacil]');
  }
  await ana.click('button[data-a=close-modal]');
  ok('composición: 1 lobo + sirvienta + 3 aldeanos, con Alguacil activado');

  // Ana narra Y juega (5 jugadores en casual).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  const lobo = st.players.find((p) => p.inGame && p.role === 'hombre_lobo');
  const sirvienta = st.players.find((p) => p.inGame && p.role === 'sirvienta');
  const aldeanos = st.players.filter((p) => p.inGame && p.role === 'aldeano');
  check(!!lobo && !!sirvienta && aldeanos.length === 3, 'reparto: lobo, sirvienta y 3 aldeanos');
  console.log('  roles:', st.players.filter((p) => p.inGame).map((p) => `${p.name}=${p.role}`).join(', '));

  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pageOf(p);
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    await pg.click('[data-a=confirm-role-seen]');
    await pg.waitForTimeout(150);
  }
  await pageOf(sirvienta).waitForSelector('button[data-a=begin-first-night]');
  await pageOf(sirvienta).click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');

  // N1: el lobo devora al primer aldeano.
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'turno de lobos');
  const lp = pageOf(lobo);
  await openTurn(lp, '[data-a=act-lobos]', 15000);
  await lp.click(`.actionpanel .player.selectable[data-p=${aldeanos[0].id}]`);
  await lp.click('[data-a=act-lobos]');
  st = await waitState(ana, (s) => s.phase === 'day', 'amanecer 1');
  check(st.players.find((p) => p.id === aldeanos[0].id)?.alive === false, 'primer aldeano devorado');

  // D1: elección de Alguacil (pendiente del primer día) → un aldeano vivo.
  const alguacil = aldeanos[1];
  const sp = pageOf(sirvienta);
  await sp.waitForSelector('.actionpanel:has-text("Alguacil")', { timeout: 30000 });
  await sp.click(`.actionpanel .player.selectable[data-p=${alguacil.id}]`);
  await sp.click('[data-a=alguacil-pick]');
  st = await waitState(ana, (s) => s.alguacilId === alguacil.id, 'Alguacil elegido');
  ok(`Alguacil: ${alguacil.name}`);

  // El pueblo condena AL ALGUACIL → ventana secreta de la Sirvienta.
  await sp.waitForSelector('.actionpanel:has-text("juicio")', { timeout: 30000 });
  await sp.click(`.actionpanel .player.selectable[data-p=${alguacil.id}]`);
  await sp.click('button[data-a=vote-confirm]');
  st = await waitState(ana, (s) => s.pending[0]?.type === 'sirvienta', 'ventana de la Sirvienta abierta');
  // Todos ven la MISMA cuenta atrás neutral; la decisión vive DENTRO de su carta.
  check((await lp.locator('.actionpanel:has-text("El juicio se resuelve")').count()) >= 1, 'los demás solo ven la cuenta atrás neutral');
  // B28: el gesto se le pide a TODA la mesa («abrid la carta»), no solo a quien
  // decide — si lo hiciera solo ella, abrir la carta la delataría.
  check(await lp.isVisible('[data-a=open-day-card]') && await sp.isVisible('[data-a=open-day-card]'),
    'todos los móviles invitan a abrir la carta durante la ventana secreta');
  await sp.click('button[data-a=toggle-rolecard]');
  await sp.waitForSelector('[data-a=sirvienta-yes]', { timeout: 15000 });
  await sp.click('[data-a=sirvienta-yes]');
  st = await waitState(ana, (s) => s.players.find((p) => p.id === sirvienta.id)?.role === 'aldeano', 'la Sirvienta asume el rol del condenado');
  check(st.players.find((p) => p.id === alguacil.id)?.role === 'sirvienta', 'el condenado es enterrado con la carta de Sirvienta (regla oficial)');
  check(st.players.find((p) => p.id === alguacil.id)?.alive === false, 'el condenado muere igualmente');
  check(st.log.some((t) => t.includes('Abnegada Sirvienta')), 'la crónica anuncia la revelación de la Sirvienta');

  // Sucesión: el Alguacil muerto señala sucesor (la ex-Sirvienta).
  const ap = pageOf(alguacil);
  await ap.waitForSelector('.actionpanel:has-text("Alguacil")', { timeout: 20000 });
  await ap.click(`.actionpanel .player.selectable[data-p=${sirvienta.id}]`);
  await ap.click('[data-a=alguacil-pick]');
  st = await waitState(ana, (s) => s.alguacilId === sirvienta.id, 'sucesión del Alguacil');
  ok('el Alguacil caído pasa la estrella a la ex-Sirvienta');

  // N2: el lobo devora a la ex-Sirvienta → quedan lobo + 1 aldeano: paridad.
  st = await waitState(ana, (s) => (s.votesLeft || 0) <= 0 && !s.pending.length, 'día 1 cerrado');
  await pageOf(aldeanos[2]).waitForSelector('button[data-a=begin-night]', { timeout: 20000 });
  await pageOf(aldeanos[2]).click('button[data-a=begin-night]');
  st = await waitState(ana, (s) => s.phase === 'night' && s.night === 2, 'noche 2');
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'lobos noche 2');
  await openTurn(lp, '[data-a=act-lobos]', 15000);
  await lp.click(`.actionpanel .player.selectable[data-p=${sirvienta.id}]`);
  await lp.click('[data-a=act-lobos]');
  st = await waitState(ana, (s) => s.phase === 'end', 'fin por paridad');
  check(st.winner === 'lobos', `ganan los lobos (winner=${st.winner})`);

  // Limpieza.
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('[data-a=change-game]', { timeout: 20000 });
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failsirv-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-sirvienta con ${fail} fallos` : '\n✔ E2E-sirvienta OK');
process.exit(fail ? 1 : 0);
