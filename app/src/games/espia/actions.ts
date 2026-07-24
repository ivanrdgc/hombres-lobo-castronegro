// Acciones de El Espía sobre Firestore. Todo el estado vive en el doc de SU
// partida (transacciones «primero gana» sobre groups/<mesa>/matches/<mid>);
// los docs de jugador no se tocan. Las acciones de grupo están en core.
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import { e2eTestMode } from '../../core/test-hooks';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  ESPIA_MIN_PLAYERS, ESPIA_MAX_PLAYERS, applyDelta, dealRound, resolveConviction, resolveGuess,
  resolveSpyLeft, resolveTimeout, resolveVoid, tallyVote, timeupOrder,
} from './engine';
import { LOCATIONS, locationById } from './locations';
import type { EspiaOutcome, EspiaState } from './types';

/** El estado de El Espía, si la partida de la vista es de este juego. */
export function espiaGame(g: GroupDoc | null): EspiaState | null {
  const game = g?.game as unknown as EspiaState | null;
  return game && game.espia ? game : null;
}

interface EspiaTxExtra {
  game: EspiaState;
  members?: string[];
  masterPatch?: string | null;
}

type EspiaTxFn = (game: EspiaState, m: MatchDoc) => EspiaState | EspiaTxExtra | null | undefined;

// Transacción sobre el doc de la partida: lee, aplica fn sobre una copia y
// escribe. fn devuelve null para abortar sin cambios (otro se adelantó).
// Con la partida en pausa nadie mueve ficha (salvo las acciones de la propia
// pausa, que pasan `allowPaused`).
async function espiaTx(fn: EspiaTxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('espia');
  if (!id) return;
  await txWithRetry(async (tx) => {
    const snap = await tx.get(mref(slug, id));
    if (!snap.exists()) return; // la partida terminó mientras tanto
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as EspiaState | null;
    if (!game || !game.espia) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as EspiaState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as EspiaTxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    tx.update(mref(slug, id), patch);
  });
}

const nameOf = (s: EspiaState, pid: string | null | undefined): string => (pid && s.names[pid]) || '¿?';

// ——— Inicio ———

export async function startEspia(playerIds: string[], speakerId: string | null, durationMin: number): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < ESPIA_MIN_PLAYERS) throw new Error(`El Espía necesita al menos ${ESPIA_MIN_PLAYERS} jugadores.`);
  if (playerIds.length > ESPIA_MAX_PLAYERS) throw new Error(`El Espía admite ${ESPIA_MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const now = Date.now();
  const deal = dealRound(playerIds, 1, [], now);
  const speaker = speakerId || myPid();
  const game: EspiaState = {
    espia: true, phase: 'reveal', startedAt: now, round: 1,
    playerIds, names,
    dealerId: deal.dealerId, spyId: deal.spyId, locationId: deal.locationId, roles: deal.roles,
    // Semilla de test: cada «minuto» dura 4 s, para poder probar el flujo de
    // tiempo agotado sin esperas reales. Jamás activa fuera de Playwright.
    seen: {}, durationMs: Math.max(1, durationMin) * (e2eTestMode() ? 4000 : 60000), deadline: null,
    voteSeq: 0, accusedUsed: {}, vote: null, timeupTurn: null,
    usedLocations: [deal.locationId], scores: {}, history: [], outcome: null,
    paused: null, repeatNonce: 0,
    log: [{ txt: `🕵️ Ronda 1: cartas repartidas (${playerIds.length} agentes… o casi).` }],
  };
  await txWithRetry(async (tx) => {
    const snap = await tx.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    // Nadie puede estar en dos partidas a la vez (la mesa admite varias).
    await assertFree(tx, slug, [...new Set([...playerIds, speaker])]);
    tx.update(gref(slug), { lastNarratorId: speaker });
    tx.set(mref(slug, mid), sanitize({
      gameId: 'espia',
      createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker,
      lastNarratorId: speaker,
      settings: { espiaMin: Math.max(1, durationMin) },
      extraRoles: [],
      game,
    }));
  });
}

// ——— Ronda ———

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me) || game.seen[me]) return null;
    game.seen[me] = true;
    return game;
  });
}

/** Todos han visto su carta: cualquiera pone el reloj en marcha. */
export async function beginRound(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase !== 'reveal') return null;
    if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'play';
    game.deadline = Date.now() + game.durationMs;
    game.log.push({ txt: `⏱️ El reloj está en marcha: ${Math.round(game.durationMs / 60000)} minutos. Empieza preguntando ${nameOf(game, game.dealerId)}.` });
    return game;
  });
}

/** Parar el reloj y acusar (una vez por ronda y jugador). */
export async function accuse(accusedId: string): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'play' || game.vote || game.deadline === null) return null;
    if (!game.playerIds.includes(me) || game.accusedUsed[me]) return null;
    if (!game.playerIds.includes(accusedId) || accusedId === me) return null;
    game.accusedUsed[me] = true;
    game.voteSeq += 1;
    game.vote = {
      accuserId: me, accusedId, votes: {},
      frozenMs: Math.max(0, game.deadline - Date.now()), fromTimeup: false,
    };
    game.deadline = null; // reloj congelado durante la votación
    game.log.push({ txt: `🛑 ${nameOf(game, me)} detiene el reloj y acusa a ${nameOf(game, accusedId)}.` });
    return game;
  });
}

/** Acusación en los turnos tras el tiempo. */
export async function timeupAccuse(accusedId: string): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'timeup' || game.vote || game.timeupTurn === null) return null;
    const order = timeupOrder(game);
    if (order[game.timeupTurn] !== me) return null;
    if (!game.playerIds.includes(accusedId) || accusedId === me) return null;
    game.voteSeq += 1;
    game.vote = { accuserId: me, accusedId, votes: {}, frozenMs: 0, fromTimeup: true };
    game.log.push({ txt: `👉 ${nameOf(game, me)} acusa a ${nameOf(game, accusedId)}.` });
    return game;
  });
}

export async function timeupPass(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'timeup' || game.vote || game.timeupTurn === null) return null;
    const order = timeupOrder(game);
    if (order[game.timeupTurn] !== me) return null;
    game.log.push({ txt: `🤐 ${nameOf(game, me)} pasa: no acusa a nadie.` });
    return advanceTimeupTurn(game);
  });
}

/** Desatasco: la mesa salta el turno de quien no responde (móvil muerto, se
 *  fue al baño…). Lo pide cualquier OTRO jugador de la ronda; sin esto, la
 *  única salida era borrar la partida. */
export async function timeupSkip(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'timeup' || game.vote || game.timeupTurn === null) return null;
    if (!game.playerIds.includes(me)) return null;
    const holder = timeupOrder(game)[game.timeupTurn];
    if (!holder || holder === me) return null; // el suyo lo pasa él con «🤐 Paso»
    game.log.push({ txt: `⏭️ La mesa salta el turno de ${nameOf(game, holder)} (no responde).` });
    return advanceTimeupTurn(game);
  });
}

/** Retirar la acusación propia: si alguien no vota, la mesa se quedaba
 *  colgada para siempre. La acusación sigue GASTADA (si se devolviera, parar
 *  el reloj para leer caras y retirar saldría gratis). */
export async function cancelAccusation(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    const vote = game.vote;
    if (!vote || game.phase === 'end' || vote.accuserId !== me) return null;
    game.vote = null;
    game.log.push({ txt: `↩️ ${nameOf(game, me)} retira su acusación contra ${nameOf(game, vote.accusedId)}.` });
    if (vote.fromTimeup) return advanceTimeupTurn(game); // era su turno: pasa
    game.deadline = Date.now() + vote.frozenMs; // el reloj se reanuda donde estaba
    return game;
  });
}

// Turno siguiente tras un pase o una votación fallida; si se acaban, el espía gana.
function advanceTimeupTurn(game: EspiaState): EspiaState {
  const order = timeupOrder(game);
  const next = (game.timeupTurn ?? 0) + 1;
  if (next >= order.length) return finishRound(game, resolveTimeout(game));
  game.timeupTurn = next;
  return game;
}

/** Voto de una acusación: cualquier «no» la tumba al instante; todos «sí» condena. */
export async function voteAccusation(agree: boolean): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    const vote = game.vote;
    if (!vote || game.phase === 'end') return null;
    if (!game.playerIds.includes(me) || me === vote.accuserId || me === vote.accusedId) return null;
    if (vote.votes[me] !== undefined) return null;
    vote.votes[me] = agree;
    if (!agree) {
      game.log.push({ txt: `❌ ${nameOf(game, me)} no lo ve claro: la acusación contra ${nameOf(game, vote.accusedId)} cae.` });
      game.vote = null;
      if (vote.fromTimeup) return advanceTimeupTurn(game);
      game.deadline = Date.now() + vote.frozenMs; // el reloj se reanuda
      return game;
    }
    const t = tallyVote(game.playerIds, vote);
    if (!t.allYes) return game; // faltan votos
    // Unanimidad: se revela la carta y la ronda termina (sea quien sea).
    game.vote = null;
    return finishRound(game, resolveConviction(game, vote.accusedId, vote.accuserId));
  });
}

/** El espía se revela y adivina la localización: mientras corre el reloj Y
 *  también en la tanda de acusaciones (nunca durante una votación). Su jugada
 *  no caduca con el reloj: es lo que prometen su carta y las reglas. */
export async function spyGuess(guessId: string): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if ((game.phase !== 'play' && game.phase !== 'timeup') || game.vote || me !== game.spyId) return null;
    if (!locationById(guessId)) return null;
    return finishRound(game, resolveGuess(game, guessId));
  });
}

/** El reloj llega a cero: empieza la tanda de acusaciones. Cualquier dispositivo. */
export async function timeUp(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase !== 'play' || game.vote || game.deadline === null) return null;
    if (Date.now() < game.deadline - 1500) return null; // aún no (tolerancia de reloj)
    game.phase = 'timeup';
    game.deadline = null;
    game.timeupTurn = 0;
    game.log.push({ txt: '⏰ ¡Se acabó el tiempo! Acusaciones por turnos, empezando por quien preguntó primero.' });
    return game;
  });
}

function finishRound(game: EspiaState, outcome: EspiaOutcome): EspiaState {
  game.phase = 'end';
  game.vote = null;
  game.deadline = null;
  game.timeupTurn = null;
  game.outcome = outcome;
  game.scores = applyDelta(game.scores, outcome.delta);
  game.history.push({ round: game.round, locationId: game.locationId, spyId: game.spyId, txt: outcome.txt });
  game.log.push({ txt: outcome.txt });
  return game;
}

// ——— Entre rondas ———

/** Nueva ronda con los mismos jugadores: rota el repartidor y cambia el lugar. */
export async function nextRound(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase !== 'end') return null;
    // Sin quórum no se reparte: con 2 la ronda sale degenerada (el «espía» y un
    // agente) y nadie tendría a quién acusar. La UI ya lo avisa; esto cubre la
    // carrera de dos dedos a la vez.
    if (game.playerIds.length < ESPIA_MIN_PLAYERS) {
      throw new Error(`Faltan jugadores: El Espía necesita ${ESPIA_MIN_PLAYERS} para otra ronda.`);
    }
    const round = game.round + 1;
    const deal = dealRound(game.playerIds, round, game.usedLocations, Date.now());
    game.round = round;
    game.dealerId = deal.dealerId;
    game.spyId = deal.spyId;
    game.locationId = deal.locationId;
    game.roles = deal.roles;
    game.seen = {};
    game.deadline = null;
    game.voteSeq = 0;
    game.accusedUsed = {};
    game.vote = null;
    game.timeupTurn = null;
    game.outcome = null;
    game.phase = 'reveal';
    game.usedLocations = game.usedLocations.length >= LOCATIONS.length
      ? [deal.locationId] // mazo agotado: se rebaraja
      : [...game.usedLocations, deal.locationId];
    game.log.push({ txt: `🕵️ Ronda ${round}: cartas nuevas. Reparte ${nameOf(game, deal.dealerId)}.` });
    return game;
  });
}

/** Incorporar gente ENTRE rondas (llega alguien, o el altavoz se anima a
 *  jugar). Solo en `end`: a mitad de ronda no hay carta que darle. */
export async function addPlayers(pids: string[]): Promise<void> {
  const slug = mySlug();
  const id = ctxMatchId('espia');
  if (!id || !pids.length) return;
  await txWithRetry(async (tx) => {
    const snap = await tx.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as EspiaState | null;
    if (!game || !game.espia || game.phase !== 'end' || game.paused) return;
    const members = m.members || [];
    const adds = pids.filter((pid) => !game.playerIds.includes(pid));
    if (!adds.length) return;
    if (game.playerIds.length + adds.length > ESPIA_MAX_PLAYERS) {
      throw new Error(`El Espía admite ${ESPIA_MAX_PLAYERS} jugadores como mucho (7 papeles + el espía).`);
    }
    // Nadie puede estar en dos partidas a la vez (lectura ANTES de escribir).
    const outsiders = adds.filter((pid) => !members.includes(pid));
    if (outsiders.length) await assertFree(tx, slug, outsiders, id);
    const copy = JSON.parse(JSON.stringify(game)) as EspiaState;
    for (const pid of adds) {
      copy.names[pid] = state.players.find((p) => p.id === pid)?.name || copy.names[pid] || pid;
    }
    copy.playerIds = [...copy.playerIds, ...adds];
    copy.log.push({ txt: `🪑 Se sienta${adds.length > 1 ? 'n' : ''} a la mesa: ${adds.map((pid) => copy.names[pid]).join(', ')}. Entra${adds.length > 1 ? 'n' : ''} en la próxima ronda.` });
    tx.update(mref(slug, id), {
      game: sanitize(copy),
      members: sanitize([...new Set([...members, ...adds])]),
    });
  });
}

// ——— Pausa y repetición (⋯) ———

/** Congela la ronda: el reloj deja de correr y el narrador calla. */
export async function pauseGame(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase === 'end' || game.paused) return null;
    const who = state.players.find((p) => p.id === myPid());
    game.paused = { by: myPid(), name: who?.name || 'alguien', at: Date.now() };
    return game;
  }, undefined, { allowPaused: true });
}

export async function resumeGame(): Promise<void> {
  await espiaTx((game) => {
    if (!game.paused) return null;
    // El interrogatorio no pierde ni un segundo: el reloj se desplaza lo que
    // duró la pausa.
    if (game.deadline !== null) game.deadline += Math.max(0, Date.now() - game.paused.at);
    game.paused = null;
    return game;
  }, undefined, { allowPaused: true });
}

/** «🔁 Repetir»: señal de flanco para que el narrador re-locute la escena. */
export async function requestRepeat(): Promise<void> {
  await espiaTx((game) => {
    game.repeatNonce = (game.repeatNonce || 0) + 1;
    return game;
  }, undefined, { allowPaused: true });
}

/** Terminar el juego: sus miembros quedan libres y vuelven al lobby de El Espía. */
export async function endEspia(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('espia');
  if (!id) return;
  await deleteDoc(mref(mySlug(), id));
}

// La mesa puede sacar a un miembro o terminar una partida desde fuera.
registerMatchTools('espia', {
  leave: (mid, pid) => leaveRound(pid, mid),
  end: (mid) => endEspia(mid),
});

/** Dejar la ronda en curso (salida administrativa, sin puntos de última hora).
 *  Con targetPid, saca a OTRO desde la mesa; quien sale queda libre.
 *  Funciona también en pausa: si no, alguien que abandona la mesa se quedaría
 *  de fantasma en la ronda hasta que a alguien se le ocurriera reanudar. */
export async function leaveRound(targetPid?: string, mid?: string): Promise<void> {
  const me = targetPid || myPid();
  await espiaTx((game, m) => {
    const members = m.members || [];
    const dropMembers = members.filter((x) => x !== me);
    // La voz no se queda huérfana: si sale el altavoz, pasa a otro miembro
    // (preferiblemente uno que juegue).
    const wasMaster = m.masterId === me;
    const masterPatch = !wasMaster ? undefined
      : dropMembers.find((x) => game.playerIds.includes(x)) ?? dropMembers[0] ?? null;
    const out = (g2: EspiaState): EspiaTxExtra =>
      wasMaster ? { game: g2, members: dropMembers, masterPatch } : { game: g2, members: dropMembers };
    if (!game.playerIds.includes(me)) {
      // Altavoz puro (no juega): sale sin tocar la ronda.
      if (!members.includes(me)) return null;
      game.log.push({ txt: `🚪 ${nameOf(game, me)} deja la partida.` });
      return out(game);
    }
    if (game.phase === 'end') {
      // Entre rondas: sale de la partida (y de las rondas futuras).
      game.playerIds = game.playerIds.filter((id) => id !== me);
      game.log.push({ txt: `🚪 ${nameOf(game, me)} deja la partida.` });
      return out(game);
    }
    // El espía se marcha a mitad de ronda: victoria de los agentes (el delta se
    // calcula ANTES de sacarlo de la lista).
    if (game.spyId === me && game.phase !== 'reveal') {
      const outcome = resolveSpyLeft(game);
      game.playerIds = game.playerIds.filter((id) => id !== me);
      return out(finishRound(game, outcome));
    }
    const orderBefore = timeupOrder(game);
    const wasTurnHolder = game.phase === 'timeup' && game.timeupTurn !== null && orderBefore[game.timeupTurn] === me;
    game.playerIds = game.playerIds.filter((id) => id !== me);
    delete game.roles[me];
    delete game.seen[me];
    game.log.push({ txt: `🚪 ${nameOf(game, me)} deja la ronda.` });
    if (game.playerIds.length < ESPIA_MIN_PLAYERS) {
      // Sin quórum: ronda ANULADA (ni puntos ni victoria de nadie; ver R4).
      return out(finishRound(game, resolveVoid(game)));
    }
    if (game.phase === 'reveal') {
      // Aún sin empezar: se reparte de nuevo entre los que quedan y todos
      // vuelven a confirmar. La localización abortada se queda en usedLocations
      // a propósito: alguien pudo llegar a verla al confirmar, y si reapareciera
      // con otro espía, ese espía podría conocerla.
      const deal = dealRound(game.playerIds, game.round, game.usedLocations, Date.now());
      game.dealerId = deal.dealerId;
      game.spyId = deal.spyId;
      game.locationId = deal.locationId;
      game.roles = deal.roles;
      game.seen = {};
      game.usedLocations = [...game.usedLocations, deal.locationId];
      game.log.push({ txt: '🔀 Se reparten cartas nuevas entre los que quedan.' });
      return out(game);
    }
    if (game.vote) {
      const v = game.vote;
      if (v.accuserId === me || v.accusedId === me) {
        // La acusación pierde una de sus partes: cae y el juego sigue. En
        // pausa el reloj cuenta desde el instante congelado (al reanudar se
        // desplaza), no desde ahora.
        game.vote = null;
        if (v.fromTimeup) return out(advanceTimeupTurn(game));
        game.deadline = (game.paused ? game.paused.at : Date.now()) + v.frozenMs;
        return out(game);
      }
      delete v.votes[me];
      const t = tallyVote(game.playerIds, v);
      if (t.allYes) {
        game.vote = null;
        return out(finishRound(game, resolveConviction(game, v.accusedId, v.accuserId)));
      }
    }
    if (game.phase === 'timeup' && game.timeupTurn !== null) {
      // Recoloca el turno sobre la lista nueva.
      const newOrder = timeupOrder(game);
      if (wasTurnHolder) {
        const stillBefore = orderBefore.slice(0, game.timeupTurn).filter((id) => game.playerIds.includes(id)).length;
        if (stillBefore >= newOrder.length) return out(finishRound(game, resolveTimeout(game)));
        game.timeupTurn = stillBefore;
      } else {
        const holder = orderBefore.slice(game.timeupTurn).find((id) => game.playerIds.includes(id));
        const idx = holder ? newOrder.indexOf(holder) : -1;
        if (idx < 0) return out(finishRound(game, resolveTimeout(game)));
        game.timeupTurn = idx;
      }
    }
    return out(game);
  }, mid, { allowPaused: true });
}
