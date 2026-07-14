// Punto de entrada: enrutado, eventos y bucle de renderizado.
import { state, onChange, applyRoute, navigate, me, isMaster, setFlash } from './store.js';
import { render, esc, randomGroupName } from './ui.js';
import * as A from './actions.js';
import { conductorTick, conductorReset, initConductor, setMuted, isMuted } from './conductor.js';
import { speak, setVoiceConfig } from './narration.js';
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
    state.ui.encOk = false;
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
  'go-home': () => navigate('/hombres_lobo'),
  'go-lobos': () => navigate('/hombres_lobo'),
  'go-menu': () => navigate('/'),
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
    const url = location.origin + '/hombres_lobo/g/' + state.route.slug;
    try { await navigator.clipboard.writeText(url); } catch {
      const inp = $('share-url'); if (inp) { inp.select(); document.execCommand('copy'); }
    }
    const fb = $('copy-feedback'); if (fb) fb.innerHTML = '<p class="copyok">✔️ Enlace copiado: compártelo por WhatsApp o donde quieras.</p>';
  },

  'leave': () => { state.ui.modal = { type: 'confirm-leave' }; render(); },
  'leave-confirm': () => { closeModal(); return guard(() => A.leaveGroup()); },
  'player-menu': (pid) => { if (state.group.status === 'lobby') { state.ui.modal = { type: 'player-menu', pid }; render(); } },
  'kick': (pid) => { closeModal(); return guard(() => A.kickPlayer(pid)); },
  'confirm-delete-group': () => { state.ui.modal = { type: 'confirm-delete' }; render(); },
  'delete-group-confirm': () => { closeModal(); return guard(() => A.deleteGroup()); },

  'open-roles': () => { state.ui.modal = { type: 'roles' }; render(); },
  'open-settings': () => { state.ui.modal = { type: 'settings' }; render(); },
  'open-start': () => { state.ui.modal = { type: 'start' }; render(); },
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
  'reset-roles': () => guard(() => A.resetRolesConfig()),
  'reset-settings': () => guard(() => A.resetGameSettings()),
  'set-narrator': (pid) => { state.ui.narratorPick = pid; render(); },
  'start-auto': () => {
    const narrator = state.ui.narratorPick || (me() || {}).id;
    // El gesto solo desbloquea el audio en el dispositivo que narra.
    if (narrator === (me() || {}).id) { unlockSpeech(); state.ui.voiceUnlocked = true; }
    return guard(() => A.startGame('auto', narrator));
  },
  'unlock-voice': () => { unlockSpeech(); state.ui.voiceUnlocked = true; render(); },
  'start-manual': () => guard(() => A.startGame('manual')),
  'start-guided': () => guard(() => A.startGame('guiado')),

  'confirm-role-seen': () => guard(() => A.confirmRoleSeen()),
  'confirm-role-refresh': () => guard(async () => { await A.confirmRoleRefresh(); state.ui.refreshOpen = false; }),
  'open-role-refresh': () => { state.ui.refreshOpen = true; render(); },
  'enc-ok': () => { state.ui.encOk = true; render(); },
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
  'act-gitana': (idx) => guard(() => A.actGitana(parseInt(idx, 10))),
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
  'gitana-yes': () => guard(() => A.answerGitana(true)),
  'gitana-no': () => guard(() => A.answerGitana(false)),

  // ——— Máster ———
  'toggle-mute': () => {
    setMuted(!isMuted());
    if (!isMuted()) speak('La voz del narrador está activada.');
    render();
  },
  'voice-open': () => { if (isMaster()) { state.ui.modal = { type: 'voice' }; render(); } },
  'narrator-who': () => {
    state.ui.narratorWho = true;
    clearTimeout(narratorWhoTimer);
    narratorWhoTimer = setTimeout(() => { state.ui.narratorWho = false; render(); }, 8000);
    render();
  },
  'voice-test': () => speak('Bienvenidos a Castronegro. Cae la noche y los lobos aúllan a lo lejos.', { muted: false }),
  'view-roles': () => { if (isMaster()) { state.ui.modal = { type: 'view-roles' }; render(); } },
  'force-advance': () => guard(async () => {
    const g = state.group.game;
    if (g.phase === 'night' && g.steps[g.stepIdx] === 'amanecer') await A.runDawn();
    else await A.forceAdvance();
  }),
  'end-game': () => { if (isMaster()) { state.ui.modal = { type: 'end-game' }; render(); } },
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
