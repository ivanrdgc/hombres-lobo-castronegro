// E2E El Espía · el reloj llega a CERO (4 jugadores, 3 rondas; con la semilla
// de test cada «minuto» dura 4 s).
//  R1: tiempo agotado → acusaciones por turnos desde el primer preguntador;
//      hay pases y una acusación unánime al espía → +1 agentes, +2 iniciador.
//  R2: la mesa salta el turno de quien no responde y los demás pasan → el
//      espía se va de rositas (+2), regla oficial.
//  R3: tras el tiempo, el espía conserva su jugada: se revela y acierta (+4).
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
  await ctx.addInitScript(() => { window.__hlcTest = true; }); // e2e veloz: rondas de segundos
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] ${e.message}`));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const g = window.__hlc.group?.game;
  return !g ? null : {
    phase: g.phase, round: g.round, spyId: g.spyId, locationId: g.locationId,
    playerIds: g.playerIds, dealerId: g.dealerId, seen: g.seen, vote: g.vote,
    deadline: g.deadline, timeupTurn: g.timeupTurn, scores: g.scores,
    outcome: g.outcome?.type || null,
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify(last));
  throw new Error('timeout esperando: ' + what);
}
const pg = (pid) => pages[pid.replace(/^p-/, '')];
const timeupOrder = (st) => {
  const i = Math.max(0, st.playerIds.indexOf(st.dealerId));
  return st.playerIds.slice(i).concat(st.playerIds.slice(0, i));
};

async function reveal4(st) {
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=espia-reveal]');
    await p.click('[data-a=espia-reveal]');
    await p.waitForSelector('[data-a=espia-seen]');
    await p.click('[data-a=espia-seen]');
    await p.waitForTimeout(150);
  }
}

try {
  const GROUP = 'EspT ' + Date.now().toString(36).slice(-5);
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
  await ana.click('button[data-a=select-game][data-p=espia]');
  await ana.waitForSelector('[data-a=open-start]');
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=espia-start]');
  await ana.click('[data-a=espia-duration][data-p="5"]'); // 5 «min» = 20 s de test
  await ana.click('[data-a=espia-start]');

  // ——— RONDA 1: dejar morir el reloj ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto R1');
  await reveal4(st);
  await ana.waitForSelector('[data-a=espia-begin]');
  await ana.click('[data-a=espia-begin]');
  st = await waitState(ana, (s) => s.phase === 'play' && s.deadline, 'reloj en marcha');
  ok('reloj en marcha (ronda de test: ~20 s)');
  st = await waitState(ana, (s) => s.phase === 'timeup', 'el reloj llega a cero y salta la tanda de acusaciones', 60000);
  check(st.timeupTurn === 0, 'acusaciones por turnos desde el primer preguntador');
  const spy = st.spyId;
  const order = timeupOrder(st);
  console.log('  espía:', spy, '· orden:', order.join(' → '));

  // Turnos: el primer no-espía PASA (y el espía pasa si le toca); el segundo
  // no-espía ACUSA al espía.
  let nonSpySeen = 0;
  let accuser = null;
  for (let turn = 0; turn < order.length && !accuser; turn++) {
    const holder = order[turn];
    const hp = pg(holder);
    await hp.waitForSelector('[data-a=espia-tu-pass], [data-a=espia-tu-accuse]', { timeout: 20000 });
    if (holder === spy || nonSpySeen === 0) {
      if (holder !== spy) nonSpySeen++;
      await hp.click('[data-a=espia-tu-pass]');
      await waitState(ana, (s) => s.timeupTurn === turn + 1 || !!s.vote || s.phase === 'end', 'turno pasado');
    } else {
      accuser = holder;
      await hp.click(`[data-a=espia-tu-pick][data-p=${spy}]`);
      await hp.click('[data-a=espia-tu-accuse]');
    }
  }
  check(!!accuser, 'hubo pases y una acusación en los turnos');
  st = await waitState(ana, (s) => !!s.vote, 'votación de la acusación');
  for (const pid of st.playerIds.filter((p) => p !== accuser && p !== spy)) {
    await pg(pid).waitForSelector('button[data-a=espia-vote][data-p=si]');
    await pg(pid).click('button[data-a=espia-vote][data-p=si]');
    await pg(pid).waitForTimeout(200);
  }
  st = await waitState(ana, (s) => s.phase === 'end', 'fin R1');
  check(st.outcome === 'spy_caught', 'tras el tiempo también se caza al espía con unanimidad');
  const agents = st.playerIds.filter((p) => p !== spy);
  const scoresOk = agents.every((a) => st.scores[a] === (a === accuser ? 2 : 1)) && !st.scores[spy];
  check(scoresOk, `puntuación oficial R1: ${JSON.stringify(st.scores)}`);

  // ——— RONDA 2: nadie acusa → el espía sobrevive (+2) ———
  await ana.click('[data-a=espia-next-round]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 2, 'reparto R2');
  await reveal4(st);
  await ana.waitForSelector('[data-a=espia-begin]');
  await ana.click('[data-a=espia-begin]');
  st = await waitState(ana, (s) => s.phase === 'play' && s.deadline, 'reloj R2');
  const spy2 = st.spyId;
  const prev = { ...st.scores };
  st = await waitState(ana, (s) => s.phase === 'timeup', 'tiempo agotado R2', 60000);
  const order2 = timeupOrder(st);
  for (let turn = 0; turn < order2.length; turn++) {
    const holder = order2[turn];
    const hp = pg(holder);
    await hp.waitForSelector('[data-a=espia-tu-pass]', { timeout: 20000 });
    if (turn === 0) {
      // Desatasco: quien no responde no cuelga la mesa (otro salta su turno).
      const other = order2.find((p) => p !== holder);
      await pg(other).waitForSelector('[data-a=espia-tu-skip]');
      await pg(other).click('[data-a=espia-tu-skip]');
      ok('la mesa puede saltar el turno de quien no responde');
    } else {
      await hp.click('[data-a=espia-tu-pass]');
    }
    await waitState(ana, (s) => s.phase === 'end' || s.timeupTurn === turn + 1, 'turno resuelto');
  }
  st = await waitState(ana, (s) => s.phase === 'end', 'fin R2');
  check(st.outcome === 'spy_survived', 'nadie condena: el espía se marcha de rositas');
  check(st.scores[spy2] === (prev[spy2] || 0) + 2, 'el espía suma +2 (puntuación oficial)');

  // ——— RONDA 3: tras el tiempo, el espía se revela y adivina (+4) ———
  await ana.click('[data-a=espia-next-round]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 3, 'reparto R3');
  await reveal4(st);
  await ana.waitForSelector('[data-a=espia-begin]');
  await ana.click('[data-a=espia-begin]');
  st = await waitState(ana, (s) => s.phase === 'play' && s.deadline, 'reloj R3');
  const spy3 = st.spyId;
  const prev3 = { ...st.scores };
  st = await waitState(ana, (s) => s.phase === 'timeup', 'tiempo agotado R3', 60000);
  await pg(spy3).waitForSelector('[data-a=espia-guess-open]', { timeout: 20000 });
  await pg(spy3).click('[data-a=espia-guess-open]');
  await pg(spy3).waitForSelector(`button[data-a=espia-lugar][data-p=${st.locationId}]`);
  await pg(spy3).click(`button[data-a=espia-lugar][data-p=${st.locationId}]`);
  await pg(spy3).click('button[data-a=espia-guess-confirm]');
  st = await waitState(ana, (s) => s.phase === 'end' && s.round === 3, 'fin R3');
  check(st.outcome === 'spy_guessed', 'la jugada del espía sobrevive al reloj: se revela y acierta');
  check(st.scores[spy3] === (prev3[spy3] || 0) + 4, 'el espía suma +4 tras el tiempo');

  // Limpieza.
  await ana.click('[data-a=espia-end-game]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failespt-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-espia-timeup con ${fail} fallos` : '\n✔ E2E-espia-timeup OK');
process.exit(fail ? 1 : 0);
