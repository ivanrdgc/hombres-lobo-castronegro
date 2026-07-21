// E2E infecto: la llamada de la sangre (paso 'infectado').
//  1) Al infectar, la víctima es despertada ESA misma noche por palabra clave:
//     ve el panel del mordisco con su palabra NUEVA junto al botón, confirma,
//     y NO muere al amanecer. Los demás ven el panel neutral («Atención al
//     narrador»): ninguna pantalla delata quién fue llamado.
//  2) La noche siguiente el infectado despierta y caza CON la manada.
//  3) Las noches sin infección (poder ya gastado) el paso avanza solo con una
//     llamada de señuelos: ningún jugador tiene que tocar nada.
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
    players: s.players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame, infected: p.infected })),
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], winner: last?.winner }));
  throw new Error('timeout esperando: ' + what);
}

try {
  const GROUP = 'Inf ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/hombres_lobo');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  // 5 jugadores con carta: así la infección (2 lobos vs 3 aldeanos) NO cierra
  // la partida por paridad en el primer amanecer y da tiempo a la noche 2.
  for (const n of ['Bruno', 'Carla', 'David', 'Elsa', 'Fran']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (6)');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-settings]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  // Roles: SOLO el infecto como extra → mazo de 4 = infecto + 3 aldeanos
  // (el especial de lobo sustituye al lobo común del reparto).
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('.roletoggle');
  const onRoles = await ana.$$eval('.roletoggle.on', (els) => els.map((e) => e.getAttribute('data-p')));
  for (const r of onRoles.filter((x) => x && x !== 'infecto')) {
    await ana.click(`.roletoggle.on[data-p=${r}]`);
    await ana.waitForSelector(`.roletoggle[data-p=${r}]:not(.on)`, { timeout: 10000 });
  }
  if (!(await ana.locator('.roletoggle.on[data-p=infecto]').count())) {
    await ana.click('.roletoggle[data-p=infecto]');
    await ana.waitForSelector('.roletoggle.on[data-p=infecto]');
  }
  await ana.click('button[data-a=close-modal]');
  ok('composición: infecto como único rol extra');

  // Empezar: Ana narra sin jugar (4 jugadores con carta).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('.player[data-a=start-player][data-p=p-ana]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  const infecto = st.players.find((p) => p.role === 'infecto');
  check(!!infecto, `el Infecto está en juego (${infecto?.name})`);
  const victim = st.players.find((p) => p.inGame && p.role === 'aldeano');
  const otros = st.players.filter((p) => p.inGame && p.role === 'aldeano' && p.id !== victim.id);

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

  // ——— Noche 1: mordisco + infección + llamada de la sangre ———
  let lastKey = '';
  let sawInfectado = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    st = await hlc(ana);
    if (st.phase !== 'night') break;
    const stepId = st.steps[st.stepIdx];
    const key = `n${st.night}:${st.stepIdx}`;
    if (key === lastKey) { await ana.waitForTimeout(400); continue; }
    lastKey = key;
    const ip = pages[infecto.name.toLowerCase()];
    if (stepId === 'lobos_reconocen') {
      await ip.waitForSelector('button[data-a=act-lobos-reconocido]', { timeout: 15000 });
      await ip.click('button[data-a=act-lobos-reconocido]');
    } else if (stepId === 'lobos') {
      await ip.waitForSelector('button[data-a=act-lobos]', { timeout: 15000 });
      await ip.click(`.actionpanel .player.selectable[data-p=${victim.id}]`);
      await ip.click('button[data-a=act-lobos]');
      ok(`la manada muerde a ${victim.name}`);
    } else if (stepId === 'infecto_decision') {
      await ip.waitForSelector('button[data-a=act-infecto][data-p=si]', { timeout: 15000 });
      await ip.click('button[data-a=act-infecto][data-p=si]');
      ok('el Infecto usa su poder: infectar');
    } else if (stepId === 'infectado') {
      const vp = pages[victim.name.toLowerCase()];
      const seen = await vp.waitForSelector('button[data-a=act-infectado-ok]', { timeout: 20000 }).then(() => true).catch(() => false);
      check(seen, `${victim.name} ve el panel del mordisco (te ha mordido)`);
      if (seen) {
        const conNueva = await vp.locator('.actionpanel:has-text("NUEVA")').count();
        check(conNueva >= 1, `${victim.name} ve su palabra nueva JUNTO al botón, antes de confirmar`);
        // Los demás vivos ven el panel neutral: ninguna pantalla delata nada.
        const op = pages[otros[0].name.toLowerCase()];
        const neutral = await op.locator('.actionpanel:has-text("Atención al narrador")').count();
        check(neutral >= 1, `${otros[0].name} solo ve el panel neutral («Atención al narrador»)`);
        await vp.click('button[data-a=act-infectado-ok]');
        ok(`${victim.name} confirma su nueva sangre`);
      }
      sawInfectado = true;
    }
    await ana.waitForTimeout(400);
  }
  check(sawInfectado, 'la noche pasó por la llamada de la sangre');

  // Amanecer 1: NADIE muere (la infección sustituye al devorado) y nada en la crónica lo delata.
  st = await waitState(ana, (s) => s.phase === 'day', 'amanecer del día 1');
  check(st.players.filter((p) => p.inGame).every((p) => p.alive), 'nadie ha muerto al amanecer');
  check(st.players.find((p) => p.id === victim.id)?.infected === true, `${victim.name} está infectado (en secreto)`);
  // «El Infecto» sale en las cartas en juego (público); lo que NO puede salir
  // es que alguien haya sido infectadO ni el nombre de la víctima con ello.
  check(!st.log.some((t) => t.toLowerCase().includes('infectad')), 'la crónica NO menciona la infección');

  // Día 1: el pueblo perdona y manda a dormir.
  const vp = pages[victim.name.toLowerCase()];
  await vp.waitForSelector('button[data-a=vote-nadie]', { timeout: 30000 });
  await vp.click('button[data-a=vote-nadie]');
  await vp.waitForSelector('button[data-a=begin-night]', { timeout: 20000 });
  await vp.click('button[data-a=begin-night]');
  st = await waitState(ana, (s) => s.phase === 'night' && s.night === 2, 'noche 2');

  // ——— Noche 2: el infectado despierta CON la manada; sin infección, señuelos solos ———
  lastKey = '';
  const t1 = Date.now();
  while (Date.now() - t1 < 150000) {
    st = await hlc(ana);
    if (st.phase !== 'night') break;
    const stepId = st.steps[st.stepIdx];
    const key = `n${st.night}:${st.stepIdx}`;
    if (key === lastKey) { await ana.waitForTimeout(400); continue; }
    lastKey = key;
    if (stepId === 'lobos') {
      const wolfPanel = await vp.waitForSelector('.actionpanel:has-text("Manada")', { timeout: 15000 }).then(() => true).catch(() => false);
      check(wolfPanel, `${victim.name} (infectado) despierta con la manada la noche siguiente`);
      const nota = await vp.locator('.actionpanel:has-text("te unió a la manada")').count();
      check(nota >= 1, 'su panel le recuerda que caza y gana con los lobos');
      await vp.click(`.actionpanel .player.selectable[data-p=${otros[0].id}]`);
      await vp.click('button[data-a=act-lobos]');
      ok(`el infectado elige presa: ${otros[0].name}`);
    } else if (stepId === 'infectado') {
      // Poder gastado: nadie tiene nada que tocar; los señuelos suenan y el
      // paso avanza solo.
      const panel = await vp.locator('button[data-a=act-infectado-ok]').count();
      check(panel === 0, 'sin infección, ningún jugador ve el panel del mordisco');
      const avanzó = await waitState(ana, (s) => s.phase !== 'night' || s.steps[s.stepIdx] !== 'infectado', 'los señuelos suenan y el paso avanza solo', 90000).then(() => true).catch(() => false);
      check(avanzó, 'la llamada falsa avanza sola (señuelos + espera humana)');
      lastKey = ''; // el paso pudo avanzar durante la espera
    }
    await ana.waitForTimeout(400);
  }

  // Amanecer 2: cae un aldeano → 2 lobos (infecto + infectado) vs 1 → paridad.
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de partida por paridad');
  check(st.winner === 'lobos', `ganan los lobos (winner=${st.winner})`);
  const endMarks = await pages[victim.name.toLowerCase()].locator('text=🧛').count();
  check(endMarks >= 1, 'la pantalla final marca al infectado con 🧛');

  // Limpieza: volver al lobby y borrar la mesa desechable.
  await ana.waitForSelector('button[data-a=back-lobby]', { timeout: 20000 });
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('[data-a=change-game]', { timeout: 20000 });
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failinf-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-infecto con ${fail} fallos` : '\n✔ E2E-infecto OK');
process.exit(fail ? 1 : 0);
