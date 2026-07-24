// Banco de palabras de «Codenames»: sustantivos comunes y evocadores, que se
// prestan a dobles sentidos. Se eligen 25 al azar por partida. Regla del banco:
// nada de sinónimos ni derivados entre sí («Faro»/«Farol», «Araña»/«Telaraña»,
// «Sol»/«Girasol», «Coliseo»/«Estadio») — si dos palabras se tapan, la pista
// buena para una lo es también para la otra y el Jefe se queda sin herramienta.
// Parecerse por FUERA no cuenta («Lobo»/«Globo», «Mono»/«Kimono» conviven sin
// problema): lo que se vigila es el significado. Cuantas más palabras, menos se
// repiten los tableros entre partidas seguidas (el juego original ronda 400).
export const WORD_BANK: string[] = [
  'Playa', 'Dragón', 'Banco', 'Estrella', 'Nieve', 'Corona', 'Pirata', 'Reloj',
  'Manzana', 'Puente', 'Sombra', 'Circo', 'Rayo', 'Bosque', 'Guitarra', 'Volcán',
  'Robot', 'Máscara', 'Faro', 'Cohete', 'Serpiente', 'Castillo', 'Diamante', 'Tambor',
  'Espejo', 'Ángel', 'Cadena', 'Isla', 'Nube', 'Trono', 'Fantasma', 'Molino',
  'Brújula', 'Caballo', 'Veneno', 'Templo', 'Cuervo', 'Anzuelo', 'Muralla', 'Cometa',
  'León', 'Puerto', 'Bruja', 'Escudo', 'Ballena', 'Desierto', 'Llave', 'Trompeta',
  'Vampiro', 'Cañón', 'Pluma', 'Iglú', 'Semáforo', 'Pirámide', 'Tiburón', 'Botón',
  'Campana', 'Cráter', 'Espada', 'Naipe', 'Pincel', 'Muelle', 'Coliseo', 'Erizo',
  'Trineo', 'Antorcha', 'Búho', 'Cascada', 'Vela', 'Imán', 'Laberinto', 'Cangrejo',
  'Corcho', 'Trébol', 'Pistola', 'Cebra', 'Cuchara', 'Meteorito', 'Ancla', 'Guante',
  'Panal', 'Tobogán', 'Cactus', 'Runa', 'Sirena', 'Selva', 'Cirujano', 'Mina',
  'Ola', 'Ninja', 'Órgano', 'Payaso', 'Cofre', 'Fósil', 'Cráneo', 'Cuadro',
  'Muñeca', 'Ratón', 'Tornado', 'Abanico', 'Cinturón', 'Dado', 'Escoba', 'Flauta',
  'Hormiga', 'Jarrón', 'Kimono', 'Linterna', 'Nudo', 'Pulpo', 'Queso', 'Silla',
  'Yunque', 'Perla', 'Estatua', 'Aguja', 'Anillo', 'Araña', 'Arco', 'Armadura',
  'Astronauta', 'Aurora', 'Avión', 'Bandera', 'Bomba', 'Botella', 'Cámara', 'Camino',
  'Campo', 'Canguro', 'Carbón', 'Cebolla', 'Chimenea', 'Cielo', 'Cine', 'Ciudad',
  'Cocodrilo', 'Concha', 'Conejo', 'Copa', 'Corazón', 'Cristal', 'Cruz', 'Cuerda',
  'Cuerno', 'Cueva', 'Delfín', 'Diente', 'Dinosaurio', 'Disco', 'Duende', 'Eclipse',
  'Elefante', 'Escalera', 'Esfinge', 'Esponja', 'Fábrica', 'Faraón', 'Fiesta', 'Flecha',
  'Fresa', 'Fuente', 'Galaxia', 'Gallo', 'Garra', 'Gato', 'Gigante', 'Globo',
  'Granja', 'Grifo', 'Guerra', 'Hacha', 'Hada', 'Hospital', 'Hotel', 'Huella',
  'Hueso', 'Huevo', 'Iceberg', 'Invierno', 'Jabón', 'Jardín', 'Jaula', 'Juez',
  'Lago', 'Lágrima', 'Lana', 'Lanza', 'Lápiz', 'Látigo', 'Libro', 'Limón',
  'Lobo', 'Luna', 'Lupa', 'Mano', 'Mapa', 'Mariposa', 'Martillo', 'Mesa',
  'Momia', 'Moneda', 'Mono', 'Montaña', 'Motor', 'Murciélago', 'Museo', 'Naranja',
  'Navidad', 'Nido', 'Oasis', 'Ojo', 'Ópera', 'Orquesta', 'Oro', 'Oso',
  'Otoño', 'Paella', 'Palmera', 'Paloma', 'Pantalla', 'Paracaídas', 'Paraguas', 'Pelota',
  'Perro', 'Petróleo', 'Piano', 'Pie', 'Pingüino', 'Piña', 'Piscina', 'Pizarra',
  'Pizza', 'Planeta', 'Plata', 'Policía', 'Pozo', 'Primavera', 'Príncipe', 'Prisión',
  'Raíz', 'Rana', 'Regalo', 'Reina', 'Río', 'Roble', 'Roca', 'Rosa',
  'Rueda', 'Ruina', 'Ruleta', 'Sandía', 'Satélite', 'Seta', 'Sol', 'Sueño',
  'Taxi', 'Teatro', 'Teléfono', 'Telescopio', 'Tenis', 'Tienda', 'Tierra', 'Tigre',
  'Toro', 'Torre', 'Tractor', 'Trampa', 'Tren', 'Tronco', 'Tumba', 'Túnel',
  'Uva', 'Valle', 'Vaquero', 'Verano', 'Viento', 'Violín', 'Virus', 'Zanahoria',
  'Zapato', 'Zorro',
];

// Lista de trabajo, garantizada sin duplicados.
export const WORDS = [...new Set(WORD_BANK)];
