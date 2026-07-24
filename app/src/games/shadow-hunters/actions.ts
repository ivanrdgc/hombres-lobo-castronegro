// Acciones de «Shadow Hunters» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia las
// identidades (cada uno ve la suya y lo que deduzca), tira los dados y reparte
// las pistas. Cada función envuelve el motor puro. Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, MAX_HP, dealGame, givePista as givePistaMut, attack as attackMut,
  rest as restMut, revealSelf as revealMut, resetForRematch, isAlive, aliveIds, factionOf,
  charOf, nextAlive,
} from './engine';
import type { ShadowHState } from './types';

export function shadowHGame(g: GroupDoc | null): ShadowHState | null {
  const game = g?.game as unknown as ShadowHState | null;
  return game && game.shadowh ? game : null;
}

interface TxExtra { game: ShadowHState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: ShadowHState, m: MatchDoc) => ShadowHState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('shadow_hunters');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as ShadowHState | null;
    if (!game || !game.shadowh) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as ShadowHState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

// ——— Inicio ———

export async function startShadowH(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Shadow Hunters necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Shadow Hunters admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const first = playerIds[seed % playerIds.length];
  const game: ShadowHState = {
    shadowh: true, phase: 'turn', startedAt: now, seed, rng: 0,
    playerIds, names, chars: deal.chars,
    hp: Object.fromEntries(playerIds.map((p) => [p, MAX_HP])),
    maxHp: MAX_HP,
    alive: Object.fromEntries(playerIds.map((p) => [p, true])),
    revealed: Object.fromEntries(playerIds.map((p) => [p, false])),
    turn: first,
    pista: null, killsBy: {},
    winner: null, winners: [], winReason: null,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])), paused: null, repeatNonce: 0,
    // Segunda línea: quién abre. Sin ella la mesa oía la intro y nadie sabía
    // por quién empezar (el motor ya canta el turno tras cada acción).
    log: [
      { txt: '🌘 Comienza Shadow Hunters. Cazadores, Sombras y neutrales con identidad SECRETA: dejad el móvil plano en la mesa y mirad vuestro personaje con el botón del ojo cuando queráis. En tu turno: pista, ataque, descanso… o revélate y usa tu poder.' },
      { txt: `🎬 Turno de ${names[first]}.` },
    ],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'shadow_hunters', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

// ——— Acciones del turno ———

export async function givePista(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => (givePistaMut(game, me, target) ? game : null));
}
export async function attack(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => (attackMut(game, me, target) ? game : null));
}
export async function rest(): Promise<void> {
  const me = myPid();
  await tx((game) => (restMut(game, me) ? game : null));
}
export async function revealSelf(target: string | null): Promise<void> {
  const me = myPid();
  await tx((game) => (revealMut(game, me, target) ? game : null));
}
/** Acusa recibo de la pista. La carta se retira SOLO cuando la han leído los
 *  dos: el que la da es el jugador activo y pulsaba al instante, borrándole el
 *  texto al que la recibe (y el texto ES la información del juego). */
export async function clearPista(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    const p = game.pista;
    if (!p || (p.target !== me && p.by !== me)) return null;
    const prev = p.ack || [];
    if (prev.includes(me)) return null;
    const ack = [...prev, me];
    if (ack.includes(p.by) && ack.includes(p.target)) game.pista = null;
    else game.pista = { ...p, ack };
    return game;
  }, undefined, { allowPaused: true });
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: '🔁 Nueva partida: identidades repartidas de nuevo.' });
    game.log.push({ txt: `🎬 Turno de ${game.names[game.turn] || 'alguien'}.` });
    return game;
  });
}
export async function endShadowH(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('shadow_hunters');
  if (!id) return;
  await deleteDoc(mref(mySlug(), id));
}

// ——— Pausa / repetir ———

export async function pauseGame(): Promise<void> {
  await tx((game) => {
    if (game.phase === 'end' || game.paused) return null;
    const who = state.players.find((p) => p.id === myPid());
    game.paused = { by: myPid(), name: who?.name || 'alguien', at: Date.now() };
    return game;
  }, undefined, { allowPaused: true });
}
export async function resumeGame(): Promise<void> {
  await tx((game) => { if (!game.paused) return null; game.paused = null; return game; }, undefined, { allowPaused: true });
}
export async function requestRepeat(): Promise<void> {
  await tx((game) => { game.repeatNonce = (game.repeatNonce || 0) + 1; return game; }, undefined, { allowPaused: true });
}

registerMatchTools('shadow_hunters', {
  leave: (mid) => endShadowH(mid),
  end: (mid) => endShadowH(mid),
  leaveEndsMatch: true,
});

export { isAlive, aliveIds, factionOf, charOf, nextAlive };
