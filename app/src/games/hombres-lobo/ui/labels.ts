// Etiquetas de pasos para paneles del narrador y guion del modo guiado.
// Ojo: estas pantallas suelen estar a la vista de la mesa — de noche se muestra
// el ROL al que se espera, no el nombre.
import type { StepId } from '../types';

export const STEP_LABELS: Record<StepId, string> = {
  ladron: 'el Ladrón', cupido: 'Cupido', enamorados: 'los Enamorados',
  nino_salvaje: 'el Niño Salvaje', perro_lobo: 'el Perro Lobo',
  dos_hermanas: 'las Dos Hermanas', tres_hermanos: 'los Tres Hermanos',
  actor: 'el Actor', defensor: 'el Defensor', vidente: 'la Vidente',
  zorro: 'el Zorro', cuervo: 'el Cuervo', lobos_reconocen: 'la manada (reconocimiento)',
  durmiendo: 'el pueblo (durmiéndose)',
  lobos: 'los Hombres Lobo', infecto_decision: 'el Infecto Padre',
  infectado: 'la llamada de la sangre',
  lobo_feroz: 'el Gran Lobo Feroz', lobo_albino: 'el Lobo Albino',
  bruja: 'la Bruja', gaitero: 'el Gaitero', gitana: 'la Gitana', encantados: 'los Encantados',
  amanecer: 'el amanecer',
};

/** Señalado por el Cuervo (o por el Actor haciendo de Cuervo). Es información
 *  PÚBLICA desde el amanecer —la voz lo anuncia—, así que la pantalla puede
 *  enseñarla de día sin delatar a nadie. Mismo criterio que el motor. */
export function cuervoMarkId(game: { acts?: { cuervoTarget?: string | null; actor?: { power?: string; target?: string | null } } } | null | undefined): string | null {
  const acts = game?.acts || {};
  return acts.cuervoTarget ?? (acts.actor && acts.actor.power === 'cuervo' ? acts.actor.target ?? null : null);
}

export const PENDING_LABELS: Record<string, string> = {
  cazador: 'el disparo del Cazador', sirvienta: 'la decisión de la Sirvienta',
  alguacil_elect: 'la elección del Alguacil', alguacil_pick: 'el sucesor del Alguacil',
  cabeza_pick: 'la decisión del Cabeza de Turco',
};
