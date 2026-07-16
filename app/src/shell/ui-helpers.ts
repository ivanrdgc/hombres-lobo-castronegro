// Utilidades del shell: nombres de mesa, orden de asiento y narrador por defecto.
// (El catálogo de juegos vive en games/registry.ts: GAME_DEFS.)
import type { GroupDoc, PlayerDoc } from '../core/sync/schema';
import { isActiveDevice } from '../core/sync/presence';

// Generador de nombres de mesa (grupo de amigos), sin tema de ningún juego.
const NAME_GROUPS = ['La Peña', 'La Cuadrilla', 'El Grupo', 'Los Cracks', 'La Panda', 'El Equipo', 'La Tribu', 'La Banda', 'Los Colegas', 'La Mesa'];
const NAME_PLACES = ['del Jueves', 'del Finde', 'de Siempre', 'del Sofá', 'de la Tarde', 'del Barrio', 'de la Uni', 'de Toda la Vida', 'del Garito', 'de la Merienda'];

export function randomGroupName(): string {
  const g = NAME_GROUPS[Math.floor(Math.random() * NAME_GROUPS.length)];
  const p = NAME_PLACES[Math.floor(Math.random() * NAME_PLACES.length)];
  return `${g} ${p}`;
}

// Narrador (altavoz) por defecto al empezar una partida: el recordado de la
// última partida SOLO si su dispositivo sigue activo; si duerme, la voz se
// mueve sola al dispositivo que está abriendo la pantalla (activo seguro).
export function defaultNarrator(
  players: PlayerDoc[],
  lastNarratorId: string | null | undefined,
  meId: string | null | undefined,
  now: number,
): string | null {
  const remembered = players.find((p) => p.id === lastNarratorId);
  if (remembered && isActiveDevice(remembered, now)) return remembered.id;
  return meId ?? null;
}

// Orden de mesa efectivo: el guardado, más los nuevos al final.
export function seatingOrder(g: GroupDoc, players: PlayerDoc[]): string[] {
  const saved = Array.isArray(g.seating) ? g.seating : [];
  const ids = players.map((p) => p.id);
  return saved.filter((id) => ids.includes(id))
    .concat(players.filter((p) => !saved.includes(p.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0)).map((p) => p.id));
}
