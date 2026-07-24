// E2E: navegación LIBRE en el lobby. Antes de empezar, cada dispositivo navega
// entre el catálogo y el lobby del juego a su aire; nadie arrastra a nadie de
// pantalla. La sincronización de pantalla solo llega al iniciar la partida.
import { chromium } from 'playwright';
const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
const GROUP = 'NAV ' + Date.now().toString(36).slice(-5);
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const browser = await chromium.launch();
const mk = async (l) => { const c = await browser.newContext(); await c.addInitScript(() => { window.__hlcTest = true; }); const p = await c.newPage(); p.on('pageerror', (e) => bad(`[${l}] ${e.message}`)); return p; };
const has = async (p, sel) => (await p.locator(sel).count()) > 0;

const ana = await mk('ana');
await ana.goto(BASE + '/hombres_lobo');
await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
const url = ana.url();
const bruno = await mk('bruno');
await bruno.goto(url); await bruno.fill('#inp-name', 'Bruno'); await bruno.click('[data-a=join]');
await bruno.waitForSelector('text=¿A qué jugamos?');
const coco = await mk('coco');
await coco.goto(url); await coco.fill('#inp-name', 'Coco'); await coco.click('[data-a=join]');
await coco.waitForSelector('text=¿A qué jugamos?');

// 1. Ana elige el juego → solo Ana entra al lobby; Bruno y Coco siguen libres.
await ana.click('button[data-a=select-game]');
await ana.waitForSelector('[data-a=open-roles]');
ok('quien elige el juego entra al lobby');
await bruno.waitForSelector('text=¿A qué jugamos?');
if (!(await has(bruno, '[data-a=open-roles]'))) ok('Bruno NO salta: sigue en el catálogo'); else bad('Bruno fue arrastrado al lobby');
if (!(await has(coco, '[data-a=open-roles]'))) ok('Coco NO salta: sigue en el catálogo'); else bad('Coco fue arrastrado al lobby');

// 2. Coco entra al lobby por su cuenta; luego vuelve al catálogo.
await coco.click('button[data-a=select-game]');
await coco.waitForSelector('[data-a=open-roles]');
ok('cada dispositivo entra al lobby cuando quiere');
// La navegación vive en la URL: el lobby del juego tiene URL propia y recargable.
if (/\/g\/[a-z0-9-]+\/hombres_lobo$/.test(coco.url())) ok('el lobby del juego tiene URL propia: ' + new URL(coco.url()).pathname); else bad('URL inesperada en el lobby: ' + coco.url());
await coco.reload();
await coco.waitForSelector('[data-a=open-roles]', { timeout: 30000 });
ok('recargar mantiene a Coco en el lobby del juego (URL única)');
await coco.click('button[data-a=change-game]');
await coco.waitForSelector('text=¿A qué jugamos?');
ok('y vuelve al catálogo libremente');
await coco.reload();
await coco.waitForSelector('text=¿A qué jugamos?', { timeout: 30000 });
if (!(await has(coco, '[data-a=open-roles]'))) ok('recargar en la mesa deja a Coco en la mesa'); else bad('la recarga movió a Coco de pantalla');

// 2b. Scroll de navegación: ir HACIA ADELANTE empieza arriba; volver a la mesa
//     conserva el scroll (viewport de móvil, para tener contenido que desplazar).
await coco.setViewportSize({ width: 390, height: 680 });
await coco.waitForSelector('text=¿A qué jugamos?');
await coco.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await coco.waitForTimeout(120);
const scrollBefore = await coco.evaluate(() => window.scrollY);
if (scrollBefore > 50) {
  await coco.click('button[data-a=select-game]');
  await coco.waitForSelector('[data-a=open-roles]');
  await coco.click('[data-a=open-start]'); // «empezar» es la pantalla larga
  await coco.waitForSelector('[data-a=start-auto]');
  await coco.waitForTimeout(150);
  const scrollFwd = await coco.evaluate(() => window.scrollY);
  if (scrollFwd < 40) ok(`ir hacia adelante (a «empezar») arranca arriba (scroll ${scrollFwd})`);
  else bad(`ir hacia adelante no arrancó arriba: ${scrollFwd}`);
  await coco.click('[data-a=back-lobby-game]');
  await coco.waitForSelector('[data-a=open-roles]');
  await coco.click('button[data-a=change-game]');
  await coco.waitForSelector('text=¿A qué jugamos?');
  await coco.waitForTimeout(250);
  const scrollBack = await coco.evaluate(() => window.scrollY);
  if (Math.abs(scrollBack - scrollBefore) < 40) ok(`volver a la mesa conserva el scroll (${scrollBefore}→${scrollBack})`);
  else bad(`la mesa perdió el scroll al volver: ${scrollBefore}→${scrollBack}`);
} else {
  ok('(la mesa no tenía scroll suficiente para la prueba; omitida)');
}
// Ana no se ha movido de su lobby mientras Coco navegaba.
if (await has(ana, '[data-a=open-roles]')) ok('nadie arrastra a Ana fuera de su lobby'); else bad('Ana fue arrastrada fuera del lobby');
// La pantalla «Empezar partida» también es URL propia y recargable.
await ana.click('[data-a=open-start]');
await ana.waitForSelector('[data-a=start-auto]');
if (/\/empezar$/.test(new URL(ana.url()).pathname)) ok('empezar partida tiene URL propia: …/empezar'); else bad('URL inesperada al empezar: ' + ana.url());
await ana.reload();
await ana.waitForSelector('[data-a=start-auto]', { timeout: 30000 });
ok('recargar mantiene la pantalla de empezar');
await ana.click('[data-a=back-lobby-game]');
await ana.waitForSelector('[data-a=open-roles]');

// 2.5 Renombrar desde la mesa (B31), en el mismo menú de expulsar/abandonar.
await bruno.goto(url);
await bruno.waitForSelector('text=/Dispositivos/');
await bruno.click('.player[data-a=player-menu]:has(.badge.you)');
await bruno.click('[data-a=rename-open]');
await bruno.fill('#inp-rename', 'Ana'); // colisión: ese nombre ya está en la mesa
await bruno.click('[data-a=rename-save]');
await bruno.waitForSelector('.flash.error', { timeout: 5000 });
ok('no deja ponerse el nombre de otro de la mesa');
await bruno.fill('#inp-rename', 'Brunilda');
await bruno.click('[data-a=rename-save]');
await bruno.waitForSelector('text=Brunilda', { timeout: 8000 });
ok('me cambio el nombre desde el menú de la mesa');
// Antes de recargar, esperar a que OTRO dispositivo lo vea: así sabemos que la
// escritura llegó al servidor y no estamos leyendo el eco local de Firestore.
await ana.goto(url);
await ana.waitForSelector('text=Brunilda', { timeout: 12000 });
ok('el nombre nuevo llega a los demás dispositivos');
await bruno.reload();
await bruno.waitForSelector('text=Brunilda', { timeout: 10000 });
ok('el nombre nuevo sobrevive a recargar (sesión actualizada)');
await ana.waitForSelector('text=/Dispositivos/');
await ana.click('.player[data-a=player-menu][data-p="p-coco"]');
await ana.click('[data-a=rename-open]');
await ana.fill('#inp-rename', 'Cocó');
await ana.click('[data-a=rename-save]');
await ana.waitForSelector('text=Cocó', { timeout: 8000 });
ok('puedo renombrar a otro dispositivo de la mesa');
await ana.click('button[data-a=select-game]');
await ana.waitForSelector('[data-a=open-roles]');

// 3. Al EMPEZAR la partida, todos convergen — incluido Bruno, que sigue en el
//    catálogo. Modo casual (3 jugadores); Ana narra y juega desde su móvil.
await ana.click('[data-a=open-settings]');
await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
await ana.click('button[data-a=close-modal]');
await ana.click('[data-a=open-start]');
await ana.click('[data-a=start-auto]');
await bruno.waitForSelector('[data-a=open-reveal-role]', { timeout: 60000 });
ok('al empezar, quien estaba en el catálogo converge a la pantalla del juego');
await coco.waitForSelector('[data-a=open-reveal-role]', { timeout: 60000 });
ok('la sincronización de pantalla llega con la partida, no antes');
// La partida en curso es su propia página: todos quedan en …/partida.
await ana.waitForTimeout(600);
const inGameUrls = [ana, bruno, coco].map((p) => new URL(p.url()).pathname);
if (inGameUrls.every((u) => /\/hombres_lobo\/partida\/[a-z0-9]+$/.test(u))) ok('la partida tiene URL propia en todos: …/partida/<id>'); else bad('URLs inesperadas en partida: ' + inGameUrls.join(' '));
if (new Set(inGameUrls).size === 1) ok('los tres comparten la URL de SU partida'); else bad('URLs de partida divergentes: ' + inGameUrls.join(' '));

// 5. En partida, la mesa solo se alcanza por «🪑 La mesa» del menú ⋯ (la URL de
//    un miembro se recoloca sola a su partida): comprobamos que el camino existe
//    y lleva al menú de cada dispositivo, donde vive «Cambiar el nombre».
await bruno.click('[data-a=game-menu]');
await bruno.click('[data-a=table-open]');
await bruno.waitForSelector('[data-a=table-player]', { timeout: 8000 });
ok('desde la partida se llega a la mesa por el menú ⋯');
await bruno.click('.player[data-a=table-player]:has(.badge.you)');
await bruno.waitForSelector('[data-a=rename-open]', { timeout: 8000 });
ok('y desde ahí se puede cambiar el nombre a media partida');

await browser.close();
console.log(fail ? `✖ navegación: ${fail} fallos` : '✔ navegación libre OK');
process.exit(fail ? 1 : 0);
