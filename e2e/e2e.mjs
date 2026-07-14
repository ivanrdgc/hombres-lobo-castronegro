// E2E: simula una partida completa con varios dispositivos (contextos) reales.
import { chromium } from 'playwright';

const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
const GROUP = 'E2E ' + Date.now().toString(36).slice(-5);
let failures = 0;
const ok = (msg) => console.log('  ✔', msg);
const bad = (msg) => { failures++; console.log('  ✖', msg); };
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

const browser = await chromium.launch();
const pages = {};

const pace = (p) => p.waitForTimeout(350);
async function mk(label) {
  const ctx = await browser.newContext({ locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`  ⚠ [${label}] console: ${m.text().slice(0, 160)}`); });
  pages[label] = page;
  return page;
}

const hlc = (page) => page.evaluate(() => {
  const s = window.__hlc;
  return {
    phase: s.group?.game?.phase, stepIdx: s.group?.game?.stepIdx,
    steps: s.group?.game?.steps, acts: s.group?.game?.acts,
    winner: s.group?.game?.winner, status: s.group?.status,
    pending: s.group?.game?.pending, votesLeft: s.group?.game?.votesLeft,
    dayNum: s.group?.game?.dayNum, night: s.group?.game?.night,
    players: s.players.map((p) => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, roleSeen: p.roleSeen })),
  };
});

async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await hlc(page);
    if (fn(s)) return s;
    await page.waitForTimeout(300);
  }
  throw new Error('timeout esperando: ' + what);
}

try {
  // ——— 1. Creación de grupo ———
  console.log('— Creación de grupo —');
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**', { timeout: 15000 });
  const url = ana.url();
  ok('grupo creado, URL: ' + url);
  await ana.waitForSelector('text=Dispositivos (1)');
  check(!(await ana.isVisible('text=⭐ Máster')), 'nadie es máster en el lobby');

  // Nombre de grupo duplicado
  const dup = await mk('dup');
  await dup.goto(BASE + '/');
  await dup.fill('#inp-name', 'Otro');
  await dup.fill('#inp-group', GROUP);
  await dup.click('[data-a=create-group]');
  await dup.waitForSelector('text=/ya existe/i', { timeout: 10000 });
  check(await dup.isVisible('[data-a=join-existing]'), 'modal ofrece entrar en el grupo existente');
  await dup.click('button[data-a=close-modal]');
  ok('grupo duplicado: modal con opción de entrar y de elegir otro nombre');
  await dup.context().close();

  // ——— 2. Uniones ———
  console.log('— Unirse al grupo —');
  for (const name of ['Bruno', 'Carla', 'David', 'Elsa']) {
    const p = await mk(name.toLowerCase());
    await p.goto(url);
    await p.waitForSelector('#inp-name');
    check(await p.isVisible(`text=${GROUP}`), `${name} ve el nombre del grupo`);
    await p.fill('#inp-name', name);
    await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
    ok(name + ' unido');
  }
  await ana.waitForSelector('text=Dispositivos (5)');
  ok('los 5 miembros aparecen en la lista del máster');

  // ——— 3. Colisión de nombre + takeover ———
  console.log('— Nombre duplicado y reconexión —');
  const eva = await mk('eva');
  await eva.goto(url);
  await eva.fill('#inp-name', 'Bruno');
  await eva.click('[data-a=join]');
  await eva.waitForSelector('[data-a=takeover-confirm]');
  ok('aviso de nombre ocupado con opción de reconectar');
  await eva.click('[data-a=takeover-confirm]');
  await eva.waitForSelector('text=/Dispositivos/');
  ok('Eva ha tomado la sesión de Bruno');
  await pages.bruno.waitForSelector('text=/sesión ya no es válida/i', { timeout: 15000 });
  ok('el dispositivo antiguo de Bruno queda desconectado');
  // Bruno recupera su sesión y Eva vuelve a quedar fuera.
  await pages.bruno.fill('#inp-name', 'Bruno');
  await pages.bruno.click('[data-a=join]');
  await pages.bruno.waitForSelector('[data-a=takeover-confirm]');
  await pages.bruno.click('[data-a=takeover-confirm]');
  await pages.bruno.waitForSelector('text=/Dispositivos/');
  await eva.context().close();
  ok('Bruno recupera su sesión');

  // ——— 4. Expulsión ———
  console.log('— Expulsión desde el máster —');
  const leo = await mk('leo');
  await leo.goto(url);
  await leo.fill('#inp-name', 'Leo');
  await leo.click('[data-a=join]');
  await leo.waitForSelector('text=/Dispositivos/');
  await ana.waitForSelector('text=Dispositivos (6)');
  await ana.click('.player[data-a=player-menu]:has-text("Leo")');
  await ana.click('[data-a=kick]');
  await ana.waitForSelector('text=Dispositivos (5)');
  await leo.waitForSelector('#inp-name', { timeout: 15000 });
  ok('Leo expulsado: su dispositivo vuelve a la pantalla de unirse');
  await leo.context().close();

  // ——— 5. Configuración de roles y ajustes ———
  console.log('— Configuración —');
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('text=Roles de la partida');
  check(await ana.isVisible('.roletoggle.locked:has-text("Hombre Lobo")'), 'lobo siempre activo (bloqueado)');
  check(await ana.isVisible('.roletoggle:has-text("El Gaitero")'), 'roles de expansión listados');
  await ana.click('.roletoggle[data-p=cuervo]');
  await ana.waitForSelector('.roletoggle.on[data-p=cuervo]');
  await ana.click('.roletoggle.on[data-p=cuervo]'); // lo quitamos otra vez
  await ana.waitForSelector('.roletoggle[data-p=cuervo]:not(.on)');
  ok('activar/desactivar rol funciona y se sincroniza');
  // Composición determinista para el resto del test: sin cupido (queda vidente+bruja+cazador).
  await ana.click('.roletoggle.on[data-p=cupido]');
  await ana.waitForSelector('.roletoggle[data-p=cupido]:not(.on)');
  await ana.click('button[data-a=close-modal]');
  const brunoSeesRoles = await pages.bruno.waitForSelector('text=La Vidente');
  check(!!brunoSeesRoles, 'los jugadores ven los roles activados');

  // ——— 6. Partida automática ———
  console.log('— Partida automática —');
  // Reglas oficiales: con 4 jugadores no deja empezar sin modo casual.
  await ana.click('[data-a=open-start]');
  await ana.click('[data-a=start-auto]');
  await ana.waitForSelector('text=/reglas oficiales piden al menos 8/i');
  ok('mínimo oficial de 8 jugadores aplicado');
  await ana.click('button[data-a=close-modal]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  ok('modo casual activado para jugar con menos de 8');
  await ana.click('[data-a=open-start]');
  await ana.click('[data-a=start-auto]');
  await waitState(ana, (s) => s.status === 'playing' && s.phase === 'reveal', 'fase de reparto');
  ok('partida iniciada en modo automático');

  // Un nuevo visitante no puede entrar con partida en curso.
  const tarde = await mk('tarde');
  await tarde.goto(url);
  await tarde.waitForSelector('text=/partida en curso/i');
  check(await tarde.isVisible('[data-a=retry]'), 'visitante tardío ve "partida en curso" + botón reintentar');
  await tarde.context().close();

  // El máster no recibe rol: ve el panel de narrador. Confirman los 4 jugadores.
  await ana.waitForSelector('text=Eres el narrador');
  check(!(await ana.isVisible('[data-a=confirm-role-seen]')), 'el máster no tiene carta que confirmar');
  for (const label of ['bruno', 'carla', 'david', 'elsa']) {
    const p = pages[label];
    await p.waitForSelector('.rolecard .rname');
    await p.click('[data-a=confirm-role-seen]'); await pace(p);
  }
  ok('los 4 jugadores ven su carta y confirman');
  await pages.bruno.waitForSelector('button[data-a=begin-first-night]');
  await pages.bruno.click('button[data-a=begin-first-night]');
  ok('la primera noche también espera al botón');

  let st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');
  check(!st.players.find((p) => p.name === 'Ana').role, 'el máster no recibe rol en automático');
  const roleOf = Object.fromEntries(st.players.filter((p) => p.role).map((p) => [p.role, p.name.toLowerCase()]));
  console.log('  roles:', st.players.map((p) => `${p.name}=${p.role}`).join(', '));
  const wolfPage = pages[roleOf.hombre_lobo];
  const wolfName = st.players.find((p) => p.role === 'hombre_lobo').name;

  // Pausa global: cualquiera pausa, todo se congela, cualquiera reanuda.
  await pages.david.click('button[data-a=pause-game]');
  await pages.carla.waitForSelector('text=Partida en pausa');
  ok('cualquier jugador puede pausar y todos lo ven');
  await pages.elsa.click('button[data-a=resume-game]');
  await pages.carla.waitForSelector('text=Partida en pausa', { state: 'detached' });
  ok('reanudar funciona desde cualquier dispositivo');

  // Noche 1: vidente mira al lobo.
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'vidente', 'turno de la vidente');
  const vidPage = pages[roleOf.vidente];
  await vidPage.click(`.actionpanel .player.selectable:has-text("${wolfName}")`);
  await vidPage.click('[data-a=act-vidente]');
  await vidPage.waitForSelector(`text=/es .*Hombre Lobo/`);
  ok('la vidente ve el rol del objetivo');
  await vidPage.click('button[data-a=act-vidente-seen]');
  ok('la vidente confirma que lo ha visto (pausa de disimulo antes del siguiente paso)');

  // Reconocimiento físico de la manada (nuevo paso de la noche 1).
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'lobos_reconocen', 'reconocimiento de la manada');
  check(!(await wolfPage.isVisible('.rolecard')), 'el rol queda oculto por defecto durante la partida');
  await wolfPage.click('button[data-a=toggle-rolecard]');
  await wolfPage.waitForSelector('.rolecard');
  check(await wolfPage.isVisible('text=/reconoceros como manada/i'), 'el lobo no ve nombres de la manada antes de reconocerse');
  await wolfPage.click('.rolecard');
  check(!(await wolfPage.isVisible('.rolecard')), 'la carta se vuelve a ocultar al tocarla');
  await wolfPage.click('button[data-a=act-lobos-reconocido]');
  ok('el lobo confirma que la manada se ha reconocido');

  // Lobo: elige víctima (la vidente).
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'turno de los lobos');
  const videnteName = st.players.find((p) => p.role === 'vidente').name;
  await wolfPage.click(`.actionpanel .player.selectable:has-text("${videnteName}")`);
  await wolfPage.click('[data-a=act-lobos]');
  ok('el lobo elige víctima');

  // Bruja: cura a la víctima y termina.
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'bruja', 'turno de la bruja');
  const brujaPage = pages[roleOf.bruja];
  await brujaPage.waitForSelector(`text=${videnteName}`);
  await brujaPage.click('.switch[data-a=act-bruja-heal-toggle]');
  await brujaPage.click('[data-a=act-bruja-done]');
  ok('la bruja usa la poción de vida');

  // Amanecer sin muertes.
  st = await waitState(ana, (s) => s.phase === 'day', 'amanecer/día 1', 40000);
  check(st.players.filter((p) => p.role).every((p) => p.alive), 'nadie muere (víctima curada por la bruja)');

  // Día: el pueblo condena al lobo (vota Carla).
  await pages.carla.waitForSelector('.actionpanel:has-text("El juicio del pueblo")');
  await pages.carla.click(`.actionpanel .player.selectable:has-text("${wolfName}")`);
  await pages.carla.click('[data-a=vote-confirm]');
  await pages.carla.click('[data-a=vote-final]');
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de partida', 30000);
  check(st.winner === 'pueblo', 'el pueblo gana al linchar al lobo');
  await pages.bruno.waitForSelector('text=/El Pueblo ha ganado/');
  ok('pantalla final con ganador visible para todos');
  check(await pages.bruno.isVisible(`.player:has-text("${wolfName}") >> text=Hombre Lobo`), 'roles revelados al final');

  // ——— 7. Volver al lobby y eliminar grupo ———
  console.log('— Lobby y limpieza —');
  await ana.click('[data-a=back-lobby]');
  await ana.waitForSelector('text=Dispositivos (5)');
  await pages.bruno.waitForSelector('[data-a=leave]');
  ok('vuelta al lobby para todos');

  // Un jugador abandona.
  await pages.david.click('[data-a=leave]');
  await pages.david.click('[data-a=leave-confirm]');
  await pages.david.waitForURL(BASE + '/');
  await ana.waitForSelector('text=Dispositivos (4)');
  ok('abandonar grupo funciona');

  // El máster elimina el grupo.
  await ana.click('[data-a=confirm-delete-group]');
  await ana.click('[data-a=delete-group-confirm]');
  await ana.waitForURL(BASE + '/');
  await pages.bruno.waitForSelector('text=/grupo ha sido eliminado|grupo no existe/i', { timeout: 15000 });
  ok('grupo eliminado: los demás son expulsados y el nombre queda libre');

  // El nombre queda libre: crear de nuevo funciona.
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**');
  ok('el nombre del grupo se puede reutilizar');

  // Reclamar el rol de máster desde la portada (grupo ya existente).
  const paco = await mk('paco');
  await paco.goto(BASE + '/');
  await paco.fill('#inp-name', 'Paco');
  await paco.fill('#inp-group', GROUP);
  await paco.click('[data-a=create-group]');
  await paco.waitForSelector('[data-a=join-existing]');
  await paco.click('[data-a=join-existing]');
  await paco.waitForURL('**/g/**');
  await paco.waitForSelector('.player:has-text("Paco")');
  ok('Paco entra en el grupo existente desde la portada');
  const anaCanStart = await ana.isVisible('[data-a=open-start]');
  check(anaCanStart, 'cualquiera puede iniciar (Ana ve empezar sin ser máster)');
  await paco.click('[data-a=confirm-delete-group]');
  await paco.click('[data-a=delete-group-confirm]');
  await paco.waitForURL(BASE + '/');
  await paco.context().close();
  ok('limpieza final');
} catch (e) {
  failures++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try {
      if (!p.isClosed()) await p.screenshot({ path: `fail-${label}.png` });
    } catch { /* cerrada */ }
  }
}

await browser.close();
console.log(failures ? `\n✖ E2E con ${failures} fallos` : '\n✔ E2E completo sin fallos');
process.exit(failures ? 1 : 0);
