// Escenas del narrador automático de Los Hombres Lobo: la proyección
// snapshot → clave de escena y el programa (async lineal) de cada escena.
// Sustituye al conductor re-entrante de la v1: misma dramaturgia y mismo
// contrato de disimulo (un ÚNICO programa sirve pasos reales, fantasma y sin
// poder), sin sondeos y con los colchones en la tabla PACING.
import type { SceneCtx, SceneDef } from '../../../core/narrator/sequencer';
import { NAG_ESCALATE_COUNT, narrationDensity } from '../../../core/narrator/pacing';
import { prewarmSynth } from '../../../core/audio/clips';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import * as A from '../actions';
import { ROLES } from '../roles';
import { computeNightSteps, resolveDawn, stepActors, stepNeedsGhostAnnounce } from '../engine';
import type { GameState, StepId } from '../types';
import {
  ABRID_OJOS, ENAMORADOS_INTRO, ENAMORADOS_TAIL, ENC_FRAME, ENCANTADOS_TAIL, KW_LEAD, deathLine, kwClip, narrParts,
} from '../texts/corpus';
import {
  bienvenidaUtterance, dawnUtterance, debateUtterance, enamoradosCallUtterance, encantadosCallUtterance,
  fillerUtterance, finUtterance, introParts, introUtterance, listosUtterance, nagUtterance, nocheCaeUtterance,
  ocasoUtterance, outroText, outroUtterance, pendingUtterance, refreshCloseUtterance, refreshOpenUtterance,
  shotUtterance,
} from './compose';

export interface Snap {
  group: GroupDoc | null;
  players: PlayerDoc[];
  session: Session | null;
}

type Ctx = SceneCtx<Snap>;

const inGame = (players: PlayerDoc[]) => players.filter((p) => p.inGame);

// Densidad del guion según el perfil de ritmo de la mesa (settings.pacing):
// teatral añade ambientación, rápido deja solo lo esencial.
const den = (ctx: Ctx) => narrationDensity(ctx.state().group?.settings?.pacing);

/** ¿Este dispositivo narra? (partida automática y masterId = mi sesión válida) */
export function amNarrator(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !g.game || g.game.mode !== 'auto' || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

export function gameIdOf(s: Snap): number | null {
  return s.group?.game?.startedAt ?? null;
}

// ——— Proyección: snapshot → escena ———

export function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amNarrator(s)) return null;
  const g = s.group!;
  const game = g.game!;
  const sa = game.startedAt || 0;
  const K = (rest: string) => `g${sa}:${rest}`;

  if (game.phase === 'end') return { key: K(`end:${game.winner}`), run: endScene };
  if (game.paused) return { key: K(`paused:${game.paused.at}`), hardEntry: true, run: pausedScene };
  if (game.phase === 'reveal') return { key: K('reveal'), run: revealScene };

  if (game.phase === 'night') {
    if (game.roleRefresh?.closing) return { key: K(`rrclose:${game.roleRefresh.at}`), run: refreshCloseScene };
    if (game.roleRefresh) return { key: K(`rr:${game.roleRefresh.startedAt}`), run: refreshOpenScene };
    const stepId = game.steps[game.stepIdx];
    if (!stepId) return null;
    return {
      key: K(`n${game.night}:s${game.stepIdx}:${stepId}:rf${game.refreshNonce || 0}`),
      run: (ctx) => nightStepScene(ctx, stepId, game.stepIdx),
    };
  }

  if (game.phase === 'day') {
    const head = (game.pending || [])[0];
    if (head) {
      const pKey = `d${game.dayNum}:pending:${head.type}:${head.pid || head.targetId || ''}:${game.pending.length}`;
      return { key: K(pKey), run: (ctx) => dayPendingScene(ctx, pKey) };
    }
    if ((game.votesLeft || 0) > 0 && !game.vote) {
      const juez = !!game.juezSecondActive;
      return { key: K(`d${game.dayNum}:debate:${game.votesLeft}${juez ? ':juez' : ''}`), run: (ctx) => dayDebateScene(ctx, juez) };
    }
    if ((game.votesLeft || 0) <= 0 && !game.pending.length && !game.winner) {
      return { key: K(`d${game.dayNum}:ocaso`), run: dayOcasoScene };
    }
    return null;
  }
  return null;
}

// ——— Utilidades de escena ———

const g = (ctx: Ctx): GameState => ctx.state().group!.game!;
const ps = (ctx: Ctx): PlayerDoc[] => inGame(ctx.state().players);

function actorsPending(stepId: StepId, game: GameState, players: PlayerDoc[]): boolean {
  const a = stepActors(stepId, game, players);
  return !!a && a.length > 0;
}

/** Pre-calienta la síntesis de las locuciones previsibles de una noche. */
function prewarmNightTexts(game: GameState, players: PlayerDoc[], night: number): void {
  try {
    const base = { ...game, night, stepIdx: 0 } as GameState;
    const steps = computeNightSteps(base, players);
    const texts: (string | null)[] = [...narrParts('noche_cae', `${game.seed}:n${night}`)];
    steps.forEach((stepId, idx) => {
      if (stepId === 'durmiendo' || stepId === 'amanecer') return;
      const g2 = { ...game, night, stepIdx: idx, steps } as GameState;
      if (stepId !== 'infecto_decision') texts.push(...introParts(g2, stepId));
      texts.push(outroText(g2, stepId));
    });
    texts.push(ABRID_OJOS);
    texts.push(...narrParts('amanecer_sin_muertes', `${game.seed}:d${night}`));
    texts.push(...narrParts('amanecer_con_muertes', `${game.seed}:d${night}`));
    texts.push(...narrParts('dia_debate', `${game.seed}:d${night}:1`));
    texts.push(...narrParts('dia_debate_tranquilo', `${game.seed}:d${night}:1`));
    if (steps.includes('enamorados')) texts.push(ENAMORADOS_INTRO, ENAMORADOS_TAIL, KW_LEAD);
    if (steps.includes('encantados')) texts.push(ENC_FRAME, ENCANTADOS_TAIL, KW_LEAD);
    prewarmSynth(texts);
  } catch {
    /* la pre-generación es opcional */
  }
}

/** Palabras clave como clips («X de Y.» / «y X de Y.») para pre-calentar. */
function kwTexts(kws: string[]): string[] {
  return kws.map((kw, i) => kwClip(kw, i === 0));
}

// ——— Escenas ———

async function pausedScene(ctx: Ctx): Promise<void> {
  await ctx.waitFor(() => false); // silencio hasta que cambie la escena
}

async function endScene(ctx: Ctx): Promise<void> {
  const game = g(ctx);
  // Teatro final: si la partida se decide AL AMANECER (p. ej. los lobos matan a
  // su última víctima), la noche transcurre entera —los lobos cierran los ojos,
  // la bruja despierta aunque no tenga pociones— y la victoria NO se resuelve
  // hasta el alba. Aquí primero se despierta al pueblo y se anuncian las muertes
  // de la noche; solo después se proclama la victoria. Si algo salvó a la
  // víctima, no se llega a esta escena: la noche resolvió que no había ganador.
  // (sayOnce se salta el amanecer si ya se narró: fin por linchamiento de día.)
  if (game.lastDawn) await ctx.sayOnce(`d${game.dayNum}:dawn`, () => dawnUtterance(g(ctx), den(ctx)));
  await announceShot(ctx);
  await ctx.sayOnce(`end:${game.winner}`, () => finUtterance(g(ctx)));
}

async function revealScene(ctx: Ctx): Promise<void> {
  const game = g(ctx);
  await ctx.sayOnce('reveal:bienvenida', () => bienvenidaUtterance(game, ps(ctx), den(ctx)));
  // Mientras la gente mira su carta, adelantamos la síntesis de la primera noche.
  prewarmNightTexts(game, ps(ctx), 1);
  await ctx.waitFor((s) => {
    const players = inGame(s.players);
    return players.length > 0 && players.every((p) => p.roleSeen);
  });
  await ctx.sayOnce('reveal:listos', () => listosUtterance(g(ctx)));
}

async function refreshOpenScene(ctx: Ctx): Promise<void> {
  const startedAt = g(ctx).roleRefresh?.startedAt || 0;
  await ctx.sayOnce(`rr:${startedAt}`, () => refreshOpenUtterance(startedAt));
  await ctx.waitOrNag(() => false, {
    nagKey: `rr:${startedAt}:nags`,
    escalateAfter: Number.MAX_SAFE_INTEGER,
    nag: (n) => nagUtterance(g(ctx), ctx.state().players, 'refresh', n),
  });
}

async function refreshCloseScene(ctx: Ctx): Promise<void> {
  const at = g(ctx).roleRefresh?.at || 0;
  await ctx.sayOnce(`rrclose:${at}`, () => refreshCloseUtterance(at));
  await ctx.pause('refreshCloseGap');
  await A.finishRoleRefreshClose();
}

async function nightStepScene(ctx: Ctx, stepId: StepId, stepIdx: number): Promise<void> {
  const game0 = g(ctx);
  const uid = (part: string) => `n${game0.night}:s${stepIdx}:${stepId}:rf${game0.refreshNonce || 0}:${part}`;

  if (stepIdx === 0) {
    await ctx.sayOnce(`n${game0.night}:cae`, () => nocheCaeUtterance(game0, den(ctx)));
    prewarmNightTexts(game0, ps(ctx), game0.night);
  }

  if (stepId === 'durmiendo') {
    await ctx.pause('sleepHold');
    await A.advanceGhostStep(stepIdx);
    return;
  }

  if (stepId === 'amanecer') {
    // Especulación del amanecer: las frases con nombre se sintetizan ANTES de
    // que suene el «abrid los ojos» (resolveDawn es puro: mismas frases).
    try {
      const game = g(ctx);
      const copy = JSON.parse(JSON.stringify(game)) as GameState;
      const res = resolveDawn(copy, ps(ctx).map((p) => ({ ...p })));
      const byId = Object.fromEntries(res.players.map((p) => [p.id, p]));
      const salt = `${game.seed}:d${game.dayNum + 1}`;
      // Mismas frases que compondrá dawnUtterance tras la transacción real.
      const texts: (string | null)[] = res.deaths.map((d) => deathLine(
        byId[d.pid]?.name || '',
        game.revealDead && d.role ? ROLES[d.role]?.name || null : null,
        salt,
      ));
      texts.push(res.cuervoAnnounce, res.osoAnnounce, res.gitanaAnnounce);
      prewarmSynth(texts);
    } catch {
      /* especulación opcional */
    }
    await ctx.pause('dawnHold');
    await A.runDawn();
    return;
  }

  // ——— Encantados: llamada por palabras clave (real, completada o falsa) ———
  if (stepId === 'encantados') {
    const game = g(ctx);
    // ¿El Gaitero encantó esta noche? (aunque ya hayan confirmado todos)
    const acted = (game.acts.gaiteroTargets || []).length > 0;
    // La llamada nombra a TODOS los que deben despertar (encantados de esta
    // noche y de las anteriores): el juego real los reconoce a todos juntos,
    // y por eso sus palabras rotan tras cada confirmación.
    const targets = !acted ? [] : (stepActors('encantados', game, ps(ctx)) || [])
      .map((id) => ps(ctx).find((p) => p.id === id))
      .filter((p): p is PlayerDoc => !!p);
    if (targets.length) {
      const kws = targets.map((p) => p.keyword).filter((k): k is string => !!k);
      prewarmSynth(kwTexts(kws));
      await ctx.sayOnce(uid('call'), () => encantadosCallUtterance(g(ctx), uid('call'), kws, false));
      const res = await ctx.waitOrNag((s) => !actorsPending(stepId, g(ctx), inGame(s.players)), {
        nagKey: uid('nags'),
        escalateAfter: NAG_ESCALATE_COUNT,
        nag: (n) => nagUtterance(g(ctx), ctx.state().players, 'encantados', n),
      });
      if (res === 'escalate') {
        await A.startRoleRefresh();
        return;
      }
      await ctx.pause('outroKnown');
    } else if (acted) {
      await ctx.pause('outroKnown'); // todos confirmados: despedida y sigue
    } else {
      const gaiteroDealt = (game.composition?.gaitero || 0) > 0 || ps(ctx).some((p) => p.role === 'gaitero');
      const fakeNeeded = game.keywordsActive
        && ((gaiteroDealt && !game.revealDead) || (!gaiteroDealt && !!game.fakeAllSelected));
      if (fakeNeeded) {
        // Llamada falsa con SEÑUELOS (palabras sin dueño, distintas cada
        // noche). Crece como crecería la real (≈2 encantados nuevos por
        // noche): que la duración no delate si la llamada es de verdad.
        const decoys = (game.kwDecoys || []).slice(2); // los 2 primeros son de Cupido
        const need = Math.max(2, Math.min(2 * game.night, decoys.length,
          Math.max(2, ps(ctx).filter((p) => p.alive).length - 1)));
        const base = ((game.night - 1) * 2) % Math.max(1, decoys.length);
        const fake = decoys.length >= 2
          ? Array.from({ length: need }, (_, i) => decoys[(base + i) % decoys.length])
          : ps(ctx).filter((p) => p.alive && p.keyword).slice(0, 2).map((p) => p.keyword!);
        prewarmSynth(kwTexts(fake));
        await ctx.sayOnce(uid('fake'), () => encantadosCallUtterance(g(ctx), uid('fake'), fake, true));
        await ctx.pause('fakeConfirmHold');
      } else {
        await ctx.pause('deadSkip');
        await A.advanceGhostStep(stepIdx);
        return;
      }
    }
    const ou = outroUtterance(g(ctx), stepId, den(ctx));
    if (ou) await ctx.sayOnce(uid('outro'), () => ou);
    await ctx.pause('advanceGap');
    await A.advanceGhostStep(stepIdx);
    return;
  }

  // ——— Paso silencioso (decisión del Infecto): sin locución de entrada ———
  if (stepId === 'infecto_decision') {
    await ctx.waitFor((s) => !actorsPending(stepId, g(ctx), inGame(s.players)));
    await ctx.pause('deadSkip');
    const ou = outroUtterance(g(ctx), stepId, den(ctx));
    if (ou) await ctx.sayOnce(uid('outro'), () => ou);
    await ctx.pause('advanceGap');
    await A.advanceGhostStep(stepIdx);
    return;
  }

  // ——— Enamorados: guardia anti-carrera (las marcas lover llegan por otro listener) ———
  if (stepId === 'enamorados' && g(ctx).acts.cupidoPair && !ps(ctx).some((p) => p.lover)) {
    await ctx.waitFor((s) => inGame(s.players).some((p) => p.lover));
  }

  const game = g(ctx);
  const players = ps(ctx);
  const actors = stepActors(stepId, game, players);

  if (actors && actors.length) {
    // Paso con actores vivos: entrada (o llamada por palabra clave), espera y avisos.
    if (stepId === 'enamorados' && game.keywordsActive) {
      const lovers = players.filter((p) => p.lover && p.keyword);
      if (lovers.length >= 2) {
        const kws = lovers.map((p) => p.keyword!);
        prewarmSynth(kwTexts(kws));
        await ctx.sayOnce(uid('call'), () => enamoradosCallUtterance(uid('call'), kws));
      } else {
        await ctx.sayOnce(uid('intro'), () => introUtterance(game, stepId, den(ctx)));
      }
    } else {
      await ctx.sayOnce(uid('intro'), () => introUtterance(game, stepId, den(ctx)));
    }
    // Mientras esperan, adelanta la despedida de este paso y la entrada del siguiente.
    const nextId = game.steps[stepIdx + 1];
    const nextTexts: (string | null)[] = [outroText(game, stepId)];
    if (nextId && !['durmiendo', 'amanecer', 'enamorados', 'encantados', 'lobos', 'infecto_decision'].includes(nextId)) {
      nextTexts.push(...introParts({ ...game, stepIdx: stepIdx + 1 } as GameState, nextId));
    }
    prewarmSynth(nextTexts);

    const res = await ctx.waitOrNag((s) => !actorsPending(stepId, g(ctx), inGame(s.players)), {
      nagKey: uid('nags'),
      escalateAfter: NAG_ESCALATE_COUNT,
      nag: (n) => nagUtterance(g(ctx), ctx.state().players, stepId, n),
      filler: fillerUtterance(game, stepId, den(ctx)),
    });
    if (res === 'escalate') {
      await A.startRoleRefresh();
      return;
    }
    // Si Cupido acaba de marcar, ya conocemos las palabras: pre-caliéntalas.
    if (game.steps[stepIdx + 1] === 'enamorados' && g(ctx).keywordsActive) {
      const lovers = ps(ctx).filter((p) => p.lover && p.keyword);
      if (lovers.length >= 2) prewarmSynth([ENAMORADOS_INTRO, ENAMORADOS_TAIL, ...kwTexts(lovers.map((p) => p.keyword!))]);
    }
    await ctx.pause(['enamorados', 'lobos_reconocen', 'lobos'].includes(stepId) ? 'outroKnown' : 'postActionHold');
  } else {
    // Nadie debe actuar: turno fantasma, paso ya completado o rol público muerto.
    const ghost = stepNeedsGhostAnnounce(stepId, game, players);
    if (stepId === 'enamorados') {
      const fakeNeeded = !!game.fakeAllSelected && !!game.keywordsActive
        && !((game.composition?.cupido || 0) > 0) && !players.some((p) => p.lover);
      if (fakeNeeded) {
        const fake = (game.kwDecoys || []).slice(0, 2);
        if (fake.length === 2) {
          prewarmSynth(kwTexts(fake));
          await ctx.sayOnce(uid('fake'), () => enamoradosCallUtterance(uid('fake'), fake));
          await ctx.pause('fakeConfirmHold');
        } else {
          await ctx.pause('outroKnown');
        }
      } else {
        await ctx.pause('outroKnown'); // enamorados ya confirmados (o sin pareja)
      }
    } else if (ghost) {
      await ctx.sayOnce(uid('intro'), () => introUtterance(game, stepId, den(ctx)));
      await ctx.pause('postActionHold');
    } else if (['lobos_reconocen', 'lobos'].includes(stepId)) {
      await ctx.pause('outroKnown'); // paso vivo ya completado
    } else {
      // Rol públicamente muerto: salto discreto, sin locución.
      await ctx.pause('deadSkip');
      await A.advanceGhostStep(stepIdx);
      return;
    }
  }

  const ou = outroUtterance(g(ctx), stepId, den(ctx));
  if (ou) await ctx.sayOnce(uid('outro'), () => ou);
  await ctx.pause('advanceGap');
  await A.advanceGhostStep(stepIdx);
}

// La flecha del Cazador se anuncia por voz (con el rol de la víctima) tras
// producirse, en cualquier escena de día a la que lleve el disparo. El nonce
// del ledger garantiza un solo anuncio por disparo.
async function announceShot(ctx: Ctx): Promise<void> {
  const game = g(ctx);
  if (game.lastShot && game.lastShot.length) {
    await ctx.sayOnce(`d${game.dayNum}:shot:${game.shotNonce || 0}`, () => shotUtterance(g(ctx)));
  }
}

async function dayPendingScene(ctx: Ctx, pKey: string): Promise<void> {
  const game = g(ctx);
  await ctx.sayOnce(`d${game.dayNum}:dawn`, () => dawnUtterance(g(ctx), den(ctx)));
  await announceShot(ctx); // si una flecha en cadena mató antes de este pendiente
  const head = (g(ctx).pending || [])[0];
  if (!head) return;
  const u = pendingUtterance(g(ctx), pKey, head.type);
  if (u) await ctx.sayOnce(pKey, () => u);
  if (head.type === 'sirvienta') {
    // Ventana acotada EN EL NARRADOR: un reloj desviado no puede romperla.
    const remaining = Math.min(30000, Math.max(1000, (head.deadline || 0) - Date.now()));
    await ctx.sleep(remaining);
    await A.resolveSirvienta(false);
  }
}

async function dayDebateScene(ctx: Ctx, withJuez: boolean): Promise<void> {
  const game = g(ctx);
  await ctx.sayOnce(`d${game.dayNum}:dawn`, () => dawnUtterance(g(ctx), den(ctx)));
  await announceShot(ctx); // el Cazador murió de noche y ya disparó → víctima antes del debate
  await ctx.sayOnce(`d${game.dayNum}:debate:${game.votesLeft}${withJuez ? ':juez' : ''}`, () => {
    const muted = ps(ctx).filter((p) => p.alive && p.revealedTonto).map((p) => p.name).filter((n): n is string => !!n);
    return debateUtterance(g(ctx), withJuez, den(ctx), muted);
  });
}

async function dayOcasoScene(ctx: Ctx): Promise<void> {
  const game = g(ctx);
  await ctx.sayOnce(`d${game.dayNum}:dawn`, () => dawnUtterance(g(ctx), den(ctx)));
  await ctx.sayOnce(`d${game.dayNum}:ocaso`, () => ocasoUtterance(g(ctx)));
  await announceShot(ctx); // el Cazador linchado disparó → «X era el Cazador. La flecha alcanza a Y…»
}
