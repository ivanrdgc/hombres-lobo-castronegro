// Mini-test: un jugador devorado revela roles tocando jugadores.
import { chromium } from 'playwright';
const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
const GROUP = 'DP ' + Date.now().toString(36).slice(-5);
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const browser = await chromium.launch();
const pages = {};
const mk = async (l) => { const c = await browser.newContext(); const p = await c.newPage(); p.on('pageerror', (e) => bad(`[${l}] ${e.message}`)); pages[l] = p; return p; };
const hlc = (p) => p.evaluate(() => { const s = window.__hlc; return { phase: s.group?.game?.phase, steps: s.group?.game?.steps, stepIdx: s.group?.game?.stepIdx, players: s.players.map((x) => ({ name: x.name, role: x.role, alive: x.alive })) }; });
const wait = async (p, fn, what, t = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const s = await hlc(p); if (fn(s)) return s; await p.waitForTimeout(300); } throw new Error('timeout ' + what); };

const ana = await mk('ana');
await ana.goto(BASE + '/hombres_lobo');
await ana.fill('#inp-name', 'Ana');
await ana.fill('#inp-group', GROUP);
await ana.click('[data-a=create-group]');
await ana.waitForURL('**/g/**');
const url = ana.url();
for (const n of ['Bea', 'Coco', 'Dani', 'Enzo', 'Fina']) {
  const p = await mk(n.toLowerCase());
  await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
  await p.waitForSelector('text=/Dispositivos/');
}
await ana.waitForSelector('text=Dispositivos (6)');
// quitar los roles extra para tener solo 1 lobo + 2 aldeanos (muerte segura noche 1)
await ana.click('button[data-a=select-game]');
await ana.waitForSelector('[data-a=open-roles]');
await ana.click('[data-a=open-roles]');
for (const r of ['vidente', 'bruja', 'cazador', 'cupido']) await ana.click(`.roletoggle.on[data-p=${r}]`);
await ana.waitForSelector('.roletoggle[data-p=bruja]:not(.on)');
await ana.click('button[data-a=close-modal]');
await ana.click('[data-a=open-settings]');
await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
await ana.click('button[data-a=close-modal]');
await ana.click('[data-a=open-start]');
// Ana narra sin jugar: se excluye en la pantalla de empezar.
await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
await ana.click('.player[data-a=start-player][data-p=p-ana]');
await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
await ana.click('[data-a=start-auto]');
let st = await wait(ana, (s) => s.phase === 'reveal', 'reparto');
for (const p of ['bea', 'coco', 'dani', 'enzo', 'fina']) { await pages[p].waitForSelector('[data-a=open-reveal-role]'); await pages[p].click('[data-a=open-reveal-role]'); await pages[p].click('[data-a=confirm-role-seen]'); }
await pages.bea.waitForSelector('button[data-a=begin-first-night]');
await pages.bea.click('button[data-a=begin-first-night]');
st = await wait(ana, (s) => s.phase === 'night', 'noche');
const wolf = st.players.find((p) => p.role === 'hombre_lobo');
const prey = st.players.find((p) => p.role === 'aldeano');
const wolfPage = pages[wolf.name.toLowerCase()];
await wait(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'lobos');
await wolfPage.click(`.actionpanel .player.selectable:has-text("${prey.name}")`);
await wolfPage.click('button[data-a=act-lobos]');
st = await wait(ana, (s) => s.phase === 'day', 'día');
const deadName = st.players.find((p) => p.alive === false).name;
const deadPage = pages[deadName.toLowerCase()];
ok(`${deadName} ha sido devorado`);
await deadPage.waitForSelector('.player[data-a=dead-peek]');
await deadPage.click(`.player[data-a=dead-peek]:has-text("${wolf.name}")`);
await deadPage.waitForSelector(`.player[data-a=dead-peek]:has-text("${wolf.name}") small`);
const txt = await deadPage.locator(`.player[data-a=dead-peek]:has-text("${wolf.name}") small`).innerText();
if (/Hombre Lobo/.test(txt)) ok('el muerto revela el rol del lobo tocándolo: ' + txt.trim());
else bad('rol revelado incorrecto: ' + txt);
// verificar que un VIVO no puede espiar
const alivePeek = await wolfPage.locator('.player[data-a=dead-peek]').count();
if (alivePeek === 0) ok('los vivos no tienen la opción de espiar roles');
else bad('un jugador vivo puede espiar roles');

// 🚪 Abandonar a media partida: un aldeano vivo se va; su rol se revela y la partida sigue.
st = await hlc(ana);
const leaver = st.players.find((p) => p.alive && p.role === 'aldeano');
const leaverPage = pages[leaver.name.toLowerCase()];
await leaverPage.click('[data-a=game-menu]');
await leaverPage.click('button[data-a=leave-game]');
await leaverPage.click('button[data-a=leave-game-confirm]');
st = await wait(ana, (s) => s.players.find((p) => p.name === leaver.name)?.alive === false, 'abandono registrado');
if (st.phase === 'day') ok(`${leaver.name} abandona y la partida sigue (sin efectos póstumos)`); else bad('el abandono alteró la fase: ' + st.phase);
await wolfPage.waitForSelector('text=/abandona la partida y muestra su carta/');
ok('el abandono se anuncia en la crónica con el rol revelado');
if (await leaverPage.isVisible('text=/Has abandonado la partida/')) ok('quien se va ve su aviso de abandono'); else bad('falta el aviso de abandono en su pantalla');

// El narrador-altavoz ahora SIGUE la partida (parrilla + crónica) y puede terminarla.
await ana.waitForSelector('text=El pueblo');
ok('el dispositivo que no juega ve la parrilla del pueblo');
await ana.click('[data-a=game-menu]');
await ana.click('button[data-a=end-game]');
await ana.click('button[data-a=end-game-confirm]');
await wait(ana, (s) => s.phase === 'end', 'fin');
ok('un dispositivo que NO juega termina la partida desde su menú ⋯');
await ana.click('button[data-a=back-lobby]');
await ana.waitForSelector('[data-a=confirm-delete-group]');
await ana.click('[data-a=confirm-delete-group]');
await ana.click('[data-a=delete-group-confirm]');
await ana.waitForURL(BASE + '/');
ok('limpieza');
await browser.close();
console.log(fail ? `✖ ${fail} fallos` : '✔ dead-peek OK');
process.exit(fail ? 1 : 0);
