// E2E de El Espía (Spyfall): partida completa a 2 rondas con 4 jugadores (y
// una quinta persona en la mesa que se incorpora entre rondas).
//  R1: pausa de mesa (⋯ → ⏸️), acusación fallida (reanuda el reloj), acusación
//      RETIRADA por su autor + acusación unánime al espía → puntuación oficial
//      (+1 agentes, +2 al iniciador).
//  R2: Eva se sienta entre rondas y el espía se revela y ACIERTA el lugar (+4).
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
  await ctx.addInitScript(() => { window.__hlcTest = true; }); // e2e veloz: sin audio, colchones mínimos
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
    historyLen: (g.history || []).length, paused: !!g.paused,
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
  // Eva está en la mesa pero se queda fuera de la primera ronda: se sentará
  // entre rondas (incorporación en caliente).
  for (const n of ['Bea', 'Carlos', 'David', 'Eva']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (5)');

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

  // Empezar: 4 jugadores (Eva se queda fuera), duración por defecto 8 (oficial).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=espia-start]');
  if (/\/espia\/empezar$/.test(new URL(ana.url()).pathname)) ok('«Empezar» tiene URL propia: …/espia/empezar'); else bad('URL inesperada: ' + ana.url());
  // Eva, fuera de la R1 (se sentará entre rondas).
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-eva].selected');
  await ana.click('.player[data-a=start-player][data-p=p-eva]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-eva].off');
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
  check(paths.every((p) => /\/espia\/partida\/[a-z0-9]+$/.test(p)), 'todos en …/espia/partida/<id>');
  await ana.waitForSelector('[data-a=espia-timer]');
  ok('cronómetro visible');

  const spy = st.spyId;
  const agents = st.playerIds.filter((p) => p !== spy);
  console.log('  espía:', spy, '· lugar:', st.locationId);

  // ——— Postura de MESA (B28): en reposo, todas las pantallas iguales ———
  // El móvil se queda plano sobre la mesa: si al espía se le viera un botón de
  // más (o un panel distinto), estaría cazado sin jugar. Comparamos los
  // controles del juego de su pantalla con los de un agente.
  const surface = (page) => page.evaluate(() =>
    [...document.querySelectorAll('[data-a^="espia-"]')].map((e) => e.getAttribute('data-a')).sort().join('|'));
  const sSpy = await surface(pg(spy));
  const sAgent = await surface(pg(agents[0]));
  check(sSpy === sAgent, 'la pantalla en reposo del espía lleva los MISMOS controles que la de un agente');
  if (sSpy !== sAgent) console.log('   espía:  ' + sSpy + '\n   agente: ' + sAgent);
  check(!sSpy.includes('espia-guess-open'), 'la jugada del espía no asoma en la pantalla en reposo');
  check(!sSpy.includes('espia-lugar'), 'los tachones de localizaciones no se quedan a la vista');
  // UNA SOLA PUERTA a la carta (B34): la pastilla flotante 🎴, idéntica en
  // todos los móviles. Ninguna pantalla trae su propio «ver mi carta».
  check(!sSpy.includes('espia-togglecard'), 'la pantalla de la ronda no duplica la puerta a la carta');
  await pg(spy).click('[data-a=open-mycard]');
  await pg(spy).waitForSelector('[data-a=espia-guess-open]');
  await pg(spy).click('button[data-a=close-modal]');
  await pg(agents[0]).click('[data-a=open-mycard]');
  await pg(agents[0]).waitForSelector('[data-a=espia-card]');
  check(await pg(agents[0]).locator('[data-a=espia-guess-open]').count() === 0, 'el agente abre la misma carta y ahí NO hay jugada de espía');
  await pg(agents[0]).click('button[data-a=close-modal]');
  // La libreta es una herramienta (no tu carta): vive en la pantalla, con su
  // propio verbo, y también es igual para todos.
  await pg(spy).click('[data-a=espia-notes]');
  await pg(spy).waitForSelector('[data-a=espia-lugar-tacha]');
  await pg(spy).click('[data-a=espia-notes-close]');
  ok('la carta se abre solo por la pastilla 🎴 y la libreta solo desde la pantalla');

  // Pausa de mesa: congela el reloj sin gastar una acusación (⋯ → ⏸️).
  const dl0 = st.deadline;
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=espia-pause]');
  st = await waitState(ana, (s) => s && s.paused, 'partida en pausa');
  ok('⋯ → ⏸️ Pausar congela la ronda');
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=espia-resume]');
  st = await waitState(ana, (s) => s && !s.paused, 'partida reanudada');
  check(st.deadline > dl0, 'al reanudar, el reloj devuelve el tiempo de la pausa');

  // Acusación FALLIDA: un agente acusa a otro agente; alguien vota que no.
  const accuser1 = agents[0];
  const wrongTarget = agents[1];
  await pg(accuser1).click(`.player[data-a=espia-accuse-pick][data-p=${wrongTarget}]`);
  await pg(accuser1).click('button[data-a=espia-accuse]');
  st = await waitState(ana, (s) => s && !!s.vote, 'votación abierta');
  check(st.deadline === null, 'el reloj se congela durante la votación');
  // La pantalla del acusado no dice si es inocente: antes ponía «pon cara de
  // inocente (lo eres)» y, leída de reojo, señalaba al espía.
  const acusadoTxt = await pg(wrongTarget).innerText('body');
  check(!/lo eres/i.test(acusadoTxt), 'la pantalla del acusado no delata si es inocente');
  // Con el reloj congelado no cuesta nada comprobar el auto-tapado: la carta
  // destapada se tapa sola y deja a la vista solo el «👁 Ver mi carta otra vez».
  await pg(spy).click('[data-a=open-mycard]');
  await pg(spy).waitForSelector('[data-a=espia-card]');
  await pg(spy).waitForSelector('[data-a=espia-togglecard]', { timeout: 20000 });
  check(await pg(spy).locator('[data-a=espia-guess-open]').count() === 0, 'al taparse la carta se va también la jugada del espía');
  await pg(spy).click('button[data-a=close-modal]');
  ok('la carta se tapa sola: un móvil olvidado boca arriba no cuenta nada');
  // El primer votante disponible vota NO → la acusación cae.
  const voter = st.playerIds.find((p) => p !== accuser1 && p !== wrongTarget);
  await pg(voter).waitForSelector('button[data-a=espia-vote][data-p=no]');
  await pg(voter).click('button[data-a=espia-vote][data-p=no]');
  st = await waitState(ana, (s) => s && !s.vote && s.phase === 'play', 'la acusación cae');
  check(st.deadline !== null, 'el reloj se reanuda tras el desacuerdo');
  check(!!st.accusedUsed[accuser1], 'la acusación gastada no se devuelve');
  ok('acusación fallida: el juego continúa');

  // El espía se marca un farol y RETIRA su acusación (desatasco cuando alguien
  // no vota): el reloj vuelve a correr y su acusación sigue gastada.
  await pg(spy).click(`.player[data-a=espia-accuse-pick][data-p=${agents[2]}]`);
  await pg(spy).click('button[data-a=espia-accuse]');
  st = await waitState(ana, (s) => s && !!s.vote, 'acusación del espía');
  await pg(spy).waitForSelector('[data-a=espia-vote-cancel]');
  await pg(spy).click('[data-a=espia-vote-cancel]');
  st = await waitState(ana, (s) => s && !s.vote && s.phase === 'play', 'acusación retirada');
  check(st.deadline !== null, 'al retirar la acusación, el reloj se reanuda');
  check(!!st.accusedUsed[spy], 'la acusación retirada sigue gastada');

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

  // ——— ENTRE RONDAS: Eva se sienta a la mesa ———
  await ana.waitForSelector('.player[data-a=espia-add-pick][data-p=p-eva]');
  await ana.click('.player[data-a=espia-add-pick][data-p=p-eva]');
  await ana.click('[data-a=espia-add-players]');
  st = await waitState(ana, (s) => s && s.playerIds.includes('p-eva'), 'Eva entra en la partida');
  check(st.playerIds.length === 5, 'la mesa pasa a 5 jugadores entre rondas');
  await pages.eva.waitForSelector('[data-a=espia-next-round]', { timeout: 15000 });
  check(/\/espia\/partida\/[a-z0-9]+$/.test(new URL(pages.eva.url()).pathname), 'el dispositivo de Eva entra en la partida');

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
  // Su jugada vive dentro de la carta, tras la misma pastilla 🎴 que usan todos.
  await pg(spy2).waitForSelector('[data-a=open-mycard]');
  await pg(spy2).click('[data-a=open-mycard]');
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
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
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
