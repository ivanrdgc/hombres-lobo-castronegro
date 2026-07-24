// E2E de «Insider»: 4 jugadores (Ana narra y juega; duración 3 min → 12 s en
// modo test). Verifica de punta a punta: catálogo → reparto (Maestro público,
// palabra a Maestro+Insider) → interrogatorio contrarreloj → el Maestro marca
// «adivinada» → caza del Insider con voto secreto, y CUATRO desenlaces:
//   R1: la mesa caza al Insider  → gana el equipo (group)
//   R2: señalan a un inocente     → el Insider escapa (insider)
//   R3: se agota el tiempo         → pierden todos (timeout)
//   R4: empate + recuento forzado → el Insider escapa (insider)
// Y las trampas de mesa: la palabra no se le escapa al común, el 🎴 la
// reconsulta en cualquier fase, la pausa congela el reloj y esconde los botones,
// quien pregunta primero nunca es el Maestro y el reloj lo arranca cualquiera.
// De la pasada de UI (B25/B26): cada pantalla dice por nombre quién responde y
// quién abre, la chuleta de papeles se consulta sin salir de la fase, los dos
// caminos del Maestro nombran su consecuencia (y «seguimos preguntando» vuelve),
// al Maestro no se le puede señalar pero SALE en la lista con el motivo, el
// final enseña a dónde fue cada voto y lo que suma la ronda, y el menú ⋯ ofrece
// «🪑 La mesa» para rescatar un móvil muerto.
// De la pasada de POSTURA (B28, 🍽️ mesa: el móvil se queda plano y desbloqueado
// sobre el mantel): el lobby dice cómo se sostiene el móvil, la carta del
// reparto se OCULTA SOLA (la palabra no se queda fija en pantalla), la carta
// abierta del Insider y la de un común son indistinguibles de reojo —mismo
// emoji, mismos bloques, mismo alto— y el botón de confirmar el voto no canta a
// quién señalas.
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
    starterIdx: g.starterIdx, paused: !!g.paused,
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

// Reparto: todos miran su carta y confirman; arranca el reloj quien se diga
// (por defecto el Maestro, pero el botón sale en TODAS las pantallas).
async function revealAndBegin(st, starterPid = st.masterId) {
  check(st.playerIds[st.starterIdx] !== st.masterId, `ronda ${st.round}: quien pregunta primero no es el Maestro`);
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=ins-reveal]', { timeout: 15000 });
    await p.click('[data-a=ins-reveal]');
    await p.waitForSelector('[data-a=ins-seen]');
    await p.click('[data-a=ins-seen]');
    await p.waitForTimeout(120);
  }
  await waitState(pages.ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos ven su carta');
  await pg(starterPid).click('[data-a=ins-begin]');
  await waitState(pages.ana, (s) => s.phase === 'question', 'reloj en marcha');
}
// El Maestro confirma que se adivinó la palabra (con su confirmación, que no hay
// vuelta atrás) y luego votan los jugadores indicados.
async function markGuessed(st) {
  const p = pg(st.masterId);
  await p.click('[data-a=ins-guessed-open]');
  await p.click('[data-a=ins-guessed]');
  await waitState(pages.ana, (s) => s.phase === 'vote', 'caza del Insider');
}
async function vote(pid, target) {
  const p = pg(pid);
  await p.waitForSelector(`.player[data-a=ins-vote][data-p="${target}"]`, { timeout: 15000 });
  await p.click(`.player[data-a=ins-vote][data-p="${target}"]`);
  await p.click('[data-a=ins-vote-confirm]:not([disabled])');
  await p.waitForTimeout(120);
}
async function guessAndVote(st, pick) {
  await markGuessed(st);
  for (const pid of st.playerIds) await vote(pid, pick(pid));
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
  // El lobby tiene un solo trabajo (B29): de qué va + tres caminos (aprender,
  // consultar, jugar) y CÓMO SE SOSTIENE EL MÓVIL (B28), sin repetir el nombre
  // del juego que ya está en la cabecera.
  check(/plano en la mesa/i.test(await ana.innerText('[data-a=ins-posture]')), 'el lobby dice cómo se sostiene el móvil (🍽️ mesa)');
  check((await ana.locator('h2:has-text("Insider"), h3:has-text("Insider")').count()) === 1, 'el nombre del juego sale UNA vez (solo en la cabecera)');
  for (const a of ['open-demo', 'ins-open-help', 'open-start']) check(await ana.locator(`[data-a=${a}]`).count() === 1, `el lobby ofrece «${a}»`);
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

  // ——— El reparto se explica solo: quién responde, quién abre y la chuleta ———
  {
    const p = pg(st.playerIds[0]);
    await p.waitForSelector('[data-a=ins-reveal]');
    const facts = await p.innerText('.facts'); // tira de datos públicos de la ronda
    check(facts.includes(NAMES[st.masterId]) && facts.includes(NAMES[st.playerIds[st.starterIdx]]),
      'el reparto dice POR NOMBRE quién responde y quién abre el interrogatorio');
    check(await p.locator('[data-a=ins-ref]').count() >= 1, 'la chuleta de papeles y puntos se consulta sin salir de la fase');
  }

  // ——— La palabra NO se queda fija en pantalla: la carta del reparto se cierra
  //     sola (el móvil acaba plano sobre la mesa, y basta con distraerse) ———
  {
    const p = pg(st.insiderId);
    await p.click('[data-a=ins-reveal]');
    await p.waitForSelector('[data-a=ins-word]');
    await p.waitForSelector('[data-a=ins-word]', { state: 'detached', timeout: 15000 });
    check(await p.locator('[data-a=ins-reveal]').count() === 1, 'la carta del reparto se oculta sola y vuelve el botón 👁 (la palabra no se queda a la vista)');
  }
  await revealAndBegin(st);

  // ——— No hay fuga: la palabra solo la ven Maestro e Insider… y sus cartas se
  //     ven IGUAL que las de un común (postura de mesa: móviles planos) ———
  const common1 = st.playerIds.find((x) => x !== st.insiderId && x !== st.masterId);
  const shape = {};
  for (const [pid, sabe] of [[common1, false], [st.insiderId, true]]) {
    const p = pg(pid);
    // Durante el interrogatorio TODOS ven la misma carta mini plegada: ni la
    // palabra a la vista ni un aspecto distinto que delate al Insider.
    check(await p.locator('[data-a=ins-word]').count() === 0, `la carta de ${NAMES[pid]} va plegada (nada de palabra a la vista)`);
    await p.setViewportSize({ width: 390, height: 844 }); // el MISMO móvil en los dos: comparamos forma
    await p.click('[data-a=ins-togglecard]');
    await p.waitForSelector('.rolecard[data-a=ins-togglecard]');
    check(await p.locator('[data-a=ins-word]').count() === (sabe ? 1 : 0), `${NAMES[pid]} ${sabe ? 've' : 'NO ve'} la palabra al desplegar su carta`);
    const card = p.locator('.rolecard[data-a=ins-togglecard]');
    shape[sabe ? 'ins' : 'com'] = {
      h: Math.round((await card.boundingBox()).height),
      emoji: (await p.locator('.rolecard .remoji').innerText()).trim(),
      kw: await p.locator('.rolecard .kwbox').count(),
      blocks: await p.locator('.rolecard > *').count(),
    };
    await p.click('.rolecard[data-a=ins-togglecard]'); // vuelve a plegarla
    await p.setViewportSize({ width: 1280, height: 720 });
  }
  // De reojo, sin leer: mismo emoji, mismos bloques, mismo alto. Cualquier
  // diferencia de FORMA (un recuadro de más, un panel más largo) ficha al Insider.
  check(shape.com.emoji === shape.ins.emoji, `la carta abierta lleva el mismo emoji sea cual sea el papel (${shape.com.emoji})`);
  check(shape.com.kw === 1 && shape.ins.kw === 1, 'las dos llevan recuadro de palabra (el del común, sin palabra dentro)');
  check(shape.com.blocks === shape.ins.blocks, 'las dos tienen los mismos bloques');
  check(Math.abs(shape.com.h - shape.ins.h) <= 2, `las dos miden lo mismo (${shape.com.h} px vs ${shape.ins.h} px): de reojo no se distinguen`);

  // ——— Pausa: el reloj se congela, los botones de la fase desaparecen y el 🎴
  //     sigue devolviendo la carta (el reloj real no corre mientras tanto) ———
  {
    const p = pg(st.masterId);
    await p.waitForSelector('[data-a=ins-guessed-open]');
    const dl0 = (await hlc(ana)).deadline;
    await p.click('[data-a=game-menu]');
    await p.click('[data-a=ins-pause]');
    await waitState(ana, (s) => s.paused, 'partida en pausa');
    check(await p.locator('[data-a=ins-guessed-open]').count() === 0, 'en pausa no quedan botones que no responden');
    check(/en pausa/i.test(await p.locator('[data-a=ins-timer]').innerText()), 'en pausa el reloj sigue a la vista, congelado');

    const ins = pg(st.insiderId);
    await ins.click('[data-a=open-mycard]');
    await ins.waitForSelector('.modal [data-a=ins-togglecard]');
    check(await ins.locator('.modal [data-a=ins-word]').count() === 0, 'el 🎴 abre la carta plegada (no se despliega sola ante el vecino)');
    await ins.click('.modal [data-a=ins-togglecard]');
    await ins.waitForSelector('.modal .rolecard');
    check(await ins.locator('.modal [data-a=ins-word]').count() === 1, 'el 🎴 devuelve la palabra al Insider a media partida');
    await ins.click('.modal [data-a=close-modal]');

    await p.waitForTimeout(900); // pausa larga: el reloj NO debe consumirla
    await p.click('[data-a=game-menu]');
    await p.click('[data-a=ins-resume]');
    await waitState(ana, (s) => !s.paused, 'partida reanudada');
    await p.waitForSelector('[data-a=ins-guessed-open]');
    check((await hlc(ana)).deadline > dl0 + 800, 'al reanudar se devuelve al reloj el tiempo pausado');

    // «🪑 La mesa» dentro de la partida: es el rescate cuando un móvil se queda
    // sin batería y la fase espera por él.
    await p.click('[data-a=game-menu]');
    await p.waitForSelector('[data-a=table-open]');
    await p.click('[data-a=table-open]');
    await p.waitForSelector('.modal [data-a=table-player]');
    ok('el menú ⋯ ofrece «🪑 La mesa» (sacar a un dispositivo apagado)');
    await p.click('.modal [data-a=close-modal]');
  }

  // ——— Los dos caminos del Maestro nombran su consecuencia, y el «no» vuelve ———
  {
    const p = pg(st.masterId);
    await p.click('[data-a=ins-guessed-open]');
    await p.waitForSelector('[data-a=ins-guessed-cancel]');
    const t = await p.innerText('.actionpanel');
    check(/cazar al Insider/i.test(t) && /seguimos preguntando/i.test(t), 'los dos botones del Maestro dicen lo que pasa con cada uno');
    await p.click('[data-a=ins-guessed-cancel]');
    await p.waitForSelector('[data-a=ins-guessed-open]');
    check((await hlc(ana)).phase === 'question', 'el «no, seguimos preguntando» no toca el interrogatorio');
  }

  await markGuessed(st);
  // La lista de la caza sale ENTERA: al Maestro no se le puede señalar, pero
  // aparece apagado y con el motivo (antes desaparecía sin explicación).
  {
    const p = pg(common1);
    await p.waitForSelector('.player[data-a=ins-vote]');
    check(await p.locator(`.player[data-a=ins-vote][data-p="${st.masterId}"]`).count() === 0, 'al Maestro no se le puede señalar…');
    const dim = (await p.locator('.player.dim').allInnerTexts()).join(' ');
    check(dim.includes(NAMES[st.masterId]) && /no puede ser el Insider/i.test(dim), '…pero sale en la lista, apagado y con el motivo');
    check(/eres tú/i.test(dim), 'y tu propia ficha explica que no puedes votarte');
    // El botón de confirmar NO canta tu voto: era el texto más grande de la
    // pantalla y el vecino lo leía de reojo antes de que lo echaras.
    await p.click(`.player[data-a=ins-vote][data-p="${st.insiderId}"]`);
    const btn = await p.innerText('[data-a=ins-vote-confirm]');
    check(!btn.includes(NAMES[st.insiderId]), 'el botón de confirmar no dice a quién señalas');
  }
  for (const pid of st.playerIds) await vote(pid, pid === st.insiderId ? common1 : st.insiderId);
  st = await waitState(ana, (s) => s.phase === 'end', 'fin de la ronda 1');
  check(st.outcome === 'group' && st.accusedId === st.insiderId, 'cazado el Insider → gana el equipo');
  check(st.playerIds.filter((p) => p !== st.insiderId).every((p) => st.scores[p] === 1) && st.scores[st.insiderId] === 0, 'puntúa todo el equipo (+1) menos el Insider');
  await ana.waitForSelector('text=/Marcador/');
  check(await ana.locator('text=/A dónde fue cada voto/').count() >= 1, 'el final enseña a dónde fue cada voto, sin ir al diario');
  check(await ana.locator('.plus').count() === 3, 'el marcador marca lo que suma cada uno ESTA ronda (+1 a los tres del equipo)');
  ok('el final destapa al Insider, la palabra y el marcador');

  // ——— Ronda 2: señalan a un INOCENTE → el Insider escapa ———
  await pg(st.playerIds[0]).click('[data-a=ins-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 2, 'ronda 2 repartida');
  NAMES = st.names;
  const scapegoat = st.playerIds.find((x) => x !== st.insiderId && x !== st.masterId);
  await revealAndBegin(st, scapegoat); // el reloj lo arranca alguien que NO es el Maestro
  ok('el reloj lo puede poner en marcha cualquiera, no solo el Maestro');
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

  // ——— Ronda 4: un móvil no vota; el Maestro fuerza el recuento y sale EMPATE ———
  await pg(st.playerIds[0]).click('[data-a=ins-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal' && s.round === 4, 'ronda 4 repartida');
  NAMES = st.names;
  await revealAndBegin(st);
  await markGuessed(st);
  {
    const [o1, o2, o3] = st.playerIds.filter((x) => x !== st.masterId);
    await vote(st.masterId, o1); // tres votos a tres dianas distintas → empate
    await vote(o1, o2);
    await vote(o2, o3);
    const m = pg(st.masterId);
    await waitState(m, (s) => Object.keys(s.votes).length === 3, 'tres votos echados, uno pendiente');
    check((await m.locator('[data-a=ins-pending]').innerText()).includes(NAMES[o3]), 'la espera dice POR NOMBRE quién falta por votar');
    await m.waitForSelector('[data-a=ins-force-tally]');
    ok('el Maestro tiene salida si un móvil no vota (recuento forzado)');
    await m.click('[data-a=ins-force-tally]');
  }
  st = await waitState(ana, (s) => s.phase === 'end' && s.round === 4, 'fin de la ronda 4');
  check(st.accusedId === null && st.outcome === 'insider', 'empate en cabeza → nadie señalado y el Insider escapa');
  check(/Voto dividido/.test(await ana.locator('[data-a=ins-vote-note]').innerText()), 'el final EXPLICA el empate en vez de callárselo');
  check(await ana.locator('text=/cierra el recuento/').count() >= 1, 'el diario deja constancia del recuento forzado');
  ok('partida completa de Insider (cuatro desenlaces)');

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
