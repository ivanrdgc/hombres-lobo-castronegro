// Mini-test: un jugador devorado revela roles tocando jugadores.
import { chromium } from 'playwright';
const BASE = 'https://castro-zui5sg.web.app';
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
await ana.goto(BASE + '/');
await ana.fill('#inp-name', 'Ana');
await ana.fill('#inp-group', GROUP);
await ana.click('[data-a=create-group]');
await ana.waitForURL('**/g/**');
const url = ana.url();
for (const n of ['Bea', 'Coco', 'Dani', 'Enzo']) {
  const p = await mk(n.toLowerCase());
  await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
  await p.waitForSelector('text=⭐ Máster');
}
await ana.waitForSelector('text=Jugadores (5)');
// quitar los roles extra para tener solo 1 lobo + 2 aldeanos (muerte segura noche 1)
await ana.click('[data-a=open-roles]');
for (const r of ['vidente', 'bruja', 'cazador']) await ana.click(`.roletoggle.on[data-p=${r}]`);
await ana.waitForSelector('.roletoggle[data-p=bruja]:not(.on)');
await ana.click('button[data-a=close-modal]');
await ana.click('[data-a=open-settings]');
await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
await ana.click('button[data-a=close-modal]');
await ana.click('[data-a=open-start]');
await ana.click('[data-a=start-auto]');
let st = await wait(ana, (s) => s.phase === 'reveal', 'reparto');
for (const p of ['bea', 'coco', 'dani', 'enzo']) { await pages[p].waitForSelector('[data-a=confirm-role-seen]'); await pages[p].click('[data-a=confirm-role-seen]'); }
st = await wait(ana, (s) => s.phase === 'night', 'noche');
const wolf = st.players.find((p) => p.role === 'hombre_lobo');
const prey = st.players.find((p) => p.role === 'aldeano');
const wolfPage = pages[wolf.name.toLowerCase()];
await wait(ana, (s) => s.steps[s.stepIdx] === 'lobos_reconocen', 'reconocimiento');
await wolfPage.click('button[data-a=act-lobos-reconocido]');
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
await ana.click('button[data-a=end-game]');
await ana.click('button[data-a=end-game-confirm]');
await wait(ana, (s) => s.phase === 'end', 'fin');
await ana.click('button[data-a=back-lobby]');
await ana.waitForSelector('[data-a=confirm-delete-group]');
await ana.click('[data-a=confirm-delete-group]');
await ana.click('[data-a=delete-group-confirm]');
await ana.waitForURL(BASE + '/');
ok('limpieza');
await browser.close();
console.log(fail ? `✖ ${fail} fallos` : '✔ dead-peek OK');
process.exit(fail ? 1 : 0);
