// Estado central de la app (runes de Svelte 5): sesión (localStorage), rutas y
// suscripciones a Firestore. Port de public/js/store.js — mismas claves de
// localStorage (hlc_sessions_v1) y misma semántica de listeners.
import { db, doc, collection, onSnapshot, query, orderBy } from './fb';
import type { GroupDoc, GroupView, MatchDoc, PlayerDoc, Session } from './schema';

const LS_KEY = 'hlc_sessions_v1';

export interface Route {
  view: 'landing' | 'group';
  slug: string | null;
  /**
   * Navegación POR URL (única y recargable):
   *   /g/<slug>                         → la mesa (game = null)
   *   /g/<slug>/<gameId>                → lobby de ese juego
   *   /g/<slug>/<gameId>/empezar        → pantalla «Empezar partida»
   *   /g/<slug>/<gameId>/partida/<mid>  → una partida en curso (se recoloca
   *                                       sola al empezar; al terminar, lobby)
   * Cada dispositivo navega libre (su URL es suya); quien está DENTRO de una
   * partida ve siempre la suya (la mesa admite varias partidas a la vez).
   */
  game: string | null;
  start: boolean;
  /** Partida concreta (/partida/<mid>); null en /partida a secas (compat). */
  matchId: string | null;
}

export interface ModalState {
  type: string;
  [k: string]: unknown;
}

/** Estado efímero de la interfaz (modales, selección…). No se sincroniza. */
export interface UiState {
  sel?: { key: string; ids: string[] } | null;
  actorPower?: string | null;
  brujaHeal?: boolean;
  narratorWho?: boolean;
  refreshOpen?: boolean;
  revealOpen?: boolean;
  roleOpen?: boolean;
  modal?: ModalState | null;
  busy?: boolean;
  lastOk?: number | null;
  formError?: string | null;
  dragging?: boolean;
  voiceUnlocked?: boolean;
  /** ¿El audio SUENA ya de verdad? (AudioContext 'running'). Lo alimenta
   *  core/audio/engine vía onAudioState; las pantallas piden activar SOLO si es
   *  falso, en vez de fiarse de una bandera manual. */
  audioReady?: boolean;
  deadPeek?: Record<string, boolean>;
  suggestedGroup?: string | null;
  /** Lectura local en voz alta: qué suena ('intro', 'roles', 'role:vidente'…) y su estado. */
  explainAudio?: { part: string; phase: 'loading' | 'playing' } | null;
  voiceTest?: 'running' | Record<string, unknown> | null;
  muted?: boolean;
}

export interface AppState {
  route: Route;
  group: GroupDoc | null;
  groupMissing: boolean;
  players: PlayerDoc[];
  /** Partidas en curso de la mesa (subcolección matches). */
  matches: MatchDoc[];
  /** true tras el primer snapshot de partidas (evita redirecciones en frío). */
  matchesReady: boolean;
  session: Session | null;
  flash: string | null;
  ui: UiState;
}

// Nota de nombres: en los componentes .svelte hay que importar `app` (importar
// un binding llamado `state` eclipsa la runa $state); en módulos .ts puede
// usarse el alias `state` (mismo objeto).
export const app: AppState = $state({
  route: { view: 'landing', slug: null, game: null, start: false, matchId: null },
  group: null,
  groupMissing: false,
  players: [],
  matches: [],
  matchesReady: false,
  session: null,
  flash: null,
  ui: {},
});

export const state: AppState = app;

let unsubGroup: (() => void) | null = null;
let unsubPlayers: (() => void) | null = null;
let unsubMatches: (() => void) | null = null;
const listeners: ((s: AppState) => void)[] = [];

/** Suscripción explícita (narrador/secuenciador): se llama en cada snapshot. */
export function onChange(fn: (s: AppState) => void): void {
  listeners.push(fn);
}

export function notify(): void {
  for (const fn of listeners) fn(state);
}

// ——— Sesiones por grupo ———
function readSessions(): Record<string, Session> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

export function getSession(slug: string): Session | null {
  return readSessions()[slug] || null;
}

export function saveSession(slug: string, sess: Session): void {
  const all = readSessions();
  all[slug] = sess;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  if (state.route.slug === slug) state.session = sess;
}

export function clearSession(slug: string): void {
  const all = readSessions();
  delete all[slug];
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  if (state.route.slug === slug) state.session = null;
}

// ——— Rutas ———
export function parseRoute(): Route {
  const path = location.pathname;
  // Pantalla «Empezar partida» de un juego: /g/<slug>/<gameId>/empezar
  let m = path.match(/^\/g\/([a-z0-9-]+)\/([a-z0-9_]+)\/empezar\/?$/);
  if (m) return { view: 'group', slug: m[1], game: m[2], start: true, matchId: null };
  // Una partida en curso: /g/<slug>/<gameId>/partida/<mid> (sin <mid>, la URL
  // heredada: cae a la partida propia si la hay o al lobby del juego).
  m = path.match(/^\/g\/([a-z0-9-]+)\/([a-z0-9_]+)\/partida(?:\/([a-z0-9]+))?\/?$/);
  if (m) return { view: 'group', slug: m[1], game: m[2], start: false, matchId: m[3] || null };
  // Lobby de un juego concreto: /g/<slug>/<gameId> (única y recargable).
  m = path.match(/^\/g\/([a-z0-9-]+)\/([a-z0-9_]+)\/?$/);
  if (m) return { view: 'group', slug: m[1], game: m[2], start: false, matchId: null };
  // La mesa: /g/<slug> es la URL canónica del grupo.
  m = path.match(/^\/g\/([a-z0-9-]+)\/?$/);
  if (m) return { view: 'group', slug: m[1], game: null, start: false, matchId: null };
  // Enlaces antiguos con prefijo de juego: redirigir en silencio.
  m = path.match(/^\/hombres_lobo\/g\/([a-z0-9-]+)\/?$/);
  if (m) {
    history.replaceState(null, '', '/g/' + m[1]);
    return { view: 'group', slug: m[1], game: null, start: false, matchId: null };
  }
  if (/^\/hombres_lobo\/?$/.test(path)) history.replaceState(null, '', '/');
  return { view: 'landing', slug: null, game: null, start: false, matchId: null }; // portada: crear la mesa
}

export function navigate(path: string): void {
  history.pushState(null, '', path);
  applyRoute();
}

export function applyRoute(): void {
  const route = parseRoute();
  // Navegación DENTRO del mismo grupo (mesa ↔ lobby de juego ↔ empezar):
  // se conservan suscripciones y estado; solo cambia la vista (y se cierra
  // cualquier modal abierto). Así no parpadea «Buscando el grupo…».
  const sameGroup = state.route.view === 'group' && route.view === 'group'
    && state.route.slug === route.slug;
  state.route = route;
  if (sameGroup) {
    state.ui.modal = null;
    notify();
    return;
  }
  state.group = null;
  state.groupMissing = false;
  state.players = [];
  state.matches = [];
  state.matchesReady = false;
  state.ui = {};
  state.session = route.slug ? getSession(route.slug) : null;
  if (unsubGroup) {
    unsubGroup();
    unsubGroup = null;
  }
  if (unsubPlayers) {
    unsubPlayers();
    unsubPlayers = null;
  }
  if (unsubMatches) {
    unsubMatches();
    unsubMatches = null;
  }
  if (route.view === 'group' && route.slug) subscribeGroup(route.slug);
  notify();
}

function subscribeGroup(slug: string): void {
  const gref = doc(db, 'groups', slug);
  unsubGroup = onSnapshot(gref, (snap) => {
    const existed = !!state.group;
    state.group = snap.exists() ? ({ id: snap.id, ...snap.data() } as GroupDoc) : null;
    state.groupMissing = !snap.exists();
    if (!snap.exists() && existed) {
      state.flash = 'El grupo ha sido eliminado por el máster.';
      clearSession(slug);
    }
    notify();
  }, (err) => {
    console.error('group listener', err);
    state.flash = 'Error de conexión con la partida.';
    notify();
  });
  const pref = query(collection(db, 'groups', slug, 'players'), orderBy('order'));
  unsubPlayers = onSnapshot(pref, (snap) => {
    state.players = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlayerDoc);
    notify();
  }, (err) => console.error('players listener', err));
  const mref = query(collection(db, 'groups', slug, 'matches'), orderBy('createdAt'));
  unsubMatches = onSnapshot(mref, (snap) => {
    state.matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MatchDoc);
    state.matchesReady = true;
    notify();
  }, (err) => console.error('matches listener', err));
}

// Jugador local actual (o null si la sesión no es válida).
export function me(): PlayerDoc | null {
  if (!state.session) return null;
  const p = state.players.find((x) => x.id === state.session!.pid);
  if (!p) return null;
  if (p.deviceToken !== state.session.token) return null; // sesión robada por otro dispositivo
  return p;
}

// ——— Partidas simultáneas ———

/** Partida que ocupa a un dispositivo (miembro: juega, narra o pone la voz). */
export function matchOf(pid: string | null | undefined): MatchDoc | null {
  if (!pid) return null;
  return state.matches.find((m) => (m.members || []).includes(pid)) || null;
}

/** MI partida (la que me ocupa), si estoy en alguna. */
export function myMatch(): MatchDoc | null {
  return state.session ? matchOf(state.session.pid) : null;
}

/** Partida apuntada por la URL (espectador), si sigue viva. */
export function routeMatch(): MatchDoc | null {
  const mid = state.route.matchId;
  return mid ? state.matches.find((m) => m.id === mid) || null : null;
}

/** Partida en contexto: la mía manda; si no, la que miro por URL. */
export function ctxMatch(): MatchDoc | null {
  return myMatch() ?? routeMatch();
}

/** El grupo con una partida superpuesta: misma forma que GroupDoc. */
export function matchView(g: GroupDoc, m: MatchDoc): GroupView {
  return {
    ...g, status: 'playing', currentGame: m.gameId, masterId: m.masterId,
    lastNarratorId: m.lastNarratorId, settings: m.settings || {},
    extraRoles: m.extraRoles || [], game: m.game, matchId: m.id,
  };
}

/**
 * El grupo TAL COMO LO VE este dispositivo: con su partida en contexto
 * superpuesta si la hay. Es lo que leen las pantallas y modales de partida
 * (antes leían app.group, cuando solo había una partida por mesa).
 */
export function viewGroup(): GroupView | null {
  const g = state.group;
  if (!g) return null;
  const m = ctxMatch();
  return m ? matchView(g, m) : g;
}

/** ¿Dirijo yo el contexto actual? (máster de mi partida; en la mesa, del grupo) */
export function isMaster(): boolean {
  const m = me();
  if (!m) return false;
  const match = ctxMatch();
  if (match) return match.masterId === m.id;
  return !!state.group && state.group.masterId === m.id;
}

export function playersAlive(): PlayerDoc[] {
  return state.players.filter((p) => p.alive);
}

export function setFlash(msg: string | null): void {
  state.flash = msg;
  notify();
}
