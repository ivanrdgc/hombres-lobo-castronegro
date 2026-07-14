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
await ana.click('.player[data-a=player-menu]:has-text("Ana")');
await ana.click('button[data-a=toggle-player]');
await ana.waitForSelector('.player:has-text("Ana"):has-text("no juega")');
// activar el zorro (rol de vecindad) y modo casual
await ana.click('[data-a=open-roles]');
await ana.click('.roletoggle[data-p=zorro]:not(.on)');
await ana.waitForSelector('.roletoggle.on[data-p=zorro]');
await ana.click('button[data-a=close-modal]');
await ana.click('[data-a=open-settings]');
await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
await ana.click('button[data-a=close-modal]');
// abrir empezar → debe pedir el orden de mesa
await ana.click('[data-a=open-start]');
await ana.waitForSelector('text=Orden de la mesa');
ok('con el zorro activo, se pide confirmar el orden de la mesa');
// mover a Dani hacia arriba dos veces (de 4º a 2º)
const dani = 'p-dani';
await ana.click(`button[data-a=seat-up][data-p=${dani}]`);
await ana.waitForTimeout(600);
await ana.click(`button[data-a=seat-up][data-p=${dani}]`);
await ana.waitForTimeout(800);
const s1 = await seating(ana);
if (s1 && s1[1] === dani) ok('reordenación con flechas guardada en el grupo: ' + s1.join(',')); else bad('orden no guardado: ' + JSON.stringify(s1));
await ana.click('button[data-a=seating-ok]');
await ana.waitForSelector('text=Orden de mesa confirmado');
ok('orden confirmado, aparecen los modos de juego');
await ana.click('[data-a=start-auto]');
await ana.waitForSelector('text=Este dispositivo narra la partida', { timeout: 20000 });
const o = await orders(ana);
const daniOrder = o.find((x) => x[0] === 'Dani')[1];
if (daniOrder === 1) ok('player.order sigue el orden de mesa (Dani = asiento 2)'); else bad('order incorrecto: ' + JSON.stringify(o));
// terminar y comprobar persistencia del orden
const alive = await pages.bea;
await alive.click('button[data-a=end-game]');
await alive.click('button[data-a=end-game-confirm]');
await ana.waitForSelector('button[data-a=back-lobby]', { timeout: 20000 });
await ana.click('button[data-a=back-lobby]');
await ana.waitForSelector('[data-a=open-start]');
const s2 = await seating(ana);
if (s2 && s2[1] === dani) ok('el orden de mesa persiste tras la partida'); else bad('orden perdido: ' + JSON.stringify(s2));
await ana.click('[data-a=confirm-delete-group]');
await ana.click('[data-a=delete-group-confirm]');
await ana.waitForURL(BASE + '/hombres_lobo');
await browser.close();
console.log(fail ? `✖ ${fail} fallos` : '✔ seating OK');
process.exit(fail ? 1 : 0);
