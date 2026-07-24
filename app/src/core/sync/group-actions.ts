// Acciones de GRUPO (mesa): crear/unirse/reconectar, expulsar, asientos,
// ajustes, narrador recordado, latido… Son comunes a todos los juegos; cada
// juego aporta sus propias acciones de partida encima de estos helpers.
// (Extraído de games/hombres-lobo/actions.ts al llegar el segundo juego;
// Hombres Lobo las re-exporta para no romper importaciones.)
import {
  db, doc, getDoc, updateDoc, deleteDoc, runTransaction, writeBatch, getDocs, collection,
} from './fb';
import type { Transaction } from 'firebase/firestore';
import { state, saveSession, clearSession, navigate, ctxMatch, matchOf } from './store.svelte';
import { CodedError } from './guard';
import { slugify, randomId, playerIdFor } from '../util/ids';
import type { MatchDoc, TableSettings } from './schema';
import type { RoleId } from '../../games/hombres-lobo/roles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON round-trip genérico
export const sanitize = <T>(x: T): any => JSON.parse(JSON.stringify(x === undefined ? null : x));

// Firestore puede devolver «resource-exhausted» en ráfagas puntuales:
// se reintenta con espera creciente en vez de enseñar un error al jugador.
export async function txWithRetry<T>(body: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runTransaction(db, body);
    } catch (e) {
      if ((e as { code?: string })?.code === 'resource-exhausted' && attempt < 3) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}

export const gref = (slug: string) => doc(db, 'groups', slug);
export const pref = (slug: string, pid: string) => doc(db, 'groups', slug, 'players', pid);
export const mref = (slug: string, mid: string) => doc(db, 'groups', slug, 'matches', mid);
export const mySlug = () => state.route.slug!;
export const myPid = () => state.session!.pid;

/** Id de partida nueva: corto, único en la mesa y apto para la URL. */
export const newMatchId = () =>
  'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** Id de la partida en contexto SI es del juego indicado (acciones de juego). */
export function ctxMatchId(gameId: string): string | null {
  const m = ctxMatch();
  return m && m.gameId === gameId ? m.id : null;
}

/**
 * Valida dentro de una transacción que ningún candidato esté ya ocupado por
 * OTRA partida (se relee cada partida conocida: los members frescos mandan).
 */
export async function assertFree(tx: Transaction, slug: string, pids: string[], exceptMid?: string): Promise<void> {
  const others = state.matches.filter((m) => m.id !== exceptMid);
  const snaps = await Promise.all(others.map((m) => tx.get(mref(slug, m.id))));
  for (const snap of snaps) {
    if (!snap.exists()) continue;
    const members: string[] = (snap.data() as { members?: string[] }).members || [];
    const clash = pids.find((pid) => members.includes(pid));
    if (clash) {
      const name = state.players.find((p) => p.id === clash)?.name || clash;
      throw new Error(`${name} ya está en otra partida. Sácalo primero desde la mesa.`);
    }
  }
}

// Cada juego registra aquí cómo sacar a alguien de una de sus partidas y cómo
// terminarla (así la mesa puede hacer ambas cosas sin que el core importe juegos).
export interface MatchTools {
  /** Salida administrativa de un miembro (kick desde la mesa o abandono). */
  leave: (mid: string, pid: string) => Promise<void>;
  /** Terminar la partida desde fuera (la mesa) o dentro. */
  end: (mid: string) => Promise<void>;
  /** true si `leave` TERMINA la partida para todos (el reparto completo no
   *  sobrevive a una baja); la mesa lo avisa antes de sacar a nadie. */
  leaveEndsMatch?: boolean;
}

const MATCH_TOOLS: Record<string, MatchTools> = {};

export function registerMatchTools(gameId: string, tools: MatchTools): void {
  MATCH_TOOLS[gameId] = tools;
}

/** ¿Sacar a alguien de una partida de este juego la termina para todos? */
export function leaveEndsMatch(gameId: string): boolean {
  return !!MATCH_TOOLS[gameId]?.leaveEndsMatch;
}

/** Sacar a un jugador de la partida que lo ocupa (cualquiera puede, es la mesa de casa). */
export async function removeFromMatch(pid: string): Promise<void> {
  const m = matchOf(pid);
  if (!m) return;
  const tools = MATCH_TOOLS[m.gameId];
  if (!tools) throw new Error('Juego desconocido.');
  await tools.leave(m.id, pid);
}

/** Terminar una partida en curso desde la mesa. */
export async function endMatch(mid: string): Promise<void> {
  const m = state.matches.find((x) => x.id === mid);
  if (!m) return;
  const tools = MATCH_TOOLS[m.gameId];
  if (!tools) throw new Error('Juego desconocido.');
  await tools.end(mid);
}

// Semillas de una mesa recién creada. Incluyen la configuración por defecto de
// Los Hombres Lobo (herencia del esquema v1: extraRoles y varios settings son
// suyos); el resto de juegos guarda sus preferencias en settings.* propios.
export const DEFAULT_EXTRA_ROLES: RoleId[] = ['vidente', 'bruja', 'cazador', 'cupido'];

export const DEFAULT_SETTINGS: TableSettings = {
  revealDead: true, showComposition: true, alguacil: false, casual: false,
  primeraNocheTranquila: false, wolvesCount: null, // null = tabla oficial
  villagersCount: null, // null = los aldeanos rellenan los huecos libres
  videnteSoloBando: false, // la vidente solo ve si es lobo o no
  ocultarCausas: false, // no anunciar la causa de las muertes nocturnas
  pacing: 'teatral', // ritmo por defecto: pausas amplias y guion con ambientación
};

// Elegir (o cambiar) el juego de la mesa: lo ve todo el grupo al instante.
export async function selectGame(gameId: string | null): Promise<void> {
  await updateDoc(gref(mySlug()), { currentGame: gameId || null });
}

// Elegir el dispositivo que narrará las partidas automáticas (se recuerda para
// todos los juegos). Con una partida en contexto, el narrador ES su máster: al
// cambiarlo se traspasa el mando y el nuevo dispositivo toma la voz DE ESA
// partida (entra en sus members; el altavoz saliente que no jugaba queda libre).
export async function setNarratorDevice(pid: string | null): Promise<void> {
  const slug = mySlug();
  const m = ctxMatch();
  if (!m) {
    await updateDoc(gref(slug), { lastNarratorId: pid || null });
    return;
  }
  await txWithRetry(async (tx) => {
    if (pid) await assertFree(tx, slug, [pid], m.id);
    const snap = await tx.get(mref(slug, m.id));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDoc;
    const patch: Record<string, unknown> = { lastNarratorId: pid || null };
    const auto = data.game
      && ((data.game as { mode?: string }).mode === 'auto' || (data.game as unknown as { espia?: boolean }).espia);
    if (pid && auto) {
      patch.masterId = pid;
      let members = data.members || [];
      const old = data.masterId;
      // El altavoz saliente solo se queda si además juega la partida.
      if (old && old !== pid && !playsInMatch(data, old)) members = members.filter((x) => x !== old);
      if (!members.includes(pid)) members = [...members, pid];
      patch.members = members;
    }
    tx.update(mref(slug, m.id), patch);
  });
}

/** ¿Este miembro JUEGA la partida (además de, quizá, poner la voz)? */
function playsInMatch(m: Pick<MatchDoc, 'game'>, pid: string): boolean {
  const game = m.game as unknown as { espia?: boolean; unaNoche?: boolean; playerIds?: string[] } | null;
  if (!game) return false;
  // El Espía y Una Noche guardan a sus jugadores en game.playerIds (no tocan
  // los docs de jugador); Los Hombres Lobo, en player.inGame.
  if (game.espia || game.unaNoche) return (game.playerIds || []).includes(pid);
  const p = state.players.find((x) => x.id === pid);
  return !!p && !!p.inGame;
}

export async function createGroup(userName: string, groupName: string): Promise<void> {
  const slug = slugify(groupName);
  if (!slug) throw new Error('Nombre de grupo no válido.');
  const pid = playerIdFor(userName);
  if (!pid) throw new Error('Nombre de jugador no válido.');
  const token = randomId('t');
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (g.exists()) throw new CodedError('group-taken');
    tx.set(gref(slug), {
      name: groupName.trim(),
      createdAt: Date.now(),
      masterId: null, // en el lobby no hay máster: todos configuran e inician
      lastNarratorId: pid, // el primer dispositivo narra por defecto (cambiable)
      currentGame: null, // la mesa elige juego después
      status: 'lobby',
      settings: DEFAULT_SETTINGS,
      extraRoles: DEFAULT_EXTRA_ROLES,
      game: null,
    });
    tx.set(pref(slug, pid), basePlayer(userName, token));
  });
  saveSession(slug, { pid, token, name: userName.trim() });
  navigate('/g/' + slug);
}

export async function joinGroup(slug: string, userName: string): Promise<void> {
  const pid = playerIdFor(userName);
  if (!pid) throw new Error('Nombre de jugador no válido.');
  const token = randomId('t');
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) throw new CodedError('no-group');
    const p = await tx.get(pref(slug, pid));
    if (p.exists()) throw new CodedError('name-taken');
    // La mesa siempre acoge: las partidas en curso no bloquean la entrada
    // (el recién llegado puede mirar o arrancar otra partida con los libres).
    tx.set(pref(slug, pid), basePlayer(userName, token));
  });
  saveSession(slug, { pid, token, name: userName.trim() });
}

// Reconectar como un jugador existente (desconecta el dispositivo anterior).
export async function takeOverPlayer(slug: string, userName: string): Promise<void> {
  const pid = playerIdFor(userName);
  if (!pid) throw new CodedError('no-player');
  const token = randomId('t');
  const snap = await getDoc(pref(slug, pid));
  if (!snap.exists()) throw new CodedError('no-player');
  await updateDoc(pref(slug, pid), { deviceToken: token, heartbeatAt: Date.now() });
  saveSession(slug, { pid, token, name: snap.data().name });
}

// Entrar en un grupo que ya existe desde la portada: como jugador o reclamando
// el rol de máster (el máster anterior pasa a ser un jugador más). Si el nombre
// ya está en uso dentro del grupo, se reconecta como ese jugador.
export async function joinExistingGroup(groupName: string, userName: string, claimMaster: boolean): Promise<void> {
  const slug = slugify(groupName);
  const pid = playerIdFor(userName);
  if (!slug || !pid) throw new Error('Nombre no válido.');
  const token = randomId('t');
  let joinedName = userName.trim();
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) throw new CodedError('no-group');
    const p = await tx.get(pref(slug, pid));
    if (p.exists()) {
      joinedName = p.data().name;
      tx.update(pref(slug, pid), { deviceToken: token, heartbeatAt: Date.now() });
    } else {
      tx.set(pref(slug, pid), basePlayer(userName, token));
    }
    if (claimMaster) tx.update(gref(slug), { masterId: pid });
  });
  saveSession(slug, { pid, token, name: joinedName });
  navigate('/g/' + slug);
}

export function basePlayer(name: string, token: string) {
  return {
    name: name.trim(), deviceToken: token, order: Date.now(),
    role: null, alive: null, inGame: false,
    isPlayer: true, // por defecto todo dispositivo juega; se puede desactivar
    heartbeatAt: Date.now(), // nace «activo»: el latido periódico lo mantiene
  };
}

// Activa/desactiva un dispositivo como jugador de UN JUEGO (se recuerda para
// la revancha de ese juego sin contaminar las pantallas de los demás).
export async function setPlayerActive(gameId: string, pid: string, active: boolean): Promise<void> {
  await updateDoc(pref(mySlug(), pid), { ['isPlayerFor.' + gameId]: !!active });
}

export async function leaveGroup(): Promise<void> {
  const slug = state.route.slug;
  const myId = state.session?.pid;
  if (!slug || !myId) return;
  // Si estoy en una partida, salgo de ella primero (salida administrativa).
  if (matchOf(myId)) await removeFromMatch(myId).catch(() => { /* mejor esfuerzo */ });
  await txWithRetry(async (tx) => {
    const g = await tx.get(gref(slug));
    if (!g.exists()) return;
    const others = state.players.filter((p) => p.id !== myId);
    if (!others.length) {
      // Último jugador: la mesa se borra sola (con sus partidas). Sustituye al
      // antiguo botón «Eliminar la mesa» (demasiado peligroso).
      tx.delete(pref(slug, myId));
      for (const m of state.matches) tx.delete(mref(slug, m.id));
      tx.delete(gref(slug));
      return;
    }
    if (g.data().masterId === myId) {
      tx.update(gref(slug), { masterId: others[0].id });
    }
    tx.delete(pref(slug, myId));
  });
  clearSession(slug);
  navigate('/');
}

export async function kickPlayer(pid: string): Promise<void> {
  // Expulsar del grupo también lo saca de su partida (si estaba en una).
  if (matchOf(pid)) await removeFromMatch(pid).catch(() => { /* mejor esfuerzo */ });
  await deleteDoc(pref(mySlug(), pid));
}

export async function deleteGroup(): Promise<void> {
  const slug = mySlug();
  const ps = await getDocs(collection(db, 'groups', slug, 'players'));
  const ms = await getDocs(collection(db, 'groups', slug, 'matches'));
  const batch = writeBatch(db);
  ps.forEach((d) => batch.delete(d.ref));
  ms.forEach((d) => batch.delete(d.ref));
  batch.delete(gref(slug));
  await batch.commit();
  clearSession(slug);
  navigate('/');
}

// Orden de la mesa (sentido horario). Se guarda en el grupo y persiste entre partidas.
export async function setSeating(order: string[]): Promise<void> {
  await updateDoc(gref(mySlug()), { seating: order });
}

export async function setSettings(patch: Partial<TableSettings>): Promise<void> {
  // Escritura atómica por campo: dos cambios seguidos nunca se pisan entre sí.
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) updates['settings.' + k] = v === undefined ? null : v;
  await updateDoc(gref(mySlug()), updates);
}

export async function makeMaster(pid: string): Promise<void> {
  await updateDoc(gref(mySlug()), { masterId: pid });
}

export async function heartbeat(): Promise<void> {
  if (!state.session) return;
  await updateDoc(pref(mySlug(), myPid()), { heartbeatAt: Date.now() });
}
