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
const mk = async (l) => { const c = await browser.newContext(); const p = await c.newPage(); p.on('pageerror', (e) => bad(`[${l}] ${e.message}`)); return p; };
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
await coco.click('button[data-a=change-game]');
await coco.waitForSelector('text=¿A qué jugamos?');
ok('y vuelve al catálogo libremente');
// Ana no se ha movido de su lobby mientras Coco navegaba.
if (await has(ana, '[data-a=open-roles]')) ok('nadie arrastra a Ana fuera de su lobby'); else bad('Ana fue arrastrada fuera del lobby');

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

await browser.close();
console.log(fail ? `✖ navegación: ${fail} fallos` : '✔ navegación libre OK');
process.exit(fail ? 1 : 0);
