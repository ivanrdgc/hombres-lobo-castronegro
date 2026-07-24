// Cartas de tema de «El Camaleón»: cada una es una rejilla de 16 palabras
// relacionadas con un tema. Una casilla es la palabra SECRETA (la conocen todos
// menos el Camaleón). Contenido puro (sin dependencias).
//
// Criterio al escribir una rejilla (R6): ni dos palabras casi sinónimas —«Queso»
// y «Mozzarella» le regalan un 50/50 al Camaleón cuando la pista vale para las
// dos—, ni palabras que solo se entienden dentro del tema («Protector»,
// «Cortador»), ni la palabra que da nombre al tema. Cada casilla debe ser algo
// que cualquiera de la mesa nombraría por su cuenta.

export interface Topic {
  id: string;
  emoji: string;
  name: string;
  /** Exactamente 16 palabras (rejilla 4×4). */
  words: string[];
}

export const TOPICS: Topic[] = [
  { id: 'playa', emoji: '🏖️', name: 'La playa', words: ['Arena', 'Ola', 'Sombrilla', 'Toalla', 'Bikini', 'Chiringuito', 'Cangrejo', 'Concha', 'Flotador', 'Gaviota', 'Socorrista', 'Palmera', 'Crema solar', 'Chancla', 'Surf', 'Hamaca'] },
  { id: 'pizzeria', emoji: '🍕', name: 'La pizzería', words: ['Masa', 'Queso', 'Tomate', 'Horno', 'Pepperoni', 'Orégano', 'Camarero', 'Napolitana', 'Porción', 'Reparto', 'Piña', 'Champiñón', 'Aceituna', 'Carta', 'Propina', 'Cuenta'] },
  { id: 'cine', emoji: '🎬', name: 'El cine', words: ['Palomitas', 'Pantalla', 'Entrada', 'Butaca', 'Tráiler', 'Estreno', 'Sesión', 'Oscuridad', 'Refresco', 'Cartelera', 'Actor', 'Alfombra roja', 'Subtítulos', 'Créditos', 'Director', 'Gafas 3D'] },
  { id: 'espacio', emoji: '🚀', name: 'El espacio', words: ['Cohete', 'Estrella', 'Planeta', 'Astronauta', 'Galaxia', 'Órbita', 'Meteorito', 'Satélite', 'Agujero negro', 'Alienígena', 'Gravedad', 'Telescopio', 'Luna', 'Despegue', 'Traje espacial', 'Marte'] },
  { id: 'hospital', emoji: '🏥', name: 'El hospital', words: ['Médico', 'Enfermera', 'Camilla', 'Jeringa', 'Quirófano', 'Gotero', 'Urgencias', 'Radiografía', 'Bata', 'Termómetro', 'Ambulancia', 'Vendaje', 'Paciente', 'Bisturí', 'Pastilla', 'Sala de espera'] },
  { id: 'futbol', emoji: '⚽', name: 'El fútbol', words: ['Balón', 'Banquillo', 'Árbitro', 'Gol', 'Tarjeta', 'Penalti', 'Portero', 'Delantero', 'Fuera de juego', 'Bufanda', 'Silbato', 'Córner', 'Fichaje', 'Estadio', 'Hincha', 'Césped'] },
  { id: 'navidad', emoji: '🎄', name: 'La Navidad', words: ['Árbol', 'Regalo', 'Turrón', 'Villancico', 'Belén', 'Cabalgata', 'Nieve', 'Lotería', 'Uvas', 'Cena', 'Trineo', 'Estrella', 'Muérdago', 'Papá Noel', 'Luces', 'Chimenea'] },
  { id: 'colegio', emoji: '🏫', name: 'El colegio', words: ['Pizarra', 'Pupitre', 'Recreo', 'Mochila', 'Examen', 'Profesor', 'Tiza', 'Timbre', 'Deberes', 'Regla', 'Gimnasio', 'Libreta', 'Suspenso', 'Comedor', 'Uniforme', 'Bolígrafo'] },
  { id: 'cocina', emoji: '🍳', name: 'La cocina', words: ['Sartén', 'Cuchillo', 'Horno', 'Delantal', 'Receta', 'Batidora', 'Microondas', 'Cucharón', 'Nevera', 'Especias', 'Tabla de cortar', 'Fregadero', 'Basura', 'Balanza', 'Colador', 'Humo'] },
  { id: 'granja', emoji: '🐴', name: 'La granja', words: ['Vaca', 'Tractor', 'Establo', 'Gallina', 'Heno', 'Ordeño', 'Granjero', 'Cerdo', 'Espantapájaros', 'Barro', 'Oveja', 'Pozo', 'Huevo', 'Arado', 'Valla', 'Perro'] },
  { id: 'crimen', emoji: '🕵️', name: 'La escena del crimen', words: ['Detective', 'Lupa', 'Coartada', 'Huella', 'Sospechoso', 'Sirena', 'Interrogatorio', 'Testigo', 'Arma', 'Cadáver', 'Forense', 'Esposas', 'Cárcel', 'Robo', 'Caja fuerte', 'Guante'] },
  { id: 'concierto', emoji: '🎸', name: 'El concierto', words: ['Escenario', 'Guitarra', 'Público', 'Micrófono', 'Bis', 'Foco', 'Batería', 'Entrada', 'Gira', 'Amplificador', 'Mechero', 'Camerino', 'Telonero', 'Coro', 'Aplauso', 'Autógrafo'] },
  { id: 'supermercado', emoji: '🛒', name: 'El supermercado', words: ['Carrito', 'Caja', 'Cola', 'Estantería', 'Oferta', 'Ticket', 'Bolsa', 'Pasillo', 'Congelados', 'Carnicería', 'Megafonía', 'Escáner', 'Caducidad', 'Aparcamiento', 'Leche', 'Pan'] },
  { id: 'aeropuerto', emoji: '✈️', name: 'El aeropuerto', words: ['Maleta', 'Pasaporte', 'Embarque', 'Piloto', 'Azafata', 'Turbulencias', 'Retraso', 'Aduana', 'Duty free', 'Torre de control', 'Escala', 'Cinturón', 'Ventanilla', 'Rayos X', 'Hangar', 'Despedida'] },
  { id: 'boda', emoji: '💒', name: 'La boda', words: ['Novia', 'Anillo', 'Tarta', 'Ramo', 'Iglesia', 'Banquete', 'Velo', 'Invitados', 'Baile', 'Fotógrafo', 'Arroz', 'Brindis', 'Discurso', 'Luna de miel', 'Padrino', 'Lágrimas'] },
  { id: 'camping', emoji: '⛺', name: 'El camping', words: ['Tienda de campaña', 'Saco de dormir', 'Hoguera', 'Linterna', 'Mosquito', 'Brújula', 'Cantimplora', 'Nudo', 'Río', 'Malvavisco', 'Navaja', 'Sendero', 'Bosque', 'Lluvia', 'Amanecer', 'Ronquidos'] },
];

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
