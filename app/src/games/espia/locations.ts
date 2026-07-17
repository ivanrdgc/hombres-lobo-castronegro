// Las 30 localizaciones de El Espía, con 7 papeles cada una (máximo oficial:
// 7 agentes + 1 espía). Contenido propio en español; la lista de NOMBRES es
// pública en la mesa (como la carta de referencia del juego físico).

export interface EspiaLocation {
  id: string;
  emoji: string;
  name: string;
  roles: string[]; // exactamente 7, únicos dentro de la localización
}

export const LOCATIONS: EspiaLocation[] = [
  {
    id: 'avion', emoji: '✈️', name: 'Avión transatlántico',
    roles: ['Comandante', 'Auxiliar de vuelo', 'Pasajera de primera clase', 'Turista con miedo a volar', 'Mecánico de vuelo', 'Contrabandista de perfumes', 'Niño que viaja solo'],
  },
  {
    id: 'banco', emoji: '🏦', name: 'Banco central',
    roles: ['Directora de la sucursal', 'Cajero', 'Guardia de seguridad', 'Cliente moroso', 'Asesora de hipotecas', 'Auditora sorpresa', 'Atracador arrepentido en la cola'],
  },
  {
    id: 'playa', emoji: '🏖️', name: 'Playa de moda',
    roles: ['Socorrista', 'Heladero', 'Surfista', 'Turista quemado por el sol', 'Niña de los castillos de arena', 'Vendedor ambulante de gafas', 'Jubilada con sombrilla'],
  },
  {
    id: 'casino', emoji: '🎰', name: 'Casino de lujo',
    roles: ['Crupier', 'Jugador compulsivo', 'Camarera de cócteles', 'Guardia de seguridad', 'Millonaria de incógnito', 'Tramposo profesional', 'Inspector de juego'],
  },
  {
    id: 'catedral', emoji: '⛪', name: 'Catedral gótica',
    roles: ['Obispo', 'Monaguillo', 'Organista', 'Guía turística', 'Restaurador de vidrieras', 'Feligresa de diario', 'Campanero'],
  },
  {
    id: 'circo', emoji: '🎪', name: 'Circo ambulante',
    roles: ['Trapecista', 'Payaso triste', 'Domadora de leones', 'Forzudo', 'Vendedor de palomitas', 'Mago despistado', 'Espectador de primera fila'],
  },
  {
    id: 'fiesta', emoji: '🥂', name: 'Fiesta de empresa',
    roles: ['Jefa que quiere ser guay', 'Becario', 'DJ contratado', 'Camarero', 'El de recursos humanos', 'La nueva de contabilidad', 'Comercial que ha bebido de más'],
  },
  {
    id: 'cruzada', emoji: '⚔️', name: 'Hueste cruzada',
    roles: ['Caballero', 'Escudero', 'Arquera', 'Monje guerrero', 'Cocinero de campaña', 'Portaestandarte', 'Prisionero sarraceno'],
  },
  {
    id: 'spa', emoji: '💆', name: 'Balneario termal',
    roles: ['Masajista', 'Recepcionista', 'Clienta en albornoz', 'Monitor de yoga', 'Esteticista', 'Fontanero del jacuzzi', 'Influencer haciéndose fotos'],
  },
  {
    id: 'embajada', emoji: '🏛️', name: 'Embajada',
    roles: ['Embajadora', 'Agregado cultural', 'Traductora', 'Guardia de seguridad', 'Diplomático extranjero', 'Solicitante de visado', 'Periodista acreditado'],
  },
  {
    id: 'hospital', emoji: '🏥', name: 'Hospital universitario',
    roles: ['Cirujana', 'Enfermero', 'Anestesista', 'Paciente en bata', 'Celador', 'Estudiante de medicina', 'Visitante con flores'],
  },
  {
    id: 'hotel', emoji: '🏨', name: 'Gran hotel',
    roles: ['Recepcionista', 'Botones', 'Gobernanta', 'Chef del restaurante', 'Huésped famoso de incógnito', 'Turista que regatea', 'Socorrista de la piscina'],
  },
  {
    id: 'base', emoji: '🪖', name: 'Base militar',
    roles: ['Coronela', 'Recluta novato', 'Francotirador', 'Cocinero de rancho', 'Médica militar', 'Mecánico de blindados', 'Oficial de radio'],
  },
  {
    id: 'cine', emoji: '🎬', name: 'Estudio de cine',
    roles: ['Directora', 'Actor protagonista', 'Doble de acción', 'Maquilladora', 'Guionista quemado', 'Operador de cámara', 'Extra con una sola frase'],
  },
  {
    id: 'crucero', emoji: '🛳️', name: 'Crucero por el Mediterráneo',
    roles: ['Capitán', 'Animadora del barco', 'Cocinero', 'Pasajera de lujo', 'Marinero de cubierta', 'Músico de la orquesta', 'Polizón'],
  },
  {
    id: 'tren', emoji: '🚂', name: 'Tren nocturno',
    roles: ['Maquinista', 'Revisora', 'Camarero del vagón restaurante', 'Viajera con una maleta enorme', 'Turista dormido', 'Contrabandista', 'Niño explorando los vagones'],
  },
  {
    id: 'pirata', emoji: '🏴‍☠️', name: 'Barco pirata',
    roles: ['Capitana', 'Contramaestre', 'Grumete', 'Cocinero de a bordo', 'Vigía del palo mayor', 'Carpintero', 'Prisionero del motín'],
  },
  {
    id: 'polar', emoji: '❄️', name: 'Estación polar',
    roles: ['Jefa de la expedición', 'Meteorólogo', 'Biólogo', 'Cocinero', 'Mecánica de motonieves', 'Médico', 'Glaciólogo aburrido'],
  },
  {
    id: 'comisaria', emoji: '🚔', name: 'Comisaría de policía',
    roles: ['Inspectora', 'Agente novato', 'Detenido esposado', 'Abogada de oficio', 'Forense', 'Confidente nervioso', 'Sargento de guardia'],
  },
  {
    id: 'restaurante', emoji: '🍽️', name: 'Restaurante con estrella',
    roles: ['Chef estrella', 'Camarero', 'Sumiller', 'Crítica gastronómica de incógnito', 'Friegaplatos', 'Cliente quisquilloso', 'Pareja de aniversario'],
  },
  {
    id: 'colegio', emoji: '🏫', name: 'Colegio',
    roles: ['Maestra', 'Alumno castigado', 'Conserje', 'Director', 'Profesora de gimnasia', 'Empollona de primera fila', 'Cocinera del comedor'],
  },
  {
    id: 'gasolinera', emoji: '⛽', name: 'Gasolinera de carretera',
    roles: ['Encargado', 'Mecánica', 'Camionero', 'Motera de paso', 'Cajero del turno de noche', 'Viajante dormido en su coche', 'Limpiaparabrisas espontáneo'],
  },
  {
    id: 'espacial', emoji: '🛰️', name: 'Estación espacial',
    roles: ['Comandante', 'Ingeniera de vuelo', 'Astronauta novato', 'Científica de experimentos', 'Médico de a bordo', 'Turista espacial multimillonario', 'Especialista en robots'],
  },
  {
    id: 'submarino', emoji: '🌊', name: 'Submarino nuclear',
    roles: ['Capitán', 'Oficial de sonar', 'Torpedista', 'Cocinera', 'Mecánico', 'Médico de a bordo', 'Marinero claustrofóbico'],
  },
  {
    id: 'supermercado', emoji: '🛒', name: 'Supermercado',
    roles: ['Cajera', 'Reponedor', 'Carnicero', 'Encargada', 'Guardia de seguridad', 'Cliente con mil cupones', 'Abuela que prueba todas las ofertas'],
  },
  {
    id: 'teatro', emoji: '🎭', name: 'Teatro a la italiana',
    roles: ['Primera actriz', 'Apuntador', 'Acomodadora', 'Tramoyista', 'Director de escena', 'Crítico de estreno', 'Espectador dormido en el palco'],
  },
  {
    id: 'universidad', emoji: '🎓', name: 'Universidad',
    roles: ['Rectora', 'Catedrático despistado', 'Estudiante de primero', 'Bibliotecaria', 'Bedel', 'Doctorando eterno', 'Estudiante de intercambio'],
  },
  {
    id: 'castronegro', emoji: '🐺', name: 'La aldea de Castronegro',
    roles: ['Tabernero', 'Herrera', 'Alguacil', 'Curandera', 'Leñador', 'Molinera', 'Forastero misterioso'],
  },
  {
    id: 'estadio', emoji: '⚽', name: 'Estadio de fútbol',
    roles: ['Portero legendario', 'Delantera estrella', 'Árbitro', 'Entrenador en la cuerda floja', 'Aficionado radical', 'Vendedora de bufandas', 'Fisioterapeuta'],
  },
  {
    id: 'atracciones', emoji: '🎢', name: 'Parque de atracciones',
    roles: ['Operadora de la montaña rusa', 'Vendedor de algodón de azúcar', 'Mascota disfrazada', 'Técnico de mantenimiento', 'Taquillera', 'Adolescente en su primera cita', 'Niña perdida con un globo'],
  },
];

export const locationById = (id: string | null | undefined): EspiaLocation | undefined =>
  LOCATIONS.find((l) => l.id === id);
