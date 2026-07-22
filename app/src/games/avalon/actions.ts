// Acciones de «Ávalon» sobre Firestore. Todo el estado vive en el doc de SU
// partida (groups/<mesa>/matches/<mid>), como El Espía y Una Noche; los docs de
// jugador no se tocan. Transacciones «primero gana». La app hace de máster
// OCULTO: reparte lealtades, calcula el conocimiento cruzado y cuenta los votos
// de equipo y las cartas de misión en secreto, destapándolos a la vez.
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools, setSettings,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import { MIN_PLAYERS, MAX_PLAYERS, dealRoles, isEvil } from './roles';
import type { RoleId } from './roles';
import {
  playersOf, leaderId, assassinId, tallyVote, resolveQuest, checkAfterQuest, pendingActors,
  validTeam, nplayers,
} from './engine';
import type { AvalonState } from './types';

/** El estado de Ávalon, si la partida de la vista es de este juego. */
export function avalonGame(g: GroupDoc | null): AvalonState | null {
  const game = g?.game as unknown as AvalonState | null;
  return game && game.avalon ? game : null;
}

interface TxExtra { game: AvalonState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: AvalonState, m: MatchDoc) => AvalonState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('avalon');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as AvalonState | null;
    if (!game || !game.avalon) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as AvalonState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: AvalonState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';
const listNames = (g: AvalonState, pids: string[]) => pids.map((p) => nameOf(g, p)).join(', ');

// ——— Inicio ———

export async function startAvalon(
  playerIds: string[],
  narratorId: string | null,
  enabledRoles: RoleId[],
): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Ávalon necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Ávalon admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const players = playerIds.map((id, i) => ({ id, order: i }));
  const { roles, dropped } = dealRoles(players, enabledRoles, seed);
  const game: AvalonState = {
    avalon: true, phase: 'reveal', startedAt: now, seed,
    playerIds, names, roles, enabledRoles, dropped,
    seen: {}, leaderIdx: seed % playerIds.length,
    quest: 1, results: [], voteTrack: 0, team: [], votes: {}, lastVote: null,
    questCards: {}, lastQuest: null, assassinTarget: null,
    winner: null, winReason: null, paused: null, repeatNonce: 0,
    log: [{ txt: `🏰 Comienza Ávalon con ${playerIds.length} caballeros. El Bien busca completar tres misiones; el Mal, sabotearlas.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'avalon', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker,
      settings: {}, extraRoles: [], game,
    }));
  });
  await setSettings({ avalon: enabledRoles }).catch(() => { /* mejor esfuerzo */ });
}

// ——— Reparto (reveal) ———

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me)) return null;
    game.seen = { ...(game.seen || {}), [me]: true };
    return game;
  });
}

/** Cuando todos han visto su carta, cualquiera abre la primera misión. */
export async function beginQuests(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'reveal') return null;
    if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'propose';
    game.log.push({ txt: `🗺️ Todos conocéis vuestra lealtad. Misión 1: propone equipo ${nameOf(game, leaderId(game))}.` });
    return game;
  });
}

// ——— Propuesta de equipo (líder) ———

export async function proposeTeam(pids: string[]): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'propose' || me !== leaderId(game)) return null;
    if (!validTeam(game, pids)) return null;
    game.team = [...new Set(pids)];
    game.votes = {};
    game.phase = 'vote';
    game.log.push({ txt: `🧭 ${nameOf(game, me)} propone para la misión ${game.quest}: ${listNames(game, game.team)}.` });
    return game;
  });
}

// ——— Voto de la propuesta (todos, en secreto) ———

export async function voteTeam(approve: boolean): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'vote' || !game.playerIds.includes(me)) return null;
    if (game.votes[me] !== undefined) return null;
    game.votes = { ...game.votes, [me]: approve };
    if (Object.keys(game.votes).length < nplayers(game)) return game; // faltan votos
    // Todos han votado: se destapan a la vez (públicos, como en el original).
    const { approvals, rejections, approved } = tallyVote(game);
    game.lastVote = { team: game.team, leaderId: leaderId(game), approvals, rejections, approved };
    game.phase = 'voteReveal';
    game.log.push({ txt: `🗳️ Propuesta ${approved ? 'APROBADA' : 'RECHAZADA'} (${approvals.length} a favor, ${rejections.length} en contra).` });
    return game;
  });
}

/** Tras destapar el voto: si se aprobó, a la misión; si no, rota el líder. */
export async function continueAfterVote(): Promise<void> {
  const me = myPid();
  await tx((game, m) => {
    if (game.phase !== 'voteReveal') return null;
    if (!game.playerIds.includes(me) && me !== m.masterId) return null;
    if (game.lastVote?.approved) {
      game.questCards = {};
      game.phase = 'quest';
      game.log.push({ txt: `⚔️ El equipo parte a la misión ${game.quest}: ${listNames(game, game.team)}.` });
      return game;
    }
    // Rechazada: pasa el liderazgo y sube el contador de rechazos.
    game.voteTrack += 1;
    game.leaderIdx = (game.leaderIdx + 1) % nplayers(game);
    game.votes = {};
    game.team = [];
    if (game.voteTrack >= 5) {
      game.winner = 'evil';
      game.winReason = 'Cinco propuestas seguidas rechazadas: el reino cae en el caos y gana el Mal.';
      game.phase = 'end';
      game.log.push({ txt: `🗡️ ${game.winReason}` });
      return game;
    }
    game.phase = 'propose';
    game.log.push({ txt: `↪️ Propuesta ${game.voteTrack}/5 rechazada. Ahora propone ${nameOf(game, leaderId(game))}.` });
    return game;
  });
}

// ——— Cartas de misión (miembros del equipo, en secreto) ———

export async function questCard(wantSuccess: boolean): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'quest' || !game.team.includes(me)) return null;
    if (game.questCards[me] !== undefined) return null;
    // El Bien SIEMPRE juega Éxito (no puede sabotear); solo el Mal puede fallar.
    const success = isEvil(game.roles[me]) ? !!wantSuccess : true;
    game.questCards = { ...game.questCards, [me]: success };
    if (game.team.some((pid) => game.questCards[pid] === undefined)) return game; // faltan cartas
    const { fails, required, success: ok } = resolveQuest(game);
    game.results.push(ok ? 'success' : 'fail');
    game.lastQuest = { quest: game.quest, team: game.team, fails, required, success: ok };
    game.phase = 'result';
    game.log.push({ txt: `${ok ? '✅' : '💥'} Misión ${game.quest}: ${ok ? 'ÉXITO' : 'FRACASO'} (${fails} sabotaje${fails === 1 ? '' : 's'}).` });
    return game;
  });
}

/** Tras el resultado: ¿fin de partida, fase del Asesino o siguiente misión? */
export async function continueAfterResult(): Promise<void> {
  const me = myPid();
  await tx((game, m) => {
    if (game.phase !== 'result') return null;
    if (!game.playerIds.includes(me) && me !== m.masterId) return null;
    const chk = checkAfterQuest(game);
    if (chk.winner) {
      game.winner = chk.winner;
      game.winReason = chk.reason;
      game.phase = 'end';
      game.log.push({ txt: `🗡️ ${chk.reason}` });
      return game;
    }
    if (chk.goodReachedThree) {
      if (assassinId(game)) {
        game.phase = 'assassin';
        game.log.push({ txt: '🗡️ El Bien ha completado tres misiones… pero el Asesino aún puede cambiarlo todo: busca a Merlín.' });
        return game;
      }
      game.winner = 'good';
      game.winReason = 'El Bien completa tres misiones y no hay Asesino que lo impida.';
      game.phase = 'end';
      game.log.push({ txt: `🏰 ${game.winReason}` });
      return game;
    }
    // Siguiente misión: rota el líder, reinicia el contador de rechazos.
    game.quest += 1;
    game.voteTrack = 0;
    game.leaderIdx = (game.leaderIdx + 1) % nplayers(game);
    game.team = [];
    game.votes = {};
    game.questCards = {};
    game.phase = 'propose';
    game.log.push({ txt: `🗺️ Misión ${game.quest}: propone ${nameOf(game, leaderId(game))}.` });
    return game;
  });
}

// ——— El Asesino busca a Merlín ———

export async function assassinate(targetId: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'assassin' || me !== assassinId(game)) return null;
    if (!game.playerIds.includes(targetId)) return null;
    game.assassinTarget = targetId;
    const hitMerlin = game.roles[targetId] === 'merlin';
    game.winner = hitMerlin ? 'evil' : 'good';
    game.winReason = hitMerlin
      ? `El Asesino ha encontrado a Merlín (${nameOf(game, targetId)}): el Mal se lleva la victoria.`
      : `El Asesino señaló a ${nameOf(game, targetId)}, que NO era Merlín: el Bien conserva la victoria.`;
    game.phase = 'end';
    game.log.push({ txt: `🗡️ ${game.winReason}` });
    return game;
  });
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const players = game.playerIds.map((id, i) => ({ id, order: i }));
    const seed = (game.seed || 0) + 101;
    const { roles, dropped } = dealRoles(players, game.enabledRoles, seed);
    game.seed = seed;
    game.roles = roles;
    game.dropped = dropped;
    game.phase = 'reveal';
    game.seen = {};
    game.leaderIdx = seed % players.length;
    game.quest = 1;
    game.results = [];
    game.voteTrack = 0;
    game.team = [];
    game.votes = {};
    game.lastVote = null;
    game.questCards = {};
    game.lastQuest = null;
    game.assassinTarget = null;
    game.winner = null;
    game.winReason = null;
    game.log.push({ txt: '🔁 Nueva partida: lealtades repartidas de nuevo.' });
    return game;
  });
}

export async function endAvalon(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('avalon');
  if (!id) return;
  await deleteDoc(mref(mySlug(), id));
}

// ——— Pausa / repetir (voz) ———

export async function pauseGame(): Promise<void> {
  await tx((game) => {
    if (game.phase === 'end' || game.paused) return null;
    const who = state.players.find((p) => p.id === myPid());
    game.paused = { by: myPid(), name: who?.name || 'alguien', at: Date.now() };
    return game;
  }, undefined, { allowPaused: true });
}

export async function resumeGame(): Promise<void> {
  await tx((game) => {
    if (!game.paused) return null;
    game.paused = null;
    return game;
  }, undefined, { allowPaused: true });
}

export async function requestRepeat(): Promise<void> {
  await tx((game) => {
    game.repeatNonce = (game.repeatNonce || 0) + 1;
    return game;
  }, undefined, { allowPaused: true });
}

// ——— Herramientas de la mesa ———
// Una partida de Ávalon depende del reparto completo: sacar a alguien (o que el
// narrador se marche) lo invalida, así que ambos casos terminan la partida.
registerMatchTools('avalon', {
  leave: (mid) => endAvalon(mid),
  end: (mid) => endAvalon(mid),
});

/** Utilidades para la UI. */
export { playersOf, leaderId, assassinId, pendingActors };
