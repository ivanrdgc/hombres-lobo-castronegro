// E2E caballero: reproduce la partida reportada tres veces en la mesa.
// 4 jugadores, 1 lobo, caballero repartido. El lobo devora al Caballero la
// noche 1 → EN ESE MISMO amanecer el primer lobo hacia su izquierda muere por
// el óxido (regla de la mesa; el oficial lo demoraba una noche y resultaba
// invisible). Con un solo lobo, la partida termina ahí: gana el pueblo.
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
  return {
    phase: s.group?.game?.phase, stepIdx: s.group?.game?.stepIdx,
    steps: s.group?.game?.steps, winner: s.group?.game?.winner, night: s.group?.game?.night,
    log: (s.group?.game?.log || []).map((l) => l.txt),
    players: s.players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame })),
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], winner: last?.winner }));
  throw new Error('timeout esperando: ' + what);
}
const wolfRoles = ['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'];

try {
  const GROUP = 'Cab ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/hombres_lobo');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bruno', 'Carla', 'David', 'Elsa']) {
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
  // Roles: SOLO el caballero como extra → mazo de 4 = lobo + caballero + 2 aldeanos.
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('.roletoggle');
  const onRoles = await ana.$$eval('.roletoggle.on', (els) => els.map((e) => e.getAttribute('data-p')));
  for (const r of onRoles.filter((x) => x && x !== 'caballero')) {
    await ana.click(`.roletoggle.on[data-p=${r}]`);
    await ana.waitForSelector(`.roletoggle[data-p=${r}]:not(.on)`, { timeout: 10000 });
  }
  if (!(await ana.locator('.roletoggle.on[data-p=caballero]').count())) {
    await ana.click('.roletoggle[data-p=caballero]');
    await ana.waitForSelector('.roletoggle.on[data-p=caballero]');
  }
  await ana.click('button[data-a=close-modal]');
  ok('composición: caballero como único rol extra');

  // Empezar: Ana narra sin jugar (4 jugadores con carta).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('.player[data-a=start-player][data-p=p-ana]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  const caballero = st.players.find((p) => p.role === 'caballero');
  const lobo = st.players.find((p) => wolfRoles.includes(p.role));
  check(!!caballero && !!lobo, `reparto con caballero (${caballero?.name}) y lobo (${lobo?.name})`);

  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pages[p.name.toLowerCase()];
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    await pg.click('[data-a=confirm-role-seen]');
    await pg.waitForTimeout(200);
  }
  const firstIn = st.players.find((x) => x.inGame);
  await pages[firstIn.name.toLowerCase()].waitForSelector('button[data-a=begin-first-night]');
  await pages[firstIn.name.toLowerCase()].click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');
  console.log('  roles:', st.players.filter((p) => p.inGame).map((p) => `${p.name}=${p.role}`).join(', '));

  // Conducir la noche: reconocimiento y mordisco AL CABALLERO.
  let lastKey = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    st = await hlc(ana);
    if (st.phase !== 'night') break;
    const stepId = st.steps[st.stepIdx];
    const key = `n${st.night}:${st.stepIdx}`;
    if (key === lastKey) { await ana.waitForTimeout(400); continue; }
    lastKey = key;
    if (stepId === 'lobos_reconocen') {
      const pg = pages[lobo.name.toLowerCase()];
      await pg.waitForSelector('button[data-a=act-lobos-reconocido]', { timeout: 15000 });
      await pg.click('button[data-a=act-lobos-reconocido]');
    } else if (stepId === 'lobos') {
      const pg = pages[lobo.name.toLowerCase()];
      await pg.waitForSelector('button[data-a=act-lobos]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${caballero.id}]`);
      await pg.click('button[data-a=act-lobos]');
      ok(`el lobo devora al caballero (${caballero.name})`);
    }
    await ana.waitForTimeout(400);
  }

  // Amanecer: caballero devorado + lobo muerto por el óxido EN EL MISMO
  // amanecer → con un solo lobo, el pueblo gana en el acto.
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de partida al amanecer');
  check(st.winner === 'pueblo', `gana el pueblo (winner=${st.winner})`);
  check(st.players.find((p) => p.id === caballero.id)?.alive === false, 'el caballero está muerto');
  check(st.players.find((p) => p.id === lobo.id)?.alive === false, 'el lobo está muerto ESE MISMO amanecer');
  check(st.log.some((t) => t.includes('óxido')), 'la crónica anuncia la muerte por el óxido');
  check(st.log.some((t) => t.includes('devorado')), 'y la del caballero devorado');

  // Limpieza: volver al lobby y borrar la mesa desechable.
  await ana.waitForSelector('button[data-a=back-lobby]', { timeout: 20000 });
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failcab-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-caballero con ${fail} fallos` : '\n✔ E2E-caballero OK');
process.exit(fail ? 1 : 0);
