// Acciones de «Captain Sonar» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia posiciones
// y estelas (cada tripulación ve solo su submarino) y resuelve torpedos, dron
// y silencio. Cada función envuelve el motor puro. Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import type { VoiceMode } from '../../core/narrator/voice-mode';
import {
  MIN_PLAYERS, MAX_PLAYERS, dealGame, splitSpeakers, move as moveMut, silence as silenceMut,
  torpedo as torpedoMut, drone as droneMut, surface as surfaceMut, resetForRematch,
  teamOf, canAct, legalDirs, torpedoTargets, silenceSteps, narrates, rival, TEAM_NAME,
} from './engine';
import type { Cell, Dir } from './map';
import type { SonarState } from './types';

export function sonarGame(g: GroupDoc | null): SonarState | null {
  const game = g?.game as unknown as SonarState | null;
  return game && game.sonar ? game : null;
}

interface TxExtra { game: SonarState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: SonarState, m: MatchDoc) => SonarState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('sonar');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as SonarState | null;
    if (!game || !game.sonar) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as SonarState;
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

export async function startSonar(
  playerIds: string[],
  voiceMode: VoiceMode,
  narratorId: string | null,
  speakerBlue: string | null,
): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Captain Sonar necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Captain Sonar admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  // F1: con un altavoz por corro, el reparto al azar podía dejar a los dos en la
  // misma tripulación (y al otro corro sin voz). Se separan tras el reparto.
  if (voiceMode === 'perRoom') splitSpeakers(deal.teams, speaker, speakerBlue);
  const game: SonarState = {
    sonar: true, phase: 'turn', startedAt: now, seed,
    playerIds, names, teams: deal.teams, subs: deal.subs,
    turnTeam: seed % 2 === 0 ? 'red' : 'blue',
    moves: { red: [], blue: [] },
    voiceMode, teamSpeakers: [speaker, voiceMode === 'perRoom' ? speakerBlue : null],
    winner: null, winReason: null,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])), paused: null, repeatNonce: 0,
    log: [{ txt: '⚓ Comienza Captain Sonar. Dos submarinos con posición SECRETA: cada rumbo se anuncia en voz alta y el rival lo apunta para triangularte. Cargad energía navegando… y hundidlo.' }],
  };
  const members = [...new Set([...playerIds, speaker, ...(voiceMode === 'perRoom' && speakerBlue ? [speakerBlue] : [])])];
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, members);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'sonar', createdAt: now,
      members, masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

// ——— Acciones del turno ———

export async function move(dir: Dir): Promise<void> {
  const me = myPid();
  await tx((game) => (moveMut(game, me, dir) ? game : null));
}
export async function silence(dir: Dir, steps = 1): Promise<void> {
  const me = myPid();
  await tx((game) => (silenceMut(game, me, dir, steps) ? game : null));
}
export async function torpedo(target: Cell): Promise<void> {
  const me = myPid();
  await tx((game) => (torpedoMut(game, me, target) ? game : null));
}
export async function drone(): Promise<void> {
  const me = myPid();
  await tx((game) => (droneMut(game, me) ? game : null));
}
export async function surface(): Promise<void> {
  const me = myPid();
  await tx((game) => (surfaceMut(game, me) ? game : null));
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: '🔁 Nueva partida: las MISMAS tripulaciones (nadie cambia de corro) y los submarinos recolocados en secreto. Vida y energía a cero.' });
    return game;
  });
}
export async function endSonar(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('sonar');
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

registerMatchTools('sonar', {
  leave: (mid) => endSonar(mid),
  end: (mid) => endSonar(mid),
  leaveEndsMatch: true,
});

export { teamOf, canAct, legalDirs, torpedoTargets, silenceSteps, narrates, rival, TEAM_NAME };
