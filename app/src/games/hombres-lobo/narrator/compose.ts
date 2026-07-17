// Composición de locuciones (Utterances) a partir del corpus, con las MISMAS
// sales deterministas que la v1: el texto en pantalla, la voz y (F6) los ids
// de los clips pre-generados cuelgan de esta composición.
// Una locución es una secuencia de clips (piezas del corpus, pre-generables) y
// silencios programados; lo dinámico (nombres, preguntas) entra como clips de
// síntesis en vivo, pre-calentados en cuanto el dato existe.
import type { Segment, Utterance } from '../../../core/audio/player';
import {
  ABRID_OJOS, ENAMORADOS_INTRO, ENAMORADOS_TAIL, ENC_FRAME, ENCANTADOS_TAIL, KW_LEAD, LISTOS,
  NAG_GENERIC, NAGS, REFRESH_CLOSE, REFRESH_OPEN, aaNote, deathLine, drama, hashStr, hunterKillLine, improv, kwClip,
  loveDeathLine, lynchNote, narr, narrParts, narrPartsMin, nagEnamoradosKw, nagEncantadosKw, outro, outroParts, KW_NOTE,
  soloVoteNote, tontoMutedNote, tontoNote,
} from '../texts/corpus';
import type { Density } from '../../../core/narrator/pacing';
import { ROLES } from '../roles';
import { WINNER_LABELS } from '../engine';
import type { GameState, StepId } from '../types';
import type { PlayerDoc } from '../../../core/sync/schema';

export const clip = (text: string): Segment => ({ kind: 'clip', text });
export const gap = (ms: number): Segment => ({ kind: 'gap', ms });

function fromParts(id: string, parts: string[], extra: Segment[] = []): Utterance {
  return {
    id,
    segments: [...parts.map(clip), ...extra],
    display: parts.concat(extra.filter((s): s is Extract<Segment, { kind: 'clip' }> => s.kind === 'clip').map((s) => s.text)).join(' '),
  };
}

const stepSalt = (game: GameState, stepId: string) => `${game.seed}:n${game.night}:s${game.stepIdx}:${stepId}`;
const outroSalt = (game: GameState) => `${game.seed}:n${game.night}:s${game.stepIdx}`;

/** Entrada de un paso de noche (o null si no tiene locución propia). */
export function introParts(game: GameState, stepId: StepId, density: Density = 'std'): string[] {
  const pick = density === 'min' ? narrPartsMin : narrParts;
  if (stepId === 'lobos' && game.night === 1 && !game.noKillNight1) {
    return pick('lobos_noche1', `${game.seed}:n1:lobos`);
  }
  return pick(stepId, stepSalt(game, stepId));
}

// La densidad del guion la marca el perfil de ritmo: 'max' (teatral) antepone
// una dramatización del paso; 'min' (rápido) recorta la floritura central y
// deja llamada e instrucción.
export function introUtterance(game: GameState, stepId: StepId, density: Density = 'std'): Utterance {
  const parts = introParts(game, stepId, density);
  if (density === 'max') {
    const d = drama(stepId, stepSalt(game, stepId));
    if (d) return fromParts(`n${game.night}:s${game.stepIdx}:${stepId}:intro`, [d, ...parts]);
  }
  return fromParts(`n${game.night}:s${game.stepIdx}:${stepId}:intro`, parts);
}

// Despedida del paso («…vuelve a cerrar los ojos») + coletilla. Se dice
// SIEMPRE (real o fingido). null cuando el paso siguiente es la decisión del
// Infecto (la manada aún no cierra los ojos).
export function outroText(game: GameState, stepId: StepId): string | null {
  if (stepId === 'lobos' && game.steps[game.stepIdx + 1] === 'infecto_decision') return null;
  return outro(stepId, outroSalt(game));
}

export function outroUtterance(game: GameState, stepId: StepId, density: Density = 'std'): Utterance | null {
  if (stepId === 'lobos' && game.steps[game.stepIdx + 1] === 'infecto_decision') return null;
  const parts = outroParts(stepId, outroSalt(game));
  if (!parts) return null;
  // Rápido: la despedida esencial, sin coletilla.
  return fromParts(`n${game.night}:s${game.stepIdx}:${stepId}:outro`, density === 'min' ? parts.slice(0, 1) : parts);
}

export function nocheCaeUtterance(game: GameState, density: Density = 'std'): Utterance {
  const parts = density === 'min'
    ? narrPartsMin('noche_cae', `${game.seed}:n${game.night}`)
    : narrParts('noche_cae', `${game.seed}:n${game.night}`);
  // Teatral: la noche cae con una pincelada ambiental extra.
  if (density === 'max') parts.push(improv('noche', `${game.seed}:n${game.night}`));
  return fromParts(`n${game.night}:cae`, parts);
}

// Bienvenida del reparto. En rápido va directa al grano: «mirad vuestra carta
// en secreto y confirmad» (+ la nota de palabras clave, que es esencial).
export function bienvenidaUtterance(game: GameState, players: PlayerDoc[], density: Density = 'std'): Utterance {
  const extra: Segment[] = [];
  if (game.keywordsActive) extra.push(clip(KW_NOTE.trim()));
  const aa = players.find((p) => p.role === 'aldeano_aldeano');
  if (aa && aa.name) extra.push(clip(aaNote(aa.name).trim()));
  const parts = density === 'min' ? narrPartsMin('bienvenida', String(game.seed)) : narrParts('bienvenida', String(game.seed));
  return fromParts('reveal:bienvenida', parts, extra);
}

export function listosUtterance(game: GameState): Utterance {
  const t = LISTOS[hashStr(`listos|${game.seed}`) % LISTOS.length];
  return { id: 'reveal:listos', segments: [clip(t)], display: t };
}

/** Llamada por palabras clave de los enamorados (real y falsa: mismas piezas). */
export function enamoradosCallUtterance(id: string, kws: string[]): Utterance {
  const segments: Segment[] = [clip(ENAMORADOS_INTRO), gap(600)];
  kws.forEach((kw, i) => {
    segments.push(clip(kwClip(kw, i === 0)));
    segments.push(gap(i === kws.length - 1 ? 400 : 500));
  });
  segments.push(clip(ENAMORADOS_TAIL));
  return { id, segments, display: `${ENAMORADOS_INTRO} … ${kws.join('… y ')}. ${ENAMORADOS_TAIL}` };
}

/** Llamada de los encantados (real y falsa: mismas piezas, distinta palabra). */
export function encantadosCallUtterance(game: GameState, id: string, kws: string[], fake: boolean): Utterance {
  const intro = narrParts('encantados', stepSalt(game, 'encantados'));
  const segments: Segment[] = [...intro.map(clip), clip(ENC_FRAME), gap(500), clip(KW_LEAD), gap(400)];
  kws.forEach((kw, i) => {
    segments.push(clip(kwClip(kw, i === 0)));
    segments.push(gap(i === kws.length - 1 ? 300 : 500));
  });
  if (fake) segments.push(clip(ENCANTADOS_TAIL));
  return {
    id,
    segments,
    display: `${intro.join(' ')} ${ENC_FRAME} ${KW_LEAD} … ${kws.join('… y ')}.${fake ? ' ' + ENCANTADOS_TAIL : ''}`,
  };
}

/** Amanecer: marco fijo + parte de muertes (nombres en vivo) + anuncios. */
export function dawnUtterance(game: GameState, density: Density = 'std'): Utterance {
  const salt = `${game.seed}:d${game.dayNum}`;
  const deaths = game.lastDawn?.deaths || [];
  const parts: Segment[] = [clip(ABRID_OJOS)];
  // Teatral: el alba también se dramatiza.
  if (density === 'max') parts.push(clip(drama('amanecer', salt)));
  const kind = deaths.length ? 'amanecer_con_muertes' : 'amanecer_sin_muertes';
  for (const p of (density === 'min' ? narrPartsMin(kind, salt) : narrParts(kind, salt))) parts.push(clip(p));
  for (const d of deaths) parts.push(clip(deathLine(d.name, d.role, salt)));
  // El Anciano cayó de noche por veneno o flecha (muerte pública): el pueblo
  // pierde sus poderes y la voz avisa → la noche siguiente será rápida.
  if (game.revealDead !== false && game.powersLost && deaths.some((d) => d.role === 'anciano')) {
    parts.push(clip(improv('anciano', salt)));
  }
  if (game.lastDawn?.cuervo) parts.push(clip(game.lastDawn.cuervo));
  if (game.lastDawn?.oso) parts.push(clip(game.lastDawn.oso));
  if (game.lastDawn?.gitana) parts.push(clip(game.lastDawn.gitana));
  // Improvisación matinal: siempre en teatral, a veces en normal, nunca en rápido.
  if (density === 'max' || (density === 'std' && hashStr('impAm|' + salt) % 2 === 0)) parts.push(clip(improv('amanecer', salt)));
  return {
    id: `d${game.dayNum}:dawn`,
    segments: parts,
    display: parts.filter((s): s is Extract<Segment, { kind: 'clip' }> => s.kind === 'clip').map((s) => s.text).join(' '),
  };
}

/** Textos que el amanecer necesitará en vivo (para pre-calentar la síntesis). */
export function dawnDynamicTexts(game: GameState): string[] {
  const salt = `${game.seed}:d${game.dayNum}`;
  const out: string[] = [];
  for (const d of game.lastDawn?.deaths || []) out.push(deathLine(d.name, d.role, salt));
  if (game.lastDawn?.cuervo) out.push(game.lastDawn.cuervo);
  if (game.lastDawn?.oso) out.push(game.lastDawn.oso);
  if (game.lastDawn?.gitana) out.push(game.lastDawn.gitana);
  return out;
}

export function debateUtterance(game: GameState, withJuez: boolean, density: Density = 'std', mutedTontos: string[] = []): Utterance {
  const vKey = `d${game.dayNum}:debate:${game.votesLeft}`;
  const kind = (game.lastDawn?.deaths || []).length ? 'dia_debate' : 'dia_debate_tranquilo';
  const salt = `${game.seed}:d${game.dayNum}:${game.votesLeft}`;
  const parts: Segment[] = [];
  if (withJuez) for (const p of narrParts('juez_segunda', `${game.seed}:${vKey}`)) parts.push(clip(p));
  const body = density === 'min' ? narrPartsMin(kind, salt) : narrParts(kind, salt);
  // Voto restringido por el Cabeza de Turco (info pública, sin fuga de pistas):
  // la última pieza —«que cualquiera registre»— se sustituye por la designación
  // del único votante. Sin soloVoteId, el debate queda bit-idéntico (golden).
  const restricted = !!game.soloVoteId;
  for (const p of (restricted ? body.slice(0, -1) : body)) parts.push(clip(p));
  if (restricted) parts.push(clip(soloVoteNote(game.soloVoteName || 'la persona designada').trim()));
  // Recordatorio si algún Tonto del Pueblo ya descubierto sigue en la plaza.
  if (mutedTontos.length) parts.push(clip(tontoMutedNote(mutedTontos.join(' y ')).trim()));
  // Cotilleos del debate: siempre en teatral, a veces en normal, nunca en rápido.
  if (density === 'max' || (density === 'std' && hashStr('impDeb|' + vKey) % 5 < 2)) parts.push(clip(improv('debate', `${game.seed}:${vKey}`)));
  return {
    id: vKey + (withJuez ? ':juez' : ''),
    segments: parts,
    display: parts.filter((s): s is Extract<Segment, { kind: 'clip' }> => s.kind === 'clip').map((s) => s.text).join(' '),
  };
}

export function ocasoUtterance(game: GameState): Utterance {
  const parts: Segment[] = [];
  const ll = game.lastLynch;
  if (game.revealDead && ll && ll.role && !ll.hideRole) {
    parts.push(clip(lynchNote(ll.name || '', ROLES[ll.role]?.name || String(ll.role)).trim()));
  }
  // El pueblo linchó al Tonto del Pueblo: la voz lo explica (no muere, pierde voto).
  if (game.lastTontoReveal) parts.push(clip(tontoNote(game.lastTontoReveal).trim()));
  // El Anciano linchado (muerte pública): el pueblo pierde sus poderes → aviso.
  if (game.revealDead !== false && game.powersLost && ll?.role === 'anciano' && !ll.hideRole) {
    parts.push(clip(improv('anciano', `${game.seed}:d${game.dayNum}`)));
  }
  const lv = game.lastLoveDeath;
  if (lv && lv.name) parts.push(clip(loveDeathLine(ll?.name || null, lv.name, `d${game.dayNum}`).trim()));
  parts.push(clip(improv('ocaso', `${game.seed}:d${game.dayNum}`)));
  return {
    id: `d${game.dayNum}:ocaso`,
    segments: parts,
    display: parts.filter((s): s is Extract<Segment, { kind: 'clip' }> => s.kind === 'clip').map((s) => s.text).join(' '),
  };
}

/** Anuncio de las muertes por la flecha del Cazador (nombre + rol si se revela). */
export function shotUtterance(game: GameState): Utterance {
  const salt = `${game.seed}:d${game.dayNum}:shot${game.shotNonce || 0}`;
  const parts: Segment[] = [];
  for (const d of game.lastShot || []) {
    const roleName = game.revealDead && !d.hideRole && d.role ? ROLES[d.role]?.name || null : null;
    parts.push(clip(hunterKillLine(d.name || '', roleName, salt)));
  }
  return {
    id: `d${game.dayNum}:shot:${game.shotNonce || 0}`,
    segments: parts,
    display: parts.filter((s): s is Extract<Segment, { kind: 'clip' }> => s.kind === 'clip').map((s) => s.text).join(' '),
  };
}

const PENDING_NARR: Record<string, string> = {
  cazador: 'cazador', sirvienta: 'sirvienta',
  alguacil_elect: 'alguacil_elige', alguacil_pick: 'alguacil_hereda',
  cabeza_pick: 'cabeza_pick',
};

export function pendingUtterance(game: GameState, pKey: string, type: string): Utterance | null {
  const narrKey = PENDING_NARR[type];
  if (!narrKey) return null;
  const t = narr(narrKey, `${game.seed}:${pKey}`);
  return { id: pKey, segments: [clip(t)], display: t };
}

export function finUtterance(game: GameState): Utterance {
  const label = (WINNER_LABELS[game.winner || 'nadie'] || '').replace(/[^\p{L}\p{N}\s,.!¡¿?…]/gu, '').trim();
  const parts = narrParts('fin_partida', String(game.seed));
  return fromParts(`end:${game.winner}`, parts, label ? [clip(label)] : []);
}

export function refreshOpenUtterance(startedAt: number): Utterance {
  return { id: `rr:${startedAt}`, segments: [clip(REFRESH_OPEN)], display: REFRESH_OPEN };
}

export function refreshCloseUtterance(at: number): Utterance {
  return { id: `rrclose:${at}`, segments: [clip(REFRESH_CLOSE)], display: REFRESH_CLOSE };
}

/** Aviso de insistencia (port de nagText de la v1). */
export function nagUtterance(game: GameState, players: PlayerDoc[], nagId: string, n: number): Utterance {
  let text: string | null = null;
  if (nagId === 'enamorados') {
    const lovers = players.filter((p) => p.inGame && p.lover && p.keyword);
    if (game.keywordsActive && lovers.length >= 2) {
      text = nagEnamoradosKw(lovers.map((p) => p.keyword!), n);
    }
  }
  if (nagId === 'encantados') {
    const targets = game.acts.gaiteroTargets || [];
    const ps = players.filter((p) => targets.includes(p.id) && p.keyword);
    if (game.keywordsActive && ps.length) text = nagEncantadosKw(ps.map((p) => p.keyword!));
  }
  if (!text) {
    const pool = NAGS[nagId] || [];
    if (n % 2 === 0 && pool.length) text = pool[Math.floor(n / 2) % pool.length];
    else text = NAG_GENERIC[n % NAG_GENERIC.length];
  }
  return { id: `nag:${nagId}:${n}`, segments: [clip(text)], display: text, priority: 'low' };
}

export function fillerUtterance(game: GameState, stepId: string, density: Density = 'std'): Utterance | null {
  // A veces, un murmullo ambiental antes del primer aviso (despista y ambienta).
  // Rápido: nunca; normal: ~30%; teatral: ~60%.
  if (density === 'min') return null;
  const salt = `${game.seed}:n${game.night}:s${game.stepIdx}:${stepId}`;
  if (hashStr('filler|' + salt) % 10 >= (density === 'max' ? 6 : 3)) return null;
  const t = improv('relleno', salt);
  return { id: `filler:${salt}`, segments: [clip(t)], display: t, priority: 'low' };
}
