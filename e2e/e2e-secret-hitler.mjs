// E2E de «Secret Hitler»: partida completa a 5 jugadores (1 fascista +
// Hitler + 3 liberales), Ana narra Y juega. Verifica de punta a punta: catálogo
// → reparto secreto (conocimiento en la carta) → nominación con límites de
// mandato → primera votación HUNDIDA a propósito (gobierno caído + destape de
// votos CON NOMBRES en el tablero) → voto Ja que aprueba → sesión legislativa
// SECRETA (Presidente descarta 1 de 3, Canciller promulga 1 de 2) → poderes
// (mirar y ejecutar, con el ejecutado viendo que está fuera) → victoria. Empuja
// decretos fascistas para disparar los poderes y, en cuanto puede, mata a
// Hitler → gana el Bien por la bala.
//
// Y la postura 🍽️ MESA (B28): NADA secreto se pinta solo —la carta y los
// decretos exigen un gesto y viven en la cortina de privacidad—, la carta
// abierta tiene el mismo marco y el mismo alto para los tres bandos, desde los
// móviles de fuera no se ve nada distinto durante la legislatura y al terminarla
// no queda rastro en pantalla de qué cartas tuvo el Presidente.
//
// Y la puerta única (B34): en partida la carta se abre SOLO desde la pastilla
// flotante 🎴 (ningún «👁 Ver mi carta» suelto en el cuerpo de las fases), la
// cabecera dice la misma fase en todos los móviles y las cortinas de la
// legislatura y de los poderes se rotulan por lo que abren, no por «mi carta».
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
  // El lobby: los tres caminos (jugar, aprender, consultar), la postura del
  // móvil… y el nombre del juego UNA sola vez (B29: la cabecera ya lo dice).
  check(await ana.locator('[data-a=open-start]').count() === 1 && await ana.locator('[data-a=open-demo]').count() === 1,
    'el lobby ofrece empezar, tutorial y «cómo se juega»');
  const postura = await ana.textContent('[data-a=sh-posture]').catch(() => '');
  check(/plano en la mesa/i.test(postura || ''), `el lobby dice cómo se sostiene el móvil («${(postura || '').slice(0, 60)}…»)`);
  const titulos = (await ana.locator('h2, h3').allTextContents()).filter((t) => /Secret Hitler/i.test(t));
  check(titulos.length === 1, `el nombre del juego sale una sola vez en los títulos (${titulos.length})`);
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
  // Postura MESA: la pantalla de reparto es la MISMA tarjeta neutra en los cinco
  // móviles y la carta solo aparece dentro de la cortina, tras el gesto.
  const frames = [];
  let noPaint = true;
  for (const pid of st.playerIds) {
    const p = pg(pid);
    await p.waitForSelector('[data-a=sh-reveal]', { timeout: 15000 });
    if (await p.locator('[data-a=sh-rolecard]').count()) noPaint = false;
    await p.click('[data-a=sh-reveal]');
    await p.waitForSelector('[data-a=sh-seen]');
    // Chivato de FORMA: antes el marco iba teñido por bando (rojo/azul) y el
    // panel del fascista era dos líneas más largo, así que de reojo se leía el
    // bando sin leer una palabra.
    const card = p.locator('[data-a=sh-rolecard]').first();
    const box = await card.boundingBox().catch(() => null);
    frames.push({ role: st.roles[pid], cls: (await card.getAttribute('class') || '').trim(), h: Math.round(box?.height ?? 0) });
    await p.click('[data-a=sh-seen]');
    await p.waitForTimeout(120);
  }
  check(noPaint, 'la carta no se pinta sola: en reposo ningún móvil la enseña');
  check(new Set(frames.map((f) => f.cls)).size === 1, `la carta abierta lleva el mismo marco en los tres bandos («${frames[0].cls}»)`);
  const hs = frames.map((f) => f.h);
  check(Math.max(...hs) - Math.min(...hs) <= 8, `y el mismo alto (${frames.map((f) => `${f.role}:${f.h}px`).join(' · ')})`);
  st = await waitState(ana, (s) => s.playerIds.every((pid) => s.seen[pid]), 'todos confirman');
  await pg(st.playerIds[0]).waitForSelector('[data-a=sh-begin]', { timeout: 15000 });
  await pg(st.playerIds[0]).click('[data-a=sh-begin]');

  // ——— Bucle de gobierno: empuja decretos fascistas para disparar poderes ———
  let sawPeek = false; let execCount = 0; let sawLegPres = false; let sawLegChan = false;
  let killedHitler = false; let neinRoundDone = false; let deadNoteChecked = false;
  let sawLegHint = false; let sawEnactHint = false; let sawNomWhy = false; let sawHandoff = false;
  let sawOneDoor = false;
  st = await waitState(ana, (s) => s.phase === 'nominate', 'primera nominación');
  // El tablero dice de un vistazo qué desbloquea la casilla que viene.
  await ana.waitForSelector('[data-a=sh-next]', { timeout: 15000 });
  const nextTxt = (await ana.textContent('[data-a=sh-next]')).replace(/\s+/g, ' ').trim();
  check(/siguiente decreto fascista/i.test(nextTxt) && /(poder|Faltan)/.test(nextTxt), `el tablero anuncia la próxima casilla («${nextTxt.slice(0, 90)}…»)`);
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    st = await hlc(ana);
    if (!st || st.phase === 'end') break;

    if (st.phase === 'nominate') {
      const pres = presidentPid(st);
      const p = pg(pres);
      // Una sola puerta a tu carta (B34): con la partida en marcha, el cuerpo de
      // las fases NO lleva ningún «👁 Ver mi carta» —había uno debajo de cada
      // panel, además de la pastilla flotante—. La pastilla 🎴 es la única, y es
      // idéntica en todos los móviles (postura de MESA, B28).
      if (!sawOneDoor) {
        sawOneDoor = true;
        const otro = st.playerIds.find((x) => x !== pres);
        const q = pg(otro);
        const fabs = await q.locator('[data-a=open-mycard]').count();
        const extra = await q.locator('[data-a=sh-show-card]').count();
        check(fabs === 1 && extra === 0, `una sola puerta a la carta: 1 pastilla 🎴 y 0 botones sueltos (${fabs}/${extra})`);
        check(await q.locator('[data-a=sh-rolecard]').count() === 0, 'en reposo ningún móvil enseña la carta');
        // Y la cabecera cuenta lo mismo en todas las pantallas.
        const chips = [];
        for (const x of st.playerIds) chips.push(((await pg(x).textContent('[data-a=sh-phase-chip]')) || '').trim());
        check(new Set(chips).size === 1, `la cabecera dice la misma fase en los ${chips.length} móviles («${chips[0]}»)`);
        await q.click('[data-a=open-mycard]');
        await q.waitForSelector('[data-a=sh-sheet] [data-a=sh-rolecard]', { timeout: 10000 });
        ok('la pastilla 🎴 abre la carta (y las reglas) dentro de la cortina de privacidad');
        await q.click('[data-a=sh-hide]');
        await q.waitForSelector('[data-a=sh-sheet]', { state: 'detached', timeout: 10000 });
        check(await q.locator('[data-a=sh-rolecard]').count() === 0, 'al ocultarla no queda rastro en pantalla');
      }
      // Leemos los cancilleres que la propia pantalla ofrece como ELEGIBLES
      // (la app ya aplica los límites de mandato) y elegimos uno que NO sea
      // Hitler — así jamás intentamos tocar un chip que la UI no muestra.
      await p.waitForSelector('.player[data-a=sh-sel]', { timeout: 15000 });
      // Cada ficha lleva escrito si puede ser Canciller o por qué no (los
      // límites de mandato no se recuerdan de memoria).
      if (!sawNomWhy) {
        sawNomWhy = true;
        const rows = await p.$$eval('.players .player', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
        check(rows.length > 0 && rows.every((r) => /Puede ser tu Canciller|Presides tú|no repite|Ejecutado/.test(r)),
          `cada candidato dice si es elegible y por qué (${rows.length} fichas)`);
      }
      const cands = await p.$$eval('.player[data-a=sh-sel]', (els) => els.map((e) => e.getAttribute('data-p')));
      const cand = cands.find((c) => c !== hitler) || cands[0];
      await p.click(`.player[data-a=sh-sel][data-p="${cand}"]`);
      await p.click('[data-a=sh-nominate]:not([disabled])');
      await waitState(ana, (s) => s.phase === 'election', 'abre la elección');
    } else if (st.phase === 'election') {
      // El ejecutado debe VER que está fuera (antes solo veía «votación en curso»).
      const deadPid = st.playerIds.find((x) => !st.alive[x]);
      if (deadPid && !deadNoteChecked) {
        deadNoteChecked = true;
        const note = await pg(deadPid).waitForSelector('[data-a=sh-dead-note]', { timeout: 10000 }).catch(() => null);
        check(!!note, 'el ejecutado ve «Estás ejecutado» en su pantalla de votación');
      }
      // La PRIMERA votación se hunde a propósito: cubre el camino de gobierno
      // caído y deja comprobar el destape de votos con nombres.
      const vote = neinRoundDone ? 'ja' : 'nein';
      for (const pid of aliveOf(st)) {
        const p = pg(pid);
        if (await p.locator(`[data-a=sh-vote][data-p=${vote}]`).count()) await p.click(`[data-a=sh-vote][data-p=${vote}]`);
      }
      const after = await waitState(ana, (s) => s.phase !== 'election', 'voto resuelto');
      if (!neinRoundDone) {
        neinRoundDone = true;
        check(after.electionTracker === 1, `un gobierno rechazado suma 1/3 hacia el caos (${after.electionTracker}/3)`);
        await ana.waitForSelector('[data-a=sh-last-votes]', { timeout: 15000 });
        const destape = (await ana.textContent('[data-a=sh-last-votes]')).replace(/\s+/g, ' ').trim();
        const everyone = st.playerIds.map((p) => st.names[p]);
        check(/RECHAZADO/.test(destape) && everyone.every((nme) => destape.includes(nme)), `el tablero destapa los votos CON NOMBRE («${destape}»)`);
      }
    } else if (st.phase === 'legislativePresident') {
      sawLegPres = true;
      check(Array.isArray(st.presidentDraw) && st.presidentDraw.length === 3, 'el Presidente ve 3 decretos en secreto');
      const draw = st.presidentDraw;
      // Descarta un LIBERAL si lo hay (para promulgar fascista); si no, el primero.
      const idx = draw.findIndex((c) => c === 'liberal');
      const discard = idx >= 0 ? idx : 0;
      const p = pg(presidentPid(st));
      // MESA→MANO: los decretos NO se pintan solos al cambiar de fase (el móvil
      // sigue plano en la mesa); hay que abrir la cortina de privacidad.
      await p.waitForSelector('[data-a=sh-open-cards]', { timeout: 15000 });
      const primeraLeg = !sawHandoff;
      if (primeraLeg) {
        sawHandoff = true;
        check(await p.locator('[data-a=sh-pres-discard]').count() === 0, 'los tres decretos no se pintan solos: hace falta el gesto');
        // Actuar no es «ver mi carta» (B34 · 2): la cortina se rotula por lo que
        // abre —los decretos—, no con otro nombre para la carta.
        const leg = ((await p.textContent('[data-a=sh-open-cards]')) || '').replace(/\s+/g, ' ').trim();
        check(/abrir/i.test(leg) && /decreto/i.test(leg) && !/mi carta/i.test(leg), `la cortina de la legislatura dice qué abre («${leg}»)`);
        const otro = st.playerIds.find((x) => x !== presidentPid(st) && x !== st.nominatedChancellor);
        const fuera = await pg(otro).locator('[data-a=sh-open-cards], [data-a=sh-sheet], .pol').count();
        check(fuera === 0, 'desde fuera (otro móvil) no se ve nada de la legislatura');
      }
      await p.click('[data-a=sh-open-cards]');
      await p.waitForSelector(`[data-a=sh-pres-discard][data-p="${discard}"]`, { timeout: 15000 });
      // Cada decreto dice en su tarjeta qué implica descartarlo (a quién pasan
      // los otros dos): elegir a ciegas era lo que hacía el juego ilegible.
      if (!sawLegHint) {
        sawLegHint = true;
        const txt = (await p.textContent(`[data-a=sh-pres-discard][data-p="${discard}"]`)).replace(/\s+/g, ' ');
        check(/Si descartas este/.test(txt) && /Canciller/.test(txt), `la carta explica qué implica descartarla («${txt.trim().slice(0, 90)}…»)`);
      }
      await p.click(`[data-a=sh-pres-discard][data-p="${discard}"]`);
      // Nada irreversible de un solo toque: se marca y se confirma.
      await p.click('[data-a=sh-pres-discard-go]');
      await waitState(ana, (s) => s.phase !== 'legislativePresident', 'presidente descarta');
      if (primeraLeg) {
        // Al terminar, en su pantalla no queda rastro de qué cartas tuvo.
        await p.waitForSelector('[data-a=sh-sheet]', { state: 'detached', timeout: 10000 }).catch(() => {});
        check(await p.locator('[data-a=sh-sheet], .pol').count() === 0, 'al terminar no queda rastro en pantalla de los decretos del Presidente');
      }
    } else if (st.phase === 'legislativeChancellor') {
      sawLegChan = true;
      check(Array.isArray(st.chancellorDraw) && st.chancellorDraw.length === 2, 'el Canciller ve 2 decretos en secreto');
      const draw = st.chancellorDraw;
      const idx = draw.findIndex((c) => c === 'fascist');
      const enact = idx >= 0 ? idx : 0;
      const p = pg(st.nominatedChancellor);
      await p.waitForSelector('[data-a=sh-open-cards]', { timeout: 15000 });
      await p.click('[data-a=sh-open-cards]');
      await p.waitForSelector(`[data-a=sh-chan-enact][data-p="${enact}"]`, { timeout: 15000 });
      if (!sawEnactHint) {
        sawEnactHint = true;
        const txt = (await p.textContent(`[data-a=sh-chan-enact][data-p="${enact}"]`)).replace(/\s+/g, ' ');
        check(/Sería el/.test(txt) && /(poder|Faltarían|GANAN)/.test(txt), `la carta dice qué implica promulgarla («${txt.trim().slice(0, 90)}…»)`);
      }
      await p.click(`[data-a=sh-chan-enact][data-p="${enact}"]`);
      await p.click('[data-a=sh-chan-enact-go]');
      await waitState(ana, (s) => s.phase !== 'legislativeChancellor', 'canciller promulga');
    } else if (st.phase === 'power') {
      const pres = presidentPid(st);
      const p = pg(pres);
      if (st.power.type === 'peek') {
        sawPeek = true;
        // Las tres cartas del mazo también viven tras la cortina.
        await p.waitForSelector('[data-a=sh-open-peek]', { timeout: 15000 });
        check(await p.locator('.policy').count() === 0, 'los tres decretos del 🔮 no se pintan solos');
        const peek = ((await p.textContent('[data-a=sh-open-peek]')) || '').replace(/\s+/g, ' ').trim();
        check(/mirar|mazo/i.test(peek) && !/mi carta/i.test(peek), `el poder 🔮 se rotula por lo que hace («${peek}»)`);
        await p.click('[data-a=sh-open-peek]');
        await p.waitForSelector('[data-a=sh-peek-done]', { timeout: 15000 });
        await p.click('[data-a=sh-peek-done]');
      } else {
        // El objetivo se elige SIEMPRE entre las fichas que la pantalla ofrece:
        // si el ideal (Hitler) es el propio Presidente —o ya fue investigado—,
        // su ficha no existe y esperarla colgaba la suite (~1 de cada 4).
        await p.waitForSelector('.player[data-a=sh-sel]', { timeout: 15000 });
        const cands = await p.$$eval('.player[data-a=sh-sel]', (els) => els.map((e) => e.getAttribute('data-p')));
        if (st.power.type === 'execution') {
          execCount++;
          // En cuanto Hitler sea alcanzable, se le fusila → gana el Bien.
          const goHitler = execCount >= 2 && cands.includes(hitler);
          const target = goHitler ? hitler
            : cands.find((x) => x !== hitler && st.roles[x] === 'liberal') || cands.find((x) => x !== hitler) || cands[0];
          killedHitler = killedHitler || goHitler;
          await p.click(`.player[data-a=sh-sel][data-p="${target}"]`);
          await p.click('[data-a=sh-execute]:not([disabled])');
          if (!goHitler) {
            const chip = await pg(target).waitForSelector('[data-a=sh-dead-chip]', { timeout: 10000 }).catch(() => null);
            check(!!chip, 'el ejecutado lleva el distintivo 💀 en su cabecera');
          }
        } else if (st.power.type === 'investigate') {
          await p.click(`.player[data-a=sh-sel][data-p="${cands[0]}"]`);
          await p.click('[data-a=sh-investigate]:not([disabled])');
          // La afiliación (lo único secreto del poder) exige abrir la cortina.
          await p.waitForSelector('[data-a=sh-open-loyalty]', { timeout: 15000 });
          check(await p.locator('.result').count() === 0, 'la afiliación investigada no se pinta sola');
          await p.click('[data-a=sh-open-loyalty]');
          await p.waitForSelector('[data-a=sh-invest-done]');
          await p.click('[data-a=sh-invest-done]');
        } else if (st.power.type === 'special') {
          await p.click(`.player[data-a=sh-sel][data-p="${cands[0]}"]`);
          await p.click('[data-a=sh-special]:not([disabled])');
        }
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
  check(neinRoundDone, 'se jugó una votación rechazada (gobierno caído) con su destape de votos');
  if (killedHitler) {
    check(st.winner === 'liberal', 'ejecutar a Hitler da la victoria al Bien');
    check(/Hitler/.test(st.winReason || ''), 'el desenlace explica que era Hitler');
  } else {
    ok(`la partida terminó sin poder fusilar a Hitler (winner=${st.winner}, ejecuciones=${execCount})`);
  }
  await pg(st.playerIds[0]).waitForSelector('[data-a=sh-again]', { timeout: 15000 });
  check(await pg(st.playerIds[0]).locator('text=/Los bandos/').count() > 0, 'el final destapa todos los bandos');
  ok('partida completa de Secret Hitler');

  // Revancha + limpieza.
  await pg(st.playerIds[0]).click('[data-a=sh-again]');
  st = await waitState(ana, (s) => s.phase === 'reveal', 'revancha repartida');
  ok('la revancha reparte de nuevo');
  const logLen = await ana.evaluate(() => (window.__hlc.group?.game?.log || []).length);
  check(logLen === 1, `la revancha arranca con la crónica en blanco (${logLen} línea(s))`);
  await ana.click('[data-a=game-menu]');
  // «🪑 La mesa» dentro de la partida: el rescate cuando un móvil se apaga.
  check(await ana.locator('[data-a=table-open]').count() > 0, 'el menú ⋯ ofrece «🪑 La mesa»');
  // Y las reglas largas, sin salir de la partida (la pastilla 🎴 solo lleva el resumen).
  check(await ana.locator('[data-a=sh-help-open]').count() > 0, 'el menú ⋯ ofrece «📖 Cómo se juega»');
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
