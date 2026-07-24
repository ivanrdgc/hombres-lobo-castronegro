// Modo de voz COMPARTIDO para juegos con grupos separados físicamente (las dos
// salas de Two Rooms, los dos submarinos de Captain Sonar…): un solo altavoz no
// llega a todos, así que a veces interesa más de uno.
//  - `single`: narra solo el altavoz principal (el masterId de la partida).
//  - `perRoom`: narran los dispositivos designados (uno por sala/equipo).
//  - `all`: narran TODOS los móviles de los jugadores (cada grupo se oye solo).
export const VOICE_MODES = ['single', 'perRoom', 'all'] as const;
export type VoiceMode = (typeof VOICE_MODES)[number];

/** ¿Debe narrar este dispositivo? (predicado común a todos esos juegos) */
export function narratesIn(
  mode: VoiceMode,
  speakers: readonly (string | null)[],
  playerIds: string[],
  pid: string,
  masterId: string | null,
): boolean {
  if (!pid) return false;
  if (mode === 'all') return playerIds.includes(pid) || pid === masterId;
  if (mode === 'perRoom') return speakers.includes(pid);
  return pid === masterId;
}
