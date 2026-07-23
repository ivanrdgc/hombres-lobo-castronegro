// E2E de «Insider»: 4 jugadores (Ana narra y juega; duración 3 min → 12 s en
// modo test). Verifica de punta a punta: catálogo → reparto (Maestro público,
// palabra a Maestro+Insider) → interrogatorio contrarreloj → el Maestro marca
// «adivinada» → caza del Insider con voto secreto, y TRES desenlaces:
//   R1: la mesa caza al Insider  → gana el equipo (group)
//   R2: señalan a un inocente     → el Insider escapa (insider)
//   R3: se agota el tiempo         → pierden todos (timeout)
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
    phase: g.phase, round: g.round, playerIds: g.playerIds, names: g.names, word: g.word,
    masterId: g.masterId, insiderId: g.insiderId, seen: g.seen, votes: g.votes,
    accusedId: g.accusedId, outcome: g.outcome, scores: g.scores, deadline: g.deadline,
  };
});
async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) { last = await hlc(page); if (last && fn(last)) return last; await page.waitForTimeout(200); }
  console.log('  estado final:', JSON.stringify(last && { phase: last.phase, outcome: last.outcome, accused: last.accusedId }));
  throw new Error('timeout esperando: ' + what);
}
let NAMES = {};
const pg = (pid) => pages[(NAMES[pid] || pid).toLowerCase()];

// Reparto: todos miran su carta y confirman; el Maestro (rota) pone el reloj.
async function revealAndBegin(st) {
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=ins-reveal]', { timeout: 15000 });
    await p.click('[data-a=ins-reveal]');
    await p.waitForSelector('[data-a=ins-seen]');
    await p.click('[data-a=ins-seen]');
    await p.waitForTimeout(120);
  }
  await waitState(pages.ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos ven su carta');
  await pg(st.masterId).click('[data-a=ins-begin]');
  await waitState(pages.ana, (s) => s.phase === 'question', 'reloj en marcha');
}
// El Maestro confirma que se adivinó la palabra, y luego todos votan.
async function guessAndVote(st, pick) {
  await pg(st.masterId).click('[data-a=ins-guessed]');
  await waitState(pages.ana, (s) => s.phase === 'vote', 'caza del Insider');
  for (const pid of st.playerIds) {
    const target = pick(pid);
    const p = pg(pid);
    await p.waitForSelector(`.player[data-a=ins-vote][data-p="${target}"]`, { timeout: 15000 });
    await p.click(`.player[data-a=ins-vote][data-p="${target}"]`);
    await p.click('[data-a=ins-vote-confirm]:not([disabled])');
    await p.waitForTimeout(120);
  }
}

try {
  const GROUP = 'Ins ' + Date.now().toString(36).slice(-5);
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

  await ana.click('button[data-a=select-game][data-p=insider]');
  await ana.waitForSelector('[data-a=ins-open-help]');
  ok('el catálogo ofrece Insider y su lobby carga');
  await ana.click('[data-a=ins-open-help]');
  await ana.waitForSelector('text=/Cómo se juega/');
  check(await ana.locator('.modal [data-a=ins-play-howto]').count() >= 5, 'el «cómo se juega» tiene un ▶️ por apartado');
  await ana.click('button[data-a=close-modal]');

  await ana.click('[data-a=open-start]');
  await ana.waitForSelector('[data-a=ins-duration][data-p="3"]');
  await ana.click('[data-a=ins-duration][data-p="3"]'); // 3 min → 12 s en test (fin por tiempo rápido)
  await ana.waitForSelector('[data-a=ins-start]:not([disabled])', { timeout: 15000 });
  await ana.click('[data-a=ins-start]');

  // ——— Ronda 1: la mesa CAZA al Insider → gana el equipo ———
  let st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  NAMES = st.names;
  check(st.playerIds.length === 4 && !!st.word, '4 jugadores y palabra secreta repartida');
  check(st.playerIds.includes(st.insiderId) && st.insiderId !== st.masterId, 'hay un Insider, distinto del Maestro');
  console.log('  maestro:', st.masterId, '· insider:', st.insiderId, '· palabra:', st.word);
  await revealAndBegin(st);
  {
    const firstOther = st.playerIds.find((x) => x !== st.insiderId && x !== st.masterId);
    await guessAndVote(st, (pid) => (pid === st.insiderId ? firstOther : st.insiderId));
  }
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 1');
  check(st.outcome === 'group' && st.accusedId === st.insiderId, 'cazado el Insider → gana el equipo');
  check(st.playerIds.filter((p) => p !== st.insiderId).every((p) => st.scores[p] === 1) && st.scores[st.insiderId] === 0, 'puntúa todo el equipo (+1) menos el Insider');
  await ana.waitForSelector('text=/Marcador/');
  ok('el final destapa al Insider, la palabra y el marcador');

  // ——— Ronda 2: señalan a un INOCENTE → el Insider escapa ———
  await pg(st.playerIds[0]).click('[data-a=ins-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 2, 'ronda 2 repartida');
  NAMES = st.names;
  const scapegoat = st.playerIds.find((x) => x !== st.insiderId && x !== st.masterId);
  await revealAndBegin(st);
  await guessAndVote(st, (pid) => (pid === scapegoat ? st.insiderId : scapegoat));
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 2');
  check(st.accusedId === scapegoat && st.outcome === 'insider', 'señalan a un inocente → el Insider escapa (+2)');
  check(st.scores[st.insiderId] >= 2, 'el Insider suma 2');

  // ——— Ronda 3: se agota el tiempo sin adivinar → pierden todos ———
  await pg(st.playerIds[0]).click('[data-a=ins-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 3, 'ronda 3 repartida');
  NAMES = st.names;
  await revealAndBegin(st); // NO se marca «adivinada»: dejamos correr el reloj
  st = await waitState(ana, (s) => s.phase === 'end' && s.outcome === 'timeout', 'fin por tiempo agotado', 30000);
  ok('se agota el tiempo sin adivinar → pierden todos (timeout)');
  ok('partida completa de Insider (tres desenlaces)');

  // Limpieza.
  await ana.click('[data-a=game-menu]');
  await ana.click('[data-a=ins-end-open]');
  await ana.waitForSelector('[data-a=ins-end-confirm]');
  await ana.click('[data-a=ins-end-confirm]');
  await ana.waitForSelector('[data-a=open-start]', { timeout: 30000 });
  ok('al terminar, la mesa vuelve al lobby de Insider');
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
    try { if (!p.isClosed()) await p.screenshot({ path: `failins-${label}.png` }); } catch { /* cerrada */ }
  }
}
await browser.close();
console.log(fail ? `\n✖ E2E-insider con ${fail} fallos` : '\n✔ E2E-insider OK');
process.exit(fail ? 1 : 0);
