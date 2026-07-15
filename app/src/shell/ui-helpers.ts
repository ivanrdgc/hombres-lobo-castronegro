// Utilidades del shell: catálogo de juegos, nombres de mesa y orden de asiento.
import type { GroupDoc, PlayerDoc } from '../core/sync/schema';

// Generador de nombres de grupo con sabor a Castronegro.
const NAME_GROUPS = ['Los Lobos', 'La Manada', 'El Aquelarre', 'Los Aullidos', 'La Camada', 'Los Colmillos', 'Las Garras', 'Los Susurros', 'La Niebla', 'Las Sombras'];
const NAME_PLACES = ['Medianoche', 'Luna Llena', 'Castronegro', 'la Niebla', 'el Páramo', 'la Colina', 'el Bosque Viejo', 'la Taberna', 'el Molino', 'Otoño'];

export function randomGroupName(): string {
  const g = NAME_GROUPS[Math.floor(Math.random() * NAME_GROUPS.length)];
  const p = NAME_PLACES[Math.floor(Math.random() * NAME_PLACES.length)];
  return `${g} de ${p}`;
}

// Catálogo de juegos de la mesa. La mesa (usuarios + orden) es común; cada
// juego aporta su propia configuración específica.
export const GAMES = [
  {
    id: 'hombres_lobo',
    emoji: '🐺',
    name: 'Los Hombres Lobo de Castronegro',
    desc: 'El clásico de roles ocultos: lobos contra el pueblo, con narrador automático por voz, modo guiado y todas las expansiones.',
  },
] as const;

// Orden de mesa efectivo: el guardado, más los nuevos al final.
export function seatingOrder(g: GroupDoc, players: PlayerDoc[]): string[] {
  const saved = Array.isArray(g.seating) ? g.seating : [];
  const ids = players.map((p) => p.id);
  return saved.filter((id) => ids.includes(id))
    .concat(players.filter((p) => !saved.includes(p.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0)).map((p) => p.id));
}
