// Banco de palabras de «Codenames»: sustantivos comunes y evocadores, que se
// prestan a dobles sentidos. Se eligen 25 al azar por partida.
export const WORD_BANK: string[] = [
  'Playa', 'Dragón', 'Banco', 'Estrella', 'Nieve', 'Corona', 'Pirata', 'Reloj',
  'Manzana', 'Puente', 'Sombra', 'Circo', 'Rayo', 'Bosque', 'Guitarra', 'Volcán',
  'Robot', 'Máscara', 'Faro', 'Cohete', 'Serpiente', 'Castillo', 'Diamante', 'Tambor',
  'Espejo', 'Ángel', 'Cadena', 'Isla', 'Nube', 'Trono', 'Fantasma', 'Molino',
  'Brújula', 'Caballo', 'Veneno', 'Templo', 'Cuervo', 'Anzuelo', 'Muralla', 'Cometa',
  'León', 'Puerto', 'Bruja', 'Escudo', 'Ballena', 'Desierto', 'Llave', 'Trompeta',
  'Vampiro', 'Cañón', 'Pluma', 'Iglú', 'Semáforo', 'Pirámide', 'Tiburón', 'Botón',
  'Campana', 'Telaraña', 'Cráter', 'Espada', 'Girasol', 'Naipe', 'Pincel', 'Muelle',
  'Coliseo', 'Erizo', 'Trineo', 'Antorcha', 'Búho', 'Cascada', 'Vela', 'Imán',
  'Laberinto', 'Cangrejo', 'Corcho', 'Trébol', 'Pistola', 'Cebra', 'Farol', 'Cuchara',
  'Meteorito', 'Ancla', 'Guante', 'Panal', 'Tobogán', 'Cactus', 'Runa', 'Sirena',
  'Selva', 'Cirujano', 'Mina', 'Ola', 'Ninja', 'Órgano', 'Payaso', 'Cofre',
  'Fósil', 'Cráneo', 'Cuadro', 'Muñeca', 'Ratón', 'Tornado', 'Abanico', 'Cinturón',
  'Dado', 'Escoba', 'Flauta', 'Hormiga', 'Jarrón', 'Kimono', 'Linterna', 'Nudo',
  'Pulpo', 'Queso', 'Silla', 'Tenedor', 'Yunque', 'Cepillo', 'Perla', 'Estatua',
];

// Lista de trabajo, garantizada sin duplicados.
export const WORDS = [...new Set(WORD_BANK)];
