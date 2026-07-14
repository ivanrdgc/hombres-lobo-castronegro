// E2E: modo guiado — el máster narra en persona y registra todo desde su pantalla.
import { chromium } from 'playwright';
const BASE = 'https://castro-zui5sg.web.app';
const GROUP = 'GUI ' + Date.now().toString(36).slice(-5);
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const browser = await chromium.launch();
const pages = {};
const mk = async (l) => { const c = await browser.newContext(); const p = await c.newPage(); p.on('pageerror', (e) => bad(`[${l}] ${e.message}`)); pages[l] = p; return p; };
const hlc = (p) => p.evaluate(() => { const s = window.__hlc; return { phase: s.group?.game?.phase, steps: s.group?.game?.steps, stepIdx: s.group?.game?.stepIdx, winner: s.group?.game?.winner, votesLeft: s.group?.game?.votesLeft, pending: s.group?.game?.pending || [], players: s.players.map((x) => ({ name: x.name, role: x.role, alive: x.alive })) }; });
const wait = async (p, fn, what, t = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < t) { const s = await hlc(p); if (fn(s)) return s; await p.waitForTimeout(250); } throw new Error('timeout ' + what); };

try {
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Coco', 'Dani']) { const p = await mk(n.toLowerCase()); await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]'); await p.waitForSelector('text=⭐ Máster'); }
  await ana.waitForSelector('text=Jugadores (4)');
  // Composición determinista: vidente + bruja (+1 lobo) — quitamos cazador y cupido.
  await ana.click('[data-a=open-roles]');
  for (const r of ['cazador', 'cupido']) { await ana.click(`.roletoggle.on[data-p=${r}]`); await ana.waitForSelector(`.roletoggle[data-p=${r}]:not(.on)`); }
  await ana.click('button[data-a=close-modal]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  await ana.click('[data-a=open-start]');
  await ana.click('button[data-a=start-guided]');
  let st = await wait(ana, (s) => s.phase === 'reveal', 'reparto');
  ok('partida guiada iniciada');
  for (const l of ['bea', 'coco', 'dani']) { await pages[l].waitForSelector('[data-a=confirm-role-seen]'); await pages[l].click('[data-a=confirm-role-seen]'); }
  await ana.waitForSelector('button[data-a=guided-first-night]');
  await ana.click('button[data-a=guided-first-night]');
  st = await wait(ana, (s) => s.phase === 'night', 'noche 1');
  console.log('  roles:', st.players.map((p) => `${p.name}=${p.role}`).join(', '));
  const wolf = st.players.find((p) => p.role === 'hombre_lobo');
  const vidente = st.players.find((p) => p.role === 'vidente');

  // El jugador NO ve paneles de acción; el guion vive en la pantalla del máster.
  const beaPanels = await pages.bea.locator('.actionpanel').count();
  if (beaPanels === 0) ok('los jugadores no ven paneles: solo su carta'); else bad('un jugador ve paneles de acción');

  // Vidente: el máster registra su elección y ve el resultado para enseñárselo.
  await wait(ana, (s) => s.steps[s.stepIdx] === 'vidente', 'paso vidente');
  await ana.waitForSelector(`text=Actúa`);
  await ana.click(`.actionpanel .player.selectable:has-text("${wolf.name}")`);
  await ana.click('button[data-a=act-vidente]');
  await ana.waitForSelector('text=/es .*Hombre Lobo/');
  ok('el máster ve el resultado de la vidente para enseñárselo');
  await ana.click('button[data-a=act-vidente-seen]');

  // Reconocimiento de la manada: botón «Hecho».
  await wait(ana, (s) => s.steps[s.stepIdx] === 'lobos_reconocen', 'reconocimiento');
  await ana.click('button[data-a=guided-skip]');
  ok('reconocimiento resuelto por el máster');

  // Lobos: el máster registra la víctima (la vidente).
  await wait(ana, (s) => s.steps[s.stepIdx] === 'lobos', 'lobos');
  await ana.click(`.actionpanel .player.selectable:has-text("${vidente.name}")`);
  await ana.click('button[data-a=act-lobos]');
  ok('víctima registrada por el máster');

  // Bruja: termina sin usar pociones.
  await wait(ana, (s) => s.steps[s.stepIdx] === 'bruja', 'bruja');
  await ana.click('button[data-a=act-bruja-done]');

  // Amanecer con botón.
  await wait(ana, (s) => s.steps[s.stepIdx] === 'amanecer', 'amanecer');
  await ana.click('button[data-a=guided-dawn]');
  st = await wait(ana, (s) => s.phase === 'day', 'día');
  if (st.players.find((p) => p.name === vidente.name).alive === false) ok('la vidente ha sido devorada'); else bad('la víctima sigue viva');

  // Juicio: el máster registra la condena del lobo.
  await ana.waitForSelector('.actionpanel:has-text("juicio")');
  await ana.click(`.actionpanel .player.selectable:has-text("${wolf.name}")`);
  await ana.click('button[data-a=vote-confirm]');
  await ana.click('button[data-a=vote-final]');
  st = await wait(ana, (s) => s.phase === 'end', 'fin');
  if (st.winner === 'pueblo') ok('el pueblo gana: partida guiada completa'); else bad('ganador inesperado: ' + st.winner);
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('[data-a=confirm-delete-group]');
  await ana.click('[data-a=confirm-delete-group]');
  await ana.click('[data-a=delete-group-confirm]');
  await ana.waitForURL(BASE + '/');
  ok('limpieza');
} catch (e) { fail++; console.log('✖ EXCEPCIÓN:', e.message); }
await browser.close();
console.log(fail ? `✖ guiado con ${fail} fallos` : '✔ guiado OK');
process.exit(fail ? 1 : 0);
