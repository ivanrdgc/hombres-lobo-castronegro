// E2E: orden de la mesa. Los roles de vecindad (zorro…) ya NO fuerzan una
// pantalla de confirmación al empezar: avisan dentro del modal de roles. El
// orden se ajusta arrastrando el asa ⠿ en la pantalla de la mesa y se recuerda.
import { chromium } from 'playwright';
const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
const GROUP = 'SEAT ' + Date.now().toString(36).slice(-5);
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const browser = await chromium.launch();
const pages = {};
const mk = async (l) => { const c = await browser.newContext(); const p = await c.newPage(); p.on('pageerror', (e) => bad(`[${l}] ${e.message}`)); pages[l] = p; return p; };
const seating = (p) => p.evaluate(() => window.__hlc.group?.seating || null);
const orders = (p) => p.evaluate(() => window.__hlc.players.map((x) => [x.name, x.order]));

const ana = await mk('ana');
await ana.goto(BASE + '/hombres_lobo');
await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
const url = ana.url();
for (const n of ['Bea', 'Coco', 'Dani']) { const p = await mk(n.toLowerCase()); await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]'); await p.waitForSelector('text=/Dispositivos/'); }
// Ana narra sin jugar.
await ana.click('.player[data-a=player-menu]:has-text("Ana")');
await ana.click('button[data-a=toggle-player]');
await ana.waitForSelector('.player:has-text("Ana"):has-text("no juega")');

// El Zorro (rol de vecindad) avisa sobre el orden de la mesa dentro del modal de roles.
await ana.click('button[data-a=select-game]');
await ana.waitForSelector('[data-a=open-roles]');
await ana.click('[data-a=open-roles]');
await ana.click('.roletoggle[data-p=zorro]:not(.on)');
await ana.waitForSelector('.roletoggle.on[data-p=zorro]');
if (await ana.isVisible('.roletoggle.on[data-p=zorro] >> text=/orden de los jugadores/i')) ok('el rol de vecindad (Zorro) avisa sobre el orden de la mesa'); else bad('el Zorro no muestra el aviso de orden');
await ana.click('button[data-a=close-modal]');
// Modo casual para 3 jugadores.
await ana.click('[data-a=open-settings]');
await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
await ana.click('button[data-a=close-modal]');
// Empezar ya no pide confirmar el orden: aparecen los modos directamente.
await ana.click('[data-a=open-start]');
await ana.waitForSelector('[data-a=start-auto]');
if ((await ana.locator('text=Orden de la mesa').count()) === 0) ok('activar un rol de vecindad ya NO fuerza confirmar el orden al empezar'); else bad('sigue apareciendo la confirmación de orden');
await ana.click('button[data-a=close-modal]');

// Reordenar arrastrando en la MESA: Bea baja al final de la lista.
await ana.click('[data-a=change-game]');
await ana.waitForSelector('.players.seatable');
await ana.locator('.draghandle[data-drag=p-bea]').hover();
await ana.mouse.down();
const list = await ana.locator('.players.seatable').boundingBox();
await ana.mouse.move(list.x + list.width / 2, list.y + list.height + 14, { steps: 12 });
await ana.mouse.up();
await ana.waitForTimeout(1000);
const s1 = await seating(ana);
if (s1 && s1[s1.length - 1] === 'p-bea') ok('arrastrar el asa reordena y guarda el orden: ' + s1.join(',')); else bad('el arrastre no colocó a Bea al final: ' + JSON.stringify(s1));

// Empezar: player.order sigue el orden de la mesa.
await ana.click('button[data-a=select-game]');
await ana.waitForSelector('[data-a=open-start]');
await ana.click('[data-a=open-start]');
await ana.click('[data-a=start-auto]');
await ana.waitForSelector('text=Este dispositivo narra la partida', { timeout: 60000 });
const o = await orders(ana);
// Ana narra y no juega: su order no se normaliza (da igual). Comparamos entre jugadores.
const playing = o.filter((x) => ['Bea', 'Coco', 'Dani'].includes(x[0]));
const beaOrder = playing.find((x) => x[0] === 'Bea')?.[1];
const maxPlaying = Math.max(...playing.map((x) => x[1]));
if (beaOrder === maxPlaying) ok('player.order sigue el orden de mesa (Bea, la última, con el asiento mayor)'); else bad('order incorrecto: ' + JSON.stringify(o));

// Terminar y comprobar persistencia del orden.
await pages.coco.click('button[data-a=end-game]');
await pages.coco.click('button[data-a=end-game-confirm]');
await ana.waitForSelector('button[data-a=back-lobby]', { timeout: 60000 });
await ana.click('button[data-a=back-lobby]');
await ana.waitForSelector('text=/Dispositivos/'); // la página principal es la mesa
const s2 = await seating(ana);
if (s2 && s2[s2.length - 1] === 'p-bea') ok('el orden de mesa persiste tras la partida'); else bad('orden perdido: ' + JSON.stringify(s2));
await ana.click('[data-a=confirm-delete-group]');
await ana.click('[data-a=delete-group-confirm]');
await ana.waitForURL(BASE + '/');
await browser.close();
console.log(fail ? `✖ ${fail} fallos` : '✔ seating OK');
process.exit(fail ? 1 : 0);
