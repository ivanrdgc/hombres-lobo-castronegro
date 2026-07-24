// E2E de «Ávalon»: partida completa a 5 jugadores (Merlín, Percival, Leal +
// Asesino, Morgana), Ana narra Y juega. Verifica el cableado de punta a punta:
// catálogo → roles → reparto secreto (conocimiento en la carta) → propuesta del
// líder → voto secreto que la app destapa a la vez → una propuesta RECHAZADA
// (contador de rechazos + rotación del liderazgo) → misión con SABOTAJE del
// Mal y misiones limpias → fase del Asesino → final. Contrasta las reglas
// oficiales (bandos, tamaños de equipo) con el estado del motor.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, roles: g.roles,
    leaderIdx: g.leaderIdx, quest: g.quest, results: g.results, voteTrack: g.voteTrack,
    team: g.team, votes: g.votes, lastVote: g.lastVote, lastQuest: g.lastQuest,
    seen: g.seen, winner: g.winner, assassinTarget: g.assassinTarget, enabledRoles: g.enabledRoles,
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(250); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, quest: last.quest, results: last.results, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const leaderPid = (st) => st.playerIds[st.leaderIdx % st.playerIds.length];
const TEAM_SIZES = { 5: [2, 3, 2, 3, 3] };

async function proposeAs(leader, pids) {
  const p = pg(leader);
  await p.waitForSelector('[data-a=av-propose]', { timeout: 15000 });
  for (const pid of pids) await p.click(`.player[data-a=av-sel][data-p="${pid}"]`);
  await p.click('[data-a=av-propose]:not([disabled])');
}
/** Lo que hace falta para decidir, EN PANTALLA (antes vivía en un `title=`). */
async function checkProposeScreen(leader, size) {
  const p = pg(leader);
  await p.waitForSelector('[data-a=av-req]', { timeout: 15000 });
  const req = await p.locator('[data-a=av-req]').first().innerText();
  check(req.includes(`van ${size}`), `la propuesta dice de entrada el tamaño exigido (van ${size})`);
  check(req.includes('sabotaje'), 'y cuántos sabotajes hunden ESTA misión');
  check(await p.locator('[data-a=av-ref]').count() > 0, 'la referencia se consulta desde el propio panel de propuesta');
  check(await p.locator('.player .pnote').count() > 0, 'cada ficha lleva el historial público del jugador');
  const other = Object.keys(NAMES).find((pid) => pid !== leader);
  await pg(other).waitForSelector('[data-a=av-propose-pending]', { timeout: 15000 });
  ok('a los demás se les dice por nombre a quién se espera y qué pueden ir haciendo');
}
/** Toda la mesa vota lo mismo (aprobar o rechazar). */
async function everyoneVotes(st, approve) {
  const sel = `[data-a=av-vote][data-p=${approve ? 'si' : 'no'}]`;
  for (const pid of st.playerIds) {
    const p = pg(pid);
    if (await p.locator(sel).count()) await p.click(sel);
  }
}

try {
  const GROUP = 'Aval ' + Date.now().toString(36).slice(-5);
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

  // Catálogo → Ávalon.
  await ana.click('button[data-a=select-game][data-p=avalon]');
  await ana.waitForSelector('[data-a=av-open-help]');
  ok('el catálogo ofrece Ávalon y su lobby carga');
  await ana.click('[data-a=av-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=av-role]').count() > 0, 'los roles son clicables en «cómo se juega»');
  await ana.locator('.modal [data-a=av-role]').first().click();
  await ana.waitForSelector('[data-a=av-role-back]');
  check(await ana.locator('text=/Cómo funciona/').count() > 0, 'el detalle del rol explica cómo funciona');
  await ana.click('[data-a=av-role-back]');
  await ana.waitForSelector('text=/Cómo se juega/');
  await ana.click('button[data-a=close-modal]');

  // Roles: por defecto Percival + Morgana (pareja clásica). Verificamos el toggle.
  check(await ana.locator('.switch.on[data-a=av-toggle-role][data-p=percival]').count() > 0, 'Percival activado por defecto');
  check(await ana.locator('.switch.on[data-a=av-toggle-role][data-p=morgana]').count() > 0, 'Morgana activada por defecto');

  // Empezar (Ana narra y juega; los 5 juegan).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=av-start]:not([disabled])', { timeout: 15000 });
  ok('«Empezar» habilitado con 5 jugadores');
  await ana.click('[data-a=av-start]');

  // ——— Reparto ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  NAMES = st.names;
  check(st.playerIds.length === 5, 'los 5 juegan');
  const evil = st.playerIds.filter((pid) => ['assassin', 'morgana', 'mordred', 'oberon', 'minion'].includes(st.roles[pid]));
  check(evil.length === 2, `2 malvados (${evil.map((p) => st.roles[p]).join(', ')})`);
  check(Object.values(st.roles).includes('merlin') && Object.values(st.roles).includes('assassin'), 'Merlín y Asesino repartidos');
  console.log('  roles:', st.playerIds.map((id) => `${st.names[id]}=${st.roles[id]}`).join(', '));
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=av-reveal]', { timeout: 15000 });
    await p.click('[data-a=av-reveal]');
    await p.waitForSelector('[data-a=av-seen]');
    await p.click('[data-a=av-seen]');
    await p.waitForTimeout(120);
  }
  st = await waitState(ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos confirman');
  await pg(st.playerIds[0]).waitForSelector('[data-a=av-begin]', { timeout: 15000 });
  await pg(st.playerIds[0]).click('[data-a=av-begin]');

  // ——— Misiones ———
  const merlin = st.playerIds.find((pid) => st.roles[pid] === 'merlin');
  const assassin = st.playerIds.find((pid) => st.roles[pid] === 'assassin');
  const goods = st.playerIds.filter((pid) => !['assassin', 'morgana', 'mordred', 'oberon', 'minion'].includes(st.roles[pid]));
  let sabotagedOnce = false;
  let rejectedOnce = false; // la primera propuesta se tumba a propósito (caso más frecuente en mesa)
  const uiSeen = {}; // pantallas ya revisadas (cada comprobación de UI, una vez)

  st = await waitState(ana, (s) => s.phase === 'propose', 'primera propuesta');
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    st = await hlc(ana);
    if (!st || st.phase === 'end' || st.phase === 'assassin') break;
    const size = TEAM_SIZES[5][st.quest - 1];

    if (st.phase === 'propose') {
      // Misión 1: metemos al Asesino (sabotará). Resto: equipo LIMPIO (solo Bien).
      const team = (st.quest === 1)
        ? [assassin, goods[0]]
        : goods.slice(0, size);
      if (!uiSeen.propose) { uiSeen.propose = true; await checkProposeScreen(leaderPid(st), size); }
      await proposeAs(leaderPid(st), team.slice(0, size));
      await waitState(ana, (s) => s.phase === 'vote', 'abre el voto');
    } else if (st.phase === 'vote') {
      if (!uiSeen.vote) {
        uiSeen.vote = true;
        // Se vota SABIENDO qué equipo es, quién lo propuso y qué pasa si sale.
        const p = pg(st.playerIds[0]);
        const what = await p.locator('[data-a=av-vote-what]').first().innerText();
        check(what.includes(st.names[leaderPid(st)]), `el voto dice quién propuso el equipo (${st.names[leaderPid(st)]})`);
        check(st.team.every((pid) => what.includes(st.names[pid])), 'y qué equipo exacto se vota');
        const whatIf = await p.locator('[data-a=av-vote-what-if]').count();
        check(whatIf > 0, 'cada botón del voto explica qué pasa si sale aprobada o rechazada');
      }
      // La PRIMERA propuesta de la partida se rechaza: es el camino que la mesa
      // real recorre una y otra vez y el e2e nunca tocaba.
      await everyoneVotes(st, rejectedOnce);
      await waitState(ana, (s) => s.phase === 'voteReveal' || s.phase === 'quest', 'voto resuelto');
    } else if (st.phase === 'voteReveal') {
      const p0 = pg(st.playerIds[0]);
      const v = st.lastVote;
      check(v && v.approvals.length + v.rejections.length === 5, 'el voto se destapa entero y con nombres (público)');
      const rejecting = !!v && !v.approved;
      const leaderBefore = leaderPid(st);
      if (rejecting && !rejectedOnce) {
        check(await p0.locator('text=1/5').count() > 0, 'el destape avisa: van 1 de 5 rechazos');
        check((await p0.locator('[data-a=av-vote-continue]').innerText()).includes('Siguiente propuesta'), 'el botón lleva a la siguiente propuesta');
      }
      await p0.click('[data-a=av-vote-continue]');
      const after = await waitState(ana, (s) => s.phase === 'quest' || s.phase === 'propose' || s.phase === 'end', 'tras el destape');
      if (rejecting && !rejectedOnce) {
        rejectedOnce = true;
        check(after.voteTrack === 1, `el contador de rechazos sube a 1 (voteTrack=${after.voteTrack})`);
        check(leaderPid(after) !== leaderBefore, `el liderazgo rota: ${st.names[leaderBefore]} → ${after.names[leaderPid(after)]}`);
        check(after.quest === 1 && after.team.length === 0, 'sigue la misión 1 y el equipo se vacía para la nueva propuesta');
      }
    } else if (st.phase === 'quest') {
      for (const pid of st.team) {
        const p = pg(pid);
        const isEvil = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'].includes(st.roles[pid]);
        if (st.quest === 1 && isEvil) {
          await p.waitForSelector('[data-a=av-quest][data-p=fail]', { timeout: 15000 });
          await p.click('[data-a=av-quest][data-p=fail]');
          sabotagedOnce = true;
        } else {
          await p.waitForSelector('[data-a=av-quest][data-p=ok]', { timeout: 15000 });
          // El Bien SOLO tiene el botón de Éxito (no puede sabotear).
          if (!isEvil) check((await p.locator('[data-a=av-quest][data-p=fail]').count()) === 0, `${st.names[pid]} (Bien) no puede sabotear`);
          if (!isEvil && !uiSeen.quest) {
            uiSeen.quest = true;
            // …y se le dice POR QUÉ, junto al botón bloqueado (no un gris mudo).
            check(await p.locator('[data-a=av-quest-locked][disabled]').count() > 0, 'el Bien ve el botón de sabotear bloqueado, no ausente');
            check((await p.locator('.actionpanel').innerText()).includes('no te deja sabotear'), 'con el motivo escrito al lado del botón bloqueado');
          }
          await p.click('[data-a=av-quest][data-p=ok]');
        }
        await p.waitForTimeout(120);
      }
      await waitState(ana, (s) => s.phase === 'result', 'resultado de la misión');
    } else if (st.phase === 'result') {
      const lq = st.lastQuest;
      if (lq && lq.quest === 1) check(!lq.success && lq.fails === 1, 'la misión 1 FRACASA por el sabotaje del Asesino');
      if (lq && !uiSeen.track) {
        uiSeen.track = true;
        // El tablero: la ficha de cada misión se TOCA y se lee (antes vivía en
        // un `title=`, invisible en un móvil).
        const p = pg(st.playerIds[0]);
        await p.click(`[data-a=av-quest-node][data-p="${lq.quest}"]`);
        const det = await p.locator('[data-a=av-quest-detail]').first().innerText();
        check(lq.team.every((pid) => det.includes(st.names[pid])), `tocando la misión ${lq.quest} se ve quién fue`);
        check(det.includes('sabotaje') || det.includes('sabotajes'), 'y cuántos sabotajes hubo');
        await p.click(`[data-a=av-quest-node][data-p="${lq.quest}"]`);
      }
      await pg(st.playerIds[0]).click('[data-a=av-result-continue]');
      await waitState(ana, (s) => s.phase !== 'result', 'tras el resultado');
    }
    await ana.waitForTimeout(200);
  }

  check(sabotagedOnce, 'el Mal pudo sabotear una misión (botón Fracaso)');
  check(rejectedOnce, 'se jugó también una propuesta rechazada');
  st = await waitState(ana, (s) => s.phase === 'assassin' || s.phase === 'end', 'el Bien alcanza 3 misiones');

  // ——— Fase del Asesino ———
  if (st.phase === 'assassin') {
    ok('3 misiones ganadas por el Bien → el Asesino tiene la última bala');
    // Falla a propósito: señala a un BUENO que NO es Merlín → gana el Bien.
    const target = goods.find((pid) => pid !== merlin);
    const ap = pg(assassin);
    await ap.waitForSelector('[data-a=av-assassinate]', { timeout: 15000 });
    // Dispara con la partida delante: historial de misiones y ficha de cada
    // candidato (de memoria, este tiro era una moneda al aire).
    check(await ap.locator('.player .pnote').count() > 0, 'cada candidato lleva su historial público bajo el nombre');
    const dossier = await ap.locator('.actionpanel').innerText();
    check(dossier.includes('Misión 1'), 'el Asesino ve la historia de la partida en su propio panel');
    await ap.click(`.player[data-a=av-sel][data-p="${target}"]`);
    await ap.click('[data-a=av-assassinate]:not([disabled])');
    st = await waitState(ana, (s) => s.phase === 'end', 'fin tras el disparo del Asesino');
    check(st.winner === 'good', `el Asesino falla (no era Merlín) → gana el Bien (winner=${st.winner})`);
  } else {
    check(st.winner === 'good', 'gana el Bien');
  }

  // ——— Final ———
  await pg(st.playerIds[0]).waitForSelector('[data-a=av-again]', { timeout: 15000 });
  check(await pg(st.playerIds[0]).locator('text=/Las lealtades/').count() > 0, 'el final destapa todas las lealtades');
  ok('partida completa de Ávalon');

  // Revancha: pide DOBLE toque para no rebarajar de un dedazo mientras la mesa
  // lee las lealtades (el primer toque solo arma el botón).
  const pRematch = pg(st.playerIds[0]);
  await pRematch.click('[data-a=av-again]');
  check((await pRematch.locator('[data-a=av-again]').innerText()).includes('otra vez'), 'la revancha pide confirmar con un segundo toque');
  check((await hlc(ana)).phase === 'end', 'un solo toque NO reparte todavía');
  await pRematch.click('[data-a=av-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal', 'revancha repartida');
  ok('la revancha reparte de nuevo con los mismos jugadores');

  // «🪑 La mesa» desde el menú ⋯: el rescate cuando a un móvil se le acaba la
  // batería y la fase se queda esperándolo, sin salir de la partida.
  await ana.click('[data-a=game-menu]');
  await ana.waitForSelector('[data-a=table-open]', { timeout: 5000 });
  await ana.click('[data-a=table-open]');
  await ana.waitForSelector('[data-a=table-player]', { timeout: 5000 });
  ok('el menú ⋯ ofrece «🪑 La mesa» dentro de la partida');
  await ana.click('.modal button[data-a=close-modal]');

  // Terminar → lobby; limpieza de la mesa.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=av-end-open]');
  await ana.waitForSelector('[data-a=av-end-confirm]');
  await ana.click('[data-a=av-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Ávalon');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failaval-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-avalon con ${fail} fallos` : '\n✔ E2E-avalon OK');
process.exit(fail ? 1 : 0);
