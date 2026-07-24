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
  await ctx.addInitScript(() => { window.__hlcTest = true; }); // e2e veloz: sin audio, colchones mínimos
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

async function waitState(page, fn, what, timeout = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await hlc(page);
    if (fn(s)) return s;
    await page.waitForTimeout(300);
  }
  throw new Error('timeout esperando: ' + what);
}

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

try {
  // ——— 1. Creación de grupo ———
  console.log('— Creación de grupo —');
  const ana = await mk('ana');
  // Portada: se crea primero la mesa; la URL antigua del juego redirige.
  await ana.goto(BASE + '/hombres_lobo');
  await ana.waitForSelector('text=Juegos digitales');
  await ana.waitForSelector('#inp-group');
  ok('portada «Juegos digitales»: crear la mesa (URL antigua redirigida)');
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**', { timeout: 45000 });
  const url = ana.url();
  ok('grupo creado, URL: ' + url);
  await ana.waitForSelector('text=Dispositivos (1)');
  check(!(await ana.isVisible('text=⭐ Máster')), 'nadie es máster en el lobby');

  // Nombre de grupo duplicado
  const dup = await mk('dup');
  await dup.goto(BASE + '/hombres_lobo');
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
  await pages.bruno.waitForSelector('text=/sesión ya no es válida/i', { timeout: 45000 });
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
  await leo.waitForSelector('#inp-name', { timeout: 45000 });
  ok('Leo expulsado: su dispositivo vuelve a la pantalla de unirse');
  await leo.context().close();

  // ——— 5. Elegir juego y configurar roles y ajustes ———
  console.log('— Configuración —');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-roles]');
  // Navegación libre en el lobby: quien elige el juego entra al lobby de
  // Castronegro; los demás NO saltan (siguen en el catálogo) hasta que empiece
  // la partida o entren por su cuenta.
  await pages.bruno.waitForSelector('text=¿A qué jugamos?');
  check((await pages.bruno.locator('[data-a=open-roles]').count()) === 0, 'elegir juego NO arrastra a los demás: navegan libres hasta empezar');
  await pages.bruno.click('button[data-a=select-game]');
  await pages.bruno.waitForSelector('[data-a=open-roles]', { timeout: 45000 });
  ok('cada dispositivo entra al lobby de Castronegro cuando quiere');

  // La mesa ya no gestiona narrador ni quién juega: eso vive en «Empezar partida».
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=¿A qué jugamos?');
  await ana.click('.player[data-a=player-menu]:has-text("Ana")');
  check(!(await ana.isVisible('button[data-a=narrator-device]')) && !(await ana.isVisible('button[data-a=toggle-player]')),
    'la mesa solo gestiona personas: sin narrador ni jugará/no jugará');
  await ana.click('button[data-a=close-modal]');
  await pace(ana);
  await ana.click('button[data-a=select-game]'); // Ana vuelve al lobby a configurar
  await ana.waitForSelector('[data-a=open-roles]');
  // La introducción ambientada está en el lobby, con botón de escucha local.
  check(await pages.bruno.isVisible('button[data-a=explain-play-intro]'), 'intro ambientada con botón de escucha en el lobby');
  // «Cómo se juega» abre el resto (instrucciones, roles y ajustes) con lectura local.
  await pages.bruno.click('[data-a=open-explain]');
  await pages.bruno.waitForSelector('text=Cómo se juega');
  check(await pages.bruno.isVisible('button[data-a=explain-speak-local]'), 'cómo se juega: opción de leer en este dispositivo');
  check((await pages.bruno.locator('button[data-a=explain-speak]').count()) === 0, 'ya no se lee en el narrador antes de empezar');
  ok('explicación: intro en el lobby y «cómo se juega» con lectura local');
  await pages.bruno.click('button[data-a=close-modal]');
  await pace(pages.bruno);
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
  // La pantalla «Empezar partida» concentra jugadores, orden, narrador y modo.
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  ok('empezar partida: los dispositivos activos vienen preseleccionados');
  check(await ana.isVisible('button.primary[data-a=pick-narrator][data-p=p-ana]'), 'el narrador por defecto es el creador (chip elegido)');
  await ana.click('button[data-a=pick-narrator][data-p=p-bruno]');
  await ana.waitForSelector('button.primary[data-a=pick-narrator][data-p=p-bruno]');
  await ana.click('button[data-a=pick-narrator][data-p=p-ana]');
  await ana.waitForSelector('button.primary[data-a=pick-narrator][data-p=p-ana]');
  ok('el narrador se cambia con chips en la propia pantalla');
  // Ana narrará sin jugar: se toca a sí misma para quedar fuera.
  await ana.click('.player[data-a=start-player][data-p=p-ana]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
  ok('Ana marcada como solo-narradora (se recuerda para la próxima)');
  // Reglas oficiales: con 4 jugadores el botón queda deshabilitado sin modo casual.
  await ana.waitForSelector('text=/Mínimo 8 jugadores/');
  check((await ana.locator('[data-a=start-auto][disabled]').count()) === 1, 'mínimo oficial de 8 jugadores aplicado (botón deshabilitado)');
  await ana.click('[data-a=back-lobby-game]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  ok('modo casual activado para jugar con menos de 8');
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
  ok('la exclusión de Ana se recuerda al reabrir la pantalla');
  await ana.click('[data-a=start-auto]');
  await waitState(ana, (s) => s.status === 'playing' && s.phase === 'reveal', 'fase de reparto');
  ok('partida iniciada en modo automático');
  await ana.waitForSelector('text=Este dispositivo narra la partida');
  ok('narrador sin rol: pantalla mínima de altavoz');

  // La mesa siempre acoge: un visitante tardío se une aunque haya partida en
  // curso; entra LIBRE (a la mesa), ve la partida en su tarjeta y no es
  // arrastrado a ella. Después se va para no alterar el resto del guion.
  const tarde = await mk('tarde');
  await tarde.goto(url);
  await tarde.fill('#inp-name', 'Tardio');
  await tarde.click('[data-a=join]');
  await tarde.waitForSelector('text=¿A qué jugamos?');
  await tarde.waitForSelector('[data-match]');
  ok('un visitante tardío se une con partida en curso y queda libre en la mesa');
  // Salir = tocar tu propia ficha (badge «Tú») → «Abandonar» (ya no hay botón Salir arriba).
  await tarde.click('.player[data-a=player-menu]:has(.badge.you)');
  await tarde.click('[data-a=leave]');
  await tarde.click('button[data-a=leave-confirm]');
  await tarde.waitForURL('**/');
  await tarde.context().close();

  // El narrador-altavoz no recibe rol ni carta que confirmar.
  check(!(await ana.isVisible('[data-a=confirm-role-seen]')), 'el narrador no tiene carta que confirmar');
  check(!(await pages.bruno.isVisible('.rolecard')), 'la carta no se muestra hasta pedirla con «Ver mi rol»');
  for (const label of ['bruno', 'carla', 'david', 'elsa']) {
    const p = pages[label];
    await p.click('[data-a=open-reveal-role]');
    await p.waitForSelector('.rolecard .rname');
    await p.click('[data-a=confirm-role-seen]'); await pace(p);
  }
  ok('los 4 jugadores despliegan su carta, la ven y confirman');
  await pages.bruno.waitForSelector('button[data-a=begin-first-night]');
  await pages.bruno.click('button[data-a=begin-first-night]');
  ok('la primera noche también espera al botón');

  let st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');
  check(!st.players.find((p) => p.name === 'Ana').role, 'el máster no recibe rol en automático');

  // Cartas en juego: tira clicable junto a la crónica; cada carta abre su
  // detalle con el «cómo se juega» paso a paso.
  await pages.bruno.waitForSelector('text=Cartas en juego');
  check(await pages.bruno.isVisible('text=/Composición pública/i'), 'tira 🎴: composición pública visible');
  await pages.bruno.click('button[data-a=role-detail][data-p=hombre_lobo]');
  await pages.bruno.waitForSelector('text=Cómo se juega');
  ok('el detalle del rol explica paso a paso cómo se juega');
  // B13: en partida, el detalle de rol NO ofrece leerlo en voz alta (sería un tell).
  check((await pages.bruno.locator('[data-a=role-play]').count()) === 0, 'el ▶️ de lectura desaparece durante la partida (B13)');
  await pages.bruno.click('button[data-a=close-modal]');
  await pace(pages.bruno);
  const roleOf = Object.fromEntries(st.players.filter((p) => p.role).map((p) => [p.role, p.name.toLowerCase()]));
  console.log('  roles:', st.players.map((p) => `${p.name}=${p.role}`).join(', '));
  const wolfPage = pages[roleOf.hombre_lobo];
  const wolfName = st.players.find((p) => p.role === 'hombre_lobo').name;

  // Pausa global: cualquiera pausa, todo se congela, cualquiera reanuda.
  // (Pausar vive ahora en el menú ⋯ de la cabecera; reanudar sigue en el cuerpo.)
  await pages.david.click('[data-a=game-menu]');
  await pages.david.click('button[data-a=pause-game]');
  await pages.carla.waitForSelector('text=Partida en pausa');
  ok('cualquier jugador puede pausar y todos lo ven');
  await pages.elsa.click('button[data-a=resume-game]');
  await pages.carla.waitForSelector('text=Partida en pausa', { state: 'detached' });
  ok('reanudar funciona desde cualquier dispositivo');

  // Noche 1: vidente mira al lobo.
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'vidente', 'turno de la vidente');
  const vidPage = pages[roleOf.vidente];
  // Postura de mesa (B28): en reposo, la pantalla de la Vidente es LA MISMA que
  // la de los demás — nada de un panel más largo que la delate de reojo.
  check(await vidPage.isVisible('[data-a=open-night-turn]'), 'de noche todos los móviles muestran la misma tarjeta neutra');
  check(await wolfPage.isVisible('[data-a=open-night-turn]'), 'quien no actúa ve exactamente lo mismo');
  check(!(await vidPage.isVisible('[data-a=act-vidente]')), 'el panel de la Vidente NO aparece solo: hay que pedirlo');
  // Y quien lo abre sin que le toque recibe «no es tu turno»: ni el lobo que
  // espía las pantallas de la mesa averigua quién es la Vidente.
  await wolfPage.click('[data-a=open-night-turn]');
  await wolfPage.waitForSelector('text=/No es tu turno/i');
  await wolfPage.click('[data-a=close-night-turn]');
  await openTurn(vidPage, '[data-a=act-vidente]');
  await vidPage.click(`.actionpanel .player.selectable:has-text("${wolfName}")`);
  await vidPage.click('[data-a=act-vidente]');
  await vidPage.waitForSelector(`text=/es .*Hombre Lobo/`);
  ok('la vidente ve el rol del objetivo');
  await vidPage.click('button[data-a=act-vidente-seen]');
  ok('la vidente confirma que lo ha visto (pausa de disimulo antes del siguiente paso)');

  // Con caza en la noche 1 no hay paso de presentación: los lobos van directos
  // a elegir presa (se reconocen al abrir los ojos para cazar).
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'turno de los lobos');
  check(!(await wolfPage.isVisible('.rolecard')), 'el rol queda oculto por defecto durante la partida');
  await wolfPage.click('button[data-a=toggle-rolecard]');
  await wolfPage.waitForSelector('.rolecard');
  check(await wolfPage.isVisible('text=/reconoceros como manada/i'), 'el lobo aún no ha visto a su manada en la carta');
  await wolfPage.click('.rolecard');
  check(!(await wolfPage.isVisible('.rolecard')), 'la carta se vuelve a ocultar al tocarla');

  // Lobo: elige víctima (la vidente).
  const videnteName = st.players.find((p) => p.role === 'vidente').name;
  await openTurn(wolfPage, '[data-a=act-lobos]');
  await wolfPage.click(`.actionpanel .player.selectable:has-text("${videnteName}")`);
  await wolfPage.click('[data-a=act-lobos]');
  ok('el lobo elige víctima');

  // Bruja: cura a la víctima y termina.
  await waitState(ana, (s) => s.steps[s.stepIdx] === 'bruja', 'turno de la bruja');
  const brujaPage = pages[roleOf.bruja];
  await openTurn(brujaPage, '[data-a=act-bruja-done]');
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
  // La confirmación es inline y con nombre: sin modal intermedio.
  await pages.carla.click(`[data-a=vote-confirm]:has-text("${wolfName}")`);
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de partida', 30000);
  check(st.winner === 'pueblo', 'el pueblo gana al linchar al lobo');
  await pages.bruno.waitForSelector('text=/El Pueblo ha ganado/');
  ok('pantalla final con ganador visible para todos');
  check(await pages.bruno.isVisible(`.player:has-text("${wolfName}") >> text=Hombre Lobo`), 'roles revelados al final');

  // ——— 7. Volver al lobby y eliminar grupo ———
  console.log('— Lobby y limpieza —');
  await ana.click('[data-a=back-lobby]');
  // Tras la partida, TODOS aterrizan en el lobby del juego recién jugado.
  await ana.waitForSelector('[data-a=open-start]');
  if (/\/hombres_lobo$/.test(new URL(ana.url()).pathname)) ok('al terminar se vuelve al lobby del juego (URL del juego)'); else bad('URL inesperada tras la partida: ' + ana.url());
  const anaPref = await ana.evaluate(() => window.__hlc.players.find((p) => p.id === 'p-ana')?.isPlayerFor?.hombres_lobo);
  check(anaPref === false, 'la exclusión de Ana (no juega) se recuerda tras la partida (por juego)');
  await pages.bruno.waitForSelector('[data-a=open-start]');
  ok('vuelta al lobby del juego para todos');

  // Un jugador abandona (el botón Salir también está en el lobby del juego).
  await pages.david.click('[data-a=leave]');
  await pages.david.click('[data-a=leave-confirm]');
  await pages.david.waitForURL(BASE + '/');
  await waitState(ana, (s) => s.players.length === 4, 'grupo de 4');
  ok('abandonar grupo funciona');

  // Ya no hay botón «eliminar la mesa»: la mesa se borra SOLA cuando se marchan
  // todos. Se van los demás y, al salir el ÚLTIMO (Ana), la mesa desaparece.
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=Dispositivos (4)');
  check(!(await ana.isVisible('[data-a=confirm-delete-group]')), 'ya no existe el botón de eliminar la mesa');
  for (const p of [pages.bruno, pages.carla, pages.elsa]) {
    await p.goto(url); await p.click('.player[data-a=player-menu]:has(.badge.you)'); await p.click('[data-a=leave]'); await p.click('[data-a=leave-confirm]'); await p.waitForURL(BASE + '/');
  }
  await waitState(ana, (s) => s.players.length === 1, 'solo queda Ana en la mesa');
  await ana.click('.player[data-a=player-menu]:has(.badge.you)');
  await ana.click('[data-a=leave]');
  await ana.click('[data-a=leave-confirm]');
  await ana.waitForURL(BASE + '/');
  ok('la mesa se borra sola cuando se marcha el último jugador');

  // El nombre queda libre: crear de nuevo funciona.
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**');
  const url2 = ana.url();
  ok('el nombre del grupo se puede reutilizar');

  // Reclamar el rol de máster desde la portada (grupo ya existente).
  const paco = await mk('paco');
  await paco.goto(BASE + '/hombres_lobo');
  await paco.fill('#inp-name', 'Paco');
  await paco.fill('#inp-group', GROUP);
  await paco.click('[data-a=create-group]');
  await paco.waitForSelector('[data-a=join-existing]');
  await paco.click('[data-a=join-existing]');
  await paco.waitForURL('**/g/**');
  await paco.waitForSelector('.player:has-text("Paco")');
  ok('Paco entra en el grupo existente desde la portada');
  await paco.goto(url2);
  await paco.locator('button[data-a=select-game]').first().click();
  await paco.waitForSelector('[data-a=open-start]', { timeout: 45000 });
  await ana.goto(url2); // Ana entra al lobby cuando quiere
  await ana.locator('button[data-a=select-game]').first().click();
  await ana.waitForSelector('[data-a=open-start]', { timeout: 45000 });
  ok('en el lobby, cualquiera elige juego y ve «empezar» (no hay máster hasta iniciar)');
  // Limpieza: se marchan los dos → la mesa se borra sola.
  for (const p of [ana, paco]) {
    await p.goto(url2); await p.click('.player[data-a=player-menu]:has(.badge.you)'); await p.click('[data-a=leave]'); await p.click('[data-a=leave-confirm]'); await p.waitForURL(BASE + '/');
  }
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
