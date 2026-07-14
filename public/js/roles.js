// Catálogo completo de roles de Los Hombres Lobo de Castronegro
// (juego base + expansiones Luna Nueva, El Pueblo y Personajes).
// Módulo puro: sin dependencias de navegador ni Firebase (testeable en Node).

export const TEAMS = {
  pueblo: { id: 'pueblo', name: 'El Pueblo', emoji: '🏡' },
  lobos: { id: 'lobos', name: 'Los Hombres Lobo', emoji: '🐺' },
  solitario: { id: 'solitario', name: 'Solitario', emoji: '🌒' },
};

// expansion: base | luna_nueva | pueblo | personajes
// team: bando al que pertenece la carta al repartirse
// multi: número fijo de cartas si el rol va en grupo (hermanas=2, hermanos=3)
export const ROLES = {
  hombre_lobo: {
    id: 'hombre_lobo', name: 'Hombre Lobo', emoji: '🐺', team: 'lobos',
    expansion: 'base', always: true,
    desc: 'Cada noche devora a un aldeano junto con el resto de lobos. Gana cuando no queda nadie del pueblo.',
  },
  aldeano: {
    id: 'aldeano', name: 'Aldeano', emoji: '🧑‍🌾', team: 'pueblo',
    expansion: 'base', always: true,
    desc: 'Sin poderes especiales. Su única arma es el debate, la intuición y el voto.',
  },
  vidente: {
    id: 'vidente', name: 'La Vidente', emoji: '🔮', team: 'pueblo', expansion: 'base',
    desc: 'Cada noche descubre el verdadero rol de un jugador.',
  },
  bruja: {
    id: 'bruja', name: 'La Bruja', emoji: '🧪', team: 'pueblo', expansion: 'base',
    desc: 'Tiene dos pociones de un solo uso: una cura a la víctima de los lobos y otra envenena a un jugador.',
  },
  cazador: {
    id: 'cazador', name: 'El Cazador', emoji: '🏹', team: 'pueblo', expansion: 'base',
    desc: 'Al morir, dispara una última flecha y se lleva consigo a otro jugador.',
  },
  cupido: {
    id: 'cupido', name: 'Cupido', emoji: '💘', team: 'pueblo', expansion: 'base',
    desc: 'La primera noche enamora a dos jugadores. Si uno muere, el otro muere de pena. Si son de bandos distintos, su objetivo pasa a ser quedar los dos últimos.',
  },
  ladron: {
    id: 'ladron', name: 'El Ladrón', emoji: '🃏', team: 'pueblo', expansion: 'base',
    desc: 'La primera noche puede cambiar su carta por una de las dos cartas sobrantes del centro. Si ambas son de lobo, debe quedarse una.',
  },
  nina: {
    id: 'nina', name: 'La Niña', emoji: '👧', team: 'pueblo', expansion: 'base',
    desc: 'Mientras los lobos eligen con los ojos abiertos, ella puede espiar entreabriendo los suyos. La app no la ayuda: espía de verdad… y que no la pillen.',
  },
  // ——— Luna Nueva ———
  defensor: {
    id: 'defensor', name: 'El Defensor', emoji: '🛡️', team: 'pueblo', expansion: 'luna_nueva',
    desc: 'Cada noche protege a un jugador del ataque de los lobos. No puede proteger al mismo dos noches seguidas.',
  },
  anciano: {
    id: 'anciano', name: 'El Anciano', emoji: '👴', team: 'pueblo', expansion: 'luna_nueva',
    desc: 'Sobrevive al primer ataque de los lobos. Pero si el pueblo, la bruja o el cazador lo matan, todos los aldeanos pierden sus poderes.',
  },
  cabeza_turco: {
    id: 'cabeza_turco', name: 'El Cabeza de Turco', emoji: '🐐', team: 'pueblo', expansion: 'luna_nueva',
    desc: 'Si la votación del día acaba en empate, muere él en su lugar y decide quién dirigirá la votación del día siguiente.',
  },
  tonto: {
    id: 'tonto', name: 'El Tonto del Pueblo', emoji: '🤪', team: 'pueblo', expansion: 'luna_nueva',
    desc: 'Si el pueblo lo lincha, se revela su carta y se salva, aunque pierde el derecho a voto para el resto de la partida.',
  },
  gaitero: {
    id: 'gaitero', name: 'El Gaitero', emoji: '🎶', team: 'solitario', expansion: 'luna_nueva',
    desc: 'Cada noche encanta a dos jugadores con su música. Gana en solitario si todos los vivos quedan encantados.',
  },
  gitana: {
    id: 'gitana', name: 'La Gitana', emoji: '🔯', team: 'pueblo', expansion: 'luna_nueva',
    desc: 'Cada noche invoca a los espíritus: elige una pregunta que un jugador muerto responderá al amanecer con un sí o un no.',
  },
  // ——— El Pueblo ———
  cuervo: {
    id: 'cuervo', name: 'El Cuervo', emoji: '🐦‍⬛', team: 'pueblo', expansion: 'pueblo',
    desc: 'Cada noche señala a un jugador sospechoso: al amanecer, todos sabrán que carga con 2 votos extra en su contra.',
  },
  // ——— Personajes ———
  aldeano_aldeano: {
    id: 'aldeano_aldeano', name: 'El Aldeano-Aldeano', emoji: '👥', team: 'pueblo', expansion: 'personajes',
    desc: 'Sus dos caras muestran un aldeano: todo el pueblo sabe con certeza que es inocente.',
  },
  dos_hermanas: {
    id: 'dos_hermanas', name: 'Las Dos Hermanas', emoji: '👭', team: 'pueblo', expansion: 'personajes', multi: 2, minPlayers: 12,
    desc: 'Se reconocen entre ellas la primera noche. Saber que la otra es inocente es su mayor ventaja. Las reglas las reservan para aldeas grandes.',
  },
  tres_hermanos: {
    id: 'tres_hermanos', name: 'Los Tres Hermanos', emoji: '👨‍👨‍👦', team: 'pueblo', expansion: 'personajes', multi: 3, minPlayers: 16,
    desc: 'Se reconocen entre ellos la primera noche y saben que pueden confiar los unos en los otros. Las reglas los reservan para aldeas muy grandes.',
  },
  angel: {
    id: 'angel', name: 'El Ángel', emoji: '😇', team: 'solitario', expansion: 'personajes',
    desc: 'Gana en solitario si muere la primera noche o en la primera votación. Si sobrevive, pasa a ser un aldeano más.',
  },
  zorro: {
    id: 'zorro', name: 'El Zorro', emoji: '🦊', team: 'pueblo', expansion: 'personajes',
    desc: 'De noche olfatea a un jugador y a sus dos vecinos vivos. Si hay algún lobo entre ellos, podrá volver a olfatear; si no, pierde su poder.',
  },
  caballero: {
    id: 'caballero', name: 'El Caballero de la Espada Oxidada', emoji: '⚔️', team: 'pueblo', expansion: 'personajes',
    desc: 'Si los lobos lo devoran, el lobo más cercano muere infectado por el óxido al amanecer siguiente.',
  },
  juez: {
    id: 'juez', name: 'El Juez Tartamudo', emoji: '⚖️', team: 'pueblo', expansion: 'personajes',
    desc: 'Una vez por partida puede exigir una segunda votación inmediata tras la primera.',
  },
  sirvienta: {
    id: 'sirvienta', name: 'La Abnegada Sirvienta', emoji: '🧹', team: 'pueblo', expansion: 'personajes',
    desc: 'Antes de que se revele el rol de un jugador linchado, puede sacrificar su carta y asumir el rol del eliminado, empezando de cero.',
  },
  actor: {
    id: 'actor', name: 'El Actor', emoji: '🎭', team: 'pueblo', expansion: 'personajes',
    desc: 'Cada noche elige interpretar uno de tres poderes: ver un rol como la vidente, proteger como el defensor o señalar como el cuervo.',
  },
  sectario: {
    id: 'sectario', name: 'El Abominable Sectario', emoji: '🌗', team: 'solitario', expansion: 'personajes',
    desc: 'La mesa se divide en dos mitades. Gana en solitario si eliminan a todos los de la mitad contraria a la suya.',
  },
  domador: {
    id: 'domador', name: 'El Domador de Osos', emoji: '🐻', team: 'pueblo', expansion: 'personajes',
    desc: 'Cada amanecer, si alguno de sus vecinos vivos es un hombre lobo, su oso gruñe y avisa a todo el pueblo.',
  },
  nino_salvaje: {
    id: 'nino_salvaje', name: 'El Niño Salvaje', emoji: '🐾', team: 'pueblo', expansion: 'personajes',
    desc: 'La primera noche elige un modelo a seguir. Si su modelo muere, se transforma en hombre lobo.',
  },
  lobo_albino: {
    id: 'lobo_albino', name: 'El Hombre Lobo Albino', emoji: '🌕', team: 'solitario', expansion: 'personajes',
    desc: 'Caza con los lobos, pero una noche de cada dos puede devorar a uno de ellos. Gana si queda como único superviviente.',
  },
  lobo_feroz: {
    id: 'lobo_feroz', name: 'El Gran Lobo Feroz', emoji: '🐺🔥', team: 'lobos', expansion: 'personajes',
    desc: 'Mientras no haya muerto ningún lobo, cada noche devora a una segunda víctima él solo.',
  },
  perro_lobo: {
    id: 'perro_lobo', name: 'El Perro Lobo', emoji: '🐕', team: 'pueblo', expansion: 'personajes',
    desc: 'La primera noche elige su destino: ser un aldeano fiel o unirse a la manada de los lobos.',
  },
  infecto: {
    id: 'infecto', name: 'El Infecto Padre de los Lobos', emoji: '🧛', team: 'lobos', expansion: 'personajes',
    desc: 'Una vez por partida puede infectar a la víctima de los lobos en vez de devorarla: esta se convierte en hombre lobo en secreto.',
  },
};

export const EXPANSIONS = [
  { id: 'base', name: 'Juego base', emoji: '📦' },
  { id: 'luna_nueva', name: 'Luna Nueva', emoji: '🌙' },
  { id: 'pueblo', name: 'El Pueblo', emoji: '🏘️' },
  { id: 'personajes', name: 'Personajes', emoji: '🎴' },
];

// Roles del bando lobo que sustituyen cartas de Hombre Lobo al repartir.
const WOLF_EXTRAS = ['lobo_feroz', 'infecto', 'lobo_albino'];

// Número de lobos según las reglas oficiales: 8-11 jugadores → 2; 12-17 → 3; 18+ → 4.
// Por debajo de 8 (modo casual, fuera de las reglas oficiales): 1 lobo hasta 6, 2 con 7.
export function wolfCountFor(n) {
  if (n <= 6) return 1;
  if (n <= 11) return 2;
  if (n <= 17) return 3;
  return 4;
}

// Roles cuya mecánica depende de quién se sienta al lado de quién.
export const NEIGHBOR_ROLES = ['zorro', 'domador', 'caballero', 'sectario'];

export const OFFICIAL_MIN_PLAYERS = 8; // jugadores repartidos, sin contar al narrador
export const CASUAL_MIN_PLAYERS = 3;

export function isWolfTeamRole(roleId) {
  return roleId === 'hombre_lobo' || roleId === 'lobo_feroz' || roleId === 'infecto' || roleId === 'lobo_albino';
}

// ¿El jugador caza con la manada esta noche? (incluye conversos)
export function isWolfSide(p) {
  if (!p.role) return false;
  return isWolfTeamRole(p.role) || p.infected === true || p.transformed === true ||
    (p.role === 'perro_lobo' && p.wolfSide === true);
}

// Bando efectivo a efectos de victoria.
export function effectiveTeam(p) {
  if (p.role === 'lobo_albino') return 'solitario';
  if (isWolfSide(p)) return 'lobos';
  const r = ROLES[p.role];
  return r ? r.team : 'pueblo';
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Palabras clave secretas por jugador: permiten que la voz del narrador
// "despierte" a jugadores elegidos en oculto (enamorados, encantados…)
// sin delatar quiénes son, como el toque en el hombro del narrador físico.
const KW_A = ['Luna', 'Cuervo', 'Sombra', 'Aullido', 'Espada', 'Farol', 'Búho', 'Trueno', 'Brasa', 'Campana', 'Zarza', 'Colmillo'];
const KW_B = ['Plata', 'Medianoche', 'Otoño', 'Invierno', 'Ceniza', 'Cristal', 'Sangre', 'Niebla', 'Roble', 'Montaña'];
export function generateKeywords(n, seed) {
  const rnd = mulberry32(seed >>> 0);
  const combos = [];
  for (const a of KW_A) for (const b of KW_B) combos.push(`${a} de ${b}`);
  return shuffled(combos, rnd).slice(0, n);
}

// Construye el mazo para n jugadores con los roles extra activados, siguiendo
// las reglas oficiales: número de lobos por tabla, mínimos de jugadores por rol
// y, con el Ladrón, 2 cartas de Aldeano extra (las 2 sobrantes del reparto van
// al centro y pueden ser cualquier carta, incluso lobos).
// Devuelve { deck: [roleId x n], center: [], pool, dropped: [{id, reason}] }
export function buildDeck(n, extraRoles, seed, wolvesOverride = null, villagersOverride = null) {
  const rnd = mulberry32(seed);
  // El máster puede fijar el número de lobos; «auto» sigue la tabla oficial.
  const wolves = Math.max(1, Math.min(n - 1, wolvesOverride || wolfCountFor(n)));
  const enabled = extraRoles.filter((r) => ROLES[r] && !ROLES[r].always);
  const dropped = [];
  const extras = [];
  for (const r of enabled) {
    if (ROLES[r].minPlayers && n < ROLES[r].minPlayers) dropped.push({ id: r, reason: 'min' });
    else extras.push(r);
  }

  // Bando lobo: los especiales sustituyen lobos comunes.
  const wolfSpecials = shuffled(extras.filter((r) => WOLF_EXTRAS.includes(r)), rnd);
  const wolfDeck = wolfSpecials.slice(0, wolves);
  for (const r of wolfSpecials.slice(wolves)) dropped.push({ id: r, reason: 'sitio' });
  while (wolfDeck.length < wolves) wolfDeck.push('hombre_lobo');

  // Resto de especiales, en orden aleatorio, hasta llenar los asientos del pueblo.
  const villageSeats = n - wolves;
  // Aldeanos fijados: se les reservan asientos (capado a los que haya, para que
  // la partida siga siendo jugable con sus lobos). Con «auto» solo rellenan huecos.
  const reserved = (villagersOverride === null || villagersOverride === undefined)
    ? 0 : Math.max(0, Math.min(villageSeats, villagersOverride));
  const specialSeats = villageSeats - reserved;
  const villageSpecials = shuffled(extras.filter((r) => !WOLF_EXTRAS.includes(r)), rnd);
  const villageDeck = [];
  for (const r of villageSpecials) {
    const copies = ROLES[r].multi || 1;
    if (villageDeck.length + copies <= specialSeats) {
      for (let i = 0; i < copies; i++) villageDeck.push(r);
    } else {
      dropped.push({ id: r, reason: 'sitio' }); // no cabe: sorteo implícito del barajado
    }
  }
  while (villageDeck.length < villageSeats) villageDeck.push('aldeano');

  const hasLadron = villageDeck.includes('ladron');
  let pool = wolfDeck.concat(villageDeck);
  if (hasLadron) pool = pool.concat(['aldeano', 'aldeano']); // regla oficial del Ladrón
  let deck = [];
  let center = [];
  // Reparto: si por azar todos los lobos acabaran en el centro, se vuelve a barajar.
  for (let tries = 0; tries < 30; tries++) {
    pool = shuffled(pool, rnd);
    deck = pool.slice(0, n);
    center = hasLadron ? pool.slice(n) : [];
    if (deck.some((r) => WOLF_EXTRAS.includes(r) || r === 'hombre_lobo')) break;
  }
  return { deck, center, pool, dropped };
}

// Asigna roles: players = [{id, order}], devuelve { assignments: {pid: roleId}, center, composition, dropped }
// La composición pública refleja todas las cartas en juego (incluidas las del
// centro con el Ladrón), igual que en el juego físico.
export function dealRoles(players, extraRoles, seed, wolvesOverride = null, villagersOverride = null) {
  const { deck, center, pool, dropped } = buildDeck(players.length, extraRoles, seed, wolvesOverride, villagersOverride);
  const sorted = players.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const assignments = {};
  sorted.forEach((p, i) => { assignments[p.id] = deck[i]; });
  const composition = {};
  for (const r of pool) composition[r] = (composition[r] || 0) + 1;
  return { assignments, center, composition, dropped };
}

// Vecinos vivos en el círculo (orden de asiento), saltando muertos.
export function aliveNeighbors(playersArr, pid) {
  const sorted = playersArr.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = sorted.findIndex((p) => p.id === pid);
  if (idx === -1) return [];
  const n = sorted.length;
  const found = [];
  for (let d = 1; d < n; d++) { // hacia la izquierda
    const p = sorted[(idx - d + n * 2) % n];
    if (p.alive && p.id !== pid) { found.push(p); break; }
  }
  for (let d = 1; d < n; d++) { // hacia la derecha
    const p = sorted[(idx + d) % n];
    if (p.alive && p.id !== pid && !found.some((f) => f.id === p.id)) { found.push(p); break; }
  }
  return found;
}
