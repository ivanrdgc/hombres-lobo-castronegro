// Motor puro de «Ávalon»: recuento del voto de equipo, resolución de la misión
// y condiciones de victoria. Sin navegador ni Firebase (testeable en Node).
import { ROLES, isEvil, teamSize, requiredFails } from './roles';
import type { RoleId } from './roles';
import type { AvalonState, Phase } from './types';

export interface Player {
  id: string;
  name?: string;
  order?: number;
  inGame?: boolean;
}

export function playersOf(game: AvalonState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i, inGame: true }));
}

export const nplayers = (game: AvalonState): number => game.playerIds.length;

/** El líder actual (pid). */
export function leaderId(game: AvalonState): string {
  return game.playerIds[game.leaderIdx % game.playerIds.length];
}

/** El Asesino de la partida (pid), si hay rol de Asesino repartido. */
export function assassinId(game: AvalonState): string | null {
  return game.playerIds.find((pid) => game.roles[pid] === 'assassin') ?? null;
}

/** Misiones ganadas por cada bando hasta ahora. */
export function tally(game: AvalonState): { success: number; fail: number } {
  return {
    success: game.results.filter((r) => r === 'success').length,
    fail: game.results.filter((r) => r === 'fail').length,
  };
}

/** ¿Está bien formado el equipo propuesto para la misión actual? */
export function validTeam(game: AvalonState, team: string[]): boolean {
  const want = teamSize(nplayers(game), game.quest);
  const uniq = [...new Set(team)];
  return uniq.length === want && uniq.every((pid) => game.playerIds.includes(pid));
}

/**
 * ¿Quién debe actuar en la fase actual? (para resaltar en la UI y validar).
 * Devuelve la lista de pids pendientes; [] = nadie / fase de solo-lectura.
 */
export function pendingActors(game: AvalonState): string[] {
  switch (game.phase) {
    case 'reveal':
      return game.playerIds.filter((pid) => !game.seen[pid]);
    case 'propose':
      return [leaderId(game)];
    case 'vote':
      return game.playerIds.filter((pid) => game.votes[pid] === undefined);
    case 'quest':
      return game.team.filter((pid) => game.questCards[pid] === undefined);
    case 'assassin': {
      const a = assassinId(game);
      return a ? [a] : [];
    }
    default:
      return [];
  }
}

/** Recuento del voto: aprueba si hay MAYORÍA ESTRICTA de aprobaciones. */
export function tallyVote(game: AvalonState): { approvals: string[]; rejections: string[]; approved: boolean } {
  const approvals = game.playerIds.filter((pid) => game.votes[pid] === true);
  const rejections = game.playerIds.filter((pid) => game.votes[pid] === false);
  return { approvals, rejections, approved: approvals.length > nplayers(game) / 2 };
}

/** Resultado de la misión: fracasa si los sabotajes llegan al mínimo requerido. */
export function resolveQuest(game: AvalonState): { fails: number; required: number; success: boolean } {
  const fails = game.team.filter((pid) => game.questCards[pid] === false).length;
  const required = requiredFails(nplayers(game), game.quest);
  return { fails, required, success: fails < required };
}

export interface WinCheck {
  winner: Team | null;
  reason: string | null;
  /** El Bien alcanzó 3 misiones: procede la fase del Asesino (si lo hay). */
  goodReachedThree: boolean;
}

/** ¿Ha terminado la partida tras la última misión? (antes de la fase del Asesino) */
export function checkAfterQuest(game: AvalonState): WinCheck {
  const { success, fail } = tally(game);
  if (fail >= 3) return { winner: 'evil', reason: 'El Mal ha saboteado tres misiones.', goodReachedThree: false };
  if (success >= 3) return { winner: null, reason: null, goodReachedThree: true };
  return { winner: null, reason: null, goodReachedThree: false };
}

export type Team = 'good' | 'evil';

/** Etiqueta del rol para las cartas y el final. */
export function roleLabel(r: RoleId): string {
  return `${ROLES[r].emoji} ${ROLES[r].name}`;
}

export const WIN_LABELS: Record<Team, string> = {
  good: '🏰 ¡Gana el Bien! Los leales de Arturo completan su gesta.',
  evil: '🗡️ ¡Gana el Mal! Las sombras de Mordred se adueñan del reino.',
};

export function isGoodRole(r: RoleId): boolean {
  return !isEvil(r);
}

/** Fases en las que una locución/voz tiene sentido (para claves de escena). */
export const SPEAKABLE_PHASES: Phase[] = ['reveal', 'propose', 'voteReveal', 'result', 'assassin', 'end'];
