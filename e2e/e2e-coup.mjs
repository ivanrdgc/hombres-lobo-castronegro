// E2E de «Coup»: 4 jugadores (Ana narra y juega). Verifica de punta a punta a
// través de la UI real + Firestore: catálogo → reparto (2 influencias secretas)
// → turnos con acciones, un DESAFÍO, un BLOQUEO, asesinatos que van eliminando
// gente, hasta que queda un ganador. La secrecía es solo de UI: el doc de la
// partida tiene todas las manos, así que el test las lee (god-view) para
// resolver las ventanas de forma determinista pase lo que pase en el reparto.
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
  await ctx.addInitScript(() => { window.__hlcTest = true; });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] ${e.message}`));
  pages[label] = page; return page;
}
const hlc = (page) => page.evaluate(() => {
  const g = window.__hlc.group?.game;
  return !g ? null : {
    phase: g.phase, playerIds: g.playerIds, names: g.names, turnIdx: g.turnIdx,
    coins: g.coins, hands: g.hands, pending: g.pending, block: g.block,
    reactions: g.reactions || {}, losing: g.losing || [], exchange: g.exchange,
    winner: g.winner, scores: g.scores, seen: g.seen,
    logLen: (g.log || []).length, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(150); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, turnIdx: last.turnIdx, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
let sawTargetStats = false, sawActionInfo = false, sawPlanStep = false, sawRecap = false;
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);
const alive = (s, pid) => (s.hands[pid] || []).some((c) => !c.lost);
const influence = (s, pid) => (s.hands[pid] || []).filter((c) => !c.lost).length;
const totalInfluence = (s) => s.playerIds.reduce((a, pid) => a + influence(s, pid), 0);
const sig = (s) => `${s.phase}|${s.turnIdx}|${s.logLen}|${Object.keys(s.reactions).length}|${s.losing.length}|${s.winner}`;

function eligibleReactors(s) {
  const p = s.pending;
  if (s.phase === 'challengeAction' && p) return s.playerIds.filter((pid) => pid !== p.actor && alive(s, pid));
  if (s.phase === 'block' && p) {
    if (p.type === 'ayuda') return s.playerIds.filter((pid) => pid !== p.actor && alive(s, pid));
    return p.target && alive(s, p.target) ? [p.target] : [];
  }
  if (s.phase === 'challengeBlock' && s.block) return s.playerIds.filter((pid) => pid !== s.block.by && alive(s, pid));
  return [];
}

async function clickWait(page, selector, before) {
  await page.click(selector, { timeout: 15000 });
  await waitState(pages.ana, (s) => sig(s) !== before, 'cambio tras ' + selector);
}

// Desafiar y bloquear comprometen una influencia: van en DOS gestos (elegir →
// confirmar un botón que nombra la consecuencia). «Pasar», que es lo seguro,
// sigue siendo un solo toque.
async function doChallengeUI(page, before) {
  await page.click('[data-a=coup-challenge-pick]', { timeout: 15000 });
  await clickWait(page, '[data-a=coup-challenge]', before);
}
async function doBlockUI(page, claim, before) {
  await page.click(`[data-a=coup-block-pick][data-p=${claim}]`, { timeout: 15000 });
  await clickWait(page, `[data-a=coup-block][data-p=${claim}]`, before);
}

// Pasa (deja pasar) a los reactores elegibles hasta que la ventana avanza.
async function passWindow(windows) {
  for (let i = 0; i < 16; i++) {
    const s = await st();
    if (!windows.includes(s.phase)) return;
    const elig = eligibleReactors(s).filter((pid) => s.reactions[pid] === undefined);
    if (!elig.length) return;
    const page = pg(elig[0]);
    if (!sawRecap) { // la ventana resume qué ha pasado y qué ocurre si nadie lo impide
      await page.waitForSelector('text=/Qué está pasando/', { timeout: 15000 });
      check(await page.locator('text=/Si nadie lo impide/').count() >= 1, 'la ventana de reacción dice qué pasa si nadie lo impide');
      check(await page.locator('text=/Falta por contestar|Todos han contestado/').count() >= 1, 'y quién falta por contestar');
      sawRecap = true;
    }
    await clickWait(page, '[data-a=coup-pass]', sig(s));
  }
}

async function resolveLose() {
  const s = await st();
  const loser = s.losing[0]?.pid; if (!loser) return;
  const idx = (s.hands[loser] || []).findIndex((c) => !c.lost);
  const page = pg(loser);
  await page.click(`[data-a=coup-lose][data-p="${idx}"]`, { timeout: 15000 });
  await clickWait(page, '[data-a=coup-lose-confirm]', sig(s));
}

async function resolveExchange() {
  const s = await st(); const ex = s.exchange; if (!ex) return;
  const page = pg(ex.pid);
  for (let i = 0; i < ex.keep; i++) await page.click(`[data-a=coup-keep][data-p="${i}"]`);
  await clickWait(page, '[data-a=coup-exchange-confirm]:not([disabled])', sig(s));
}

async function forceAction(s, type, target) {
  const actor = s.playerIds[s.turnIdx];
  const page = pg(actor);
  if (!sawActionInfo) { // cada jugada lleva su efecto, qué personaje dices tener y quién la bloquea
    const card = await page.locator(`[data-a=coup-action][data-p=${type}]`).innerText({ timeout: 15000 });
    check(/Dices ser|No dices tener/.test(card), 'cada jugada dice qué personaje declaras (lo desafiable)');
    check(/bloquear/.test(card), 'y quién puede bloquearla');
    sawActionInfo = true;
  }
  await page.click(`[data-a=coup-action][data-p=${type}]`, { timeout: 15000 });
  if (!sawPlanStep) { // elegir QUÉ y elegir A QUIÉN son dos pasos, con vuelta atrás
    check(await page.locator('[data-a=coup-back]').count() === 1, 'elegida la jugada, se puede volver con «↩️ Cambiar de jugada»');
    sawPlanStep = true;
  }
  if (target) {
    if (!sawTargetStats) { // cada fila lleva las monedas y las influencias de la víctima
      const row = await page.locator(`[data-a=coup-target][data-p="${target}"]`).innerText();
      check(/🪙\s*\d+\s*·\s*🂠\s*\d+/.test(row), 'el selector de víctima muestra 🪙 monedas y 🂠 influencias');
      sawTargetStats = true;
    }
    await page.click(`[data-a=coup-target][data-p="${target}"]`);
  }
  await clickWait(page, '[data-a=coup-do]:not([disabled])', sig(s));
}

try {
  const GROUP = 'Coup ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=coup]');
  await ana.waitForSelector('[data-a=coup-open-help]');
  ok('el catálogo ofrece Coup y su lobby carga');
  await ana.click('[data-a=coup-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=coup-play-howto]').count() >= 5, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=coup-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=coup-start]');

  // ——— Reparto ———
  let s = await waitState(ana, (x) => x.phase === 'reveal', 'reparto');
  NAMES = s.names;
  check(s.playerIds.length === 4, '4 jugadores en la corte');
  check(s.playerIds.every((pid) => s.hands[pid].length === 2), 'cada uno tiene 2 influencias');
  check(s.playerIds.every((pid) => s.coins[pid] === 2), 'cada uno empieza con 2 monedas');
  for (const pid of s.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=coup-reveal]', { timeout: 15000 });
    await p.click('[data-a=coup-reveal]');
    await p.waitForSelector('[data-a=coup-seen]');
    await p.click('[data-a=coup-seen]');
    await p.waitForTimeout(80);
  }
  await waitState(ana, (x) => x.playerIds.every((pid) => x.seen[pid]), 'todos ven sus cartas');
  await pg(s.playerIds[0]).click('[data-a=coup-begin]');
  s = await waitState(ana, (x) => x.phase === 'turn', 'arranca la partida');
  ok('reparto confirmado y partida en marcha');

  // ——— Motor de partida: cobertura guiada + asesinatos hasta un ganador ———
  let didChallenge = false, didExchange = false, didAyuda = false, sawBlock = false;
  let didChallengeBlock = false, blockToChallenge = false, didForcedCoup = false, richId = null;
  let challengeIsNext = false, totalBeforeChallenge = 0;

  for (let step = 0; step < 400; step++) {
    s = await st();
    if (s.phase === 'end') break;

    if (s.phase === 'turn') {
      const actor = s.playerIds[s.turnIdx];
      const coins = s.coins[actor];
      if (!didChallenge) {
        totalBeforeChallenge = totalInfluence(s);
        challengeIsNext = true;
        await forceAction(s, 'impuestos', null); // será desafiado en la ventana
      } else if (!didExchange) {
        await forceAction(s, 'intercambiar', null);
        didExchange = true;
      } else if (!didAyuda) {
        await forceAction(s, 'ayuda', null);
        didAyuda = true;
      } else if (!didChallengeBlock) {
        // 2ª ayuda: su bloqueo se declarará en FAROL y alguien lo desafiará.
        blockToChallenge = true;
        await forceAction(s, 'ayuda', null);
      } else if (!didForcedCoup) {
        // Etapa «rico»: uno acumula impuestos hasta 10 monedas (donde la app
        // OBLIGA al golpe); los demás cogen renta, que es inmediata.
        if (!richId || !alive(s, richId)) {
          richId = s.playerIds.filter((pid) => alive(s, pid)).sort((a, b) => influence(s, b) - influence(s, a))[0];
        }
        if (coins < 10) {
          await forceAction(s, actor === richId ? 'impuestos' : 'renta', null);
        } else {
          const rp = pg(actor);
          check(await rp.locator('[data-a=coup-action]').count() === 1
            && await rp.locator('[data-a=coup-action][data-p=golpe]').count() === 1,
          'con 10+ monedas la app solo ofrece el Golpe de Estado');
          check(await rp.locator('text=/obligado a dar un golpe/').count() >= 1, 'y avisa de que es obligatorio');
          const victims = s.playerIds.filter((pid) => pid !== actor && alive(s, pid))
            .sort((a, b) => influence(s, b) - influence(s, a));
          await forceAction(s, 'golpe', victims[0]);
          didForcedCoup = true;
        }
      } else if (coins >= 3) {
        // Asesina al rival con menos influencia (para ir cerrando la partida).
        const victims = s.playerIds.filter((pid) => pid !== actor && alive(s, pid))
          .sort((a, b) => influence(s, a) - influence(s, b));
        await forceAction(s, 'asesinar', victims[0]);
      } else {
        await forceAction(s, 'impuestos', null);
      }
    } else if (s.phase === 'challengeAction') {
      if (challengeIsNext) {
        const challenger = eligibleReactors(s)[0];
        await doChallengeUI(pg(challenger), sig(s));
        didChallenge = true; challengeIsNext = false;
      } else {
        await passWindow(['challengeAction']);
      }
    } else if (s.phase === 'block') {
      // Solo intentamos bloquear la AYUDA (con un tenedor de Duque, si lo hay).
      const p = s.pending;
      const elig = eligibleReactors(s).filter((pid) => s.reactions[pid] === undefined);
      const hasDuke = (pid) => s.hands[pid].some((c) => !c.lost && c.char === 'duque');
      if (p && p.type === 'ayuda' && blockToChallenge) {
        // Bloqueo de farol (a poder ser, sin Duque): el desafío lo cazará.
        await doBlockUI(pg(elig.find((pid) => !hasDuke(pid)) || elig[0]), 'duque', sig(s));
      } else if (p && p.type === 'ayuda' && !sawBlock) {
        const duke = elig.find(hasDuke);
        if (duke) {
          await doBlockUI(pg(duke), 'duque', sig(s));
          sawBlock = true;
        } else { await passWindow(['block']); }
      } else { await passWindow(['block']); }
    } else if (s.phase === 'challengeBlock') {
      if (blockToChallenge) {
        const challenger = eligibleReactors(s).filter((pid) => s.reactions[pid] === undefined)[0];
        await doChallengeUI(pg(challenger), sig(s));
        didChallengeBlock = true; blockToChallenge = false;
      } else {
        await passWindow(['challengeBlock']); // aceptamos el bloqueo
      }
    } else if (s.phase === 'loseInfluence') {
      await resolveLose();
    } else if (s.phase === 'exchangeReturn') {
      await resolveExchange();
    }
    await ana.waitForTimeout(40);
  }

  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina con un ganador', 30000);
  check(!!s.winner, 'hay un ganador (último en pie)');
  check(influence(s, s.winner) > 0 && s.playerIds.filter((pid) => alive(s, pid)).length === 1, 'el ganador es el único con influencia');
  check(s.scores[s.winner] === 1, 'el ganador suma 1 punto');
  check(didChallenge && s.log.some((t) => /desafía/.test(t)), 'se ejecutó un desafío a través de la UI');
  check(didChallengeBlock && s.log.some((t) => /desafía el bloqueo/.test(t)), 'se desafió un BLOQUEO a través de la UI');
  check(didForcedCoup && s.log.some((t) => /da un golpe de Estado a /.test(t)), 'se llegó a las 10 monedas y al golpe obligatorio');
  check(s.log.some((t) => /cobra impuestos/.test(t)), 'se cobraron impuestos (Duque)');
  check(s.log.some((t) => /intercambi|devuelve/.test(t)), 'hubo un intercambio del Embajador');
  check(s.log.some((t) => /asesin/i.test(t)), 'hubo al menos un asesinato');
  check(s.log.some((t) => /gana el golpe de Estado/.test(t)), 'la voz anuncia al ganador');
  await ana.waitForSelector('text=/Marcador/');
  check(await ana.locator('[data-a=coup-seat] .back').count() === 0, 'al terminar se destapan todas las influencias');
  ok('partida completa de Coup de principio a fin');

  // ——— Revancha: reparto nuevo y diario limpio (no arrastra la partida anterior) ———
  const lastLine = s.log[s.log.length - 1];
  await ana.click('[data-a=coup-again]');
  s = await waitState(ana, (x) => x.phase === 'reveal', 'la revancha reparte de nuevo');
  check(s.logLen === 1 && !s.log.includes(lastLine), 'la revancha arranca con el diario limpio');
  check(s.playerIds.every((pid) => s.coins[pid] === 2 && s.hands[pid].every((c) => !c.lost)), 'la revancha reparte 2 monedas y 2 influencias nuevas');
  check(Object.values(s.scores).some((n) => n === 1), 'el marcador se conserva entre partidas');
  ok('revancha limpia');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  check(await ana.locator('[data-a=table-open]').count() === 1, 'el menú ⋯ ofrece «🪑 La mesa»');
  await ana.click('[data-a=coup-end-open]');
  await ana.waitForSelector('[data-a=coup-end-confirm]');
  await ana.click('[data-a=coup-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Coup');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failcoup-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-coup con ${fail} fallos` : '\n✔ E2E-coup OK');
process.exit(fail ? 1 : 0);
