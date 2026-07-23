// E2E Hombres Lobo · roles de expansión a la vez: Actor, Defensor, Zorro,
// Cuervo, Domador, Anciano y Juez (9 jugadores + narradora, 2 lobos, 2 noches).
//  N1: el actor interpreta a la vidente; el defensor se protege a sí mismo; el
//      zorro huele un trío CON lobo (conserva olfato); el cuervo señala; la
//      manada muerde al ANCIANO → sobrevive su primera vida y nadie muere.
//  D1: el pueblo perdona; el Juez exige la segunda votación DESPUÉS del juicio
//      (regresión: antes el poder se perdía sin abrirla) → cae un lobo.
//  N2: el actor ya no puede repetir papel; el defensor no puede repetir
//      protegido; el zorro huele un trío sin lobos y PIERDE el olfato.
// Además: gruñido del oso del Domador coherente con los vecinos reales.
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
    phase: g?.phase, stepIdx: g?.stepIdx, steps: g?.steps || [], night: g?.night,
    votesLeft: g?.votesLeft, juezSecondActive: g?.juezSecondActive, winner: g?.winner,
    pending: g?.pending || [], acts: g?.acts || {}, lastDawn: g?.lastDawn || null,
    log: (g?.log || []).map((l) => l.txt),
    players: s.players.map((p) => ({
      id: p.id, name: p.name, role: p.role, alive: p.alive, inGame: p.inGame, order: p.order,
      ancianoHit: p.ancianoHit, powers: p.powers, protectedLast: p.protectedLast, actorUsed: p.actorUsed,
    })),
  };
});
async function waitState(page, fn, what, timeout = 60000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (fn(last)) return last; await page.waitForTimeout(300); }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], votesLeft: last?.votesLeft, pending: last?.pending?.length }));
  throw new Error('timeout esperando: ' + what);
}
const pageOf = (p) => pages[p.name.toLowerCase()];
// Vecinos vivos en el círculo (misma regla que el motor: orden de asiento).
function aliveNeighbors(players, pid) {
  const sorted = players.filter((p) => p.inGame).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = sorted.findIndex((p) => p.id === pid);
  const n = sorted.length; const found = [];
  for (let d = 1; d < n; d++) { const p = sorted[(idx - d + n * 2) % n]; if (p.alive && p.id !== pid) { found.push(p); break; } }
  for (let d = 1; d < n; d++) { const p = sorted[(idx + d) % n]; if (p.alive && p.id !== pid && !found.some((f) => f.id === p.id)) { found.push(p); break; } }
  return found;
}

try {
  const GROUP = 'HLR ' + Date.now().toString(36).slice(-5);
  const NAMES = ['Bea', 'Coco', 'Dani', 'Elsa', 'Fabio', 'Gema', 'Hugo', 'Ines', 'Julia'];
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
  await ana.waitForSelector('text=Dispositivos (10)');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-roles]');
  // Composición determinista: 2 lobos (tabla oficial para 9) + exactamente 7
  // roles de pueblo → todos se reparten, sin sorteos ni aldeanos.
  await ana.click('[data-a=open-roles]');
  await ana.waitForSelector('.roletoggle');
  const WANT = ['actor', 'defensor', 'zorro', 'cuervo', 'domador', 'anciano', 'juez'];
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
  await ana.click('button[data-a=close-modal]');
  ok('composición: actor, defensor, zorro, cuervo, domador, anciano y juez (+2 lobos)');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].selected');
  await ana.click('.player[data-a=start-player][data-p=p-ana]'); // Ana solo narra
  await ana.waitForSelector('.player[data-a=start-player][data-p=p-ana].off');
  await ana.click('[data-a=start-auto]');
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  const by = (role) => st.players.find((p) => p.inGame && p.role === role);
  const wolves = st.players.filter((p) => p.inGame && p.role === 'hombre_lobo');
  check(wolves.length === 2 && WANT.every((r) => by(r)), 'los 9 roles previstos están repartidos');
  console.log('  roles:', st.players.filter((p) => p.inGame).map((p) => `${p.name}=${p.role}`).join(', '));
  const [wolf1, wolf2] = wolves;
  const actor = by('actor'); const defensor = by('defensor'); const zorro = by('zorro');
  const cuervo = by('cuervo'); const domador = by('domador'); const anciano = by('anciano'); const juez = by('juez');

  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pageOf(p);
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    await pg.click('[data-a=confirm-role-seen]');
    await pg.waitForTimeout(150);
  }
  await pageOf(st.players.find((x) => x.inGame)).waitForSelector('button[data-a=begin-first-night]');
  await pageOf(st.players.find((x) => x.inGame)).click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');

  // ——— Noche 1 ———
  let lastKey = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    st = await hlc(ana);
    if (st.phase !== 'night') break;
    const stepId = st.steps[st.stepIdx];
    const key = `n${st.night}:${st.stepIdx}`;
    if (key === lastKey) { await ana.waitForTimeout(350); continue; }
    lastKey = key;
    if (stepId === 'actor') {
      const pg = pageOf(actor);
      await pg.waitForSelector('[data-a=act-actor-power][data-p=vidente]', { timeout: 15000 });
      await pg.click('[data-a=act-actor-power][data-p=vidente]');
      await pg.click(`.actionpanel .player.selectable[data-p=${wolf1.id}]`);
      await pg.click('[data-a=act-actor-confirm]');
      await pg.waitForSelector('[data-a=act-actor-seen]', { timeout: 15000 });
      const esLobo = await pg.locator('.actionpanel:has-text("Hombre Lobo")').count();
      check(esLobo >= 1, 'el Actor-vidente ve que su objetivo ES un hombre lobo');
      await pg.click('[data-a=act-actor-seen]');
    } else if (stepId === 'defensor') {
      const pg = pageOf(defensor);
      await pg.waitForSelector('[data-a=act-defensor]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${defensor.id}]`); // se protege a sí mismo (oficial)
      await pg.click('[data-a=act-defensor]');
      ok('el Defensor se protege a sí mismo (permitido por las reglas)');
    } else if (stepId === 'zorro') {
      const pg = pageOf(zorro);
      await pg.waitForSelector('[data-a=act-zorro]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${wolf1.id}]`); // trío con lobo seguro
      await pg.click('[data-a=act-zorro]');
      await pg.waitForSelector('[data-a=act-zorro-seen]', { timeout: 15000 });
      const rastro = await pg.locator('.actionpanel:has-text("rastro de")').count();
      check(rastro >= 1, 'el Zorro huele el trío del lobo: hay rastro (conserva el olfato)');
      await pg.click('[data-a=act-zorro-seen]');
    } else if (stepId === 'cuervo') {
      const pg = pageOf(cuervo);
      await pg.waitForSelector('[data-a=act-cuervo]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${wolf1.id}]`);
      await pg.click('[data-a=act-cuervo]');
    } else if (stepId === 'lobos') {
      const pg = pageOf(wolf1);
      await pg.waitForSelector('[data-a=act-lobos]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${anciano.id}]`);
      await pg.click('[data-a=act-lobos]');
      ok('la manada muerde al Anciano');
    }
    await ana.waitForTimeout(350);
  }

  // Amanecer 1: el Anciano aguanta su primera vida; el oso y el cuervo hablan.
  st = await waitState(ana, (s) => s.phase === 'day', 'amanecer 1');
  check(st.players.filter((p) => p.inGame).every((p) => p.alive), 'NADIE muere: el Anciano sobrevive al primer ataque');
  check(st.players.find((p) => p.id === anciano.id)?.ancianoHit === true, 'su primera vida queda gastada (ancianoHit)');
  check((st.lastDawn?.cuervo || '').includes(wolf1.name), 'el amanecer anuncia las plumas del Cuervo sobre el lobo señalado');
  const domNeigh = aliveNeighbors(st.players, domador.id);
  const wolfNeighbor = domNeigh.some((p) => p.role === 'hombre_lobo');
  check(!!st.lastDawn?.oso === wolfNeighbor, `el oso gruñe si y solo si un lobo es vecino del Domador (vecinos: ${domNeigh.map((p) => p.name).join(', ')})`);

  // ——— Día 1: perdón + el Juez exige la 2ª votación DESPUÉS del juicio ———
  // El registrador fijo es el Juez: vive toda la partida (nunca es lobo ni presa).
  const anyAlive = pageOf(juez);
  await anyAlive.waitForSelector('button[data-a=vote-nadie]', { timeout: 30000 });
  await anyAlive.click('button[data-a=vote-nadie]');
  st = await waitState(ana, (s) => (s.votesLeft || 0) <= 0 && !s.pending.length, 'el pueblo perdona (juicio resuelto)');
  const jp = pageOf(juez);
  await jp.click('button[data-a=toggle-rolecard]');
  await jp.waitForSelector('[data-a=juez-arm]', { timeout: 15000 });
  await jp.click('[data-a=juez-arm]');
  st = await waitState(ana, (s) => (s.votesLeft || 0) === 1 && s.juezSecondActive === true,
    'el Juez abre la segunda votación aunque el juicio de hoy ya estuviera resuelto (regresión)');
  ok('poder del Juez tras el juicio: segunda votación abierta en el acto');
  // Segunda votación: cae el lobo 2.
  await anyAlive.waitForSelector('.actionpanel:has-text("juicio")', { timeout: 30000 });
  await anyAlive.click(`.actionpanel .player.selectable[data-p=${wolf2.id}]`);
  await anyAlive.click('button[data-a=vote-confirm]');
  st = await waitState(ana, (s) => s.players.find((p) => p.id === wolf2.id)?.alive === false, 'el lobo 2 cae en la segunda votación');
  ok('condena registrada en la votación del Juez');

  // ——— Noche 2 ———
  st = await waitState(ana, (s) => (s.votesLeft || 0) <= 0 && !s.pending.length, 'día 1 cerrado');
  await anyAlive.waitForSelector('button[data-a=begin-night]', { timeout: 20000 });
  await anyAlive.click('button[data-a=begin-night]');
  st = await waitState(ana, (s) => s.phase === 'night' && s.night === 2, 'noche 2');
  lastKey = '';
  const t1 = Date.now();
  while (Date.now() - t1 < 150000) {
    st = await hlc(ana);
    if (st.phase !== 'night') break;
    const stepId = st.steps[st.stepIdx];
    const key = `n${st.night}:${st.stepIdx}`;
    if (key === lastKey) { await ana.waitForTimeout(350); continue; }
    lastKey = key;
    if (stepId === 'actor') {
      const pg = pageOf(actor);
      await pg.waitForSelector('[data-a=act-actor-power]', { timeout: 15000 });
      check((await pg.locator('[data-a=act-actor-power][data-p=vidente]').count()) === 0,
        'el papel de vidente ya está descartado: no puede repetirse (regla oficial)');
      await pg.click('[data-a=act-actor-power][data-p=defensor]');
      await pg.click(`.actionpanel .player.selectable[data-p=${juez.id}]`);
      await pg.click('[data-a=act-actor-confirm]');
    } else if (stepId === 'defensor') {
      const pg = pageOf(defensor);
      await pg.waitForSelector('[data-a=act-defensor]', { timeout: 15000 });
      check((await pg.locator(`.actionpanel .player.selectable[data-p=${defensor.id}]`).count()) === 0,
        'no puede repetir protegido dos noches seguidas (anoche se protegió él)');
      await pg.click(`.actionpanel .player.selectable[data-p=${domador.id}]`);
      await pg.click('[data-a=act-defensor]');
    } else if (stepId === 'zorro') {
      // Trío sin lobos garantizado: lejos del único lobo vivo.
      const alive = st.players.filter((p) => p.inGame && p.alive);
      const candidate = alive.find((c) => c.id !== wolf1.id && c.role !== 'hombre_lobo'
        && ![c, ...aliveNeighbors(st.players, c.id)].some((x) => x.role === 'hombre_lobo'));
      const pg = pageOf(zorro);
      await pg.waitForSelector('[data-a=act-zorro]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${candidate.id}]`);
      await pg.click('[data-a=act-zorro]');
      await pg.waitForSelector('[data-a=act-zorro-seen]', { timeout: 15000 });
      const agotado = await pg.locator('.actionpanel:has-text("olfato se ha agotado")').count();
      check(agotado >= 1, 'trío sin lobos: el Zorro pierde su olfato (regla oficial)');
      await pg.click('[data-a=act-zorro-seen]');
    } else if (stepId === 'cuervo') {
      const pg = pageOf(cuervo);
      await pg.waitForSelector('[data-a=act-cuervo]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${juez.id}]`);
      await pg.click('[data-a=act-cuervo]');
    } else if (stepId === 'lobos') {
      const pg = pageOf(wolf1);
      await pg.waitForSelector('[data-a=act-lobos]', { timeout: 15000 });
      await pg.click(`.actionpanel .player.selectable[data-p=${zorro.id}]`);
      await pg.click('[data-a=act-lobos]');
    }
    await ana.waitForTimeout(350);
  }
  st = await waitState(ana, (s) => s.phase === 'day' || s.phase === 'end', 'amanecer 2');
  check(st.players.find((p) => p.id === zorro.id)?.alive === false, 'el Zorro (sin protección) es devorado la noche 2');
  check(st.players.find((p) => p.id === zorro.id)?.powers?.zorro === false, 'su pérdida de olfato quedó registrada');

  // Fin y limpieza (la partida se da por terminada desde el menú).
  await ana.click('[data-a=game-menu]');
  await ana.click('button[data-a=end-game]');
  await ana.click('button[data-a=end-game-confirm][data-p=""]');
  await waitState(ana, (s) => s.phase === 'end', 'fin');
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('[data-a=change-game]', { timeout: 20000 });
  await ana.click('[data-a=change-game]');
  await ana.waitForSelector('text=/Dispositivos/');
  for (const _p of Object.values(pages)) {
    try { if (_p.isClosed()) continue; await _p.goto(url); const _l = await _p.waitForSelector('[data-a=leave]', { timeout: 9000 }).catch(() => null); if (_l) { await _p.click('[data-a=leave]'); await _p.click('[data-a=leave-confirm]'); await _p.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {}); } } catch { /* ya fuera */ }
  }
  await ana.waitForURL(BASE + '/');
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `failhlr-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-hl-roles con ${fail} fallos` : '\n✔ E2E-hl-roles OK');
process.exit(fail ? 1 : 0);
