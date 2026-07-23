// E2E Hombres Lobo · el Ladrón y las 2 cartas del centro (4 jugadores, 1 lobo).
// El reparto decide la rama y AMBAS son válidas y verificadas:
//  a) Ladrón repartido → cambia su carta por una del centro: su rol cambia, la
//     carta 'ladron' queda en el centro y el guion de la noche se recalcula.
//  b) Ladrón en el centro → su paso suena y avanza SOLO (nadie cuelga nada).
// En ambas, la partida sigue hasta linchar al lobo (gana el pueblo).
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
  const s = window.__hlc;
  const g = s.group?.game;
  return {
    phase: g?.phase, stepIdx: g?.stepIdx, steps: g?.steps || [], night: g?.night,
    votesLeft: g?.votesLeft, winner: g?.winner, pending: g?.pending || [],
    centerCards: g?.centerCards || [], acts: g?.acts || {},
    players: s.players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame })),
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], center: last?.centerCards }));
  throw new Error('timeout esperando: ' + what);
}
const pageOf = (p) => pages[p.name.toLowerCase()];

try {
  const GROUP = 'Lad ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/hombres_lobo');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Coco', 'Dani']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (4)');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-settings]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('.roletoggle');
  const onRoles = await ana.$$eval('.roletoggle.on[data-a=toggle-role]', (els) => els.map((e) => e.getAttribute('data-p')));
  for (const r of onRoles.filter((x) => x && x !== 'ladron')) {
    await ana.click(`.roletoggle.on[data-p=${r}]`);
    await ana.waitForSelector(`.roletoggle[data-p=${r}]:not(.on)`, { timeout: 10000 });
  }
  if (!(await ana.locator('.roletoggle.on[data-p=ladron]').count())) {
    await ana.click('.roletoggle[data-p=ladron]');
    await ana.waitForSelector('.roletoggle.on[data-p=ladron]');
  }
  await ana.click('button[data-a=close-modal]');
  ok('composición: 1 lobo + Ladrón (con sus 2 cartas de más al centro)');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  check(st.centerCards.length === 2, 'las 2 cartas sobrantes esperan en el centro (regla oficial)');
  const ladron = st.players.find((p) => p.inGame && p.role === 'ladron') || null;
  const lobo = st.players.find((p) => p.inGame && p.role === 'hombre_lobo');
  console.log('  roles:', st.players.filter((p) => p.inGame).map((p) => `${p.name}=${p.role}`).join(', '), '· centro:', st.centerCards.join(','));

  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pageOf(p);
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    await pg.click('[data-a=confirm-role-seen]');
    await pg.waitForTimeout(150);
  }
  const firstIn = st.players.find((x) => x.inGame);
  await pageOf(firstIn).waitForSelector('button[data-a=begin-first-night]');
  await pageOf(firstIn).click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');

  if (ladron) {
    // Rama a: el Ladrón toma la primera carta del centro.
    await waitState(ana, (s) => s.steps[s.stepIdx] === 'ladron', 'turno del Ladrón');
    const tomaba = st.centerCards[0];
    const rp = pageOf(ladron);
    await rp.waitForSelector('[data-a=act-ladron-take]', { timeout: 15000 });
    await rp.click('[data-a=act-ladron-take][data-p="0"]');
    st = await waitState(ana, (s) => s.players.find((p) => p.id === ladron.id)?.role === tomaba, 'el Ladrón cambia de rol');
    check(st.centerCards[0] === 'ladron', 'su carta de Ladrón se queda en el centro');
    ok(`el Ladrón ahora es ${tomaba}`);
  } else {
    // Rama b: el Ladrón cayó al centro → su paso avanza solo, sin nadie.
    st = await hlc(ana);
    check(st.steps.includes('ladron'), 'el guion incluye el paso del Ladrón (composición pública lo delata igual)');
    await waitState(ana, (s) => s.phase !== 'night' || s.steps[s.stepIdx] !== 'ladron' || s.stepIdx > s.steps.indexOf('ladron'), 'el paso del Ladrón pasa de largo sin colgarse');
    ok('Ladrón en el centro: nadie tuvo que tocar nada');
  }

  // La manada devora a un aldeano; el pueblo lincha al lobo → fin.
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'turno de lobos');
  st = await hlc(ana);
  const victim = st.players.find((p) => p.inGame && p.alive && p.role === 'aldeano' && p.id !== lobo.id);
  const lp = pageOf(lobo);
  await lp.waitForSelector('[data-a=act-lobos]', { timeout: 15000 });
  await lp.click(`.actionpanel .player.selectable[data-p=${victim.id}]`);
  await lp.click('[data-a=act-lobos]');
  st = await waitState(ana, (s) => s.phase === 'day', 'amanecer');
  const reg = st.players.find((p) => p.inGame && p.alive && p.id !== lobo.id);
  const rp2 = pageOf(reg);
  await rp2.waitForSelector('.actionpanel:has-text("juicio")', { timeout: 30000 });
  await rp2.click(`.actionpanel .player.selectable[data-p=${lobo.id}]`);
  await rp2.click('button[data-a=vote-confirm]');
  st = await waitState(ana, (s) => s.phase === 'end', 'fin');
  check(st.winner === 'pueblo', `gana el pueblo (winner=${st.winner})`);

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
    try { if (!p.isClosed()) await p.screenshot({ path: `faillad-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-ladron con ${fail} fallos` : '\n✔ E2E-ladron OK');
process.exit(fail ? 1 : 0);
