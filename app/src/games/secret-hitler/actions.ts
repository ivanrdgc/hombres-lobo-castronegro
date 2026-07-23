// Acciones de «Secret Hitler» sobre Firestore. Todo el estado vive en el
// doc de su partida (matches/<mid>); los docs de jugador no se tocan. La app
// hace de máster OCULTO: baraja y reparte el mazo de decretos, muestra a cada
// gobierno solo lo que le toca ver, aplica los poderes presidenciales y detecta
// las victorias. Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import { MIN_PLAYERS, MAX_PLAYERS, dealRoles, newDeck, factionOf } from './roles';
import type { PolicyId } from './roles';
import {
  presidentId, advancePresidency, eligibleChancellors, tallyElection, takeTop, drawTop,
  enactPolicy, checkPolicyWin, hitlerChancellorWin, aliveIds, aliveCount, playersOf, pendingActors,
} from './engine';
import type { SHState } from './types';

export function shGame(g: GroupDoc | null): SHState | null {
  const game = g?.game as unknown as SHState | null;
  return game && game.secretHitler ? game : null;
}

interface TxExtra { game: SHState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: SHState, m: MatchDoc) => SHState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('secret_hitler');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as SHState | null;
    if (!game || !game.secretHitler) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as SHState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: SHState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';

// ——— Inicio ———

export async function startSecretHitler(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Secret Hitler necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Secret Hitler admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const players = playerIds.map((id, i) => ({ id, order: i }));
  const { roles } = dealRoles(players, seed);
  const game: SHState = {
    secretHitler: true, phase: 'reveal', startedAt: now, seed,
    playerIds, names, roles, alive: Object.fromEntries(playerIds.map((p) => [p, true])), seen: {},
    presidentIdx: seed % playerIds.length, specialPresident: null, nominatedChancellor: null,
    lastPresident: null, lastChancellor: null, votes: {}, lastElection: null,
    electionTracker: 0, liberalPolicies: 0, fascistPolicies: 0,
    draw: newDeck(seed), discard: [], presidentDraw: null, chancellorDraw: null,
    vetoUnlocked: false, vetoRequested: false, lastEnacted: null, power: null,
    peek: null, investigateResult: null, investigated: [], reshuffles: 0,
    winner: null, winReason: null, paused: null, repeatNonce: 0,
    log: [{ txt: `🏛️ Comienza Secret Hitler con ${playerIds.length} jugadores. Liberales contra fascistas… y un Hitler oculto.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'secret_hitler', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me)) return null;
    game.seen = { ...(game.seen || {}), [me]: true };
    return game;
  });
}

export async function beginGame(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'reveal') return null;
    if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'nominate';
    game.log.push({ txt: `🏛️ Todos conocéis vuestro bando. Preside ${nameOf(game, presidentId(game))}: que nomine Canciller.` });
    return game;
  });
}

// ——— Nominación y elección ———

export async function nominateChancellor(pid: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'nominate' || me !== presidentId(game)) return null;
    if (!eligibleChancellors(game).includes(pid)) return null;
    game.nominatedChancellor = pid;
    game.votes = {};
    game.phase = 'election';
    game.log.push({ txt: `🤝 ${nameOf(game, presidentId(game))} nomina Canciller a ${nameOf(game, pid)}. ¡A votar!` });
    return game;
  });
}

export async function voteGov(ja: boolean): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'election' || !game.alive[me]) return null;
    if (game.votes[me] !== undefined) return null;
    game.votes = { ...game.votes, [me]: ja };
    if (aliveIds(game).some((pid) => game.votes[pid] === undefined)) return game; // faltan votos
    const { ja: jaV, nein, passed } = tallyElection(game);
    const pres = presidentId(game);
    const chan = game.nominatedChancellor!;
    game.lastElection = { president: pres, chancellor: chan, ja: jaV, nein, passed };
    game.log.push({ txt: `🗳️ Gobierno ${passed ? 'APROBADO' : 'RECHAZADO'} (${jaV.length} Ja, ${nein.length} Nein).` });
    if (!passed) {
      game.nominatedChancellor = null;
      game.electionTracker += 1;
      if (game.electionTracker >= 3) return chaos(game);
      advancePresidency(game);
      game.phase = 'nominate';
      game.log.push({ txt: `😳 Van ${game.electionTracker}/3 gobiernos caídos. Preside ahora ${nameOf(game, presidentId(game))}.` });
      return game;
    }
    // Aprobado: ¿trampa de Hitler Canciller?
    game.electionTracker = 0;
    if (hitlerChancellorWin(game, chan)) {
      game.winner = 'fascist';
      game.winReason = `¡${nameOf(game, chan)} era Hitler y ha sido elegido Canciller con tres decretos fascistas! Ganan los fascistas.`;
      game.phase = 'end';
      game.log.push({ txt: `💀 ${game.winReason}` });
      return game;
    }
    // Sesión legislativa: el Presidente roba 3 (en secreto).
    game.lastPresident = pres;
    game.lastChancellor = chan;
    game.presidentDraw = takeTop(game, 3);
    game.phase = 'legislativePresident';
    game.log.push({ txt: `📜 Gobierno en marcha: ${nameOf(game, pres)} estudia tres decretos y descartará uno.` });
    return game;
  });
}

// Caos: 3 gobiernos caídos → se promulga el decreto de arriba a ciegas.
function chaos(game: SHState): SHState {
  const [top] = takeTop(game, 1);
  const power = enactPolicy(game, top); // el caos NO activa poderes
  game.log.push({ txt: `🔥 ¡Caos! Tres gobiernos rechazados: se promulga a ciegas un decreto ${top === 'liberal' ? 'LIBERAL 🕊️' : 'FASCISTA 🐷'}.` });
  game.electionTracker = 0;
  game.lastPresident = null; // el caos borra los límites de mandato
  game.lastChancellor = null;
  game.nominatedChancellor = null;
  const win = checkPolicyWin(game);
  if (win.winner) {
    game.winner = win.winner; game.winReason = win.reason; game.phase = 'end';
    game.log.push({ txt: win.winner === 'liberal' ? `🕊️ ${win.reason}` : `🐷 ${win.reason}` });
    return game;
  }
  void power; // el poder se ignora en el caos (regla oficial)
  advancePresidency(game);
  game.phase = 'nominate';
  return game;
}

// ——— Sesión legislativa ———

export async function presidentDiscard(index: number): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'legislativePresident' || me !== presidentId(game)) return null;
    const draw = game.presidentDraw;
    if (!draw || index < 0 || index >= draw.length) return null;
    game.discard.push(draw[index]);
    game.chancellorDraw = draw.filter((_, i) => i !== index);
    game.presidentDraw = null;
    game.phase = 'legislativeChancellor';
    game.log.push({ txt: `📜 ${nameOf(game, me)} pasa dos decretos al Canciller.` });
    return game;
  });
}

export async function chancellorEnact(index: number): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'legislativeChancellor' || me !== game.nominatedChancellor) return null;
    const draw = game.chancellorDraw;
    if (!draw || index < 0 || index >= draw.length) return null;
    const enacted = draw[index];
    const other = draw.find((_, i) => i !== index);
    if (other) game.discard.push(other);
    game.chancellorDraw = null;
    game.vetoRequested = false;
    return afterEnact(game, enacted);
  });
}

// Coloca el decreto, comprueba victoria y dispara el poder presidencial si toca.
function afterEnact(game: SHState, policy: PolicyId): SHState {
  const power = enactPolicy(game, policy);
  game.log.push({ txt: `${policy === 'liberal' ? '🕊️' : '🐷'} Se promulga un decreto ${policy === 'liberal' ? 'LIBERAL' : 'FASCISTA'} (🕊️ ${game.liberalPolicies} · 🐷 ${game.fascistPolicies}).` });
  const win = checkPolicyWin(game);
  if (win.winner) {
    game.winner = win.winner; game.winReason = win.reason; game.phase = 'end';
    game.log.push({ txt: win.winner === 'liberal' ? `🕊️ ${win.reason}` : `🐷 ${win.reason}` });
    return game;
  }
  if (power) {
    const by = presidentId(game);
    game.power = { type: power, by };
    game.peek = power === 'peek' ? drawTop(game, 3) : null;
    game.investigateResult = null;
    game.phase = 'power';
    return game;
  }
  advancePresidency(game);
  game.phase = 'nominate';
  game.nominatedChancellor = null;
  return game;
}

// ——— Veto (con 5 decretos fascistas) ———

export async function requestVeto(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'legislativeChancellor' || me !== game.nominatedChancellor) return null;
    if (!game.vetoUnlocked) return null;
    game.vetoRequested = true;
    game.phase = 'vetoDecision';
    game.log.push({ txt: `✋ El Canciller propone VETAR esta agenda. Decide el Presidente.` });
    return game;
  });
}

export async function decideVeto(agree: boolean): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'vetoDecision' || me !== presidentId(game)) return null;
    if (agree) {
      for (const c of game.chancellorDraw || []) game.discard.push(c);
      game.chancellorDraw = null;
      game.vetoRequested = false;
      game.electionTracker += 1;
      game.log.push({ txt: `🚫 Veto aceptado: la agenda se descarta (${game.electionTracker}/3 hacia el caos).` });
      if (game.electionTracker >= 3) return chaos(game);
      advancePresidency(game);
      game.phase = 'nominate';
      game.nominatedChancellor = null;
      return game;
    }
    // Rechazado: el Canciller DEBE promulgar (ya sin veto).
    game.vetoRequested = false;
    game.phase = 'legislativeChancellor';
    game.log.push({ txt: `↩️ El Presidente rechaza el veto: el Canciller debe promulgar.` });
    return game;
  });
}

// ——— Poderes presidenciales ———

export async function powerPeekDone(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'power' || game.power?.type !== 'peek' || me !== game.power.by) return null;
    game.peek = null;
    game.power = null;
    advancePresidency(game);
    game.phase = 'nominate';
    game.nominatedChancellor = null;
    game.log.push({ txt: `🔮 El Presidente ha atisbado el futuro. Preside ahora ${nameOf(game, presidentId(game))}.` });
    return game;
  });
}

export async function powerInvestigate(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'power' || game.power?.type !== 'investigate' || me !== game.power.by) return null;
    if (game.investigateResult) return null; // ya investigó este turno
    if (!game.alive[target] || target === me || game.investigated.includes(target)) return null;
    game.investigateResult = { target, faction: factionOf(game.roles[target]) };
    game.investigated = [...game.investigated, target];
    game.log.push({ txt: `🔎 ${nameOf(game, me)} investiga la lealtad de ${nameOf(game, target)}…` });
    return game;
  });
}

export async function powerInvestigateDone(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'power' || game.power?.type !== 'investigate' || me !== game.power.by) return null;
    if (!game.investigateResult) return null;
    game.investigateResult = null;
    game.power = null;
    advancePresidency(game);
    game.phase = 'nominate';
    game.nominatedChancellor = null;
    return game;
  });
}

export async function powerSpecialElection(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'power' || game.power?.type !== 'special' || me !== game.power.by) return null;
    if (!game.alive[target] || target === me) return null;
    game.specialPresident = target;
    game.power = null;
    game.phase = 'nominate';
    game.nominatedChancellor = null;
    game.log.push({ txt: `🗳️ ${nameOf(game, me)} convoca una elección especial: preside ${nameOf(game, target)}.` });
    return game;
  });
}

export async function powerExecute(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'power' || game.power?.type !== 'execution' || me !== game.power.by) return null;
    if (!game.alive[target] || target === me) return null;
    game.alive = { ...game.alive, [target]: false };
    game.power = null;
    game.log.push({ txt: `💀 ${nameOf(game, me)} ejecuta a ${nameOf(game, target)}.` });
    if (game.roles[target] === 'hitler') {
      game.winner = 'liberal';
      game.winReason = `¡${nameOf(game, target)} era Hitler! La bala salva la República: ganan los liberales.`;
      game.phase = 'end';
      game.log.push({ txt: `🕊️ ${game.winReason}` });
      return game;
    }
    // Si el ejecutado era el último Canciller/Presidente, se libera el límite.
    if (game.lastChancellor === target) game.lastChancellor = null;
    if (game.lastPresident === target) game.lastPresident = null;
    advancePresidency(game);
    game.phase = 'nominate';
    game.nominatedChancellor = null;
    return game;
  });
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const players = game.playerIds.map((id, i) => ({ id, order: i }));
    const seed = (game.seed || 0) + 101;
    const { roles } = dealRoles(players, seed);
    Object.assign(game, {
      seed, roles, phase: 'reveal', seen: {},
      alive: Object.fromEntries(game.playerIds.map((p) => [p, true])),
      presidentIdx: seed % players.length, specialPresident: null, nominatedChancellor: null,
      lastPresident: null, lastChancellor: null, votes: {}, lastElection: null,
      electionTracker: 0, liberalPolicies: 0, fascistPolicies: 0,
      draw: newDeck(seed), discard: [], presidentDraw: null, chancellorDraw: null,
      vetoUnlocked: false, vetoRequested: false, lastEnacted: null, power: null,
      peek: null, investigateResult: null, investigated: [], reshuffles: 0,
      winner: null, winReason: null,
    });
    game.log.push({ txt: '🔁 Nueva partida: bandos repartidos de nuevo.' });
    return game;
  });
}

export async function endSecretHitler(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('secret_hitler');
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

// Una partida depende del reparto completo: sacar a alguien o que el narrador se
// vaya la invalida → termina para todos.
registerMatchTools('secret_hitler', {
  leave: (mid) => endSecretHitler(mid),
  end: (mid) => endSecretHitler(mid),
});

export { playersOf, presidentId, pendingActors, eligibleChancellors, aliveCount };
