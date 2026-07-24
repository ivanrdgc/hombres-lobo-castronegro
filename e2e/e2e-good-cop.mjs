// E2E de «Good Cop Bad Cop»: 4 jugadores (Ana narra y juega). God-view (el doc
// tiene las cartas): catálogo → empezar → investigar (privado) → armarse →
// apuntar → disparar a un no-líder (sigue) → cazar al líder rival (fin).
// Verifica la FUGA: las cartas ajenas van tapadas; el peek solo lo ve quien miró.
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
    phase: g.phase, playerIds: g.playerIds, names: g.names, cards: g.cards,
    alive: g.alive, armed: g.armed, aimAt: g.aimAt, turn: g.turn, peek: g.peek,
    winner: g.winner, scores: g.scores, log: (g.log || []).map((l) => l.txt),
  };
});
async function waitState(page, fn, what, timeout = 30000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(120); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, turn: last.turn, winner: last.winner }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];
const st = () => hlc(pages.ana);
const bandOf = (cards) => (cards.filter((c) => c.kind === 'crook').length > cards.length / 2 ? 'crook' : 'honest');
const leaderOf = (s, band) => s.playerIds.find((pid) => s.cards[pid].some((c) => c.role === (band === 'honest' ? 'agent' : 'kingpin')));

// Ejecuta una acción con el jugador de turno s.turn.
async function turnDo(s, fn) {
  const p = pg(s.turn);
  await p.waitForSelector('[data-a=gc-mode-investigate]', { timeout: 15000 });
  await fn(p, s.turn);
}

try {
  const GROUP = 'GC ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=good_cop]');
  await ana.waitForSelector('[data-a=gc-open-help]');
  ok('el catálogo ofrece Good Cop Bad Cop y su lobby carga');
  await ana.click('[data-a=gc-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=gc-play-howto]').count() >= 4, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=gc-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=gc-start]');

  let s = await waitState(ana, (x) => x.phase === 'turn', 'primer turno');
  NAMES = s.names;
  check(s.playerIds.length === 4, '4 jugadores');
  const agent = leaderOf(s, 'honest');
  const kingpin = leaderOf(s, 'crook');
  check(!!agent && !!kingpin, 'hay un Agente y un Jefe');
  check(bandOf(s.cards[agent]) === 'honest' && bandOf(s.cards[kingpin]) === 'crook', 'los líderes son de su bando');

  // ——— FUGA: cartas ajenas tapadas; 🎴 muestra las propias en cualquier momento ———
  const someone = s.playerIds.find((p) => p !== s.turn);
  const backs = await pg(someone).locator('.gccard.back').count();
  check(backs >= 9, `las cartas ajenas van tapadas (${backs} dorsos)`);
  await pg(someone).click('[data-a=open-mycard]');
  await pg(someone).waitForSelector('text=/Tus cartas de integridad/');
  ok('el 🎴 enseña tus cartas en cualquier momento');
  await pg(someone).click('.modal [data-a=close-modal]');

  // ——— Turno 1: investigar (el peek solo lo ve quien miró) ———
  s = await st();
  const investigator = s.turn;
  const invTarget = s.playerIds.find((p) => p !== investigator);
  await turnDo(s, async (p) => {
    await p.click('[data-a=gc-mode-investigate]');
    await p.click(`[data-a=gc-inv-target][data-p="${invTarget}"]`);
    await p.click('[data-a=gc-inv-card][data-p="0"]');
  });
  s = await waitState(ana, (x) => !!x.peek, 'peek registrado');
  check(s.peek.by === investigator, 'la investigación queda registrada para quien miró');
  check(await pg(investigator).locator('[data-a=gc-peek-ok]').count() === 1, 'quien investigó ve su tarjeta privada');
  const otherP = s.playerIds.find((p) => p !== investigator);
  check(await pg(otherP).locator('[data-a=gc-peek-ok]').count() === 0, 'nadie más ve el resultado');
  await pg(investigator).click('[data-a=gc-peek-ok]');

  // ——— Cazar: el turno que toque, arma → apunta a un NO líder → dispara ———
  // (para verificar que la partida SIGUE), y después al líder rival (fin).
  const nonLeader = s.playerIds.find((p) => p !== agent && p !== kingpin);
  async function armAimShoot(target) {
    // El jugador de turno arma; en sus siguientes turnos apunta y dispara.
    let ss = await st();
    // Si le toca al propio objetivo, que haga de relleno (nadie puede apuntarse
    // a sí mismo, así que el tirador debe ser OTRO).
    while (ss.phase === 'turn' && ss.turn === target) {
      const t = ss.playerIds.find((p) => p !== ss.turn && ss.alive[p]);
      await turnDo(ss, async (p) => {
        await p.click('[data-a=gc-mode-investigate]');
        await p.click(`[data-a=gc-inv-target][data-p="${t}"]`);
        await pg(ss.turn).locator('[data-a=gc-inv-card]:not([disabled])').first().click();
      });
      await waitState(ana, (x) => x.turn !== ss.turn || x.phase === 'end', 'el objetivo cede el turno');
      const s2 = await st();
      if (s2.peek) await pg(s2.peek.by).click('[data-a=gc-peek-ok]').catch(() => {});
      ss = await st();
      if (ss.phase === 'end') return ss;
    }
    const shooter = ss.turn;
    await turnDo(ss, async (p) => { await p.click('[data-a=gc-arm]:not([disabled])'); });
    ss = await waitState(ana, (x) => x.armed[shooter], 'armado');
    // Esperar a que vuelva su turno, actuando de relleno con los demás (investigan).
    for (let guard = 0; guard < 12; guard++) {
      ss = await st();
      if (ss.phase === 'end') return ss;
      if (ss.turn === shooter) break;
      const t = ss.playerIds.find((p) => p !== ss.turn && ss.alive[p]);
      await turnDo(ss, async (p) => {
        await p.click('[data-a=gc-mode-investigate]');
        await p.click(`[data-a=gc-inv-target][data-p="${t}"]`);
        const card = pg(ss.turn).locator('[data-a=gc-inv-card]:not([disabled])').first();
        await card.click();
      });
      await waitState(ana, (x) => x.turn !== ss.turn || x.phase === 'end', 'pasa el relleno');
      const s2 = await st();
      if (s2.peek) await pg(s2.peek.by).click('[data-a=gc-peek-ok]').catch(() => {});
    }
    ss = await st();
    if (ss.phase === 'end') return ss;
    await turnDo(ss, async (p) => { await p.click('[data-a=gc-mode-aim]'); await p.click(`[data-a=gc-aim-target][data-p="${target}"]`); });
    ss = await waitState(ana, (x) => x.aimAt[shooter] === target || x.phase === 'end', 'apuntado');
    for (let guard = 0; guard < 12; guard++) {
      ss = await st();
      if (ss.phase === 'end' || ss.turn === shooter) break;
      const t = ss.playerIds.find((p) => p !== ss.turn && ss.alive[p]);
      await turnDo(ss, async (p) => {
        await p.click('[data-a=gc-mode-investigate]');
        await p.click(`[data-a=gc-inv-target][data-p="${t}"]`);
        await pg(ss.turn).locator('[data-a=gc-inv-card]:not([disabled])').first().click();
      });
      await waitState(ana, (x) => x.turn !== ss.turn || x.phase === 'end', 'pasa el relleno');
      const s2 = await st();
      if (s2.peek) await pg(s2.peek.by).click('[data-a=gc-peek-ok]').catch(() => {});
    }
    ss = await st();
    if (ss.phase === 'end') return ss;
    await turnDo(ss, async (p) => { await p.click('[data-a=gc-shoot]:not([disabled])'); });
    return waitState(ana, (x) => !x.alive[target] || x.phase === 'end', 'disparo resuelto');
  }

  s = await armAimShoot(nonLeader);
  if (s.phase !== 'end') {
    check(!s.alive[nonLeader], 'cae un no-líder y sus cartas se destapan');
    check(s.cards[nonLeader].every((c) => c.up), 'las cartas del caído quedan boca arriba');
    check(s.phase === 'turn', 'la partida SIGUE tras caer un no-líder');
    s = await armAimShoot(kingpin);
  }
  s = await waitState(ana, (x) => x.phase === 'end', 'la partida termina');
  check(!!s.winner, `hay bando ganador (${s.winner})`);
  check(s.log.some((t) => /Ganan/.test(t)), 'la voz anuncia el desenlace');
  await ana.waitForSelector('text=/Marcador/');
  ok('partida completa de Good Cop Bad Cop');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=gc-end-open]');
  await ana.waitForSelector('[data-a=gc-end-confirm]');
  await ana.click('[data-a=gc-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _me = await _p.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null); if (_me) { await _me.click(); await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failgc-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-good-cop con ${fail} fallos` : '\n✔ E2E-good-cop OK');
process.exit(fail ? 1 : 0);
