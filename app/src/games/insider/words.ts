// Palabras a adivinar en «Insider»: nombres comunes y concretos, adivinables a
// base de preguntas de sí/no. Contenido puro.
export const WORDS: string[] = [
  'Elefante', 'Guitarra', 'Semáforo', 'Volcán', 'Pingüino', 'Bombero', 'Cactus', 'Submarino',
  'Sandía', 'Astronauta', 'Molino', 'Tiburón', 'Paraguas', 'Castillo', 'Bicicleta', 'Pirata',
  'Cascada', 'Girasol', 'Telescopio', 'Cocodrilo', 'Faro', 'Payaso', 'Iglú', 'Dinosaurio',
  'Brújula', 'Cometa', 'Ardilla', 'Trompeta', 'Momia', 'Erizo', 'Catapulta', 'Medusa',
  'Escoba', 'Vampiro', 'Acordeón', 'Camaleón', 'Ancla', 'Robot', 'Cebolla', 'Murciélago',
  'Tobogán', 'Sirena', 'Yunque', 'Colmena', 'Espantapájaros', 'Termómetro', 'Caracol', 'Cohete',
  'Linterna', 'Mariposa', 'Gaita', 'Iceberg', 'Ballena', 'Tostadora', 'Puente', 'Tambor',
];

export function wordAt(i: number): string {
  return WORDS[((i % WORDS.length) + WORDS.length) % WORDS.length];
}
