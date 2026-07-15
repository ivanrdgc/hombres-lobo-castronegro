// E2E 2: modo manual + partida automática con roles complejos y conductor genérico.
import { chromium } from 'playwright';

const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
let failures = 0;
const ok = (msg) => console.log('  ✔', msg);
const bad = (msg) => { failures++; console.log('  ✖', msg); };
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

const browser = await chromium.launch();
const pages = {};

const pace = (p) => p.waitForTimeout(350);
async function mk(label) {
  const ctx = await browser.newContext({ locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`[${label}] pageerror: ${e.message}`));
  pages[label] = page;
  return page;
}

const hlc = (page) => page.evaluate(() => {
  const s = window.__hlc;
  return {
    phase: s.group?.game?.phase, stepIdx: s.group?.game?.stepIdx,
    steps: s.group?.game?.steps, acts: s.group?.game?.acts,
    winner: s.group?.game?.winner, status: s.group?.status,
    pending: s.group?.game?.pending || [], votesLeft: s.group?.game?.votesLeft,
    dayNum: s.group?.game?.dayNum, night: s.group?.game?.night,
    manualPhase: s.group?.game?.manualPhase,
    players: s.players.map((p) => ({
      id: p.id, name: p.name, role: p.role, alive: p.alive, roleSeen: p.roleSeen,
      lover: p.lover, inGame: p.inGame, keyword: p.keyword,
    })),
  };
});

async function waitState(page, fn, what, timeout = 45000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeout) {
    last = await hlc(page);
    if (fn(last)) return last;
    await page.waitForTimeout(300);
  }
  console.log('  estado final:', JSON.stringify({ phase: last?.phase, step: last?.steps?.[last?.stepIdx], pending: last?.pending, votesLeft: last?.votesLeft, winner: last?.winner }));
  throw new Error('timeout esperando: ' + what);
}

const pageOf = (st, pred) => {
  const p = st.players.find(pred);
  return p ? pages[p.name.toLowerCase()] : null;
};

async function clickFirstAnd(page, confirmSel, n = 1) {
  for (let i = 0; i < n; i++) {
    await page.click(`.actionpanel .player.selectable:not(.selected) >> nth=0`);
    await page.waitForTimeout(200);
  }
  await page.click(confirmSel);
  await page.waitForTimeout(350);
}

// Conduce un paso nocturno de forma genérica.
async function driveNightStep(st) {
  const stepId = st.steps[st.stepIdx];
  const alive = (r) => st.players.find((p) => p.role === r && p.alive);
  switch (stepId) {
    case 'ladron': return clickAction(alive('ladron'), 'button[data-a=act-ladron-keep]');
    case 'cupido': return clickFirstAnd(pages[alive('cupido').name.toLowerCase()], 'button[data-a=act-cupido]', 2);
    case 'enamorados': {
      for (const p of st.players.filter((x) => x.lover && x.alive)) {
        const pg = pages[p.name.toLowerCase()];
        if (await pg.isVisible('button[data-a=act-lover-ok]')) await pg.click('button[data-a=act-lover-ok]');
      }
      return;
    }
    case 'nino_salvaje': return clickFirstAnd(pages[alive('nino_salvaje').name.toLowerCase()], 'button[data-a=act-nino]');
    case 'perro_lobo': return pages[alive('perro_lobo').name.toLowerCase()].click('button[data-a=act-perro][data-p=aldeano]');
    case 'dos_hermanas': {
      for (const p of st.players.filter((x) => x.role === 'dos_hermanas' && x.alive)) {
        const pg = pages[p.name.toLowerCase()];
        if (await pg.isVisible('button[data-a=act-hermana-ok]')) await pg.click('button[data-a=act-hermana-ok]');
      }
      return;
    }
    case 'actor': return clickAction(alive('actor'), 'button[data-a=act-actor-skip]');
    case 'defensor': return clickFirstAnd(pages[alive('defensor').name.toLowerCase()], 'button[data-a=act-defensor]');
    case 'vidente': {
      const pg = pages[alive('vidente').name.toLowerCase()];
      await clickFirstAnd(pg, 'button[data-a=act-vidente]');
      await pg.waitForSelector('button[data-a=act-vidente-seen]');
      return pg.click('button[data-a=act-vidente-seen]');
    }
    case 'zorro': return clickAction(alive('zorro'), 'button[data-a=act-zorro-skip]');
    case 'cuervo': return clickFirstAnd(pages[alive('cuervo').name.toLowerCase()], 'button[data-a=act-cuervo]');
    case 'lobos_reconocen': {
      const pack = st.players.filter((p) => p.alive && (['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'].includes(p.role) || p.wolfSide === true));
      for (const p of pack) {
        const pg = pages[p.name.toLowerCase()];
        if (await pg.isVisible('button[data-a=act-lobos-reconocido]')) await pg.click('button[data-a=act-lobos-reconocido]');
      }
      return;
    }
    case 'lobos': {
      const wolf = st.players.find((p) => p.alive && ['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'].includes(p.role));
      const wolfPage = pages[wolf.name.toLowerCase()];
      // El lobo devora al cazador si vive (para probar su disparo); si no, al primero.
      const cazador = st.players.find((p) => p.alive && p.role === 'cazador');
      if (cazador) {
        await wolfPage.click(`.actionpanel .player.selectable:has-text("${cazador.name}")`);
      } else {
        await wolfPage.click('.actionpanel .player.selectable >> nth=0');
      }
      return wolfPage.click('button[data-a=act-lobos]');
    }
    case 'infecto_decision': return clickAction(alive('infecto'), 'button[data-a=act-infecto][data-p=no]');
    case 'lobo_feroz': return clickAction(alive('lobo_feroz'), 'button[data-a=act-feroz-skip]');
    case 'lobo_albino': return clickAction(alive('lobo_albino'), 'button[data-a=act-albino-skip]');
    case 'bruja': return clickAction(alive('bruja'), 'button[data-a=act-bruja-done]');
    case 'gaitero': {
      const g = alive('gaitero'); if (!g) return;
      const pg = pages[g.name.toLowerCase()];
      const targets = await pg.locator('.actionpanel .player.selectable').count();
      return clickFirstAnd(pg, 'button[data-a=act-gaitero]', Math.min(2, targets));
    }
    case 'gitana': return clickAction(alive('gitana'), 'button[data-a=act-gitana-skip]');
  }
}

async function clickAction(player, selector) {
  if (!player) return;
  const pg = pages[player.name.toLowerCase()];
  await pg.waitForSelector(selector, { timeout: 10000 });
  await pg.click(selector);
}

async function drivePending(st) {
  const head = st.pending[0];
  const actorP = st.players.find((p) => p.id === head.pid);
  switch (head.type) {
    case 'cazador': {
      const pg = pages[actorP.name.toLowerCase()];
      await pg.waitForSelector('button[data-a=cazador-shoot]');
      // Ya está muerto: puede espiar el rol de un jugador tocándolo.
      if (await pg.locator('.player[data-a=dead-peek]').count()) {
        await pg.click('.player[data-a=dead-peek] >> nth=0');
        const revealed = await pg.locator('.player[data-a=dead-peek] small').count();
        check(revealed >= 1, 'el jugador muerto puede revelar roles tocando a la gente');
      }
      // Dispara al primer objetivo de la lista.
      const victimName = (await pg.locator('.actionpanel .player.selectable >> nth=0').innerText()).trim();
      await pg.click('.actionpanel .player.selectable >> nth=0');
      await pg.click('button[data-a=cazador-shoot]');
      ok('el cazador dispara su última flecha');
      // La víctima se registra para que la voz la anuncie (con su rol).
      await pg.waitForFunction(() => (window.__hlc.group?.game?.lastShot || []).length > 0, { timeout: 15000 });
      const shot = await pg.evaluate(() => window.__hlc.group.game.lastShot);
      check(shot.some((d) => d.name === victimName), 'la víctima del cazador se registra para anunciarla por voz');
      return;
    }
    case 'sirvienta': {
      const s = st.players.find((p) => p.role === 'sirvienta' && p.alive);
      if (s) { await pages[s.name.toLowerCase()].click('button[data-a=sirvienta-no]'); }
      return;
    }
    case 'alguacil_elect': {
      const anyAlive = st.players.find((p) => p.alive);
      const pg = pages[anyAlive.name.toLowerCase()];
      await pg.click('.actionpanel .player.selectable >> nth=0');
      await pg.click('button[data-a=alguacil-pick]');
      ok('alguacil elegido');
      return;
    }
    case 'alguacil_pick': {
      const pg = pages[actorP.name.toLowerCase()];
      await pg.click('.actionpanel .player.selectable >> nth=0');
      await pg.click('button[data-a=alguacil-pick]');
      return;
    }
    case 'cabeza_pick': {
      const pg = pages[actorP.name.toLowerCase()];
      await pg.click('button[data-a=cabeza-skip]');
      return;
    }
  }
}

try {
  // ═══ PARTE A: MODO MANUAL ═══
  console.log('— Modo manual —');
  const GROUP_M = 'Man ' + Date.now().toString(36).slice(-5);
  const ana = await mk('ana');
  await ana.goto(BASE + '/hombres_lobo');
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP_M);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**');
  const urlM = ana.url();
  for (const n of ['Bruno', 'Carla', 'David']) {
    const p = await mk(n.toLowerCase());
    await p.goto(urlM);
    await p.fill('#inp-name', n);
    await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (4)');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-settings]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');
  await ana.click('[data-a=open-start]');
  await ana.click('[data-a=start-manual]');
  await ana.waitForSelector('text=Panel del narrador');
  ok('modo manual: máster ve el panel del narrador');
  let st = await hlc(ana);
  check(st.players.filter((p) => p.role).length === 3, 'el máster no recibe rol; los otros 3 sí');
  check(await ana.isVisible('.player:has-text("Bruno") small'), 'máster ve los roles de todos');
  await pages.bruno.click('[data-a=open-reveal-role]');
  await pages.bruno.waitForSelector('.rolecard .rname');
  ok('los jugadores despliegan su carta también en modo manual');

  // Marcar una muerte (sin causa).
  await ana.click('.player[data-a=manual-player]:has-text("Carla")');
  await ana.click('button[data-a=manual-toggle-dead]');
  await pages.carla.waitForSelector('text=/Carla ha muerto/');
  ok('muerte marcada por el máster y anunciada en la crónica');
  st = await waitState(ana, (s) => s.players.find((p) => p.name === 'Carla')?.alive === false, 'Carla marcada muerta');
  ok('Carla figura como muerta');

  // Revivir (mismo botón, control absoluto).
  await ana.click('.player[data-a=manual-player]:has-text("Carla")');
  await ana.click('button[data-a=manual-toggle-dead]');
  st = await waitState(ana, (s) => s.players.find((p) => p.name === 'Carla').alive === true, 'revivir');
  ok('revivir funciona');

  // Mostrar el rol a pantalla completa.
  await ana.click('.player[data-a=manual-player]:has-text("Bruno")');
  await ana.click('button[data-a=show-role-full]');
  await ana.waitForSelector('.modal .rolecard');
  ok('rol a pantalla completa desde el menú del máster');
  await ana.click('button[data-a=close-modal]');

  // Fin de partida manual.
  await ana.click('button[data-a=end-game]');
  await ana.click('button[data-a=end-game-confirm][data-p=pueblo]');
  await pages.bruno.waitForSelector('text=/El Pueblo ha ganado/');
  ok('fin manual con ganador elegido');
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('text=/Dispositivos/'); // la página principal es la mesa
  await ana.click('[data-a=confirm-delete-group]');
  await ana.click('button[data-a=delete-group-confirm]');
  await ana.waitForURL(BASE + '/');
  ok('limpieza del grupo manual');

  // ═══ PARTE B: AUTOMÁTICO CON ROLES COMPLEJOS ═══
  console.log('— Partida automática con cupido, defensor, cuervo, tonto y cazador —');
  const GROUP_A = 'Cmpl ' + Date.now().toString(36).slice(-5);
  await ana.fill('#inp-name', 'Ana');
  await ana.fill('#inp-group', GROUP_A);
  await ana.click('[data-a=create-group]');
  await ana.waitForURL('**/g/**');
  const urlA = ana.url();
  for (const n of ['Bruno', 'Carla', 'David', 'Elsa', 'Fede']) {
    if (!pages[n.toLowerCase()]) await mk(n.toLowerCase());
    const p = pages[n.toLowerCase()];
    await p.goto(urlA);
    await p.fill('#inp-name', n);
    await p.click('[data-a=join]');
    await p.waitForSelector('text=/Dispositivos/');
  }
  await ana.waitForSelector('text=Dispositivos (6)');
  // Ana narrará sin jugar: se desmarca como jugadora.
  await ana.click('.player[data-a=player-menu]:has-text("Ana")');
  await ana.click('button[data-a=toggle-player]');
  await ana.waitForSelector('.player:has-text("Ana"):has-text("no juega")');
  await ana.click('button[data-a=select-game]');
  await ana.waitForSelector('[data-a=open-settings]');
  await ana.click('[data-a=open-settings]');
  await ana.click('.switch[data-a=toggle-setting][data-p=casual]');
  await ana.waitForSelector('.switch.on[data-a=toggle-setting][data-p=casual]');
  await ana.click('button[data-a=close-modal]');

  // Configurar roles: cupido, defensor, cuervo, tonto, cazador (y quitar vidente/bruja por defecto).
  await ana.click('[data-a=open-roles]');
  for (const r of ['vidente', 'bruja']) await ana.click(`.roletoggle.on[data-p=${r}]`);
  for (const r of ['defensor', 'cuervo', 'tonto']) await ana.click(`.roletoggle[data-p=${r}]:not(.on)`); // cupido ya viene activo por defecto
  await ana.waitForSelector('.roletoggle.on[data-p=tonto]');
  await ana.click('button[data-a=close-modal]');
  ok('roles configurados: cazador, cupido, defensor, cuervo, tonto');

  await ana.click('[data-a=open-start]');
  await ana.click('[data-a=start-auto]');
  st = await waitState(ana, (s) => s.phase === 'reveal', 'reparto');
  const kwActive = st.players.some((p) => p.keyword);
  let kwChecked = false;
  for (const p of st.players.filter((x) => x.inGame)) {
    const pg = pages[p.name.toLowerCase()];
    await pg.waitForSelector('[data-a=open-reveal-role]');
    await pg.click('[data-a=open-reveal-role]');
    await pg.waitForSelector('[data-a=confirm-role-seen]');
    if (kwActive && !kwChecked) {
      check(await pg.isVisible('text=/palabra clave/i'), 'la palabra clave aparece junto al rol');
      kwChecked = true;
    }
    await pg.click('[data-a=confirm-role-seen]'); await pace(pg);
  }
  if (kwActive) ok('partida con palabras clave activas (cupido/gaitero en juego)');
  const firstP = st.players.find((x) => x.inGame);
  await pages[firstP.name.toLowerCase()].waitForSelector('button[data-a=begin-first-night]');
  await pages[firstP.name.toLowerCase()].click('button[data-a=begin-first-night]');
  st = await waitState(ana, (s) => s.phase === 'night', 'noche 1');
  console.log('  roles:', st.players.map((p) => `${p.name}=${p.role}`).join(', '));

  // Reconexión a mitad de partida: Bruno recarga.
  await pages.bruno.reload();
  await pages.bruno.waitForSelector('[data-a=toggle-rolecard], .actionpanel', { timeout: 45000 });
  ok('reconexión tras recargar la página en plena partida');

  // Conducir la partida hasta el final (máx. 6 ciclos noche/día).
  let cycles = 0;
  let lastKey = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    st = await hlc(ana);
    if (st.phase === 'end') break;
    if (st.phase === 'night') {
      const key = `n${st.night}:${st.stepIdx}`;
      if (key !== lastKey) {
        lastKey = key;
        const stepId = st.steps[st.stepIdx];
        if (stepId && stepId !== 'amanecer') {
          try { await driveNightStep(st); } catch { /* paso fantasma o rol muerto: lo salta el conductor */ }
        }
      }
      await ana.waitForTimeout(400);
      continue;
    }
    if (st.phase === 'day') {
      if (st.pending.length) {
        const key = `d${st.dayNum}:p:${st.pending[0].type}:${st.pending.length}`;
        if (key !== lastKey) { lastKey = key; try { await drivePending(st); } catch (e) { console.log('  pending err', e.message.slice(0, 80)); } }
        await ana.waitForTimeout(400);
        continue;
      }
      if (st.votesLeft <= 0 && !st.pending.length) {
        // Fin del día: alguien pulsa «Empezar la noche».
        const key = `d${st.dayNum}:tonight`;
        if (key !== lastKey) {
          lastKey = key;
          const alive = st.players.find((p) => p.alive && p.role);
          if (alive) {
            const pg = pages[alive.name.toLowerCase()];
            try { await pg.click('button[data-a=begin-night]', { timeout: 8000 }); } catch { /* quizá ya es de noche */ }
          }
        }
        await ana.waitForTimeout(400);
        continue;
      }
      if (st.votesLeft > 0) {
        const key = `d${st.dayNum}:vote:${st.votesLeft}`;
        if (key !== lastKey) {
          lastKey = key;
          cycles++;
          // El pueblo (primer vivo no tonto) condena a un lobo vivo.
          const wolf = st.players.find((p) => p.alive && ['hombre_lobo', 'lobo_feroz', 'infecto'].includes(p.role));
          const voter = st.players.find((p) => p.alive && p.role !== 'tonto');
          if (wolf && voter) {
            const pg = pages[voter.name.toLowerCase()];
            try {
              await pg.waitForSelector('.actionpanel:has-text("juicio")', { timeout: 8000 });
              await pg.click(`.actionpanel .player.selectable:has-text("${wolf.name}")`);
              await pg.click('button[data-a=vote-confirm]');
              await pg.click('button[data-a=vote-final]');
            } catch (e) { console.log('  voto err', e.message.slice(0, 80)); }
          }
        }
        await ana.waitForTimeout(400);
        continue;
      }
    }
    await ana.waitForTimeout(400);
  }
  st = await hlc(ana);
  check(st.phase === 'end', `la partida termina sola (ciclos de día: ${cycles})`);
  check(['pueblo', 'enamorados', 'lobos'].includes(st.winner), 'ganador coherente: ' + st.winner);
  await pages.bruno.waitForSelector('text=/ha ganado|ganado!/i');
  ok('pantalla de fin visible');

  // Limpieza.
  await ana.click('button[data-a=back-lobby]');
  await ana.waitForSelector('text=/Dispositivos/', { timeout: 45000 }); // la página principal es la mesa
  await ana.click('[data-a=confirm-delete-group]');
  await ana.click('button[data-a=delete-group-confirm]');
  await ana.waitForURL(BASE + '/');
  ok('limpieza final');
} catch (e) {
  failures++;
  console.log('✖ EXCEPCIÓN:', e.message);
  for (const [label, p] of Object.entries(pages)) {
    try { if (!p.isClosed()) await p.screenshot({ path: `fail2-${label}.png` }); } catch { /* cerrada */ }
  }
}

await browser.close();
console.log(failures ? `\n✖ E2E-2 con ${failures} fallos` : '\n✔ E2E-2 completo sin fallos');
process.exit(failures ? 1 : 0);
