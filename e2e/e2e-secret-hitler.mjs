// E2E de «Secret Hitler»: partida completa a 5 jugadores (1 fascista +
// Hitler + 3 liberales), Ana narra Y juega. Verifica de punta a punta: catálogo
// → reparto secreto (conocimiento en la carta) → nominación con límites de
// mandato → voto Ja/Nein que la app destapa → sesión legislativa SECRETA
// (Presidente descarta 1 de 3, Canciller promulga 1 de 2) → poderes (mirar y
// ejecutar) → victoria. Empuja decretos fascistas para disparar los poderes y,
// en la 2.ª ejecución, mata a Hitler → gana el Bien por la bala.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, roles: g.roles, alive: g.alive, seen: g.seen,
    presidentIdx: g.presidentIdx, specialPresident: g.specialPresident, nominatedChancellor: g.nominatedChancellor,
    lastPresident: g.lastPresident, lastChancellor: g.lastChancellor, votes: g.votes, lastElection: g.lastElection,
    liberalPolicies: g.liberalPolicies, fascistPolicies: g.fascistPolicies, electionTracker: g.electionTracker,
    presidentDraw: g.presidentDraw, chancellorDraw: g.chancellorDraw, power: g.power, winner: g.winner, winReason: g.winReason,
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(200); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, lib: last.liberalPolicies, fas: last.fascistPolicies, power: last.power, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const presidentPid = (st) => st.specialPresident || st.playerIds[st.presidentIdx % st.playerIds.length];
const aliveOf = (st) => st.playerIds.filter((p) => st.alive[p]);

try {
  const GROUP = 'SH ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of ['Bea', 'Carlos', 'Diego', 'Eva']) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (5)');

  await ana.click('button[data-a=select-game][data-p=secret_hitler]');
  await ana.waitForSelector('[data-a=sh-open-help]');
  ok('el catálogo ofrece Secret Hitler y su lobby carga');
  await ana.click('[data-a=sh-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  await ana.locator('.modal [data-a=sh-role]').first().click();
  await ana.waitForSelector('[data-a=sh-role-back]');
  check(await ana.locator('text=/Cómo funciona/').count() > 0, 'el detalle del rol explica cómo funciona');
  await ana.click('[data-a=sh-role-back]');
  await ana.waitForSelector('text=/Cómo se juega/');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=sh-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=sh-start]');

  // ——— Reparto ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  NAMES = st.names;
  const hitler = st.playerIds.find((p) => st.roles[p] === 'hitler');
  const fascist = st.playerIds.find((p) => st.roles[p] === 'fascist');
  const liberals = st.playerIds.filter((p) => st.roles[p] === 'liberal');
  check(!!hitler && !!fascist && liberals.length === 3, `1 Hitler, 1 fascista y 3 liberales (${st.playerIds.map((p) => st.roles[p]).join(', ')})`);
  console.log('  roles:', st.playerIds.map((id) => `${st.names[id]}=${st.roles[id]}`).join(', '));
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=sh-reveal]', { timeout: 15000 });
    await p.click('[data-a=sh-reveal]');
    await p.waitForSelector('[data-a=sh-seen]');
    await p.click('[data-a=sh-seen]');
    await p.waitForTimeout(120);
  }
  st = await waitState(ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos confirman');
  await pg(st.playerIds[0]).waitForSelector('[data-a=sh-begin]', { timeout: 15000 });
  await pg(st.playerIds[0]).click('[data-a=sh-begin]');

  // ——— Bucle de gobierno: empuja decretos fascistas para disparar poderes ———
  let sawPeek = false; let execCount = 0; let sawLegPres = false; let sawLegChan = false;
  st = await waitState(ana, (s) => s.phase === 'nominate', 'primera nominación');
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    st = await hlc(ana);
    if (!st || st.phase === 'end') break;

    if (st.phase === 'nominate') {
      const pres = presidentPid(st);
      const p = pg(pres);
      // Leemos los cancilleres que la propia pantalla ofrece como ELEGIBLES
      // (la app ya aplica los límites de mandato) y elegimos uno que NO sea
      // Hitler — así jamás intentamos tocar un chip que la UI no muestra.
      await p.waitForSelector('.player[data-a=sh-sel]', { timeout: 15000 });
      const cands = await p.$$eval('.player[data-a=sh-sel]', (els) => els.map((e) => e.getAttribute('data-p')));
      const cand = cands.find((c) => c !== hitler) || cands[0];
      await p.click(`.player[data-a=sh-sel][data-p="${cand}"]`);
      await p.click('[data-a=sh-nominate]:not([disabled])');
      await waitState(ana, (s) => s.phase === 'election', 'abre la elección');
    } else if (st.phase === 'election') {
      for (const pid of aliveOf(st)) {
        const p = pg(pid);
        if (await p.locator('[data-a=sh-vote][data-p=ja]').count()) await p.click('[data-a=sh-vote][data-p=ja]');
      }
      await waitState(ana, (s) => s.phase !== 'election', 'voto resuelto');
    } else if (st.phase === 'legislativePresident') {
      sawLegPres = true;
      check(Array.isArray(st.presidentDraw) && st.presidentDraw.length === 3, 'el Presidente ve 3 decretos en secreto');
      const draw = st.presidentDraw;
      // Descarta un LIBERAL si lo hay (para promulgar fascista); si no, el primero.
      const idx = draw.findIndex((c) => c === 'liberal');
      const discard = idx >= 0 ? idx : 0;
      const p = pg(presidentPid(st));
      await p.waitForSelector(`[data-a=sh-pres-discard][data-p="${discard}"]`, { timeout: 15000 });
      await p.click(`[data-a=sh-pres-discard][data-p="${discard}"]`);
      await waitState(ana, (s) => s.phase !== 'legislativePresident', 'presidente descarta');
    } else if (st.phase === 'legislativeChancellor') {
      sawLegChan = true;
      check(Array.isArray(st.chancellorDraw) && st.chancellorDraw.length === 2, 'el Canciller ve 2 decretos en secreto');
      const draw = st.chancellorDraw;
      const idx = draw.findIndex((c) => c === 'fascist');
      const enact = idx >= 0 ? idx : 0;
      const p = pg(st.nominatedChancellor);
      await p.waitForSelector(`[data-a=sh-chan-enact][data-p="${enact}"]`, { timeout: 15000 });
      await p.click(`[data-a=sh-chan-enact][data-p="${enact}"]`);
      await waitState(ana, (s) => s.phase !== 'legislativeChancellor', 'canciller promulga');
    } else if (st.phase === 'power') {
      const pres = presidentPid(st);
      const p = pg(pres);
      if (st.power.type === 'peek') {
        sawPeek = true;
        await p.waitForSelector('[data-a=sh-peek-done]', { timeout: 15000 });
        await p.click('[data-a=sh-peek-done]');
      } else if (st.power.type === 'execution') {
        execCount++;
        // 1.ª ejecución: un liberal cualquiera. 2.ª: ¡a Hitler! → gana el Bien.
        const target = execCount >= 2
          ? hitler
          : aliveOf(st).find((x) => x !== pres && x !== hitler && st.roles[x] === 'liberal') || aliveOf(st).find((x) => x !== pres && x !== hitler);
        await p.waitForSelector(`.player[data-a=sh-sel][data-p="${target}"]`, { timeout: 15000 });
        await p.click(`.player[data-a=sh-sel][data-p="${target}"]`);
        await p.click('[data-a=sh-execute]:not([disabled])');
      } else if (st.power.type === 'investigate') {
        const target = aliveOf(st).find((x) => x !== pres);
        await p.click(`.player[data-a=sh-sel][data-p="${target}"]`);
        await p.click('[data-a=sh-investigate]:not([disabled])');
        await p.waitForSelector('[data-a=sh-invest-done]');
        await p.click('[data-a=sh-invest-done]');
      } else if (st.power.type === 'special') {
        const target = aliveOf(st).find((x) => x !== pres);
        await p.click(`.player[data-a=sh-sel][data-p="${target}"]`);
        await p.click('[data-a=sh-special]:not([disabled])');
      }
      await waitState(ana, (s) => s.phase !== 'power', 'poder resuelto');
    }
    await ana.waitForTimeout(150);
  }

  st = await waitState(ana, (s) => s.phase === 'end', 'la partida termina');
  check(sawLegPres && sawLegChan, 'se jugó la sesión legislativa (Presidente descarta, Canciller promulga)');
  check(st.liberalPolicies + st.fascistPolicies >= 1, `se promulgaron decretos (🕊️ ${st.liberalPolicies} · 🐷 ${st.fascistPolicies})`);
  check(sawPeek, 'se disparó el poder de MIRAR los próximos decretos (3.er decreto fascista)');
  check(['liberal', 'fascist'].includes(st.winner), 'hay bando ganador: ' + st.winner);
  if (execCount >= 2) {
    check(st.winner === 'liberal', 'ejecutar a Hitler da la victoria al Bien');
    check(/Hitler/.test(st.winReason || ''), 'el desenlace explica que era Hitler');
  } else {
    ok(`la partida terminó antes de la 2.ª ejecución (winner=${st.winner})`);
  }
  await pg(st.playerIds[0]).waitForSelector('[data-a=sh-again]', { timeout: 15000 });
  check(await pg(st.playerIds[0]).locator('text=/Los bandos/').count() > 0, 'el final destapa todos los bandos');
  ok('partida completa de Secret Hitler');

  // Revancha + limpieza.
  await pg(st.playerIds[0]).click('[data-a=sh-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal', 'revancha repartida');
  ok('la revancha reparte de nuevo');
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=sh-end-open]');
  await ana.waitForSelector('[data-a=sh-end-confirm]');
  await ana.click('[data-a=sh-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Secret Hitler');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failsh-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-secret-hitler con ${fail} fallos` : '\n✔ E2E-secret-hitler OK');
process.exit(fail ? 1 : 0);
