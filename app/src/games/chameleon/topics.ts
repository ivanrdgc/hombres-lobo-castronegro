// Cartas de tema de «El Camaleón»: cada una es una rejilla de 16 palabras
// relacionadas con un tema. Una casilla es la palabra SECRETA (la conocen todos
// menos el Camaleón). Contenido puro (sin dependencias).

export interface Topic {
  id: string;
  emoji: string;
  name: string;
  /** Exactamente 16 palabras (rejilla 4×4). */
  words: string[];
}

export const TOPICS: Topic[] = [
  { id: 'playa', emoji: '🏖️', name: 'La playa', words: ['Arena', 'Ola', 'Sombrilla', 'Toalla', 'Bikini', 'Chiringuito', 'Cangrejo', 'Concha', 'Flotador', 'Gaviota', 'Marea', 'Palmera', 'Protector', 'Sandalia', 'Surf', 'Castillo'] },
  { id: 'pizzeria', emoji: '🍕', name: 'La pizzería', words: ['Masa', 'Queso', 'Tomate', 'Horno', 'Pepperoni', 'Orégano', 'Camarero', 'Napolitana', 'Porción', 'Cortador', 'Albahaca', 'Mozzarella', 'Aceituna', 'Carta', 'Propina', 'Cuenta'] },
  { id: 'cine', emoji: '🎬', name: 'El cine', words: ['Palomitas', 'Pantalla', 'Entrada', 'Butaca', 'Tráiler', 'Estreno', 'Taquilla', 'Oscuridad', 'Refresco', 'Cartelera', 'Actor', 'Fila', 'Subtítulos', 'Créditos', 'Director', 'Gafas 3D'] },
  { id: 'espacio', emoji: '🚀', name: 'El espacio', words: ['Cohete', 'Estrella', 'Planeta', 'Astronauta', 'Galaxia', 'Órbita', 'Meteorito', 'Satélite', 'Agujero negro', 'Nebulosa', 'Gravedad', 'Telescopio', 'Luna', 'Cometa', 'Traje', 'Marte'] },
  { id: 'hospital', emoji: '🏥', name: 'El hospital', words: ['Médico', 'Enfermera', 'Camilla', 'Jeringa', 'Quirófano', 'Receta', 'Urgencias', 'Radiografía', 'Bata', 'Termómetro', 'Ambulancia', 'Vendaje', 'Paciente', 'Bisturí', 'Pastilla', 'Consulta'] },
  { id: 'futbol', emoji: '⚽', name: 'El fútbol', words: ['Balón', 'Portería', 'Árbitro', 'Gol', 'Tarjeta', 'Penalti', 'Portero', 'Delantero', 'Falta', 'Grada', 'Silbato', 'Córner', 'Fichaje', 'Estadio', 'Hincha', 'Césped'] },
  { id: 'navidad', emoji: '🎄', name: 'La Navidad', words: ['Árbol', 'Regalo', 'Turrón', 'Villancico', 'Belén', 'Reyes', 'Nieve', 'Espumillón', 'Uvas', 'Cena', 'Trineo', 'Estrella', 'Muérdago', 'Papá Noel', 'Guirnalda', 'Chimenea'] },
  { id: 'colegio', emoji: '🏫', name: 'El colegio', words: ['Pizarra', 'Pupitre', 'Recreo', 'Mochila', 'Examen', 'Profesor', 'Tiza', 'Timbre', 'Deberes', 'Regla', 'Patio', 'Libreta', 'Suspenso', 'Comedor', 'Uniforme', 'Bolígrafo'] },
  { id: 'cocina', emoji: '🍳', name: 'La cocina', words: ['Sartén', 'Cuchillo', 'Horno', 'Delantal', 'Receta', 'Batidora', 'Fuego', 'Cucharón', 'Nevera', 'Especias', 'Tabla', 'Fregadero', 'Olla', 'Balanza', 'Colador', 'Fuente'] },
  { id: 'granja', emoji: '🐴', name: 'La granja', words: ['Vaca', 'Tractor', 'Establo', 'Gallina', 'Heno', 'Ordeño', 'Granjero', 'Cerdo', 'Espantapájaros', 'Cosecha', 'Oveja', 'Pozo', 'Huevo', 'Arado', 'Corral', 'Pastor'] },
  { id: 'crimen', emoji: '🕵️', name: 'La escena del crimen', words: ['Detective', 'Pista', 'Coartada', 'Huella', 'Sospechoso', 'Móvil', 'Interrogatorio', 'Testigo', 'Arma', 'Escena', 'Forense', 'Culpable', 'Cárcel', 'Robo', 'Alarma', 'Guante'] },
  { id: 'concierto', emoji: '🎸', name: 'El concierto', words: ['Escenario', 'Guitarra', 'Público', 'Micrófono', 'Bis', 'Foco', 'Batería', 'Entrada', 'Gira', 'Amplificador', 'Mechero', 'Camerino', 'Repertorio', 'Coro', 'Aplauso', 'Camiseta'] },
];

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
