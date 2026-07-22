// E2E de «Ávalon»: partida completa a 5 jugadores (Merlín, Percival, Leal +
// Asesino, Morgana), Ana narra Y juega. Verifica el cableado de punta a punta:
// catálogo → roles → reparto secreto (conocimiento en la carta) → propuesta del
// líder → voto secreto que la app destapa a la vez → misión con SABOTAJE del
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
async function everyoneApprove(st) {
  for (const pid of st.playerIds) {
    const p = pg(pid);
    if (await p.locator('[data-a=av-vote][data-p=si]').count()) await p.click('[data-a=av-vote][data-p=si]');
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
      await proposeAs(leaderPid(st), team.slice(0, size));
      await waitState(ana, (s) => s.phase === 'vote', 'abre el voto');
    } else if (st.phase === 'vote') {
      await everyoneApprove(st);
      await waitState(ana, (s) => s.phase === 'voteReveal' || s.phase === 'quest', 'voto resuelto');
    } else if (st.phase === 'voteReveal') {
      check(st.lastVote && st.lastVote.approvals.length >= 1, 'el voto se destapa con la lista de aprobaciones (público)');
      await pg(st.playerIds[0]).click('[data-a=av-vote-continue]');
      await waitState(ana, (s) => s.phase === 'quest' || s.phase === 'propose', 'tras el destape');
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
          await p.click('[data-a=av-quest][data-p=ok]');
        }
        await p.waitForTimeout(120);
      }
      await waitState(ana, (s) => s.phase === 'result', 'resultado de la misión');
    } else if (st.phase === 'result') {
      const lq = st.lastQuest;
      if (lq && lq.quest === 1) check(!lq.success && lq.fails === 1, 'la misión 1 FRACASA por el sabotaje del Asesino');
      await pg(st.playerIds[0]).click('[data-a=av-result-continue]');
      await waitState(ana, (s) => s.phase !== 'result', 'tras el resultado');
    }
    await ana.waitForTimeout(200);
  }

  check(sabotagedOnce, 'el Mal pudo sabotear una misión (botón Fracaso)');
  st = await waitState(ana, (s) => s.phase === 'assassin' || s.phase === 'end', 'el Bien alcanza 3 misiones');

  // ——— Fase del Asesino ———
  if (st.phase === 'assassin') {
    ok('3 misiones ganadas por el Bien → el Asesino tiene la última bala');
    // Falla a propósito: señala a un BUENO que NO es Merlín → gana el Bien.
    const target = goods.find((pid) => pid !== merlin);
    const ap = pg(assassin);
    await ap.waitForSelector('[data-a=av-assassinate]', { timeout: 15000 });
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

  // Revancha re-reparte.
  await pg(st.playerIds[0]).click('[data-a=av-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal', 'revancha repartida');
  ok('la revancha reparte de nuevo con los mismos jugadores');

  // Terminar → lobby; limpieza de la mesa.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=av-end-open]');
  await ana.waitForSelector('[data-a=av-end-confirm]');
  await ana.click('[data-a=av-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Ávalon');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failaval-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-avalon con ${fail} fallos` : '\n✔ E2E-avalon OK');
process.exit(fail ? 1 : 0);
