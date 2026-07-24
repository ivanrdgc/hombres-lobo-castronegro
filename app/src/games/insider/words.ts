// Palabras a adivinar en «Insider»: nombres comunes y concretos, adivinables a
// base de preguntas de SÍ o NO. Contenido puro.
// El corpus es largo a propósito: `usedWords` no recicla hasta agotarlo, así que
// una noche entera de rondas no repite ni una palabra.
export const WORDS: string[] = [
  // Animales
  'Elefante', 'Pingüino', 'Tiburón', 'Cocodrilo', 'Ardilla', 'Erizo', 'Medusa', 'Camaleón',
  'Murciélago', 'Caracol', 'Mariposa', 'Ballena', 'Canguro', 'Pulpo', 'Jirafa', 'Camello',
  'Búho', 'Abeja', 'Tortuga', 'Delfín', 'Zorro', 'Loro', 'Cangrejo', 'Mapache',
  'Avestruz', 'Escorpión', 'Colmena',
  // Objetos y cacharros
  'Guitarra', 'Paraguas', 'Telescopio', 'Brújula', 'Trompeta', 'Escoba', 'Acordeón', 'Ancla',
  'Yunque', 'Termómetro', 'Linterna', 'Gaita', 'Tostadora', 'Tambor', 'Microscopio', 'Cremallera',
  'Aspiradora', 'Almohada', 'Peluca', 'Bumerán', 'Imán', 'Nevera', 'Paracaídas', 'Ventilador',
  'Sacacorchos', 'Espejo', 'Escalera', 'Tijeras', 'Embudo', 'Cerradura', 'Alfombra', 'Reloj de arena',
  'Máquina de escribir', 'Arpa', 'Xilófono', 'Maracas', 'Piano', 'Cometa', 'Catapulta', 'Semáforo',
  // Lugares y construcciones
  'Volcán', 'Molino', 'Castillo', 'Cascada', 'Faro', 'Iglú', 'Puente', 'Pirámide',
  'Biblioteca', 'Ascensor', 'Noria', 'Acuario', 'Circo', 'Túnel', 'Mercado', 'Tobogán',
  // Vehículos
  'Submarino', 'Bicicleta', 'Cohete', 'Helicóptero', 'Trineo', 'Patinete', 'Ambulancia', 'Velero',
  'Tranvía', 'Globo aerostático',
  // Personajes y oficios
  'Bombero', 'Astronauta', 'Pirata', 'Payaso', 'Momia', 'Vampiro', 'Robot', 'Sirena',
  'Espantapájaros', 'Ninja', 'Bruja', 'Detective', 'Cartero', 'Buzo', 'Fantasma', 'Mago',
  'Torero', 'Dinosaurio',
  // Naturaleza y comida
  'Cactus', 'Sandía', 'Girasol', 'Cebolla', 'Iceberg', 'Arcoíris', 'Tornado', 'Desierto',
  'Relámpago', 'Eclipse', 'Géiser', 'Palomitas', 'Aguacate', 'Chocolate', 'Helado', 'Piña',
  'Queso', 'Miel',
];

export function wordAt(i: number): string {
  return WORDS[((i % WORDS.length) + WORDS.length) % WORDS.length];
}
