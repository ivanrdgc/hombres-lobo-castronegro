// Estado local: sesión (localStorage), rutas y suscripciones a Firestore.
import { db, doc, collection, onSnapshot, query, orderBy } from './fb.js';

const LS_KEY = 'hlc_sessions_v1';

export const state = {
  route: { view: 'landing', slug: null }, // landing | group
  group: null,        // datos del doc del grupo (o null)
  groupMissing: false,
  players: [],        // subcolección ordenada por asiento
  session: null,      // {pid, token, name} para el slug actual
  flash: null,        // mensaje puntual para mostrar en la UI
  ui: {},             // estado efímero de la interfaz (modales, selección…)
};

let unsubGroup = null;
let unsubPlayers = null;
let listeners = [];

export function onChange(fn) { listeners.push(fn); }
export function notify() { for (const fn of listeners) fn(state); }

export function slugify(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export function randomId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// ——— Sesiones por grupo ———
function readSessions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
export function getSession(slug) {
  return readSessions()[slug] || null;
}
export function saveSession(slug, sess) {
  const all = readSessions();
  all[slug] = sess;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  if (state.route.slug === slug) state.session = sess;
}
export function clearSession(slug) {
  const all = readSessions();
  delete all[slug];
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  if (state.route.slug === slug) state.session = null;
}

// ——— Rutas ———
export function parseRoute() {
  const m = location.pathname.match(/^\/g\/([a-z0-9-]+)\/?$/);
  if (m) return { view: 'group', slug: m[1] };
  return { view: 'landing', slug: null };
}

export function navigate(path) {
  history.pushState(null, '', path);
  applyRoute();
}

export function applyRoute() {
  const route = parseRoute();
  state.route = route;
  state.group = null;
  state.groupMissing = false;
  state.players = [];
  state.ui = {};
  state.session = route.slug ? getSession(route.slug) : null;
  if (unsubGroup) { unsubGroup(); unsubGroup = null; }
  if (unsubPlayers) { unsubPlayers(); unsubPlayers = null; }
  if (route.view === 'group') subscribeGroup(route.slug);
  notify();
}

function subscribeGroup(slug) {
  const gref = doc(db, 'groups', slug);
  unsubGroup = onSnapshot(gref, (snap) => {
    const existed = !!state.group;
    state.group = snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
    state.players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notify();
  }, (err) => console.error('players listener', err));
}

// Jugador local actual (o null si la sesión no es válida).
export function me() {
  if (!state.session) return null;
  const p = state.players.find((x) => x.id === state.session.pid);
  if (!p) return null;
  if (p.deviceToken !== state.session.token) return null; // sesión robada por otro dispositivo
  return p;
}

export function isMaster() {
  const m = me();
  return !!m && state.group && state.group.masterId === m.id;
}

export function playersAlive() {
  return state.players.filter((p) => p.alive);
}

export function setFlash(msg) { state.flash = msg; notify(); }
