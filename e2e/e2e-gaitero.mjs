// E2E gaitero: regresión de dos bugs.
//  1) El Gaitero encanta y los encantados DEBEN ver un botón para confirmar
//     (antes: el paso 'encantados' salía sin botón y la partida se colgaba).
//  2) Al confirmar el rol en el reparto, la carta mini queda PLEGADA (antes,
//     si roleOpen se había quedado activo, salía desplegada hasta tocarla).
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
  // Semilla de test: sin audio (locuciones registradas, no reproducidas) y con
  // colchones del narrador mínimos → e2e mucho más rápido.
  await ctx.addInitScript(() => { window.__hlcTest = true; });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] ${e.message}`));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const s = window.__hlc;
  return {
    phase: s.group?.game?.phase, stepIdx: s.group?.game?.stepIdx,
    steps: s.group?.game?.steps, winner: s.group?.game?.winner, night: s.group?.game?.night,
    players: s.players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame, charmed: p.charmed })),
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], winner: last?.winner }));
  throw new Error('timeout esperando: ' + what);
}
const wolfRoles = ['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'];

try {
  const GROUP = 'Gait ' + Date.now().toString(36).slice(-5);
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
  // Roles: habilitar gaitero; quitar vidente/bruja/cupido para aislar el flujo
  // (así la noche es durmiendo → lobos_reconocen → gaitero → encantados → lobos).
  await ana.click('[data-a=open-roles]');
  for (const r of ['vidente', 'bruja', 'cupido']) {
    if (await ana.locator(`.roletoggle.on[data-p=${r}]`).count()) await ana.click(`.roletoggle.on[data-p=${r}]`);
  }
  await ana.click('.roletoggle[data-p=gaitero]:not(.on)');
  await ana.waitForSelector('.roletoggle.on[data-p=gaitero]');
  await ana.click('button[data-a=close-modal]');
  ok('gaitero habilitado, vidente/bruja/cupido fuera');

  // Empezar: Ana narra sin jugar.
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('.player[data-a=start-player][data-p=p-ana]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  check(st.players.some((p) => p.role === 'gaitero'), 'el gaitero está en juego');

  // Revelar todos. En el primero, reproducimos el disparador del bug de roleOpen:
  // tocar la carta desplegada del revelado ANTES de confirmar; tras confirmar,
  // la carta mini debe salir PLEGADA (botón «Mostrar mi rol»), no abierta.
  let first = true;
  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pages[p.name.toLowerCase()];
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    if (first) {
      await pg.click('.rolecard[data-a=toggle-rolecard]'); // toque en la carta del revelado
      await pg.waitForTimeout(150);
    }
    await pg.click('[data-a=confirm-role-seen]');
    await pg.waitForTimeout(250);
    if (first) {
      const collapsed = await pg.locator('button[data-a=toggle-rolecard]').count();
      const expanded = await pg.locator('div.rolecard[data-a=toggle-rolecard]').count();
      check(collapsed >= 1 && expanded === 0, 'tras confirmar el rol, la carta mini queda plegada (no abierta)');
      first = false;
    }
  }
  const firstIn = st.players.find((x) => x.inGame);
  await pages[firstIn.name.toLowerCase()].waitForSelector('button[data-a=begin-first-night]');
  await pages[firstIn.name.toLowerCase()].click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');
  console.log('  roles:', st.players.map((p) => `${p.name}=${p.role}`).join(', '));

  // Conducir la noche hasta pasar por 'encantados' (y verificar su botón).
  let sawEncantados = false;
  let lastKey = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    st = await hlc(ana);
    if (st.phase !== 'night') break;
    const stepId = st.steps[st.stepIdx];
    const key = `n${st.night}:${st.stepIdx}`;
    if (key === lastKey) { await ana.waitForTimeout(400); continue; }
    lastKey = key;
    if (stepId === 'lobos_reconocen') {
      for (const p of st.players.filter((x) => x.alive && wolfRoles.includes(x.role))) {
        const pg = pages[p.name.toLowerCase()];
        if (await pg.isVisible('button[data-a=act-lobos-reconocido]')) await pg.click('button[data-a=act-lobos-reconocido]');
      }
    } else if (stepId === 'gaitero') {
      const g = st.players.find((p) => p.role === 'gaitero' && p.alive);
      const pg = pages[g.name.toLowerCase()];
      await pg.waitForSelector('button[data-a=act-gaitero]');
      const targets = await pg.locator('.actionpanel .player.selectable').count();
      const n = Math.min(2, targets);
      for (let i = 0; i < n; i++) { await pg.click('.actionpanel .player.selectable:not(.selected) >> nth=0'); await pg.waitForTimeout(150); }
      await pg.click('button[data-a=act-gaitero]');
    } else if (stepId === 'encantados') {
      const charmed = st.players.filter((p) => p.alive && p.charmed);
      check(charmed.length > 0, 'hay encantados tras la música del gaitero');
      for (const p of charmed) {
        const pg = pages[p.name.toLowerCase()];
        const seen = await pg.waitForSelector('button[data-a=act-encantado-ok]', { timeout: 12000 }).then(() => true).catch(() => false);
        check(seen, `el encantado ${p.name} ve el botón de confirmar`);
        if (seen) {
          // La palabra NUEVA (kwNext) se enseña en la MISMA pantalla, junto al botón.
          const conNueva = await pg.locator('.actionpanel:has-text("NUEVA")').count();
          check(conNueva >= 1, `${p.name} ve su palabra nueva JUNTO al botón, antes de confirmar`);
          await pg.click('button[data-a=act-encantado-ok]');
        }
        await pg.waitForTimeout(150);
      }
      sawEncantados = true;
    } else if (stepId === 'lobos') {
      const wolf = st.players.find((p) => p.alive && wolfRoles.includes(p.role));
      const pg = pages[wolf.name.toLowerCase()];
      await pg.waitForSelector('button[data-a=act-lobos]');
      await pg.click('.actionpanel .player.selectable >> nth=0');
      await pg.click('button[data-a=act-lobos]');
    }
    await ana.waitForTimeout(400);
  }
  check(sawEncantados, 'la partida pasó por el paso de encantados');
  // Tras confirmar, el paso avanza (no seguimos colgados en encantados).
  await waitState(ana, (s) => s.phase !== 'night' || s.steps[s.stepIdx] !== 'encantados', 'el paso de encantados avanza tras confirmar');
  ok('el paso de encantados avanza tras las confirmaciones');

  // Limpieza: terminar la partida y borrar la mesa desechable.
  await ana.click('[data-a=game-menu]');
  await ana.click('button[data-a=end-game]');
  await ana.click('button[data-a=end-game-confirm][data-p=""]');
  await ana.waitForSelector('button[data-a=back-lobby]', { timeout: 20000 });
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('[data-a=change-game]', { timeout: 20000 });
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=/Dispositivos/');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _l = await _p.waitForSelector('[data-a=leave]', { timeout: 9000 }).catch(() => null); if (_l) { await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failgait-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-gaitero con ${fail} fallos` : '\n✔ E2E-gaitero OK');
process.exit(fail ? 1 : 0);
