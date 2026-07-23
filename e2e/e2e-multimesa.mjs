// E2E de PARTIDAS SIMULTÁNEAS: una mesa de 10 con dos partidas a la vez
// (Hombres Lobo manual de 4+narrador y El Espía de 4) y un dispositivo libre
// que opera desde la mesa: ve quién juega a qué, saca a una jugadora de su
// partida y termina partidas enteras. Verifica el aislamiento entre partidas.
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
// Estado global de la mesa visto por un dispositivo (partidas y su contenido).
const mesa = (page) => page.evaluate(() => ({
  matches: (window.__hlc.matches || []).map((m) => ({
    id: m.id, gameId: m.gameId, members: m.members,
    phase: m.game?.phase, round: m.game?.round, playerIds: m.game?.playerIds || null,
  })),
}));
// Vista propia (group = su partida superpuesta).
const vista = (page) => page.evaluate(() => ({
  status: window.__hlc.group?.status, phase: window.__hlc.group?.game?.phase || null,
  matchId: window.__hlc.group?.matchId || null, path: location.pathname,
}));
async function waitFor(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await mesa(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify(last));
  throw new Error('timeout esperando: ' + what);
}

try {
  const GROUP = 'Multi ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  const OTHERS = ['Bea', 'Carlos', 'Dani', 'Eva', 'Fran', 'Gara', 'Hugo', 'Iris', 'Jon'];
  for (const n of OTHERS) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (10)');
  ok('mesa de 10 dispositivos');

  // ——— Partida 1: Hombres Lobo MANUAL (Ana narra; juegan Bea, Carlos, Dani, Eva) ———
  await ana.click('button[data-a=select-game][data-p=hombres_lobo]');
  await ana.waitForSelector('[data-a=open-settings]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  for (const out of ['p-ana', 'p-fran', 'p-gara', 'p-hugo', 'p-iris', 'p-jon']) {
    await ana.click(`.player[data-a=start-player][data-p=${out}]`);
    await ana.waitForSelector(`.player[data-a=start-player][data-p=${out}].off`);
  }
  await ana.click('[data-a=start-mode][data-p=manual]');
  await ana.click('[data-a=start-manual]');
  let st = await waitFor(ana, (s) => s.matches.length === 1 && s.matches[0].phase === 'manual', 'partida de lobos creada');
  const midLobos = st.matches[0].id;
  check(st.matches[0].gameId === 'hombres_lobo', 'la partida 1 es de Hombres Lobo');
  check(st.matches[0].members.length === 5, `members de lobos = 5 (${st.matches[0].members.join(',')})`);
  const va = await vista(ana);
  check(va.matchId === midLobos && new RegExp(`/hombres_lobo/partida/${midLobos}$`).test(va.path), 'Ana (narradora) dentro de SU partida con URL propia');
  await pages.bea.waitForSelector('text=/manual/i', { timeout: 20000 }).catch(() => {});
  const vb = await vista(pages.bea);
  check(vb.phase === 'manual', 'Bea ve su partida manual');

  // Los libres NO son arrastrados: Fran sigue en la mesa y ve la partida en curso.
  await pages.fran.waitForSelector('text=¿A qué jugamos?');
  await pages.fran.waitForSelector(`[data-match=${midLobos}]`);
  ok('Fran (libre) sigue en la mesa y ve la tarjeta de la partida de lobos');
  await pages.fran.waitForSelector('[data-a=player-menu][data-p=p-bea][data-busy=hombres_lobo]');
  ok('la mesa marca con 🐺 a los ocupados por Los Hombres Lobo');

  // ——— Partida 2: El Espía (Fran, Gara, Hugo, Iris; la voz en Fran) ———
  await pages.fran.click('button[data-a=select-game][data-p=espia]');
  await pages.fran.waitForSelector('[data-a=open-start]');
  await pages.fran.click('[data-a=open-start]');
  await pages.fran.waitForSelector('[data-a=espia-start]');
  // Los ocupados aparecen bloqueados (⛔) y no cuentan como elegidos.
  await pages.fran.waitForSelector('.player[data-a=start-player][data-p=p-bea] .selmark:has-text("⛔")');
  await pages.fran.waitForSelector('text=/está(n)? en otra partida/');
  ok('la pantalla «Empezar» bloquea a los que ya juegan otra partida');
  await pages.fran.click('.player[data-a=start-player][data-p=p-jon]');
  await pages.fran.waitForSelector('.player[data-a=start-player][data-p=p-jon].off');
  await pages.fran.click('[data-a=espia-start]');
  st = await waitFor(pages.fran, (s) => s.matches.length === 2, 'segunda partida creada');
  const espia = st.matches.find((m) => m.gameId === 'espia');
  const midEspia = espia.id;
  check(espia.phase === 'reveal' && espia.playerIds.length === 4, 'El Espía arranca en reparto con 4');
  check(st.matches.find((m) => m.id === midLobos).phase === 'manual', 'la partida de lobos sigue intacta');
  const vf = await vista(pages.fran);
  check(vf.matchId === midEspia && new RegExp(`/espia/partida/${midEspia}$`).test(vf.path), 'Fran dentro de El Espía con URL propia');
  const vAna2 = await vista(ana);
  check(vAna2.matchId === midLobos, 'Ana sigue viendo SU partida (aislamiento)');

  // ——— Jon (libre) opera desde la mesa ———
  await pages.jon.waitForSelector(`[data-match=${midEspia}]`);
  const cards = await pages.jon.locator('[data-match]').count();
  check(cards === 2, 'la mesa lista las DOS partidas en curso');

  // Mirar una partida de espectador y VOLVER a la mesa desde el menú ⋯.
  await pages.jon.click(`[data-a=watch-match][data-p=${midLobos}]`);
  await pages.jon.waitForSelector('[data-a=game-menu]');
  ok('un libre entra a mirar la partida de lobos');
  await pages.jon.click('[data-a=game-menu]');
  await pages.jon.waitForSelector('button[data-a=back-to-mesa]');
  await pages.jon.click('button[data-a=back-to-mesa]');
  await pages.jon.waitForSelector('text=¿A qué jugamos?');
  check(/\/g\/[a-z0-9-]+$/.test(new URL(pages.jon.url()).pathname), 'el menú del espectador vuelve a la mesa');
  await pages.jon.waitForSelector('[data-a=player-menu][data-p=p-iris][data-busy=espia]');
  ok('la mesa marca con 🕵️ a los ocupados por El Espía');

  // Sacar a Iris de El Espía (en reparto: re-reparte entre los 3 restantes).
  await pages.jon.click('[data-a=player-menu][data-p=p-iris]');
  await pages.jon.waitForSelector('button[data-a=kick-from-match][data-p=p-iris]');
  await pages.jon.click('button[data-a=kick-from-match][data-p=p-iris]');
  st = await waitFor(pages.jon, (s) => {
    const e = s.matches.find((m) => m.id === midEspia);
    return !!e && e.playerIds.length === 3 && !e.members.includes('p-iris');
  }, 'Iris fuera de El Espía');
  ok('un libre saca a una jugadora de su partida desde la mesa');
  await pages.jon.waitForSelector('[data-a=player-menu][data-p=p-iris]:not([data-busy])');
  ok('Iris queda libre (sin icono de partida)');
  // Iris aterriza en el lobby de El Espía, lista para otra cosa.
  await pages.iris.waitForSelector('[data-a=open-start]', { timeout: 20000 });
  ok('Iris aterriza en el lobby del juego al salir');

  // Terminar El Espía entero desde la mesa.
  await pages.jon.click(`[data-a=end-match-open][data-p=${midEspia}]`);
  await pages.jon.waitForSelector('button[data-a=end-match-confirm]');
  await pages.jon.click('button[data-a=end-match-confirm]');
  st = await waitFor(pages.jon, (s) => s.matches.length === 1, 'El Espía terminado');
  check(st.matches[0].id === midLobos && st.matches[0].phase === 'manual', 'solo queda la partida de lobos, intacta');
  await pages.gara.waitForSelector('[data-a=open-start]', { timeout: 20000 });
  ok('los jugadores de El Espía quedan libres en su lobby');

  // Terminar Hombres Lobo desde la mesa (1º salta al desenlace; 2º la cierra).
  await pages.jon.click(`[data-a=end-match-open][data-p=${midLobos}]`);
  await pages.jon.waitForSelector('button[data-a=end-match-confirm]');
  await pages.jon.click('button[data-a=end-match-confirm]');
  st = await waitFor(pages.jon, (s) => s.matches.length === 1 && s.matches[0].phase === 'end', 'lobos en desenlace');
  ok('terminar desde la mesa lleva la partida a su desenlace (roles a la vista)');
  await pages.jon.click(`[data-a=end-match-open][data-p=${midLobos}]`);
  await pages.jon.waitForSelector('button[data-a=end-match-confirm]');
  await pages.jon.click('button[data-a=end-match-confirm]');
  st = await waitFor(pages.jon, (s) => s.matches.length === 0, 'mesa sin partidas');
  ok('cerrarla del todo libera a sus jugadores');
  await pages.bea.waitForSelector('[data-a=open-start]', { timeout: 20000 });
  ok('los jugadores de lobos vuelven a su lobby');

  // Limpieza.
  await ana.waitForSelector('[data-a=open-start]', { timeout: 20000 });
  await ana.click('[data-a=change-game]');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _l = await _p.waitForSelector('[data-a=leave]', { timeout: 9000 }).catch(() => null); if (_l) { await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failmulti-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-multimesa con ${fail} fallos` : '\n✔ E2E-multimesa OK');
process.exit(fail ? 1 : 0);
