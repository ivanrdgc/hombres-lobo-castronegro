// E2E Hombres Lobo · Gitana, Tonto del Pueblo y Cabeza de Turco (8 jugadores,
// 1 lobo fijado a mano, 3 noches).
//  N1: la Gitana escribe su PROPIA pregunta; el lobo devora a un aldeano.
//  D1: los espíritus reciben la pregunta en el amanecer; el pueblo lincha al
//      TONTO → se salva, pierde el voto y su panel de juicio desaparece.
//  D2: EMPATE → muere el Cabeza de Turco y designa al único registrador de
//      mañana.
//  N3: el lobo devora AL DESIGNADO → regresión: antes nadie podía registrar el
//      voto (partida colgada); ahora el voto vuelve al pueblo y se anuncia.
//  D3: cualquiera registra, cae el lobo y gana el pueblo.
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
  const s = window.__hlc;
  const g = s.group?.game;
  return {
    phase: g?.phase, stepIdx: g?.stepIdx, steps: g?.steps || [], night: g?.night, dayNum: g?.dayNum,
    votesLeft: g?.votesLeft, winner: g?.winner, pending: g?.pending || [],
    soloVoteId: g?.soloVoteId, lastDawn: g?.lastDawn || null,
    log: (g?.log || []).map((l) => l.txt),
    players: s.players.map((p) => ({
      id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame, revealedTonto: p.revealedTonto,
    })),
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], votesLeft: last?.votesLeft, soloVoteId: last?.soloVoteId, pending: last?.pending }));
  throw new Error('timeout esperando: ' + what);
}
const pageOf = (p) => pages[p.name.toLowerCase()];

try {
  const GROUP = 'HLP ' + Date.now().toString(36).slice(-5);
  const NAMES = ['Bea', 'Coco', 'Dani', 'Elsa', 'Fabio', 'Gema', 'Hugo'];
  const ana = await mk('ana');
  await ana.goto(BASE + '/hombres_lobo');
  await ana.fill('#inp-name', 'Ana'); await ana.fill('#inp-group', GROUP);
  await ana.click('[data-a=create-group]'); await ana.waitForURL('**/g/**');
  const url = ana.url();
  for (const n of NAMES) {
    const p = await mk(n.toLowerCase());
    await p.goto(url); await p.fill('#inp-name', n); await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (8)');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-roles]');
  // Composición: SOLO gitana + tonto + cabeza_turco, y 1 lobo fijado a mano
  // (para que el lobo sobreviva hasta el día 3). Relleno: 4 aldeanos.
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('.roletoggle');
  const WANT = ['gitana', 'tonto', 'cabeza_turco'];
  const onRoles = await ana.$$eval('.roletoggle.on[data-a=toggle-role]', (els) => els.map((e) => e.getAttribute('data-p')));
  for (const r of onRoles.filter((x) => x && !WANT.includes(x))) {
    await ana.click(`.roletoggle.on[data-p=${r}]`);
    await ana.waitForSelector(`.roletoggle[data-p=${r}]:not(.on)`, { timeout: 10000 });
  }
  for (const r of WANT) {
    if (!(await ana.locator(`.roletoggle.on[data-p=${r}]`).count())) {
      await ana.click(`.roletoggle[data-p=${r}]`);
      await ana.waitForSelector(`.roletoggle.on[data-p=${r}]`);
    }
  }
  // 1 lobo fijo: manual y bajar de 2 a 1.
  await ana.click('[data-a=wolves-manual]');
  await ana.waitForSelector('[data-a=wolves-dec]');
  await ana.click('[data-a=wolves-dec]');
  await ana.waitForTimeout(300);
  await ana.click('button[data-a=close-modal]');
  ok('composición: 1 lobo + gitana + tonto + cabeza de turco + 4 aldeanos');

  // Ana narra Y juega (8 jugadores: mínimo oficial, sin modo casual).
  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  const by = (role) => st.players.find((p) => p.inGame && p.role === role);
  const lobo = by('hombre_lobo'); const gitana = by('gitana'); const tonto = by('tonto'); const cabeza = by('cabeza_turco');
  const aldeanos = st.players.filter((p) => p.inGame && p.role === 'aldeano');
  check(!!lobo && !!gitana && !!tonto && !!cabeza && aldeanos.length === 4, 'reparto completo (1 lobo, 3 especiales, 4 aldeanos)');
  console.log('  roles:', st.players.filter((p) => p.inGame).map((p) => `${p.name}=${p.role}`).join(', '));

  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pageOf(p);
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    await pg.click('[data-a=confirm-role-seen]');
    await pg.waitForTimeout(150);
  }
  await pageOf(gitana).waitForSelector('button[data-a=begin-first-night]');
  await pageOf(gitana).click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');

  const PREGUNTA = '¿Sigue el lobo entre los vivos?';
  // Conductor genérico de las 3 noches: lobo → víctima elegida; gitana →
  // pregunta propia la noche 1, «no preguntar» después.
  const victims = [aldeanos[0], aldeanos[1]]; // la 3ª víctima será el designado
  async function driveNight(nightNo, victim) {
    let lastKey = '';
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      st = await hlc(ana);
      if (st.phase !== 'night') break;
      const stepId = st.steps[st.stepIdx];
      const key = `n${st.night}:${st.stepIdx}`;
      if (key === lastKey) { await ana.waitForTimeout(350); continue; }
      lastKey = key;
      if (stepId === 'lobos') {
        const pg = pageOf(lobo);
        await pg.waitForSelector('[data-a=act-lobos]', { timeout: 15000 });
        await pg.click(`.actionpanel .player.selectable[data-p=${victim.id}]`);
        await pg.click('[data-a=act-lobos]');
      } else if (stepId === 'gitana') {
        const pg = pageOf(gitana);
        if (nightNo === 1) {
          await pg.waitForSelector('#gitana-q', { timeout: 15000 });
          await pg.fill('#gitana-q', PREGUNTA);
          await pg.click('[data-a=act-gitana-custom]');
        } else {
          await pg.waitForSelector('[data-a=act-gitana-skip]', { timeout: 15000 });
          await pg.click('[data-a=act-gitana-skip]');
        }
      }
      await ana.waitForTimeout(350);
    }
  }

  await driveNight(1, victims[0]);
  st = await waitState(ana, (s) => s.phase === 'day' && s.dayNum === 1, 'amanecer 1');
  check(st.players.find((p) => p.id === victims[0].id)?.alive === false, 'el lobo devora al primer aldeano');
  check((st.lastDawn?.gitana || '').includes(PREGUNTA), 'la pregunta PROPIA de la Gitana llega a los espíritus al amanecer');

  // D1: linchan al Tonto → se salva, pierde el voto.
  const reg1 = pageOf(gitana);
  await reg1.waitForSelector('.actionpanel:has-text("juicio")', { timeout: 30000 });
  await reg1.click(`.actionpanel .player.selectable[data-p=${tonto.id}]`);
  await reg1.click('button[data-a=vote-confirm]');
  st = await waitState(ana, (s) => s.players.find((p) => p.id === tonto.id)?.revealedTonto === true, 'el Tonto revelado');
  check(st.players.find((p) => p.id === tonto.id)?.alive === true, 'el Tonto se salva del linchamiento');
  check(st.log.some((t) => t.includes('Tonto del Pueblo')), 'la crónica lo explica');
  // Su panel de juicio desaparece para siempre (ya no vota)…
  st = await waitState(ana, (s) => (s.votesLeft || 0) <= 0 && !s.pending.length, 'día 1 cerrado');
  await pageOf(gitana).waitForSelector('button[data-a=begin-night]', { timeout: 20000 });
  await pageOf(gitana).click('button[data-a=begin-night]');
  st = await waitState(ana, (s) => s.phase === 'night' && s.night === 2, 'noche 2');

  await driveNight(2, victims[1]);
  st = await waitState(ana, (s) => s.phase === 'day' && s.dayNum === 2, 'amanecer 2');
  const tontoPanel = await pageOf(tonto).locator('.actionpanel:has-text("juicio")').count();
  check(tontoPanel === 0, 'el Tonto descubierto ya no ve el panel de venir a registrar (no vota)');

  // D2: EMPATE → muere el Cabeza de Turco y designa registrador único.
  await reg1.waitForSelector('button[data-a=vote-empate]', { timeout: 30000 });
  await reg1.click('button[data-a=vote-empate]');
  st = await waitState(ana, (s) => s.players.find((p) => p.id === cabeza.id)?.alive === false, 'el Cabeza de Turco muere en el empate');
  ok('empate: el Cabeza de Turco se sacrifica (regla oficial)');
  const designado = aldeanos[2];
  const cp = pageOf(cabeza);
  await cp.waitForSelector('[data-a=cabeza-pick]', { timeout: 20000 });
  await cp.click(`.actionpanel .player.selectable[data-p=${designado.id}]`);
  await cp.click('[data-a=cabeza-pick]');
  st = await waitState(ana, (s) => s.soloVoteId === designado.id, 'designa al único registrador de mañana');
  ok(`designado: ${designado.name}`);

  st = await waitState(ana, (s) => (s.votesLeft || 0) <= 0 && !s.pending.length, 'día 2 cerrado');
  await pageOf(gitana).waitForSelector('button[data-a=begin-night]', { timeout: 20000 });
  await pageOf(gitana).click('button[data-a=begin-night]');
  st = await waitState(ana, (s) => s.phase === 'night' && s.night === 3, 'noche 3');

  // N3: el lobo devora AL DESIGNADO (regresión del voto colgado).
  await driveNight(3, designado);
  st = await waitState(ana, (s) => s.phase === 'day' && s.dayNum === 3, 'amanecer 3');
  check(st.players.find((p) => p.id === designado.id)?.alive === false, 'el designado cae esa misma noche');
  check(st.soloVoteId === null || st.soloVoteId === undefined, 'REGRESIÓN: el voto vuelve al pueblo (antes quedaba colgado en un muerto)');
  check(st.log.some((t) => t.includes('registra cualquiera')), 'la crónica avisa del relevo del registro');

  // D3: cualquiera registra y cae el lobo → gana el pueblo.
  await reg1.waitForSelector('.actionpanel:has-text("juicio")', { timeout: 30000 });
  await reg1.click(`.actionpanel .player.selectable[data-p=${lobo.id}]`);
  await reg1.click('button[data-a=vote-confirm]');
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de partida');
  check(st.winner === 'pueblo', `gana el pueblo (winner=${st.winner})`);

  // Limpieza.
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('[data-a=change-game]', { timeout: 20000 });
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failhlp-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-hl-pueblo con ${fail} fallos` : '\n✔ E2E-hl-pueblo OK');
process.exit(fail ? 1 : 0);
