// Renderizado de la interfaz. Genera HTML según el estado y delega eventos via data-a.
import { state, me, isMaster } from './store.js';
import { ROLES, TEAMS, EXPANSIONS, wolfCountFor, isWolfSide, isWolfTeamRole, OFFICIAL_MIN_PLAYERS } from './roles.js';
import { NIGHT_STEPS, stepActors, GITANA_QUESTIONS, WINNER_LABELS } from './engine.js';
import { NARRATION, narr, listSpanishVoices, getVoiceConfig } from './narration.js';
import { isMuted } from './conductor.js';

// Generador de nombres de grupo con sabor a Castronegro.
const NAME_GROUPS = ['Los Lobos', 'La Manada', 'El Aquelarre', 'Los Aullidos', 'La Camada', 'Los Colmillos', 'Las Garras', 'Los Susurros', 'La Niebla', 'Las Sombras'];
const NAME_PLACES = ['Medianoche', 'Luna Llena', 'Castronegro', 'la Niebla', 'el Páramo', 'la Colina', 'el Bosque Viejo', 'la Taberna', 'el Molino', 'Otoño'];
export function randomGroupName() {
  const g = NAME_GROUPS[Math.floor(Math.random() * NAME_GROUPS.length)];
  const p = NAME_PLACES[Math.floor(Math.random() * NAME_PLACES.length)];
  return `${g} de ${p}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const btn = (action, label, cls = '', param = '') =>
  `<button class="${cls}" data-a="${action}" data-p="${esc(param)}">${label}</button>`;

let lastHtml = '';
let lastModalType = null;
let lastScreenKey = '';

export function render() {
  const app = document.getElementById('app');

  let html = '';
  if (state.route.view === 'landing') html = landingScreen();
  else html = groupScreen();
  if (state.ui.modal) html += renderModal();
  document.body.classList.toggle('busy', !!state.ui.busy);
  renderToast();

  const modalType = state.ui.modal ? state.ui.modal.type : null;
  const screenKey = `${state.route.view}:${state.group?.status || ''}:${state.group?.game?.phase || ''}:${modalType || ''}`;

  // Render diferencial: si nada cambió visualmente, no se toca el DOM
  // (evita parpadeos y saltos de scroll con cada snapshot).
  if (html === lastHtml) return;
  lastHtml = html;

  const focusEl = document.activeElement;
  const focusId = focusEl && focusEl.id;
  const selStart = focusEl && focusEl.selectionStart;
  // Los valores escritos deben sobrevivir a cualquier re-renderizado
  // (los snapshots de Firestore redibujan la pantalla en cualquier momento).
  const savedInputs = {};
  app.querySelectorAll('input[type=text]:not([readonly])').forEach((i) => {
    if (i.id) savedInputs[i.id] = i.value;
  });
  const prevModal = document.querySelector('.modal');
  const modalScroll = prevModal ? prevModal.scrollTop : null;
  const winScroll = window.scrollY;
  const sameScreen = screenKey === lastScreenKey;
  lastScreenKey = screenKey;

  app.innerHTML = html;

  // Conservar la posición de lectura al redibujar la misma pantalla/modal.
  if (sameScreen) {
    window.scrollTo(0, winScroll);
    const m = document.querySelector('.modal');
    if (m && modalType && modalType === lastModalType) {
      m.style.animation = 'none'; // sin animación de entrada en re-renders
      if (modalScroll != null) m.scrollTop = modalScroll;
    }
  }
  lastModalType = modalType;

  for (const [id, v] of Object.entries(savedInputs)) {
    const el = document.getElementById(id);
    if (el) el.value = v; // lo escrito manda sobre el valor de plantilla
  }
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch { /* no-op */ }
    }
  }
  const log = document.getElementById('gamelog');
  if (log) log.scrollTop = log.scrollHeight;
}

// El toast vive en su propia capa: aparecer o desaparecer no redibuja la app.
function renderToast() {
  let layer = document.getElementById('toast-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'toast-layer';
    document.body.appendChild(layer);
  }
  const html = state.ui.busy ? '<div class="toast">📡 Enviando…</div>'
    : state.ui.lastOk ? '<div class="toast ok">✔️ Recibido</div>' : '';
  if (layer.innerHTML !== html) layer.innerHTML = html;
}

const flashHtml = () => state.flash
  ? `<div class="flash">${esc(state.flash)} <button class="small ghost" style="float:right" data-a="dismiss-flash">✕</button></div>` : '';

// ——— Pantallas de entrada ———

function landingScreen() {
  if (!state.ui.suggestedGroup) state.ui.suggestedGroup = randomGroupName();
  return `
  <span class="moon">🌕🐺</span>
  <h1 class="title-hero">Los Hombres Lobo de Castronegro</h1>
  <p class="subtitle">Crea una partida y comparte el enlace con tu grupo</p>
  ${flashHtml()}
  <div class="card">
    <h3>🆕 Nueva partida</h3>
    <label for="inp-name">Tu nombre</label>
    <input type="text" id="inp-name" maxlength="24" placeholder="P. ej. María" autocomplete="off">
    <label for="inp-group">Nombre del grupo</label>
    <div style="display:flex;gap:8px">
      <input type="text" id="inp-group" maxlength="30" value="${esc(state.ui.suggestedGroup)}" autocomplete="off" style="flex:1">
      <button class="small ghost" data-a="reroll-group" title="Otro nombre al azar" style="font-size:1.2rem">🎲</button>
    </div>
    <div id="form-error">${state.ui.formError ? `<div class="flash error">${esc(state.ui.formError)}</div>` : ''}</div>
    ${btn('create-group', '🌑 Crear grupo', 'primary block')}
    <p class="small-note">Quien crea el grupo será el <b>máster</b> (narrador) de la partida. ¿Te han invitado? Abre directamente el enlace que te hayan pasado.</p>
  </div>`;
}

function groupScreen() {
  const g = state.group;
  if (state.groupMissing) {
    return `<span class="moon">🌑</span>
      <h1 class="title-hero">Este grupo no existe</h1>
      <p class="subtitle">Puede que el máster lo haya eliminado.</p>
      ${flashHtml()}
      <div class="card">${btn('go-home', '🏡 Crear una partida nueva', 'primary block')}</div>`;
  }
  if (!g) return '<p style="text-align:center;margin-top:40vh;color:#9b98b0">Buscando el grupo…</p>';

  const my = me();
  if (!my) {
    if (g.status === 'playing') return blockedScreen(g);
    return joinScreen(g);
  }
  if (g.status === 'lobby') return lobbyScreen(g, my);
  if (!g.game) return '<p style="text-align:center;margin-top:40vh">Preparando la partida…</p>';
  return g.game.mode === 'manual' ? manualScreen(g, my) : autoScreen(g, my);
}

function joinScreen(g) {
  const hadSession = !!state.session;
  return `
  <span class="moon">🌕</span>
  <h1 class="title-hero">${esc(g.name)}</h1>
  <p class="subtitle">Te han invitado a una partida de Los Hombres Lobo de Castronegro</p>
  ${flashHtml()}
  ${hadSession ? '<div class="flash">Tu sesión ya no es válida en este dispositivo (quizá te conectaste desde otro o te expulsaron).</div>' : ''}
  <div class="card">
    <h3>🚪 Únete al grupo</h3>
    <label for="inp-name">Tu nombre</label>
    <input type="text" id="inp-name" maxlength="24" placeholder="¿Cómo te llamas?" autocomplete="off">
    <div id="form-error">${state.ui.formError ? `<div class="flash error">${esc(state.ui.formError)}</div>` : ''}</div>
    ${btn('join', '🐺 Unirme', 'primary block')}
    <p class="small-note">Jugadores en el grupo: ${state.players.map((p) => esc(p.name)).join(', ') || 'ninguno todavía'}</p>
  </div>`;
}

function blockedScreen(g) {
  return `
  <span class="moon">🌙</span>
  <h1 class="title-hero">${esc(g.name)}</h1>
  ${flashHtml()}
  <div class="card">
    <h3>⏳ Hay una partida en curso</h3>
    <p style="color:var(--muted)">No se puede entrar hasta que termine. Vuelve a intentarlo en un rato.</p>
    ${btn('retry', '🔄 Reintentar', 'primary block')}
    <hr class="sep">
    <p class="small-note">¿Ya estabas jugando y has perdido la sesión? Escribe tu nombre exacto para reconectarte:</p>
    <input type="text" id="inp-name" maxlength="24" placeholder="Tu nombre en la partida" autocomplete="off">
    <div id="form-error">${state.ui.formError ? `<div class="flash error">${esc(state.ui.formError)}</div>` : ''}</div>
    ${btn('reconnect', '🔌 Reconectar', 'violet block')}
  </div>`;
}

// ——— Lobby ———

function lobbyScreen(g, my) {
  const master = isMaster();
  const extra = g.extraRoles || [];
  const n = state.players.length;
  const nJug = Math.max(0, n - 1); // el máster narra y no juega
  const wolvesFixed = (g.settings || {}).wolvesCount || null;
  const lobos = Math.max(1, Math.min(Math.max(nJug - 1, 1), wolvesFixed || wolfCountFor(nJug || 1)));
  return `
  <div class="topbar">
    <h2>🌕 ${esc(g.name)}</h2>
    ${btn('leave', '🚪 Salir', 'small ghost')}
  </div>
  <div class="card">
    <h3>🔗 Invita a tu grupo</h3>
    <div class="linkbox">
      <input type="text" id="share-url" value="${esc(location.origin + '/g/' + g.id)}" readonly>
      ${btn('copy-url', '📋 Copiar', 'small primary')}
    </div>
    <div id="copy-feedback"></div>
  </div>
  ${flashHtml()}
  <div class="card">
    <h3>👥 Jugadores (${n})</h3>
    <div class="players">
      ${state.players.map((p) => `
        <div class="player ${master && p.id !== my.id ? 'selectable' : ''}" ${master && p.id !== my.id ? `data-a="player-menu" data-p="${p.id}"` : ''}>
          <span class="pname">${esc(p.name)}</span>
          ${p.id === g.masterId ? '<span class="badge">⭐ Máster</span>' : ''}
          ${p.id === my.id ? '<span class="badge you">Tú</span>' : ''}
        </div>`).join('')}
    </div>
    ${master && n > 1 ? '<p class="small-note">Toca un jugador para expulsarlo o cederle el rol de máster.</p>' : ''}
  </div>
  <div class="card">
    <h3>🎴 Roles de la partida</h3>
    <p class="small-note">Con ${nJug} jugador${nJug === 1 ? '' : 'es'} (el máster narra y no juega): <b>${lobos} 🐺 lobo${lobos > 1 ? 's' : ''}</b>${wolvesFixed ? ' (fijado por el máster)' : ''} y el resto según los roles activados (los huecos se rellenan con 🧑‍🌾 aldeanos).</p>
    ${nJug < OFFICIAL_MIN_PLAYERS && !(g.settings || {}).casual ? `<p class="small-note">⚠️ Las reglas oficiales piden de ${OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador. Para jugar con menos, el máster puede activar el <b>modo casual</b> en los ajustes.</p>` : ''}
    <div class="btnrow" style="margin-top:6px">
      ${(extra.length ? extra.map((r) => ROLES[r] ? `<span class="chip">${ROLES[r].emoji} ${ROLES[r].name}</span>` : '').join('') : '<span class="chip">Solo lobos y aldeanos</span>')}${(g.settings || {}).alguacil ? '<span class="chip">⭐ Alguacil</span>' : ''}
    </div>
    ${master ? btn('open-roles', '⚙️ Elegir roles', 'block') : ''}
  </div>
  ${master ? `
  <div class="card">
    <h3>🛠️ Opciones del máster</h3>
    ${btn('open-settings', '🔧 Ajustes de partida', 'block')}
    ${btn('open-start', '🎬 Empezar partida', 'primary block')}
    ${btn('confirm-delete-group', '🗑️ Eliminar el grupo', 'danger block')}
  </div>` : `
  <div class="card">
    <p style="color:var(--muted)">Esperando a que <b>${esc(state.players.find((p) => p.id === g.masterId)?.name || 'el máster')}</b> empiece la partida…</p>
  </div>`}`;
}

// ——— Partida: modo automático ———

function autoScreen(g, my) {
  const game = g.game;
  const alive = my.alive;
  let body = '';
  if (game.phase === 'reveal') body = revealPhase(g, my);
  else if (game.phase === 'night') body = nightPhase(g, my);
  else if (game.phase === 'day') body = dayPhase(g, my);
  else if (game.phase === 'end') body = endPhase(g, my);

  return `
  <div class="topbar">
    <h2>${esc(g.name)}</h2>
    ${phaseChip(game)}
  </div>
  ${!alive && game.phase !== 'end' && my.inGame ? '<div class="flash">💀 Has muerto. Sigue mirando en silencio… y no desveles nada.</div>' : ''}
  ${flashHtml()}
  ${!my.inGame && game.phase !== 'end' ? narratorPanel(g) : ''}
  ${body}
  ${logPanel(game)}
  ${masterToolsBar(g)}
  `;
}

// Panel para el máster en modo automático: su dispositivo narra, él no juega.
// Ojo: esta pantalla suele estar a la vista de la mesa — de noche se muestra el
// ROL al que se espera, no el nombre (el nombre solo bajo demanda, «¿quién es?»).
const STEP_LABELS = {
  ladron: 'el Ladrón', cupido: 'Cupido', enamorados: 'los Enamorados',
  nino_salvaje: 'el Niño Salvaje', perro_lobo: 'el Perro Lobo',
  dos_hermanas: 'las Dos Hermanas', tres_hermanos: 'los Tres Hermanos',
  actor: 'el Actor', defensor: 'el Defensor', vidente: 'la Vidente',
  zorro: 'el Zorro', cuervo: 'el Cuervo', lobos_reconocen: 'la manada (reconocimiento)',
  lobos: 'los Hombres Lobo', infecto_decision: 'el Infecto Padre',
  lobo_feroz: 'el Gran Lobo Feroz', lobo_albino: 'el Lobo Albino',
  bruja: 'la Bruja', gaitero: 'el Gaitero', gitana: 'la Gitana', encantados: 'los Encantados',
};

function narratorPanel(g) {
  const game = g.game;
  const players = state.players.filter((p) => p.inGame);
  let info = '';
  if (game.phase === 'reveal') {
    const pend = players.filter((p) => !p.roleSeen).map((p) => esc(p.name));
    info = pend.length ? `⏳ Falta que confirmen su rol: ${pend.join(', ')}` : '✅ Todos han visto su rol.';
  } else if (game.phase === 'night' && game.roleRefresh) {
    const pend = players.filter((p) => p.alive && !(game.roleRefresh.confirmed || {})[p.id]).map((p) => esc(p.name));
    info = `👁️ Repaso de roles en curso. Faltan: ${pend.join(', ') || 'nadie'}`;
  } else if (game.phase === 'night') {
    const stepId = game.steps[game.stepIdx];
    const actors = stepId ? stepActors(stepId, game, players) : null;
    if (stepId === 'amanecer') info = '🌅 Resolviendo el amanecer…';
    else if (actors && actors.length) {
      const label = STEP_LABELS[stepId] || stepId;
      if (state.ui.narratorWho) {
        const names = actors.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean);
        info = `⏳ Esperando a <b>${esc(label)}</b>: ${names.map(esc).join(', ')} <small>(se ocultará en unos segundos)</small>`;
      } else {
        info = `⏳ Esperando a <b>${esc(label)}</b> ${btn('narrator-who', '¿quién es?', 'small ghost')}`;
      }
    } else {
      info = '🌫️ Paso sin acción (avanzará solo)…';
    }
  } else if (game.phase === 'day') {
    const head = (game.pending || [])[0];
    const pendTxt = {
      cazador: 'el disparo del Cazador', sirvienta: 'la decisión de la Sirvienta',
      alguacil_elect: 'la elección del Alguacil', alguacil_pick: 'el sucesor del Alguacil',
      cabeza_pick: 'la decisión del Cabeza de Turco',
    };
    info = head ? `⏳ Pendiente: ${pendTxt[head.type] || head.type}`
      : game.votesLeft > 0 ? '🗳️ Votación del pueblo abierta.'
        : '🌆 El día termina, la noche llegará enseguida…';
  }
  return `<div class="card"><h3>🎙️ Eres el narrador</h3>
    <p class="small-note">Tu dispositivo dirige la partida con su voz: mantén la pantalla encendida y el volumen alto. No juegas con rol, pero puedes consultar los roles de la mesa y forzar pasos desde la barra inferior.</p>
    ${info ? `<p style="margin-top:6px">${info}</p>` : ''}</div>`;
}

function phaseChip(game) {
  if (game.phase === 'reveal') return '<span class="chip">🎴 Reparto</span>';
  if (game.phase === 'night') return `<span class="chip">🌙 Noche ${game.night}</span>`;
  if (game.phase === 'day') return `<span class="chip">☀️ Día ${game.dayNum}</span>`;
  if (game.phase === 'manual') return `<span class="chip">${game.manualPhase === 'noche' ? '🌙 Noche' : '☀️ Día'} ${game.manualCount}</span>`;
  return '<span class="chip">🏁 Fin</span>';
}

function revealPhase(g, my) {
  const pend = state.players.filter((p) => p.inGame && !p.roleSeen);
  return `
  <div class="narration">📜 ${esc(narr('bienvenida', String(g.game.seed)))}</div>
  ${roleCard(my, g)}
  ${!my.roleSeen && my.inGame ? btn('confirm-role-seen', '✅ He visto mi rol', 'primary block') : `
    <div class="waitlist">Esperando a que confirmen: ${pend.map((p) => esc(p.name)).join(', ') || 'nadie, ¡empezamos!'}</div>`}
  `;
}

// Tarjeta del rol propio con información privada extra.
function roleCard(my, g, mini = false) {
  if (!my.inGame || !my.role) return '';
  const r = ROLES[my.role];
  if (!r) return '';
  const game = g.game || {};
  // Oculto por defecto: que nadie vea tu rol (ni tu palabra clave) de reojo.
  if (mini && !state.ui.roleOpen) {
    return `<div style="text-align:center;margin:10px 0">${btn('toggle-rolecard', '👁 Mostrar mi rol', 'small ghost')}</div>`;
  }
  const extras = [];
  if (my.keyword) {
    extras.push(`🔑 Tu palabra clave: <b>${esc(my.keyword)}</b>. Si el narrador la pronuncia, el mensaje va por ti: abre los ojos con disimulo y mira tu pantalla.`);
  }
  if ((my.videnteLog || []).length) {
    const nameOf = (pid) => state.players.find((p) => p.id === pid)?.name || '¿?';
    extras.push(`🔮 Tus visiones: ${my.videnteLog.map((e) =>
      e.role !== undefined
        ? `noche ${e.night}: <b>${esc(nameOf(e.pid))}</b> es ${ROLES[e.role]?.emoji || ''} ${ROLES[e.role]?.name || '¿?'}`
        : `noche ${e.night}: <b>${esc(nameOf(e.pid))}</b> ${e.wolf ? 'ES LOBO 🐺' : 'no es lobo 🏡'}`).join(' · ')}`);
  }
  // En modo automático, los grupos se reconocen físicamente por la noche antes
  // de que la app muestre sus nombres (como en el juego real con narrador).
  const wolvesKnown = game.mode === 'manual' || game.wolvesKnown;
  const packmates = state.players.filter((p) => p.inGame && p.id !== my.id && isWolfSide(p));
  if (isWolfSide(my)) {
    if (wolvesKnown) extras.push(`🐺 Tu manada: ${packmates.length ? packmates.map((p) => esc(p.name)).join(', ') : 'cazas en solitario'}`);
    else extras.push('🐺 Esta noche abriréis los ojos para reconoceros como manada. Hasta entonces, nadie conoce a nadie.');
  }
  if (my.infected) extras.push('🧛 Has sido infectado: ahora eres un hombre lobo en secreto (conservas tu carta).');
  if (my.transformed) extras.push('🐾 Tu modelo ha muerto: te has transformado en hombre lobo.');
  if (my.role === 'dos_hermanas') {
    const sis = state.players.filter((p) => p.role === 'dos_hermanas' && p.id !== my.id);
    if ((game.mode === 'manual' || game.hermanasKnown) && sis.length) extras.push(`👭 Tu hermana: ${sis.map((p) => esc(p.name)).join(', ')}`);
    else extras.push('👭 Esta noche abriréis los ojos para reconoceros.');
  }
  if (my.role === 'tres_hermanos') {
    const bro = state.players.filter((p) => p.role === 'tres_hermanos' && p.id !== my.id);
    if ((game.mode === 'manual' || game.hermanosKnown) && bro.length) extras.push(`👨‍👨‍👦 Tus hermanos: ${bro.map((p) => esc(p.name)).join(', ')}`);
    else extras.push('👨‍👨‍👦 Esta noche abriréis los ojos para reconoceros.');
  }
  if (my.role === 'sectario') {
    const mine = state.players.filter((p) => p.inGame && p.sect === my.sect && p.id !== my.id).map((p) => esc(p.name));
    const others = state.players.filter((p) => p.inGame && p.sect && p.sect !== my.sect).map((p) => esc(p.name));
    extras.push(`🌗 Tu mitad: ${mine.join(', ') || '(solo tú)'}<br>🎯 Debes eliminar a: ${others.join(', ')}`);
  }
  if (my.lover) {
    const partner = state.players.find((p) => p.lover && p.id !== my.id);
    if (partner) extras.push(`💘 Estás enamorado/a de <b>${esc(partner.name)}</b>. Si muere, morirás de pena. Ganáis juntos.`);
  }
  if (my.charmed) extras.push(`🎶 Estás <b>encantado</b> por el Gaitero. Encantados: ${state.players.filter((p) => p.charmed).map((p) => esc(p.name)).join(', ')}`);
  if (my.role === 'nino_salvaje' && my.modelId && my.modelId !== 'nadie') {
    const m = state.players.find((p) => p.id === my.modelId);
    if (m) extras.push(`🐾 Tu modelo: ${esc(m.name)} ${m.alive === false ? '(💀 ha muerto)' : ''}`);
  }
  if (my.role === 'bruja' && my.powers) {
    extras.push(`🧪 Pociones: ${my.powers.heal !== false ? '💚 vida' : ''} ${my.powers.poison !== false ? '☠️ muerte' : ''} ${my.powers.heal === false && my.powers.poison === false ? 'ninguna' : ''}`);
  }
  if (game.alguacilId === my.id) extras.push('⭐ Eres el Alguacil: tu voto vale doble.');
  if (my.revealedTonto) extras.push('🤪 Te has librado del linchamiento, pero ya no puedes votar.');
  if (game.powersLost && ROLES[my.role].team === 'pueblo' && !['aldeano', 'tonto'].includes(my.role)) {
    extras.push('⚠️ El Anciano murió a manos del pueblo: los aldeanos habéis perdido vuestros poderes.');
  }
  const team = my.role === 'perro_lobo' && my.wolfSide ? TEAMS.lobos : TEAMS[isWolfSide(my) && r.team !== 'solitario' ? 'lobos' : r.team];
  return `
  <div class="rolecard" data-a="toggle-rolecard">
    <span class="remoji">${r.emoji}</span>
    <span class="rname">${r.name}</span>
    <div class="rteam">${team.emoji} Bando: ${team.name}</div>
    <div class="rdesc">${r.desc}</div>
    ${extras.map((e) => `<div class="rextra">${e}</div>`).join('')}
    ${mini ? '<p class="small-note" style="margin-top:8px">Se ocultará sola en unos segundos; toca la carta para ocultarla ya.</p>' : ''}
  </div>`;
}

// ——— Noche ———

function nightPhase(g, my) {
  const game = g.game;

  // Repaso de roles: la noche está en pausa y todos los vivos revisan su carta.
  if (game.roleRefresh) {
    const conf = (game.roleRefresh.confirmed || {})[my.id];
    const players = state.players.filter((p) => p.inGame);
    const pend = players.filter((p) => p.alive && !(game.roleRefresh.confirmed || {})[p.id]).map((p) => esc(p.name));
    return `
    <div class="narration">👁️ Pausa: todo Castronegro abre los ojos y revisa su rol y su palabra clave en secreto. La noche continuará donde estaba.</div>
    ${my.alive && my.inGame ? roleCard(my, g) : ''}
    ${my.alive && my.inGame && !conf ? btn('confirm-role-refresh', '✅ Revisado, estoy listo', 'primary block')
    : `<div class="waitlist">Esperando a: ${pend.join(', ') || 'nadie, ¡seguimos!'}</div>`}
    ${playersGrid(players, { title: '🏘️ El pueblo', viewer: my })}`;
  }

  const stepId = game.steps[game.stepIdx];
  const def = NIGHT_STEPS.find((s) => s.id === stepId);
  const players = state.players.filter((p) => p.inGame);
  const actors = stepId ? stepActors(stepId, game, players) : null;
  const isActor = actors && actors.includes(my.id) && my.alive;
  const narrText = (def && !def.silent && narr(stepId, `${game.seed}:n${game.night}:s${game.stepIdx}:${stepId}`)) || 'La noche envuelve Castronegro…';

  let panel = '';
  if (isActor) panel = nightActionPanel(stepId, g, my, players);
  else panel = privateNightInfo(stepId, g, my, players);

  // Pasos con palabras clave o reconocimiento físico: los que no actúan
  // mantienen la vista en su pantalla con esta indicación neutral.
  if (!isActor && !panel && ['enamorados', 'encantados', 'lobos_reconocen'].includes(stepId)) {
    panel = `<div class="actionpanel"><h3>👂 Atención al narrador</h3>
      <p class="hint">${stepId === 'lobos_reconocen'
    ? 'Ojos cerrados: los lobos se están reconociendo. No mires.'
    : 'Ojos cerrados y oídos atentos. Si suena <b>tu palabra clave</b>, ábrelos con disimulo: tendrás un mensaje aquí.'}</p></div>`;
  }

  return `
  <div class="narration">🌙 ${esc(stepId === 'amanecer' ? 'Los primeros rayos de sol acarician los tejados…' : narrText)}</div>
  ${roleCard(my, g, true)}
  ${panel}
  ${playersGrid(players, { title: '🏘️ El pueblo', viewer: my })}
  `;
}

function pickList(players, { exclude = [], onlyAlive = true, max = 1, selKey = '' } = {}) {
  const sel = (state.ui.sel && state.ui.sel.key === selKey) ? state.ui.sel.ids : [];
  return `<div class="players">
    ${players.filter((p) => (!onlyAlive || p.alive) && !exclude.includes(p.id)).map((p) => `
      <div class="player selectable ${sel.includes(p.id) ? 'selected' : ''}" data-a="sel" data-p="${p.id}" data-max="${max}" data-selkey="${esc(selKey)}">
        <span class="pname">${esc(p.name)}</span>
        ${sel.includes(p.id) ? '<span>✔️</span>' : ''}
      </div>`).join('')}
  </div>`;
}

const selIds = (key) => (state.ui.sel && state.ui.sel.key === key ? state.ui.sel.ids : []);

function nightActionPanel(stepId, g, my, players) {
  const game = g.game;
  const others = players.filter((p) => p.id !== my.id);
  const key = `n${game.night}:${stepId}`;
  const sel = selIds(key);
  const wrap = (title, hint, inner) => `<div class="actionpanel"><h3>${title}</h3><p class="hint">${hint}</p>${inner}</div>`;

  switch (stepId) {
    case 'ladron': {
      const cc = game.centerCards || [];
      const bothWolves = cc.length === 2 && cc.every((r) => isWolfTeamRole(r));
      return wrap('🃏 El Ladrón', bothWolves ? 'Las dos cartas son de lobo: debes quedarte una.' : 'Puedes cambiar tu carta por una del centro o quedarte como estás.',
        `<div class="centercards">
          ${cc.map((r, i) => `<div class="cc" data-a="act-ladron-take" data-p="${i}"><div style="font-size:2rem">${ROLES[r].emoji}</div><b>${ROLES[r].name}</b><div class="small-note">${ROLES[r].desc}</div></div>`).join('')}
        </div>
        ${bothWolves ? '' : btn('act-ladron-keep', '✋ Me quedo mi carta', 'ghost block')}`);
    }
    case 'cupido':
      return wrap('💘 Cupido', 'Elige a dos personas (puedes incluirte). Quedarán enamoradas para siempre.',
        pickList(players, { max: 2, selKey: key }) +
        btn('act-cupido', `🏹 Enamorar${sel.length === 2 ? '' : ' (elige 2)'}`, 'primary block'));
    case 'enamorados': {
      const partner = players.find((p) => p.lover && p.id !== my.id);
      return wrap('💘 Estás enamorado/a', `Tu media naranja es <b>${esc(partner?.name || '…')}</b>. Si muere, tú también. Si sois de bandos distintos, vuestra meta es quedar los dos últimos.`,
        btn('act-lover-ok', '❤️ Entendido', 'primary block'));
    }
    case 'nino_salvaje':
      return wrap('🐾 El Niño Salvaje', 'Elige a tu modelo. Si muere, te convertirás en hombre lobo.',
        pickList(others, { selKey: key }) + btn('act-nino', '🌟 Elegir modelo', 'primary block'));
    case 'perro_lobo':
      return wrap('🐕 El Perro Lobo', 'Elige tu destino para toda la partida.',
        `<div class="btnrow">${btn('act-perro', '🏡 Ser aldeano', 'primary', 'aldeano')}${btn('act-perro', '🐺 Unirme a los lobos', 'violet', 'lobo')}</div>`);
    case 'dos_hermanas':
      return wrap('👭 Las Dos Hermanas', 'Abrid los ojos con disimulo y reconoceos la una a la otra. Cuando lo hayáis hecho, confirmad aquí.',
        btn('act-hermana-ok', '🤝 Nos hemos reconocido', 'primary block'));
    case 'tres_hermanos':
      return wrap('👨‍👨‍👦 Los Tres Hermanos', 'Abrid los ojos con disimulo y reconoceos entre vosotros. Cuando lo hayáis hecho, confirmad aquí.',
        btn('act-hermano-ok', '🤝 Nos hemos reconocido', 'primary block'));
    case 'lobos_reconocen': {
      const packmates = players.filter((p) => p.alive && isWolfSide(p) && p.id !== my.id);
      const info = packmates.length
        ? `Tu manada: <b>${packmates.map((p) => esc(p.name)).join(', ')}</b>. Abrid los ojos en silencio, reconoceos… y confirmad aquí.`
        : 'Estás <b>solo</b> en la manada: nadie más abrirá los ojos. Confirma y la partida sigue.';
      return wrap('🐺 La manada se reconoce', `El pueblo duerme con los ojos cerrados. ${info}`,
        btn('act-lobos-reconocido', '🐺 Nos hemos reconocido', 'danger block'));
    }
    case 'actor': {
      if (game.powersLost) return wrap('🎭 El Actor', 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.', btn('act-actor-skip', '🌙 Terminar mi turno', 'primary block'));
      const acts = game.acts;
      if (acts.actor && acts.actor.power === 'vidente' && acts.actor.target && !acts.actorSeen) {
        const t = players.find((p) => p.id === acts.actor.target);
        const r = t && ROLES[t.role];
        const txt = game.videnteBando
          ? `<b>${esc(t?.name || '')}</b> ${t && isWolfTeamRole(t.role) ? 'ES un 🐺 hombre lobo' : 'NO es un hombre lobo 🏡'}.`
          : `<b>${esc(t?.name || '')}</b> es ${r?.emoji || ''} <b>${r?.name || ''}</b>.`;
        return wrap('🎭🔮 El Actor como Vidente', 'Memoriza lo que ves y confirma.',
          `<p style="margin:8px 0">${txt}</p>` + btn('act-actor-seen', '✔️ Lo he visto', 'primary block'));
      }
      const power = state.ui.actorPower;
      const powers = [['vidente', '🔮 Ver un rol'], ['defensor', '🛡️ Proteger'], ['cuervo', '🐦‍⬛ Señalar (+2 votos)']];
      if (!power) {
        return wrap('🎭 El Actor', 'Elige el papel que interpretarás esta noche.',
          `<div class="btnrow">${powers.map(([p, l]) => btn('act-actor-power', l, 'violet', p)).join('')}</div>` +
          btn('act-actor-skip', '🚫 No actuar esta noche', 'ghost block'));
      }
      return wrap('🎭 El Actor: ' + powers.find(([p]) => p === power)[1], 'Ahora elige tu objetivo.',
        pickList(power === 'defensor' ? players : others, { selKey: key }) +
        btn('act-actor-confirm', '🎭 Actuar', 'primary block') + btn('act-actor-power', '↩️ Cambiar papel', 'ghost block', ''));
    }
    case 'defensor': {
      if (game.powersLost) return wrap('🛡️ El Defensor', 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.', btn('act-defensor-skip', '🌙 Terminar mi turno', 'primary block'));
      const excluded = my.protectedLast ? [my.protectedLast] : [];
      return wrap('🛡️ El Defensor', 'Elige a quién proteger esta noche (no puedes repetir al de anoche). Puedes protegerte a ti.',
        pickList(players, { exclude: excluded, selKey: key }) +
        btn('act-defensor', '🛡️ Proteger', 'primary block') + btn('act-defensor-skip', 'No proteger a nadie', 'ghost block'));
    }
    case 'vidente': {
      const acts = game.acts;
      if (acts.videnteTarget !== undefined && acts.videnteTarget !== null && !acts.videnteSeen) {
        const t = players.find((p) => p.id === acts.videnteTarget);
        const r = t && ROLES[t.role];
        const esLobo = t && isWolfTeamRole(t.role);
        const resultado = game.videnteBando
          ? `<span class="remoji">${esLobo ? '🐺' : '🏡'}</span><span class="rname">${esc(t?.name || '')}</span>
             <div class="rteam">${esLobo ? 'ES UN HOMBRE LOBO' : 'NO es un hombre lobo'}</div>`
          : `<span class="remoji">${r?.emoji || '❔'}</span><span class="rname">${esc(t?.name || '')}</span>
             <div class="rteam">es ${r?.emoji || ''} ${r?.name || ''}</div>`;
        return wrap('🔮 La Vidente', 'Memoriza lo que ves y confirma. La partida seguirá unos segundos después, con disimulo.',
          `<div class="rolecard" style="margin:8px 0">${resultado}</div>` +
          btn('act-vidente-seen', '✔️ Lo he visto', 'primary block'));
      }
      if (game.powersLost) return wrap('🔮 La Vidente', 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.', btn('act-vidente-skip', '🌙 Terminar mi turno', 'primary block'));
      return wrap('🔮 La Vidente', 'Elige a quién quieres descubrir esta noche.',
        pickList(others, { selKey: key }) + btn('act-vidente', '🔮 Ver su rol', 'primary block'));
    }
    case 'zorro': {
      const acts = game.acts;
      if (acts.zorroTarget !== undefined && acts.zorroTarget !== null && !acts.zorroSeen) {
        return wrap('🦊 El Zorro', 'Memoriza el resultado y confirma.',
          `<p style="margin:8px 0">${acts.zorroResult
            ? '🐺 ¡Tu olfato detecta rastro de <b>hombre lobo</b> en ese trío de casas!'
            : '🍃 No hay rastro de lobo en ese trío… y tu olfato se ha agotado.'}</p>` +
          btn('act-zorro-seen', '✔️ Lo he visto', 'primary block'));
      }
      if (game.powersLost || my.powers?.zorro === false) {
        return wrap('🦊 El Zorro', game.powersLost ? 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.' : 'Tu olfato se agotó aquella noche sin rastro. Que nadie lo sepa: husmea el aire un momento, disimula… y pasa.',
          btn('act-zorro-skip', '🌙 Terminar mi turno', 'primary block'));
      }
      return wrap('🦊 El Zorro', 'Señala a un jugador: olfatearás su casa y las dos vecinas. Si no hay lobos, perderás tu olfato.',
        pickList(others, { selKey: key }) +
        btn('act-zorro', '🦊 Olfatear', 'primary block') + btn('act-zorro-skip', 'No olfatear', 'ghost block'));
    }
    case 'cuervo':
      if (game.powersLost) return wrap('🐦‍⬛ El Cuervo', 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.', btn('act-cuervo-skip', '🌙 Terminar mi turno', 'primary block'));
      return wrap('🐦‍⬛ El Cuervo', 'Señala a un sospechoso: mañana cargará con 2 votos extra.',
        pickList(others, { selKey: key }) +
        btn('act-cuervo', '🐦‍⬛ Señalar', 'primary block') + btn('act-cuervo-skip', 'No señalar', 'ghost block'));
    case 'lobos': {
      const pack = players.filter((p) => p.alive && isWolfSide(p));
      // La manada puede devorar a cualquiera… incluso a uno de los suyos.
      const prey = players.filter((p) => p.alive);
      return wrap('🐺 Los Hombres Lobo', `Manada: <b>${pack.map((p) => esc(p.name)).join(', ')}</b>. Poneos de acuerdo (en silencio, con la mirada…): el primero que elija decide por todos.`,
        pickList(prey, { selKey: key }) + btn('act-lobos', '🩸 Devorar', 'danger block')
        + btn('act-lobos-nadie', '🤷 No nos ponemos de acuerdo (nadie muere)', 'ghost block'));
    }
    case 'infecto_decision': {
      const v = players.find((p) => p.id === g.game.acts.wolfVictim);
      return wrap('🧛 El Infecto Padre de los Lobos', `La manada va a devorar a <b>${esc(v?.name || '…')}</b>. Puedes infectarlo en su lugar (una vez por partida): se unirá a los lobos en secreto.`,
        `<div class="btnrow">${btn('act-infecto', '🧛 Infectar', 'violet', 'si')}${btn('act-infecto', '🩸 Devorar sin más', 'danger', 'no')}</div>`);
    }
    case 'lobo_feroz': {
      const prey = players.filter((p) => p.alive && p.id !== g.game.acts.wolfVictim && p.id !== my.id);
      return wrap('🐺🔥 El Gran Lobo Feroz', 'Ningún lobo ha muerto aún: tu hambre exige una segunda víctima.',
        pickList(prey, { selKey: key }) + btn('act-feroz', '🩸 Devorar también', 'danger block') + btn('act-feroz-skip', 'Contener el hambre', 'ghost block'));
    }
    case 'lobo_albino': {
      const pack = players.filter((p) => p.alive && isWolfSide(p) && p.id !== my.id);
      return wrap('🌕 El Hombre Lobo Albino', 'Esta noche puedes devorar a un miembro de tu propia manada.',
        pickList(pack, { selKey: key }) + btn('act-albino', '🩸 Traicionar', 'danger block') + btn('act-albino-skip', 'Ser leal (por ahora)', 'ghost block'));
    }
    case 'bruja': {
      const victim = players.find((p) => p.id === g.game.acts.wolfVictim);
      const canHeal = my.powers?.heal !== false && !game.powersLost;
      const canPoison = my.powers?.poison !== false && !game.powersLost;
      if (!canHeal && !canPoison) {
        return wrap('🧪 La Bruja', game.powersLost ? 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.' : 'Tus dos pociones ya están gastadas. Que nadie lo sepa: remueve el caldero vacío, disimula… y termina tu turno.',
          btn('act-bruja-done', '🧪 Terminar mi turno', 'primary block'));
      }
      const healing = state.ui.brujaHeal;
      return wrap('🧪 La Bruja', canHeal
        ? (victim ? `Los lobos han atacado a <b>${esc(victim.name)}</b>.` : 'Esta noche los lobos no han elegido víctima.')
        : 'Tu poción de vida ya está gastada; la noche solo te ofrece el veneno.',
        (victim && canHeal ? `<div class="settingrow"><div class="sinfo"><div class="sname">💚 Usar poción de vida con ${esc(victim.name)}</div></div><div class="switch ${healing ? 'on' : ''}" data-a="act-bruja-heal-toggle"></div></div>` : '') +
        (canPoison ? `<p class="hint" style="margin-top:8px">☠️ Poción de muerte (opcional): elige a quién envenenar.</p>${pickList(players, { exclude: [my.id], selKey: key })}` : '') +
        btn('act-bruja-done', '🧪 Terminar mi turno', 'primary block'));
    }
    case 'gaitero': {
      const targets = players.filter((p) => p.alive && !p.charmed && p.id !== my.id);
      const maxSel = Math.min(2, targets.length);
      return wrap('🎶 El Gaitero', `Encanta a ${maxSel} jugador${maxSel > 1 ? 'es' : ''} con tu música.`,
        pickList(targets, { max: maxSel, selKey: key }) + btn('act-gaitero', `🎶 Encantar${sel.length === maxSel ? '' : ` (elige ${maxSel})`}`, 'violet block'));
    }
    case 'gitana':
      if (game.powersLost) return wrap('🔯 La Gitana', 'La muerte del Anciano os arrebató los poderes. Que nadie lo note: espera un instante, disimula… y termina tu turno.', btn('act-gitana-skip', '🌙 Terminar mi turno', 'primary block'));
      return wrap('🔯 La Gitana', 'Elige una pregunta: un espíritu (jugador muerto) la responderá al amanecer.',
        GITANA_QUESTIONS.map((q, i) => btn('act-gitana', '🕯️ ' + q, 'ghost block', String(i))).join('') +
        btn('act-gitana-skip', 'No preguntar', 'ghost block'));
    default:
      return '';
  }
}

// Información privada visible durante la noche aunque no sea tu turno.
// Solo lo imprescindible y solo en su momento: nada de resultados secretos
// flotando en la pantalla de reposo (para eso está «Mostrar mi rol»).
function privateNightInfo(stepId, g, my, players) {
  const acts = g.game.acts || {};
  const bits = [];
  // Los lobos ven la elección SOLO durante su paso (su momento de ojos abiertos);
  // al avanzar la noche, desaparece de la pantalla.
  if (stepId === 'lobos' && isWolfSide(my) && my.alive && acts.wolfVictim !== undefined) {
    const v = players.find((p) => p.id === acts.wolfVictim);
    bits.push(`🐺 La manada ha elegido a <b>${esc(v?.name || 'nadie')}</b>. Cerrad los ojos con disimulo.`);
  }
  if (stepId === 'encantados' && my.charmed && (acts.gaiteroTargets || []).includes(my.id)) {
    const all = players.filter((p) => p.charmed).map((p) => esc(p.name)).join(', ');
    bits.push(`🎶 ¡La música del Gaitero te ha atrapado! Ahora estás <b>encantado</b>. Encantados hasta ahora: ${all}.`);
  }
  if (!bits.length) return '';
  return `<div class="actionpanel">${bits.map((b) => `<p>${b}</p>`).join('')}</div>`;
}

// ——— Día ———

function dayPhase(g, my) {
  const game = g.game;
  const players = state.players.filter((p) => p.inGame);
  const head = (game.pending || [])[0];
  let panel = '';

  if (game.gitanaQ && game.gitanaQ.answer === null) {
    panel += gitanaDayPanel(g, my);
  }
  if (head) panel += pendingPanel(head, g, my, players);
  else if (game.votesLeft > 0 && !game.vote) panel += votePanel(g, my, players);
  else if (game.vote) panel += `<div class="actionpanel"><h3>⏳ Juicio en curso…</h3><p class="hint">La Sirvienta medita su decisión.</p></div>`;
  else panel += '<div class="narration">🌆 El día llega a su fin. La noche caerá enseguida…</div>';

  return `
  <div class="narration">☀️ ${esc(narr(((game.lastDawn || {}).deaths || []).length ? 'dia_debate' : 'dia_debate_tranquilo', `${game.seed}:d${game.dayNum}:${game.votesLeft}`))}</div>
  ${roleCard(my, g, true)}
  ${juezButton(g, my)}
  ${panel}
  ${playersGrid(players, { title: '🏘️ El pueblo', showAlguacil: g.game.alguacilId, viewer: my })}
  `;
}

function juezButton(g, my) {
  if (my.role !== 'juez' || !my.alive || my.powers?.juez === false || g.game.phase !== 'day') return '';
  return `<div class="card"><p class="small-note">⚖️ Solo tú ves esto: puedes exigir una segunda votación hoy (una vez por partida).</p>
    ${btn('juez-arm', '⚖️ Exigir segunda votación tras el juicio', 'violet block')}</div>`;
}

function gitanaDayPanel(g, my) {
  const q = g.game.gitanaQ;
  const medium = state.players.find((p) => p.id === q.mediumId);
  if (my.id === q.mediumId) {
    return `<div class="actionpanel"><h3>🔯 Los espíritus te invocan</h3>
      <p class="hint">Desde el más allá, responde con sinceridad: <b>«${esc(q.q)}»</b></p>
      <div class="btnrow">${btn('gitana-yes', '✔️ SÍ', 'primary')}${btn('gitana-no', '✖️ NO', 'danger')}</div></div>`;
  }
  return `<div class="narration">🔯 La Gitana pregunta a los espíritus: «${esc(q.q)}». ${esc(medium?.name || 'Un difunto')} responderá desde el más allá…</div>`;
}

function pendingPanel(head, g, my, players) {
  const key = `pend:${head.type}`;
  switch (head.type) {
    case 'cazador': {
      const hunter = players.find((p) => p.id === head.pid);
      if (my.id === head.pid) {
        return `<div class="actionpanel"><h3>🏹 ¡Tu última flecha!</h3>
          <p class="hint">Has caído, pero puedes llevarte a alguien contigo.</p>
          ${pickList(players, { exclude: [my.id], selKey: key })}
          ${btn('cazador-shoot', '🏹 Disparar', 'danger block')}${btn('cazador-skip', 'No disparar', 'ghost block')}</div>`;
      }
      return `<div class="narration">🏹 ${esc(hunter?.name || 'El Cazador')} tensa su arco por última vez…</div>`;
    }
    case 'sirvienta': {
      const target = players.find((p) => p.id === head.targetId);
      const iAmSirvienta = my.role === 'sirvienta' && my.alive && !my.lover;
      if (iAmSirvienta) {
        return `<div class="actionpanel"><h3>🧹 La Abnegada Sirvienta</h3>
          <p class="hint">El pueblo ha condenado a <b>${esc(target?.name || '')}</b>. ¿Sacrificas tu carta para asumir su rol en secreto? <span class="countdown" data-deadline="${head.deadline}">…</span></p>
          <div class="btnrow">${btn('sirvienta-yes', '🧹 Tomar su rol', 'violet')}${btn('sirvienta-no', 'No intervenir', 'ghost')}</div></div>`;
      }
      return `<div class="actionpanel"><h3>⏳ El juicio se resuelve…</h3><p class="hint">Un instante de silencio antes de revelar el destino de ${esc(target?.name || '')}.</p></div>`;
    }
    case 'alguacil_elect':
      if (my.alive) {
        return `<div class="actionpanel"><h3>⭐ Elección del Alguacil</h3>
          <p class="hint">Debatid quién será el Alguacil (su voto vale doble). Cualquiera registra el resultado.</p>
          ${pickList(players, { selKey: key })}${btn('alguacil-pick', '⭐ Nombrar Alguacil', 'primary block')}</div>`;
      }
      return '<div class="narration">⭐ El pueblo elige a su Alguacil…</div>';
    case 'alguacil_pick': {
      if (my.id === head.pid) {
        return `<div class="actionpanel"><h3>⭐ Tu último acto como Alguacil</h3>
          <p class="hint">Señala a tu sucesor.</p>
          ${pickList(players, { exclude: [my.id], selKey: key })}${btn('alguacil-pick', '⭐ Nombrar sucesor', 'primary block')}</div>`;
      }
      return '<div class="narration">⭐ El Alguacil caído señala a su sucesor…</div>';
    }
    case 'cabeza_pick': {
      if (my.id === head.pid) {
        return `<div class="actionpanel"><h3>🐐 Tu sacrificio no será en vano</h3>
          <p class="hint">Decide quién será el único que podrá registrar la decisión del pueblo mañana.</p>
          ${pickList(players, { exclude: [my.id], selKey: key })}${btn('cabeza-pick', '👉 Elegir', 'primary block')}${btn('cabeza-skip', 'Que voten todos', 'ghost block')}</div>`;
      }
      return '<div class="narration">🐐 El Cabeza de Turco toma su última decisión…</div>';
    }
    default: return '';
  }
}

function votePanel(g, my, players) {
  const game = g.game;
  const canVote = my.alive && !my.revealedTonto && (!game.soloVoteId || game.soloVoteId === my.id);
  if (!canVote) {
    const solo = game.soloVoteId ? state.players.find((p) => p.id === game.soloVoteId) : null;
    return `<div class="narration">🗳️ ${solo ? `Hoy solo <b>${esc(solo.name)}</b> puede registrar la decisión (designado por el Cabeza de Turco).` : 'El pueblo delibera quién morirá hoy…'}</div>`;
  }
  const key = `vote:d${game.dayNum}:${game.votesLeft}`;
  return `<div class="actionpanel"><h3>🗳️ El juicio del pueblo</h3>
    <p class="hint">Debatid en voz alta. Cuando haya decisión, <b>cualquiera</b> puede registrarla aquí. ¡La primera elección es definitiva!</p>
    ${pickList(players, { exclude: [], selKey: key })}
    ${btn('vote-confirm', '⚖️ Condenar al selecionado', 'danger block')}
    <div class="btnrow">${btn('vote-nadie', '🕊️ El pueblo perdona', 'ghost')}${btn('vote-empate', '🤝 Hubo empate', 'ghost')}</div></div>`;
}

function playersGrid(players, { title = 'Jugadores', showAlguacil = null, viewer = null } = {}) {
  // Los muertos pueden descubrir, si quieren, el rol de cualquier jugador
  // (como en el juego físico: los eliminados observan la noche con los ojos abiertos).
  const canPeek = viewer && viewer.inGame && viewer.alive === false
    && state.group?.game && state.group.game.phase !== 'end';
  const peeked = state.ui.deadPeek || {};
  const marks = (p) => `${p.infected ? ' 🧛' : ''}${p.transformed ? ' 🐾→🐺' : ''}${p.wolfSide ? ' →🐺' : ''}${p.lover ? ' 💘' : ''}${p.charmed ? ' 🎶' : ''}`;
  return `<div class="card"><h3>${title}</h3><div class="players">
    ${players.map((p) => `
      <div class="player ${p.alive === false ? 'dead' : ''} ${canPeek ? 'selectable' : ''}" ${canPeek ? `data-a="dead-peek" data-p="${p.id}"` : ''}>
        <span class="pname">${esc(p.name)}
          ${canPeek && peeked[p.id] ? `<br><small style="color:var(--accent)">${ROLES[p.role]?.emoji || '❔'} ${ROLES[p.role]?.name || '—'}${marks(p)}</small>` : ''}
        </span>
        ${showAlguacil === p.id ? '<span class="badge">⭐</span>' : ''}
        ${p.revealedTonto ? '<span class="badge">🤪</span>' : ''}
        ${p.id === (me() || {}).id ? '<span class="badge you">Tú</span>' : ''}
        ${p.alive === false ? '<span>💀</span>' : ''}
      </div>`).join('')}
  </div>
  ${canPeek ? '<p class="small-note">💀 Estás muerto: toca un jugador para descubrir su rol (solo tú lo ves). Y recuerda: los muertos no hablan.</p>' : ''}
  </div>`;
}

// ——— Fin de partida ———

function endPhase(g, my) {
  const game = g.game;
  const players = state.players.filter((p) => p.inGame);
  return `
  <div class="winbanner card">
    <span class="wemoji">${(WINNER_LABELS[game.winner] || '🏁').slice(0, 2)}</span>
    <h2>${esc(WINNER_LABELS[game.winner] || 'Fin de la partida')}</h2>
  </div>
  <div class="card"><h3>🎭 Los roles eran…</h3><div class="players">
    ${players.map((p) => `
      <div class="player ${p.alive === false ? 'dead' : ''}">
        <span>${ROLES[p.role]?.emoji || '❔'}</span>
        <span class="pname">${esc(p.name)}<br><small style="color:var(--muted)">${ROLES[p.role]?.name || ''}</small></span>
        ${p.alive === false ? '<span>💀</span>' : '<span>❤️</span>'}
      </div>`).join('')}
  </div></div>
  ${isMaster() ? btn('back-lobby', '🔁 Volver al lobby', 'primary block') : '<p class="subtitle">El máster puede devolver al grupo al lobby para otra partida.</p>'}
  `;
}

// ——— Modo manual ———

function manualScreen(g, my) {
  const game = g.game;
  const master = isMaster();
  const players = state.players.filter((p) => p.inGame);
  if (game.phase === 'end') {
    return `<div class="topbar"><h2>${esc(g.name)}</h2>${phaseChip(game)}</div>${endPhase(g, my)}${logPanel(game)}`;
  }
  return `
  <div class="topbar"><h2>${esc(g.name)}</h2>${phaseChip(game)}</div>
  ${flashHtml()}
  ${master ? manualMasterPanel(g, players) : `
    ${my.inGame ? roleCard(my, g, !!my.roleSeen) : ''}
    ${!my.roleSeen && my.inGame ? btn('confirm-role-seen', '✅ He visto mi rol', 'primary block') : ''}
    ${playersGrid(players, { title: '🏘️ El pueblo', viewer: my })}`}
  ${logPanel(game)}
  `;
}

function manualMasterPanel(g, players) {
  return `
  <div class="card">
    <h3>🎩 Panel del narrador</h3>
    <p class="small-note">Tú diriges: la app repartió los roles y lleva el registro. Toca un jugador para marcar muertes o correcciones.</p>
    ${btn('manual-phase', g.game.manualPhase === 'noche' ? '☀️ Pasar al día' : '🌙 Pasar a la noche', 'primary block')}
  </div>
  <div class="card"><h3>👥 Jugadores y roles</h3><div class="players">
    ${players.map((p) => `
      <div class="player selectable ${p.alive === false ? 'dead' : ''}" data-a="manual-player" data-p="${p.id}">
        <span>${ROLES[p.role]?.emoji || '❔'}</span>
        <span class="pname">${esc(p.name)}<br><small style="color:var(--muted)">${ROLES[p.role]?.name || ''}</small></span>
        ${p.alive === false ? '<span>💀</span>' : ''}
      </div>`).join('')}
  </div></div>
  <div class="btnrow">${btn('end-game', '🏳️ Terminar partida', 'danger')}</div>
  `;
}

// ——— Herramientas del máster (modo auto) ———

function masterToolsBar(g) {
  if (!isMaster() || g.game.mode !== 'auto') return '';
  if (g.game.phase === 'end') return '';
  return `<div class="mastertools"><div class="inner">
    ${btn('voice-open', isMuted() ? '🔇 Voz' : '🗣️ Voz', 'ghost')}
    ${btn('view-roles', '👁 Roles', 'ghost')}
    ${btn('force-advance', '⏭️ Forzar', 'ghost')}
    ${btn('end-game', '🏳️ Fin', 'ghost')}
  </div></div>
  <p class="small-note" style="text-align:center">🔊 Mantén esta pantalla encendida: tu dispositivo es el narrador.</p>`;
}

function logPanel(game) {
  if (!game.log || !game.log.length) return '';
  return `<div class="card"><h3>📜 Crónica de Castronegro</h3>
    <div class="log" id="gamelog">${game.log.map((l) => `<p class="${esc(l.kind || '')}">${esc(l.txt)}</p>`).join('')}</div></div>`;
}

// ——— Modales ———

function renderModal() {
  const m = state.ui.modal;
  const inner = {
    'roles': rolesModal,
    'settings': settingsModal,
    'start': startModal,
    'player-menu': playerMenuModal,
    'confirm-leave': confirmLeaveModal,
    'confirm-delete': confirmDeleteModal,
    'takeover': takeoverModal,
    'group-exists': groupExistsModal,
    'voice': voiceModal,
    'view-roles': viewRolesModal,
    'end-game': endGameModal,
    'manual-player': manualPlayerModal,
    'vote-confirm': voteConfirmModal,
  }[m.type];
  if (!inner) return '';
  // El modal lleva data-a="noop" para que los clics en su interior no lleguen
  // al overlay (que cierra); los botones internos se resuelven antes por closest().
  return `<div class="overlay" data-a="close-modal"><div class="modal" data-a="noop">${inner(m)}</div></div>`;
}

function rolesModal() {
  const g = state.group;
  const extra = g.extraRoles || [];
  const wc = (g.settings || {}).wolvesCount || null;
  const alguacilOn = !!(g.settings || {}).alguacil;
  const alguacilRow = `<div class="roletoggle ${alguacilOn ? 'on' : ''}" data-a="toggle-setting" data-p="alguacil">
      <span class="remoji">⭐</span>
      <div class="rinfo"><div class="rname">El Alguacil <small>(cargo electo, no es una carta)</small></div>
      <div class="rdesc">El primer día el pueblo elige a su Alguacil, cuya voz vale por dos. Al morir, señala a su sucesor.</div></div>
      <span class="state">${alguacilOn ? '✅' : '⬜'}</span></div>`;
  const groups = EXPANSIONS.map((exp) => {
    const roles = Object.values(ROLES).filter((r) => r.expansion === exp.id);
    return `<div class="exp">${exp.emoji} ${exp.name.toUpperCase()}</div>` + roles.map((r) => {
      if (r.id === 'hombre_lobo') {
        const nJug = Math.max(1, state.players.length - 1);
        const auto = !wc;
        const shown = wc || wolfCountFor(nJug);
        return `<div class="roletoggle locked on"><span class="remoji">${r.emoji}</span>
          <div class="rinfo"><div class="rname">${r.name} <small>(siempre en juego)</small></div>
          <div class="rdesc">${r.desc} La tabla oficial pone 2 con 8-11 jugadores, 3 con 12-17 y 4 con 18.</div>
          <div class="btnrow" style="margin-top:6px">
            ${btn('wolves-auto', auto ? `🎯 Auto · ${shown} 🐺` : '🎯 Auto', auto ? 'primary small' : 'ghost small')}
            ${auto ? btn('wolves-manual', '✋ Elegir número', 'ghost small')
    : `<span style="display:inline-flex;align-items:center;gap:10px">${btn('wolves-dec', '−', 'ghost small')}<b style="font-size:1.05rem">${wc} 🐺</b>${btn('wolves-inc', '+', 'ghost small')}</span>`}
          </div></div>
          <span class="state">🔒</span></div>`;
      }
      if (r.always) {
        return `<div class="roletoggle locked on"><span class="remoji">${r.emoji}</span>
          <div class="rinfo"><div class="rname">${r.name} <small>(automático)</small></div><div class="rdesc">${r.desc}</div></div>
          <span class="state">🔒</span></div>`;
      }
      const on = extra.includes(r.id);
      const nJug = Math.max(0, state.players.length - 1);
      const minWarn = r.minPlayers && nJug < r.minPlayers;
      return `<div class="roletoggle ${on ? 'on' : ''}" data-a="toggle-role" data-p="${r.id}">
        <span class="remoji">${r.emoji}</span>
        <div class="rinfo"><div class="rname">${r.name}${r.multi ? ` <small>(×${r.multi} cartas)</small>` : ''}${r.minPlayers ? ` <small>(regla: ≥${r.minPlayers} jugadores)</small>` : ''}</div>
        <div class="rdesc">${r.desc}${minWarn && on ? ' <b>⚠️ Ahora mismo no hay jugadores suficientes: no se repartirá.</b>' : ''}</div></div>
        <span class="state">${on ? '✅' : '⬜'}</span></div>`;
    }).join('') + (exp.id === 'base' ? alguacilRow : '');
  }).join('');
  return `<h3>🎴 Roles de la partida</h3>
    <p class="small-note">Los aldeanos rellenan los huecos automáticamente. Activa los demás roles que quieras incluir; si hay más roles que sitios, se elegirá un subconjunto al azar.</p>
    ${groups}
    ${btn('reset-roles', '↩️ Restaurar composición recomendada', 'ghost block')}
    ${btn('close-modal', '✔️ Listo', 'primary block')}`;
}

function settingsModal() {
  const s = state.group.settings || {};
  const row = (k, name, desc) => `
    <div class="settingrow"><div class="sinfo"><div class="sname">${name}</div><div class="sdesc">${desc}</div></div>
    <div class="switch ${s[k] ? 'on' : ''}" data-a="toggle-setting" data-p="${k}"></div></div>`;
  return `<h3>🔧 Ajustes de partida</h3>
    ${row('revealDead', '💀 Revelar rol al morir', 'Al eliminar a alguien se anuncia qué rol tenía (regla oficial).')}
    ${row('showComposition', '🎴 Composición pública', 'Al empezar se anuncia qué cartas hay en juego (como en el juego de mesa).')}
    ${row('primeraNocheTranquila', '🌙 Primera noche sin sangre', 'La primera noche los lobos se reconocen y los roles actúan, pero nadie es devorado.')}
    ${row('videnteSoloBando', '🔮 La vidente solo ve el bando', 'En vez del rol exacto, la vidente solo descubre si el jugador es hombre lobo o no.')}
    ${row('ocultarCausas', '🌫️ Ocultar causas de muerte', 'Las muertes nocturnas no explican si fueron los lobos, la bruja u otra cosa: solo quién ha muerto.')}
    ${row('casual', '🎲 Modo casual', `Permite jugar con menos de ${OFFICIAL_MIN_PLAYERS} jugadores (mínimo 3), fuera de las reglas oficiales (8-18 + narrador).`)}
    ${btn('reset-settings', '↩️ Restaurar ajustes por defecto', 'ghost block')}
    ${btn('close-modal', '✔️ Listo', 'primary block')}`;
}

function startModal() {
  const n = state.players.length;
  return `<h3>🎬 Empezar partida</h3>
    <p class="small-note">Jugadores en la mesa: <b>${n}</b>. Una vez empiece, nadie podrá entrar ni salir del grupo.</p>
    <div class="card" style="border-color:var(--accent)">
      <h3>🤖 Modo automático</h3>
      <p class="small-note">La app dirige la partida sin narrador humano: este dispositivo narra con voz las fases y los jugadores actúan desde su móvil. Tú no recibes rol (tu dispositivo es el narrador). Jugad en la misma sala, con este móvil a buen volumen.</p>
      ${btn('start-auto', '🤖 Empezar en automático', 'primary block')}
    </div>
    <div class="card">
      <h3>🎩 Modo manual</h3>
      <p class="small-note">Tú narras la partida al estilo clásico (sin rol para ti). La app reparte los roles en secreto, te los muestra todos y lleva el registro de muertes.</p>
      ${btn('start-manual', '🎩 Empezar en manual', 'violet block')}
    </div>
    <p class="small-note">En ambos modos el máster hace de narrador y no juega. Reglas oficiales: de ${OFFICIAL_MIN_PLAYERS} a 18 jugadores además de ti${(state.group.settings || {}).casual ? ' (modo casual activo: desde 3)' : ''}.</p>
    <div id="form-error">${state.ui.formError ? `<div class="flash error">${esc(state.ui.formError)}</div>` : ''}</div>
    ${btn('close-modal', 'Cancelar', 'ghost block')}`;
}

function playerMenuModal(m) {
  const p = state.players.find((x) => x.id === m.pid);
  if (!p) return '';
  return `<h3>👤 ${esc(p.name)}</h3>
    ${btn('kick', '👢 Expulsar del grupo', 'danger block', p.id)}
    ${btn('make-master', '⭐ Hacer máster', 'violet block', p.id)}
    ${btn('close-modal', 'Cancelar', 'ghost block')}`;
}

const confirmLeaveModal = () => `<h3>🚪 ¿Abandonar el grupo?</h3>
  <p class="small-note">Saldrás de la lista y se cerrará tu sesión en este dispositivo.</p>
  ${btn('leave-confirm', '🚪 Sí, salir', 'danger block')}${btn('close-modal', 'Cancelar', 'ghost block')}`;

const confirmDeleteModal = () => `<h3>🗑️ ¿Eliminar el grupo?</h3>
  <p class="small-note">Se expulsará a todos los jugadores y el nombre del grupo quedará libre. Esta acción no se puede deshacer.</p>
  ${btn('delete-group-confirm', '🗑️ Sí, eliminar todo', 'danger block')}${btn('close-modal', 'Cancelar', 'ghost block')}`;

function takeoverModal(m) {
  return `<h3>👤 Ese nombre ya existe</h3>
    <p class="small-note">Ya hay un jugador llamado <b>${esc(m.name)}</b> en este grupo. Si eres tú, puedes desconectar su dispositivo anterior y continuar desde este. Si no, elige otro nombre.</p>
    ${btn('takeover-confirm', `🔌 Soy yo: conectarme como ${esc(m.name)}`, 'violet block', m.name)}
    ${btn('close-modal', 'Elegir otro nombre', 'ghost block')}`;
}

function groupExistsModal(m) {
  return `<h3>🏘️ Ese grupo ya existe</h3>
    <p class="small-note">El grupo <b>${esc(m.group)}</b> ya está creado. ¿Quieres entrar en él en vez de crear uno nuevo?</p>
    ${btn('join-existing-master', '🎩 Entrar y ser el máster', 'primary block')}
    <p class="small-note" style="margin:2px 0 8px">El máster actual pasará a ser un jugador más.</p>
    ${btn('join-existing-player', '🚪 Entrar como jugador', 'violet block')}
    ${btn('close-modal', '✏️ Elegir otro nombre de grupo', 'ghost block')}`;
}

function voiceModal() {
  const voices = listSpanishVoices();
  const cfg = getVoiceConfig();
  const current = cfg.voiceURI || (voices[0] && voices[0].voiceURI) || '';
  return `<h3>🗣️ Voz del narrador</h3>
    <div class="settingrow"><div class="sinfo"><div class="sname">🔊 Voz activada</div><div class="sdesc">Silencia la locución sin pausar la partida.</div></div>
      <div class="switch ${isMuted() ? '' : 'on'}" data-a="toggle-mute"></div></div>
    <label for="voice-select">Voz (las «Natural», «Online» o de Google suenan mejor)</label>
    ${voices.length ? `
      <select id="voice-select" data-vs="voice" style="width:100%;padding:10px;border-radius:10px;background:var(--bg2);color:var(--text);border:1px solid var(--border)">
        ${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === current ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
      </select>` : '<p class="small-note">⚠️ Este navegador no ofrece voces en español. Prueba con Chrome (Android) o Edge, o instala voces de español en el sistema.</p>'}
    <label for="voice-rate">Velocidad</label>
    <input type="range" id="voice-rate" data-vs="rate" min="0.6" max="1.3" step="0.05" value="${cfg.rate}" style="width:100%">
    <label for="voice-pitch">Tono</label>
    <input type="range" id="voice-pitch" data-vs="pitch" min="0.5" max="1.3" step="0.05" value="${cfg.pitch}" style="width:100%">
    <div class="btnrow">${btn('voice-test', '▶️ Probar la voz', 'violet')}${btn('close-modal', '✔️ Listo', 'primary')}</div>
    <p class="small-note">La voz depende de las que ofrezca este dispositivo. En Android (Chrome) y Edge suele haber voces muy naturales; en otros navegadores puede sonar más robótica.</p>`;
}

function viewRolesModal() {
  const players = state.players.filter((p) => p.inGame);
  return `<h3>👁 Roles de la mesa (solo máster)</h3>
    <div class="players">${players.map((p) => `
      <div class="player ${p.alive === false ? 'dead' : ''}">
        <span>${ROLES[p.role]?.emoji || '❔'}</span>
        <span class="pname">${esc(p.name)}<br><small style="color:var(--muted)">${ROLES[p.role]?.name || ''}${p.infected ? ' 🧛' : ''}${p.transformed ? ' 🐾→🐺' : ''}${p.wolfSide ? ' →🐺' : ''}${p.lover ? ' 💘' : ''}${p.charmed ? ' 🎶' : ''}</small></span>
        ${p.alive === false ? '<span>💀</span>' : ''}
      </div>`).join('')}</div>
    ${btn('close-modal', 'Cerrar', 'primary block')}`;
}

function endGameModal() {
  const game = (state.group && state.group.game) || {};
  const comp = game.composition || {};
  const players = state.players.filter((p) => p.inGame);
  const hasRole = (r) => (comp[r] || 0) > 0 || players.some((p) => p.role === r);
  // Solo se ofrecen los desenlaces posibles con los roles de esta partida.
  const relevant = {
    pueblo: true,
    lobos: true,
    enamorados: hasRole('cupido') || players.some((p) => p.lover),
    gaitero: hasRole('gaitero'),
    lobo_albino: hasRole('lobo_albino'),
    sectario: hasRole('sectario'),
    angel: hasRole('angel'),
  };
  return `<h3>🏳️ Terminar la partida</h3>
    <p class="small-note">Elige el resultado (o deja que la app lo calcule con los vivos actuales).</p>
    ${btn('end-game-confirm', '🧮 Calcular ganador automáticamente', 'primary block', '')}
    ${Object.entries(WINNER_LABELS).filter(([k]) => k !== 'nadie' && relevant[k]).map(([k, v]) => btn('end-game-confirm', v, 'ghost block', k)).join('')}
    ${btn('close-modal', 'Cancelar', 'ghost block')}`;
}

function manualPlayerModal(m) {
  const p = state.players.find((x) => x.id === m.pid);
  if (!p) return '';
  const r = ROLES[p.role];
  return `<h3>${r?.emoji || ''} ${esc(p.name)} — ${r?.name || ''}</h3>
    <p class="small-note">${r?.desc || ''}</p>
    ${p.alive ? `
      ${btn('manual-kill-lobos', '🐺 Devorado por los lobos', 'danger block', p.id)}
      ${btn('manual-kill-linchado', '⚖️ Linchado por el pueblo', 'danger block', p.id)}
      ${btn('manual-kill-otro', '☠️ Muere por otra causa', 'danger block', p.id)}` : `
      ${btn('manual-revive', '✨ Revivir (corrección)', 'violet block', p.id)}`}
    ${btn('close-modal', 'Cancelar', 'ghost block')}`;
}

function voteConfirmModal(m) {
  const p = state.players.find((x) => x.id === m.pid);
  return `<h3>⚖️ ¿Condenar a ${esc(p?.name || '')}?</h3>
    <p class="small-note">Esta decisión es definitiva para hoy: nadie más podrá votar.</p>
    ${btn('vote-final', '⚖️ Sí, el pueblo ha hablado', 'danger block', m.pid)}
    ${btn('close-modal', 'Cancelar', 'ghost block')}`;
}
