// E2E de El Espía (Spyfall): partida completa a 2 rondas con 4 jugadores.
//  R1: acusación fallida (reanuda el reloj) + acusación unánime al espía
//      → puntuación oficial (+1 agentes, +2 al iniciador).
//  R2: el espía se revela y ACIERTA el lugar (+4).
// También: URL propia /g/<mesa>/espia/partida y limpieza de la mesa.
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
  const g = window.__hlc.group?.game;
  return !g ? null : {
    phase: g.phase, round: g.round, spyId: g.spyId, locationId: g.locationId,
    playerIds: g.playerIds, seen: g.seen, vote: g.vote, deadline: g.deadline,
    scores: g.scores, accusedUsed: g.accusedUsed, outcome: g.outcome?.type || null,
    historyLen: (g.history || []).length,
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify(last));
  throw new Error('timeout esperando: ' + what);
}
const pg = (pid) => pages[pid.replace(/^p-/, '')];

try {
  const GROUP = 'Espia ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos', 'David']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (4)');

  // El catálogo ofrece los dos juegos; elegimos El Espía por su data-p.
  await ana.click('button[data-a=select-game][data-p=espia]');
  await ana.waitForSelector('[data-a=espia-open-help]');
  ok('el catálogo ofrece El Espía y su lobby tiene URL propia: ' + new URL(ana.url()).pathname);
  if (!/\/espia$/.test(new URL(ana.url()).pathname)) bad('URL inesperada en el lobby: ' + ana.url());

  // Lobby: cómo se juega y localizaciones se abren.
  await ana.click('[data-a=espia-open-lugares]');
  await ana.waitForSelector('text=Las 30 localizaciones');
  await ana.click('button[data-a=close-modal]');
  ok('la lista pública de localizaciones se consulta desde el lobby');

  // Empezar: 4 jugadores (todos), duración por defecto 8 (oficial).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=espia-start]');
  if (/\/espia\/empezar$/.test(new URL(ana.url()).pathname)) ok('«Empezar» tiene URL propia: …/espia/empezar'); else bad('URL inesperada: ' + ana.url());
  await ana.click('[data-a=espia-start]');

  // ——— RONDA 1: reparto y confirmaciones ———
  let st = await waitState(ana, (s) => s && s.phase === 'reveal', 'reparto R1');
  check(st.playerIds.length === 4, 'los 4 juegan la ronda');
  check(!!st.spyId && st.playerIds.includes(st.spyId), 'hay espía repartido');
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=espia-reveal]');
    await p.click('[data-a=espia-reveal]');
    await p.waitForSelector('[data-a=espia-seen]');
    await p.click('[data-a=espia-seen]');
    await p.waitForTimeout(200);
  }
  st = await waitState(ana, (s) => s && Object.keys(s.seen).length === 4, 'todos confirman');
  ok('los 4 confirman su identidad');
  await ana.waitForSelector('[data-a=espia-begin]');
  await ana.click('[data-a=espia-begin]');
  st = await waitState(ana, (s) => s && s.phase === 'play' && s.deadline, 'reloj en marcha');
  ok('el reloj arranca (' + Math.round((st.deadline - Date.now()) / 60000) + ' min)');
  // La partida es su propia página.
  await ana.waitForTimeout(600);
  const paths = ['ana', 'bea', 'carlos', 'david'].map((n) => new URL(pages[n].url()).pathname);
  check(paths.every((p) => /\/espia\/partida$/.test(p)), 'todos en …/espia/partida');
  await ana.waitForSelector('[data-a=espia-timer]');
  ok('cronómetro visible');

  const spy = st.spyId;
  const agents = st.playerIds.filter((p) => p !== spy);
  console.log('  espía:', spy, '· lugar:', st.locationId);

  // Acusación FALLIDA: un agente acusa a otro agente; alguien vota que no.
  const accuser1 = agents[0];
  const wrongTarget = agents[1];
  await pg(accuser1).click(`.player[data-a=espia-accuse-pick][data-p=${wrongTarget}]`);
  await pg(accuser1).click('button[data-a=espia-accuse]');
  st = await waitState(ana, (s) => s && !!s.vote, 'votación abierta');
  check(st.deadline === null, 'el reloj se congela durante la votación');
  // El primer votante disponible vota NO → la acusación cae.
  const voter = st.playerIds.find((p) => p !== accuser1 && p !== wrongTarget);
  await pg(voter).waitForSelector('button[data-a=espia-vote][data-p=no]');
  await pg(voter).click('button[data-a=espia-vote][data-p=no]');
  st = await waitState(ana, (s) => s && !s.vote && s.phase === 'play', 'la acusación cae');
  check(st.deadline !== null, 'el reloj se reanuda tras el desacuerdo');
  check(!!st.accusedUsed[accuser1], 'la acusación gastada no se devuelve');
  ok('acusación fallida: el juego continúa');

  // Acusación UNÁNIME al espía por otro agente.
  const accuser2 = agents[1];
  await pg(accuser2).click(`.player[data-a=espia-accuse-pick][data-p=${spy}]`);
  await pg(accuser2).click('button[data-a=espia-accuse]');
  st = await waitState(ana, (s) => s && !!s.vote, 'segunda votación');
  for (const pid of st.playerIds.filter((p) => p !== accuser2 && p !== spy)) {
    await pg(pid).waitForSelector('button[data-a=espia-vote][data-p=si]');
    await pg(pid).click('button[data-a=espia-vote][data-p=si]');
    await pg(pid).waitForTimeout(250);
  }
  st = await waitState(ana, (s) => s && s.phase === 'end', 'fin de la ronda 1');
  check(st.outcome === 'spy_caught', 'desenlace: espía cazado');
  // Puntuación oficial: +1 agentes, +1 extra al iniciador; espía 0.
  const expect1 = Object.fromEntries(agents.map((a) => [a, a === accuser2 ? 2 : 1]));
  const scoresOk = agents.every((a) => st.scores[a] === expect1[a]) && !st.scores[spy];
  check(scoresOk, `puntuación R1 correcta: ${JSON.stringify(st.scores)}`);
  await ana.waitForSelector('text=/Marcador/');
  ok('marcador visible al final de la ronda');

  // ——— RONDA 2: el espía adivina el lugar ———
  await ana.click('[data-a=espia-next-round]');
  st = await waitState(ana, (s) => s && s.phase === 'reveal' && s.round === 2, 'reparto R2');
  ok('ronda 2 repartida (repartidor rotado)');
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=espia-reveal]');
    await p.click('[data-a=espia-reveal]');
    await p.click('[data-a=espia-seen]');
    await p.waitForTimeout(200);
  }
  await ana.waitForSelector('[data-a=espia-begin]');
  await ana.click('[data-a=espia-begin]');
  st = await waitState(ana, (s) => s && s.phase === 'play' && s.round === 2, 'reloj R2');
  const spy2 = st.spyId;
  const prevScore = { ...st.scores };
  console.log('  espía R2:', spy2, '· lugar:', st.locationId);
  await pg(spy2).waitForSelector('[data-a=espia-guess-open]');
  await pg(spy2).click('[data-a=espia-guess-open]');
  await pg(spy2).waitForSelector(`button[data-a=espia-lugar][data-p=${st.locationId}]`);
  await pg(spy2).click(`button[data-a=espia-lugar][data-p=${st.locationId}]`);
  await pg(spy2).click('button[data-a=espia-guess-confirm]');
  st = await waitState(ana, (s) => s && s.phase === 'end' && s.round === 2, 'fin R2');
  check(st.outcome === 'spy_guessed', 'desenlace: el espía adivina el lugar');
  check(st.scores[spy2] === (prevScore[spy2] || 0) + 4, 'el espía suma +4');
  check(st.historyLen === 2, 'historial con las 2 rondas');

  // Terminar el juego → lobby de El Espía; luego limpieza de la mesa.
  await ana.click('[data-a=espia-end-game]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de El Espía');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failespia-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-espía con ${fail} fallos` : '\n✔ E2E-espía OK');
process.exit(fail ? 1 : 0);
