// Punto de entrada: enrutado, eventos y bucle de renderizado.
import { state, onChange, applyRoute, navigate, me, isMaster, setFlash } from './store.js';
import { render, invalidateRender, esc, randomGroupName } from './ui.js';
import * as A from './actions.js';
import { conductorTick, conductorReset, initConductor, setMuted, isMuted } from './conductor.js';
import { speak, stopSpeech, setVoiceConfig, getVoiceConfig } from './narration.js';
import { EXPLANATIONS } from './explain.js';
import { kickAmbience, stopAmbience, ensureAmbience } from './ambience.js';
import { aliveNeighbors, isWolfSide, wolfCountFor } from './roles.js';

function unlockSpeech() {
  try { speak('El pueblo de Castronegro abre sus puertas.'); } catch { /* sin voz */ }
}

// ——— Limpieza de selección al cambiar el contexto de juego ———
let lastCtx = '';
function contextSignature() {
  const g = state.group && state.group.game;
  if (!g) return state.group ? state.group.status : 'none';
  return [g.phase, g.night, g.stepIdx, g.dayNum, g.votesLeft, (g.pending || []).length,
    ((g.pending || [])[0] || {}).type || '', g.roleRefresh ? 'rr' : '', g.refreshNonce || 0, g.paused ? 'p' : ''].join(':');
}

onChange(() => {
  const ctx = contextSignature();
  if (ctx !== lastCtx) {
    lastCtx = ctx;
    state.ui.sel = null;
    state.ui.actorPower = null;
    state.ui.brujaHeal = false;
    state.ui.narratorWho = false; // el «¿quién es?» se oculta al cambiar de paso
    state.ui.refreshOpen = false;
    state.ui.revealOpen = false;
    if (state.group && state.group.status === 'playing') {
      // Los avisos tipo «selecciona primero a un jugador» caducan al cambiar
      // de fase o de paso (fuera de partida se conservan: p. ej. «grupo eliminado»).
      state.flash = null;
      state.ui.formError = null;
    }
    if (state.ui.modal && ['vote-confirm', 'view-roles', 'manual-player'].includes(state.ui.modal.type) === false
      && state.group && state.group.status === 'playing') {
      // los modales de lobby se cierran si empieza/acaba una partida
      if (['roles', 'settings', 'start', 'player-menu'].includes(state.ui.modal.type)) state.ui.modal = null;
    }
  }
  conductorReset();
  conductorTick();
  render();
});

// ——— Utilidades ———
function moveSeat(pid, dir) {
  const g = state.group;
  const saved = Array.isArray(g.seating) ? g.seating : [];
  const ids = state.players.map((p) => p.id);
  const order = saved.filter((id) => ids.includes(id))
    .concat(state.players.filter((p) => !saved.includes(p.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0)).map((p) => p.id));
  const i = order.indexOf(pid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  return guard(() => A.setSeating(order));
}

// ——— Arrastrar para ordenar la mesa (lobby): funciona con dedo y con ratón ———
// El bloque sigue al puntero con un transform; al cruzar la mitad de otra fila
// se intercambian en el DOM y se compensa el salto del reflow para que el
// movimiento se vea continuo. La lista .seatable es de una sola columna.
let dragCtx = null;
let swallowClick = false; // el click fantasma que sigue a un arrastre real
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag]');
  if (!h) return;
  const row = h.closest('.player');
  const list = row && row.closest('.players');
  if (!row || !list) return;
  e.preventDefault();
  state.ui.dragging = true;
  row.classList.add('dragging');
  dragCtx = { row, list, moved: false, startX: e.clientX, startY: e.clientY, baseX: 0, baseY: 0, pid: e.pointerId };
  try { row.setPointerCapture(e.pointerId); } catch { /* sin captura también funciona */ }
});
document.addEventListener('pointermove', (e) => {
  if (!dragCtx || e.pointerId !== dragCtx.pid) return;
  e.preventDefault();
  const { row, list } = dragCtx;
  const move = () => {
    row.style.transform = `translate(${e.clientX - dragCtx.startX + dragCtx.baseX}px, ${e.clientY - dragCtx.startY + dragCtx.baseY}px)`;
  };
  move();
  const rows = [...list.querySelectorAll('.player')].filter((r) => r !== row);
  const next = rows.find((r) => {
    const b = r.getBoundingClientRect();
    return e.clientY < b.top + b.height / 2;
  }) || null;
  const needsMove = next ? row.nextElementSibling !== next : row.nextElementSibling !== null;
  if (needsMove) {
    const b0 = row.getBoundingClientRect();
    if (next) list.insertBefore(row, next); else list.appendChild(row);
    const b1 = row.getBoundingClientRect();
    dragCtx.baseX += b0.left - b1.left;
    dragCtx.baseY += b0.top - b1.top;
    dragCtx.moved = true;
    move();
  }
});
const endDrag = () => {
  if (!dragCtx) return;
  const { row, list, moved } = dragCtx;
  row.classList.remove('dragging');
  row.style.transform = '';
  dragCtx = null;
  state.ui.dragging = false;
  invalidateRender(); // el DOM se movió a mano: forzar el siguiente pintado
  if (moved) {
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 350);
    const order = [...list.querySelectorAll('.player')].map((r) => r.dataset.p).filter(Boolean);
    guard(() => A.setSeating(order));
  } else render();
};
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

let roleHideTimer = null;
let narratorWhoTimer = null;
const $ = (id) => document.getElementById(id);
const val = (id) => ($(id) ? $(id).value.trim() : '');
// El error de formulario vive en el estado para sobrevivir a los re-renderizados.
const formError = (msg) => {
  if (document.getElementById('form-error')) { state.ui.formError = msg; render(); } else setFlash(msg);
};
const sel = () => (state.ui.sel ? state.ui.sel.ids : []);
const sel1 = () => sel()[0] || null;
const closeModal = () => { state.ui.modal = null; render(); };
const needSel = () => { setFlash('Selecciona primero a un jugador de la lista.'); };

// Ejecuta una acción remota con feedback inmediato: bloquea los botones y
// muestra «enviando…» al instante, y un «✔ recibido» al confirmarse.
let okTimer = null;
async function guard(fn) {
  if (state.ui.busy) return; // evita dobles pulsaciones mientras viaja la anterior
  state.ui.busy = true;
  state.ui.formError = null;
  render();
  const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 15000));
  try {
    const work = fn().then(() => 'ok');
    work.catch(() => { /* si gana el timeout, evita un rechazo sin manejar */ });
    const result = await Promise.race([work, timeout]);
    if (result === 'timeout') {
      setFlash('La red va lenta… la acción puede tardar unos segundos en reflejarse.');
    } else {
      state.ui.lastOk = Date.now();
      clearTimeout(okTimer);
      okTimer = setTimeout(() => { state.ui.lastOk = null; render(); }, 1600);
    }
  } catch (e) {
    console.warn(e);
    if (e && e.code === 'group-taken') { state.ui.modal = { type: 'group-exists', group: val('inp-group'), name: val('inp-name') }; }
    else if (e && e.code === 'name-taken') { state.ui.modal = { type: 'takeover', name: val('inp-name') }; }
    else if (e && e.code === 'no-group') formError('El grupo ya no existe.');
    else if (e && e.code === 'playing') { setFlash('La partida acaba de empezar: espera a que termine.'); applyRoute(); }
    else if (e && e.code === 'no-player') formError('No hay ningún jugador con ese nombre en la partida.');
    else if (e && e.message) formError(e.message);
  } finally {
    state.ui.busy = false;
    render();
  }
}

// ——— Despacho de acciones ———
const handlers = {
  'noop': () => {},
  'go-home': () => navigate('/'),
  'select-game': (p) => guard(() => A.selectGame(p)),
  'change-game': () => guard(() => A.selectGame(null)),
  'narrator-device': (p) => { state.ui.modal = null; return guard(() => A.setNarratorDevice(p)); },
  'open-explain': () => { state.ui.modal = { type: 'explain' }; render(); },
  'open-game-roles': () => { state.ui.modal = { type: 'game-roles' }; render(); },
  'explain-speak': () => guard(() => A.requestExplain()),
  'explain-speak-local': () => {
    const ex = EXPLANATIONS[(state.group || {}).currentGame] || EXPLANATIONS.hombres_lobo;
    stopSpeech();
    setTimeout(() => speak(ex.spoken), 250);
  },
  'dismiss-flash': () => { state.flash = null; render(); },
  'retry': () => location.reload(),

  'create-group': () => {
    const name = val('inp-name'); const group = val('inp-group');
    if (!name) return formError('Escribe tu nombre.');
    if (!group) return formError('Escribe el nombre del grupo.');
    return guard(() => A.createGroup(name, group));
  },
  'reroll-group': () => {
    state.ui.suggestedGroup = randomGroupName();
    const inp = $('inp-group');
    if (inp) inp.value = state.ui.suggestedGroup;
  },
  'join-existing': () => {
    const m = state.ui.modal || {};
    closeModal();
    return guard(() => A.joinExistingGroup(m.group, m.name, false));
  },
  'join': () => {
    const name = val('inp-name');
    if (!name) return formError('Escribe tu nombre.');
    return guard(() => A.joinGroup(state.route.slug, name));
  },
  'reconnect': () => {
    const name = val('inp-name');
    if (!name) return formError('Escribe tu nombre exacto.');
    return guard(() => A.takeOverPlayer(state.route.slug, name));
  },
  'takeover-confirm': (name) => { closeModal(); return guard(() => A.takeOverPlayer(state.route.slug, name)); },

  'copy-url': async () => {
    const url = location.origin + '/g/' + state.route.slug;
    try { await navigator.clipboard.writeText(url); } catch {
      const inp = $('share-url'); if (inp) { inp.select(); document.execCommand('copy'); }
    }
    const fb = $('copy-feedback'); if (fb) fb.innerHTML = '<p class="copyok">✔️ Enlace copiado: compártelo por WhatsApp o donde quieras.</p>';
  },

  'leave': () => { state.ui.modal = { type: 'confirm-leave' }; render(); },
  'leave-confirm': () => { closeModal(); return guard(() => A.leaveGroup()); },
  'player-menu': (pid) => { if (state.group.status === 'lobby') { state.ui.modal = { type: 'player-menu', pid }; render(); } },
  'kick': (pid) => { closeModal(); return guard(() => A.kickPlayer(pid)); },
  'toggle-player': (pid) => {
    const p = state.players.find((x) => x.id === pid);
    closeModal();
    return guard(() => A.setPlayerActive(pid, p ? p.isPlayer === false : true));
  },
  'confirm-delete-group': () => { state.ui.modal = { type: 'confirm-delete' }; render(); },
  'delete-group-confirm': () => { closeModal(); return guard(() => A.deleteGroup()); },

  'open-roles': () => { state.ui.modal = { type: 'roles' }; render(); },
  'open-settings': () => { state.ui.modal = { type: 'settings' }; render(); },
  'open-start': () => { state.ui.seatingOk = false; state.ui.modal = { type: 'start' }; render(); },
  'seating-ok': () => { state.ui.seatingOk = true; render(); },
  'seating-edit': () => { state.ui.seatingOk = false; render(); },
  'seat-up': (pid) => moveSeat(pid, -1),
  'seat-down': (pid) => moveSeat(pid, +1),
  'close-modal': closeModal,
  'toggle-role': (roleId) => {
    const cur = state.group.extraRoles || [];
    const next = cur.includes(roleId) ? cur.filter((r) => r !== roleId) : cur.concat([roleId]);
    return guard(() => A.setExtraRoles(next));
  },
  'toggle-setting': (key) => guard(() => A.setSettings({ [key]: !(state.group.settings || {})[key] })),
  'wolves-auto': () => guard(() => A.setSettings({ wolvesCount: null })),
  'wolves-manual': () => guard(() => A.setSettings({ wolvesCount: wolfCountFor(Math.max(1, state.players.length - 1)) })),
  'wolves-inc': () => {
    const cur = (state.group.settings || {}).wolvesCount || 1;
    return guard(() => A.setSettings({ wolvesCount: Math.min(4, cur + 1) }));
  },
  'wolves-dec': () => {
    const cur = (state.group.settings || {}).wolvesCount || 1;
    return guard(() => A.setSettings({ wolvesCount: Math.max(1, cur - 1) }));
  },
  'villagers-auto': () => guard(() => A.setSettings({ villagersCount: null })),
  'villagers-manual': () => {
    // Punto de partida: los huecos que quedarían ahora mismo con el relleno auto.
    const nJug = Math.max(1, state.players.filter((p) => p.isPlayer !== false).length);
    const lobos = (state.group.settings || {}).wolvesCount || wolfCountFor(nJug);
    const extras = (state.group.extraRoles || []).length;
    return guard(() => A.setSettings({ villagersCount: Math.max(0, nJug - lobos - extras) }));
  },
  'villagers-inc': () => {
    const cur = (state.group.settings || {}).villagersCount || 0;
    return guard(() => A.setSettings({ villagersCount: Math.min(17, cur + 1) }));
  },
  'villagers-dec': () => {
    const cur = (state.group.settings || {}).villagersCount || 0;
    return guard(() => A.setSettings({ villagersCount: Math.max(0, cur - 1) }));
  },
  'reset-roles': () => guard(() => A.resetRolesConfig()),
  'reset-settings': () => guard(() => A.resetGameSettings()),
  'set-narrator': (pid) => { state.ui.narratorPick = pid; render(); },
  'start-auto': () => {
    const narrator = state.ui.narratorPick || (me() || {}).id;
    // El gesto solo desbloquea el audio en el dispositivo que narra.
    if (narrator === (me() || {}).id) { unlockSpeech(); kickAmbience(); state.ui.voiceUnlocked = true; }
    return guard(() => A.startGame('auto', narrator));
  },
  'unlock-voice': () => { unlockSpeech(); kickAmbience(); state.ui.voiceUnlocked = true; render(); },
  'start-manual': () => guard(() => A.startGame('manual')),
  'start-guided': () => guard(() => A.startGame('guiado')),

  'open-reveal-role': () => { state.ui.revealOpen = true; render(); },
  'confirm-role-seen': () => guard(async () => { await A.confirmRoleSeen(); state.ui.revealOpen = false; }),
  'confirm-role-refresh': () => guard(async () => { await A.confirmRoleRefresh(); state.ui.refreshOpen = false; }),
  'open-role-refresh': () => { state.ui.refreshOpen = true; render(); },
  'toggle-rolecard': () => {
    state.ui.roleOpen = !state.ui.roleOpen;
    clearTimeout(roleHideTimer);
    // La carta se oculta sola: que no se quede abierta a la vista de nadie.
    if (state.ui.roleOpen) {
      roleHideTimer = setTimeout(() => { state.ui.roleOpen = false; render(); }, 12000);
    }
    render();
  },
  // Un jugador muerto puede descubrir roles tocando a los jugadores (solo lo ve él).
  'dead-peek': (pid) => {
    const my = me();
    if (!my || my.alive !== false) return;
    state.ui.deadPeek = state.ui.deadPeek || {};
    state.ui.deadPeek[pid] = !state.ui.deadPeek[pid];
    render();
  },

  // Selección genérica en listas
  'sel': (pid, el) => {
    const key = el.dataset.selkey; const max = parseInt(el.dataset.max || '1', 10);
    let cur = state.ui.sel && state.ui.sel.key === key ? state.ui.sel.ids.slice() : [];
    if (cur.includes(pid)) cur = cur.filter((x) => x !== pid);
    else { cur.push(pid); while (cur.length > max) cur.shift(); }
    state.ui.sel = { key, ids: cur };
    render();
  },

  // ——— Acciones nocturnas ———
  'act-ladron-keep': () => guard(() => A.actLadron(null)),
  'act-ladron-take': (idx) => guard(() => A.actLadron(parseInt(idx, 10))),
  'act-cupido': () => (sel().length === 2 ? guard(() => A.actCupido(sel()[0], sel()[1])) : needSel()),
  'act-lover-ok': () => guard(() => A.confirmLover()),
  'act-nino': () => (sel1() ? guard(() => A.actNinoSalvaje(sel1())) : needSel()),
  'act-perro': (side) => guard(() => A.actPerroLobo(side === 'lobo')),
  'act-hermana-ok': () => guard(() => A.confirmHermana()),
  'act-hermano-ok': () => guard(() => A.confirmHermano()),
  'act-actor-power': (p) => { state.ui.actorPower = p || null; state.ui.sel = null; render(); },
  'act-actor-skip': () => guard(() => A.actActor(null, null)),
  'act-actor-confirm': () => {
    if (!sel1()) return needSel();
    const p = state.ui.actorPower;
    return guard(async () => { await A.actActor(p, sel1()); state.ui.actorPower = null; });
  },
  'act-defensor': () => (sel1() ? guard(() => A.actDefensor(sel1())) : needSel()),
  'act-defensor-skip': () => guard(() => A.actDefensor(null)),
  'act-vidente': () => (sel1() ? guard(() => A.actVidente(sel1())) : needSel()),
  'act-vidente-skip': () => guard(() => A.actVidente(null)),
  'act-vidente-seen': () => guard(() => A.actVidenteSeen()),
  'act-zorro-seen': () => guard(() => A.actZorroSeen()),
  'act-actor-seen': () => guard(() => A.actActorSeen()),
  'act-zorro': () => {
    const t = sel1(); if (!t) return needSel();
    const players = state.players.filter((p) => p.inGame);
    const trio = [players.find((p) => p.id === t), ...aliveNeighbors(players, t)].filter(Boolean);
    const found = trio.some((p) => isWolfSide(p));
    return guard(() => A.actZorro(t, found));
  },
  'act-zorro-skip': () => guard(() => A.actZorro(null, false)),
  'act-cuervo': () => (sel1() ? guard(() => A.actCuervo(sel1())) : needSel()),
  'act-cuervo-skip': () => guard(() => A.actCuervo(null)),
  'act-lobos-reconocido': () => guard(() => A.confirmLoboReconocido()),
  'act-lobos': () => (sel1() ? guard(() => A.actLobos(sel1())) : needSel()),
  'act-lobos-nadie': () => guard(() => A.actLobos(null)),
  'act-infecto': (v) => guard(() => A.actInfecto(v === 'si')),
  'act-feroz': () => (sel1() ? guard(() => A.actFeroz(sel1())) : needSel()),
  'act-feroz-skip': () => guard(() => A.actFeroz(null)),
  'act-albino': () => (sel1() ? guard(() => A.actAlbino(sel1())) : needSel()),
  'act-albino-skip': () => guard(() => A.actAlbino(null)),
  'act-bruja-heal-toggle': () => { state.ui.brujaHeal = !state.ui.brujaHeal; render(); },
  'act-bruja-done': () => {
    const heal = state.ui.brujaHeal ? (state.group.game.acts.wolfVictim || null) : null;
    return guard(async () => { await A.actBruja(heal, sel1()); state.ui.brujaHeal = false; });
  },
  'act-gaitero': () => {
    const players = state.players.filter((p) => p.inGame);
    const my = me();
    const targets = players.filter((p) => p.alive && !p.charmed && p.id !== my.id);
    const maxSel = Math.min(2, targets.length);
    if (sel().length !== maxSel) return needSel();
    return guard(() => A.actGaitero(sel()));
  },
  'act-encantado-ok': () => guard(() => A.confirmEncantado()),
  'act-gitana': (idx) => guard(() => A.actGitana(parseInt(idx, 10))),
  'act-gitana-custom': () => {
    const q = val('gitana-q');
    if (!q) return formError ? setFlash('Escribe primero tu pregunta.') : null;
    return guard(() => A.actGitanaCustom(q));
  },
  'act-gitana-skip': () => guard(() => A.actGitana(null)),

  // ——— Día ———
  'vote-confirm': () => (sel1() ? (state.ui.modal = { type: 'vote-confirm', pid: sel1() }, render()) : needSel()),
  'vote-final': (pid) => { closeModal(); return guard(() => A.castVote(pid)); },
  'vote-nadie': () => guard(() => A.castVote('nadie')),
  'vote-empate': () => guard(() => A.castVote('empate')),
  'juez-arm': () => guard(async () => { await A.armJuez(); setFlash('⚖️ Hecho: tras el juicio de hoy habrá una segunda votación.'); }),
  'sirvienta-yes': () => guard(() => A.resolveSirvienta(true)),
  'sirvienta-no': () => guard(() => A.resolveSirvienta(false)),
  'cazador-shoot': () => (sel1() ? guard(() => A.hunterShoot(sel1())) : needSel()),
  'cazador-skip': () => guard(() => A.hunterShoot(null)),
  'alguacil-pick': () => (sel1() ? guard(() => A.pickAlguacil(sel1())) : needSel()),
  'cabeza-pick': () => (sel1() ? guard(() => A.cabezaPick(sel1())) : needSel()),
  'cabeza-skip': () => guard(() => A.cabezaPick(null)),

  // ——— Máster ———
  'toggle-mute': () => {
    setMuted(!isMuted());
    if (!isMuted()) speak('La voz del narrador está activada.');
    render();
  },
  'voice-open': () => { state.ui.modal = { type: 'voice' }; render(); },
  'narrator-who': () => {
    state.ui.narratorWho = true;
    clearTimeout(narratorWhoTimer);
    narratorWhoTimer = setTimeout(() => { state.ui.narratorWho = false; render(); }, 8000);
    render();
  },
  'voice-test': () => speak('Bienvenidos a Castronegro. Cae la noche y los lobos aúllan a lo lejos.', { muted: false }),
  'voice-engine': (engine) => { setVoiceConfig({ engine }); render(); },
  'toggle-ambience': () => {
    const on = !getVoiceConfig().ambience;
    setVoiceConfig({ ambience: on });
    if (!on) stopAmbience(); else kickAmbience();
    render();
  },
  'view-roles': () => { if (isMaster()) { state.ui.modal = { type: 'view-roles' }; render(); } },
  'repeat-last': () => guard(() => A.requestRepeat()),
  'end-game': () => {
    const my = me();
    if (isMaster() || (my && my.inGame)) { state.ui.modal = { type: 'end-game' }; render(); }
  },
  'end-game-confirm': (winner) => { closeModal(); return guard(() => A.endGameNow(winner || null)); },
  'back-lobby': () => guard(() => A.backToLobby()),

  // ——— Modo manual ———
  'manual-player': (pid) => { if (isMaster()) { state.ui.modal = { type: 'manual-player', pid }; render(); } },
  'manual-toggle-dead': (pid) => { closeModal(); return guard(() => A.manualToggleDead(pid)); },
  'manual-toggle-lover': (pid) => { closeModal(); return guard(() => A.manualToggleLover(pid)); },
  'show-role-full': (pid) => { if (isMaster()) { state.ui.modal = { type: 'show-role', pid }; render(); } },
  'open-thief-swap': (pid) => { if (isMaster()) { state.ui.modal = { type: 'thief-swap', pid }; render(); } },
  'thief-swap-pick': (param) => {
    const [pid, idx] = String(param).split(':');
    closeModal();
    return guard(() => A.manualSwapRole(pid, parseInt(idx, 10)));
  },
  'guided-first-night': () => guard(() => A.startFirstNight()),
  'guided-dawn': () => guard(() => A.runDawn()),
  'guided-next-night': () => guard(() => A.startNextNight()),
  'begin-night': () => guard(() => A.startNextNight()),
  'begin-first-night': () => guard(() => A.startFirstNight()),
  'pause-game': () => guard(() => A.pauseGame()),
  'resume-game': () => guard(() => A.resumeGame()),
  'guided-skip': () => guard(() => A.forceAdvance()),
};

document.addEventListener('click', (ev) => {
  if (swallowClick) { swallowClick = false; return; } // resto de un arrastre
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const fn = handlers[el.dataset.a];
  if (fn) fn(el.dataset.p, el);
});

// Controles de voz del narrador (selector y deslizadores del modal de voz).
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-vs]');
  if (!el) return;
  const kind = el.dataset.vs;
  if (kind === 'voice') setVoiceConfig({ voiceURI: el.value });
  if (kind === 'cloudvoice') setVoiceConfig({ cloudVoice: el.value });
  if (kind === 'rate') setVoiceConfig({ rate: parseFloat(el.value) });
  if (kind === 'pitch') setVoiceConfig({ pitch: parseFloat(el.value) });
});

// Enter en un input pulsa el botón principal de su tarjeta.
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || !(ev.target instanceof HTMLInputElement)) return;
  const card = ev.target.closest('.card, .modal');
  const primary = card && card.querySelector('button.primary');
  if (primary) primary.click();
});

// Cuenta atrás de la sirvienta (actualiza sin re-render completo).
setInterval(() => {
  document.querySelectorAll('.countdown[data-deadline]').forEach((el) => {
    const left = Math.max(0, Math.ceil((parseInt(el.dataset.deadline, 10) - Date.now()) / 1000));
    el.textContent = `(${left}s)`;
  });
}, 500);

window.addEventListener('popstate', applyRoute);

initConductor();
applyRoute();

// Referencia de solo lectura para depuración.
window.__hlc = state;
