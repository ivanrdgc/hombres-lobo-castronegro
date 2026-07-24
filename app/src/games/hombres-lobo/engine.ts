// Motor del juego (modo automático): pasos de la noche, resolución del amanecer,
// votaciones del día y condiciones de victoria. Módulo puro (testeable en Node).
// Port literal de public/js/engine.js (v1); solo se añaden tipos.
import { ROLES, isWolfSide, aliveNeighbors } from './roles';
import type { RoleId } from './roles';
import type {
  Acts, Composition, DeathCause, DeathNote, DeathRecord, GamePlayer, LogEntry,
  PendingEntry, StepId, WinnerId,
} from './types';

export const GITANA_QUESTIONS: string[] = [
  '¿Está viva la vidente?',
  '¿Hay algún hombre lobo entre los tres jugadores más veteranos de la mesa?',
  '¿Murió algún aldeano sin poderes esta noche?',
  '¿Queda más de un hombre lobo con vida?',
  '¿El último eliminado era del bando del pueblo?',
  '¿Hay algún enamorado con vida?',
];

export interface NightStepDef {
  id: StepId;
  roles: RoleId[];
  firstNight?: boolean;
  evenNights?: boolean;
  silent?: boolean;
}

// Definición ordenada de los pasos de la noche.
// silent: paso interno sin locución (no delata información).
export const NIGHT_STEPS: NightStepDef[] = [
  { id: 'durmiendo', roles: [] }, // colchón inicial: todos cierran los ojos
  { id: 'ladron', roles: ['ladron'], firstNight: true },
  { id: 'cupido', roles: ['cupido'], firstNight: true },
  { id: 'enamorados', roles: [], firstNight: true },
  { id: 'nino_salvaje', roles: ['nino_salvaje'], firstNight: true },
  { id: 'perro_lobo', roles: ['perro_lobo'], firstNight: true },
  { id: 'dos_hermanas', roles: ['dos_hermanas'], firstNight: true },
  { id: 'tres_hermanos', roles: ['tres_hermanos'], firstNight: true },
  { id: 'actor', roles: ['actor'] },
  { id: 'defensor', roles: ['defensor'] },
  { id: 'vidente', roles: ['vidente'] },
  { id: 'zorro', roles: ['zorro'] },
  { id: 'cuervo', roles: ['cuervo'] },
  { id: 'lobos_reconocen', roles: [], firstNight: true },
  { id: 'lobos', roles: [] },
  { id: 'infecto_decision', roles: ['infecto'], silent: true },
  { id: 'infectado', roles: [] },
  { id: 'lobo_feroz', roles: ['lobo_feroz'] },
  { id: 'lobo_albino', roles: ['lobo_albino'], evenNights: true },
  { id: 'bruja', roles: ['bruja'] },
  { id: 'gaitero', roles: ['gaitero'] },
  { id: 'encantados', roles: [] },
  { id: 'gitana', roles: ['gitana'] },
  { id: 'amanecer', roles: [] },
];

/** Lo que computeNightSteps necesita saber de la partida. */
export interface StepsGame {
  night: number;
  noKillNight1?: boolean;
  fakeAllSelected?: boolean;
  selectedRoles?: (RoleId | string)[];
  composition?: Composition;
  powersLost?: boolean;
  revealDead?: boolean;
}

const roleDealt = (game: { composition?: Composition }, roleId: RoleId) =>
  (game.composition?.[roleId] ?? 0) > 0;

// Pasos de roles de pueblo con poder que enmudecen al morir el Anciano. Si su
// muerte es pública, se omiten por completo: nadie necesita disimular un poder
// que todo el pueblo sabe perdido (noche rápida). Los lobos y roles solitarios
// (gaitero…) no se ven afectados.
const ANCIANO_MUTED_STEPS: StepId[] = ['actor', 'defensor', 'vidente', 'zorro', 'cuervo', 'bruja', 'gitana'];

// Pasos que componen la noche `night` para esta partida.
export function computeNightSteps(game: StepsGame, players: GamePlayer[]): StepId[] {
  const steps: StepId[] = [];
  // Composición secreta: los roles activados pero NO repartidos también tienen
  // su paso (fantasma), para que la voz finja que juegan de verdad.
  const fakeSel = (r: RoleId) => !!(game.fakeAllSelected && (game.selectedRoles || []).includes(r));
  // Muerte pública del Anciano: sus roles de pueblo ya no despiertan (ni real ni
  // fantasma). Muerte privada: siguen despertando para disimular.
  const powersPublic = !!game.powersLost && game.revealDead !== false;
  for (const s of NIGHT_STEPS) {
    if (s.firstNight && game.night !== 1) continue;
    if (powersPublic && ANCIANO_MUTED_STEPS.includes(s.id)) continue;
    if (s.evenNights && game.night % 2 !== 0) continue;
    // Primera noche sin sangre: los lobos se reconocen, pero nadie devora.
    if (game.noKillNight1 && game.night === 1
      && ['lobos', 'infecto_decision', 'infectado', 'lobo_feroz'].includes(s.id)) continue;
    if (s.id === 'lobos' || s.id === 'amanecer' || s.id === 'durmiendo') { steps.push(s.id); continue; }
    if (s.id === 'lobos_reconocen') {
      // Solo hace falta presentar a la manada cuando la primera noche es sin
      // sangre; si hay caza, los lobos se reconocen al elegir a su presa.
      if (game.noKillNight1) steps.push(s.id);
      continue;
    }
    if (s.id === 'enamorados') {
      if (roleDealt(game, 'cupido') || fakeSel('cupido')) steps.push(s.id);
      continue;
    }
    if (s.id === 'encantados') {
      if (roleDealt(game, 'gaitero') || fakeSel('gaitero')) steps.push(s.id);
      continue;
    }
    if (s.id === 'infectado') {
      // La llamada al mordido existe SIEMPRE que el Infecto esté (o pueda
      // estar) en juego: las noches sin infección suenan señuelos, para que
      // el paso no delate si usó su poder.
      if (roleDealt(game, 'infecto') || fakeSel('infecto')) steps.push(s.id);
      continue;
    }
    // Se incluye si el rol se repartió o si alguien lo tiene ahora (ladrón/sirvienta pueden cambiar cartas).
    if (s.roles.some((r) => roleDealt(game, r)) || players.some((p) => p.role != null && s.roles.includes(p.role))
      || s.roles.some(fakeSel)) {
      steps.push(s.id);
    }
  }
  return steps;
}

const aliveWithRole = (players: GamePlayer[], roleId: RoleId) =>
  players.filter((p) => p.alive && p.role === roleId);

/** Lo que stepActors necesita saber de la partida. */
export interface ActorsGame {
  acts?: Acts;
  wolfDeathOccurred?: boolean;
}

// ¿Quién debe actuar en este paso? null => paso "fantasma" (locución + espera falsa) o saltable.
export function stepActors(stepId: StepId | string, game: ActorsGame, players: GamePlayer[]): string[] | null {
  const acts = game.acts || {};
  switch (stepId) {
    case 'ladron': {
      if (acts.ladronDone) return null;
      return idsOf(aliveWithRole(players, 'ladron'));
    }
    case 'cupido': {
      if (acts.cupidoPair) return null;
      return idsOf(aliveWithRole(players, 'cupido'));
    }
    case 'enamorados': {
      const lovers = players.filter((p) => p.alive && p.lover && !(acts.loversSeen || {})[p.id]);
      return idsOf(lovers);
    }
    case 'nino_salvaje': {
      const n = aliveWithRole(players, 'nino_salvaje').filter((p) => !p.modelId);
      return idsOf(n);
    }
    case 'perro_lobo': {
      const n = aliveWithRole(players, 'perro_lobo').filter((p) => p.wolfSide === null || p.wolfSide === undefined);
      return idsOf(n);
    }
    case 'dos_hermanas': {
      const n = aliveWithRole(players, 'dos_hermanas').filter((p) => !(acts.hermanasSeen || {})[p.id]);
      return idsOf(n);
    }
    case 'tres_hermanos': {
      const n = aliveWithRole(players, 'tres_hermanos').filter((p) => !(acts.hermanosSeen || {})[p.id]);
      return idsOf(n);
    }
    case 'actor': {
      if (acts.actor) {
        // Con el poder de la vidente, el actor debe confirmar que ha visto el resultado.
        if (acts.actor.power === 'vidente' && acts.actor.target && !acts.actorSeen) {
          return idsOf(aliveWithRole(players, 'actor'));
        }
        return null;
      }
      return idsOf(aliveWithRole(players, 'actor'));
    }
    // Nota: los roles vivos SIEMPRE despiertan, aunque no puedan usar su poder
    // (pociones gastadas, olfato perdido, castigo del Anciano). La interfaz les
    // muestra un panel de disimulo y su comportamiento externo es idéntico.
    case 'defensor': {
      if (acts.defensorTarget !== undefined) return null;
      return idsOf(aliveWithRole(players, 'defensor'));
    }
    case 'vidente': {
      if (acts.videnteTarget !== undefined) {
        // Ya eligió: espera a que confirme que ha memorizado el resultado.
        if (acts.videnteTarget === null || acts.videnteSeen) return null;
        return idsOf(aliveWithRole(players, 'vidente'));
      }
      return idsOf(aliveWithRole(players, 'vidente'));
    }
    case 'zorro': {
      if (acts.zorroTarget !== undefined) {
        if (acts.zorroTarget === null || acts.zorroSeen) return null;
        return idsOf(aliveWithRole(players, 'zorro')); // confirmando el resultado
      }
      return idsOf(aliveWithRole(players, 'zorro'));
    }
    case 'cuervo': {
      if (acts.cuervoTarget !== undefined) return null;
      return idsOf(aliveWithRole(players, 'cuervo'));
    }
    case 'lobos_reconocen': {
      // Los lobos alzan la vista y se reconocen físicamente; cada uno lo confirma.
      const ws = players.filter((p) => p.alive && isWolfSide(p) && !(acts.lobosSeen || {})[p.id]);
      return idsOf(ws);
    }
    case 'lobos': {
      if (acts.wolfVictim !== undefined) return null;
      return idsOf(players.filter((p) => p.alive && isWolfSide(p)));
    }
    case 'infecto_decision': {
      if (!acts.wolfVictim) return null;
      if (acts.infectoDecided) return null;
      const inf = aliveWithRole(players, 'infecto').filter((p) => (p.powers || {}).infect !== false);
      return idsOf(inf);
    }
    case 'infectado': {
      // Despierta (por palabra clave) SOLO la víctima infectada esta noche,
      // para enterarse en secreto de su nueva sangre y confirmarlo.
      const pid = infectionTonight({ acts }, players);
      if (!pid || (acts.infectadoSeen || {})[pid]) return null;
      return [pid];
    }
    case 'lobo_feroz': {
      if (acts.ferozVictim !== undefined) return null;
      if (game.wolfDeathOccurred) return null;
      return idsOf(aliveWithRole(players, 'lobo_feroz'));
    }
    case 'lobo_albino': {
      if (acts.albinoVictim !== undefined) return null;
      return idsOf(aliveWithRole(players, 'lobo_albino'));
    }
    case 'bruja': {
      if (acts.brujaDone) return null;
      return idsOf(aliveWithRole(players, 'bruja'));
    }
    case 'gaitero': {
      if (acts.gaiteroTargets) return null;
      return idsOf(aliveWithRole(players, 'gaitero'));
    }
    case 'encantados': {
      // Como en el juego de mesa, TODOS los encantados (viejos y nuevos) se
      // despiertan cada noche que el Gaitero actúa, para reconocerse. Sus
      // palabras clave vuelven a sonar: por eso rotan al confirmar.
      const targets = acts.gaiteroTargets || [];
      if (!targets.length) return null; // sin encantamiento (o gaitero inactivo)
      const pend = players.filter((p) => p.alive && p.charmed && !(acts.encantadosSeen || {})[p.id]);
      return idsOf(pend);
    }
    case 'durmiendo':
      return null; // nadie actúa: tiempo para que todos cierren los ojos
    case 'gitana': {
      if (acts.gitanaDone) return null;
      return idsOf(aliveWithRole(players, 'gitana'));
    }
    default:
      return null;
  }
}

function idsOf(arr: GamePlayer[]): string[] | null {
  return arr.length ? arr.map((p) => p.id) : null;
}

// ¿Quién queda infectado ESTA noche? (null si no hay/no prospera). El contagio
// va en el mordisco principal: el Defensor (o el Actor-defensor) lo anula por
// completo; la cura de la Bruja llega después y NO lo impide. Es el mismo
// criterio que aplica resolveDawn al amanecer: aquí se adelanta para poder
// despertar al mordido en el paso 'infectado' de esa misma noche.
export function infectionTonight(
  game: { acts?: Acts },
  players: Pick<GamePlayer, 'id' | 'alive'>[],
): string | null {
  const acts = game.acts || {};
  if (!acts.infectoUsed) return null;
  const pid = acts.wolfVictim;
  if (!pid) return null;
  if (pid === acts.defensorTarget) return null;
  if (acts.actor && acts.actor.power === 'defensor' && pid === acts.actor.target) return null;
  const p = players.find((x) => x.id === pid);
  return p && p.alive ? pid : null;
}

/** Lo que stepNeedsGhostAnnounce necesita saber de la partida. */
export interface GhostGame {
  composition?: Composition;
  fakeAllSelected?: boolean;
  revealDead?: boolean;
}

// ¿Debe anunciarse este paso aunque nadie actúe? (turno "fantasma" para disimular)
export function stepNeedsGhostAnnounce(stepId: StepId | string, game: GhostGame, players: GamePlayer[]): boolean {
  const def = NIGHT_STEPS.find((s) => s.id === stepId);
  if (!def || def.silent || stepId === 'amanecer' || stepId === 'lobos' || stepId === 'durmiendo') return false;
  if (stepId === 'enamorados' || stepId === 'encantados' || stepId === 'infectado' || stepId === 'lobos_reconocen') return false;
  // Rol vivo pero sin poder utilizable (bruja sin pociones, zorro sin olfato,
  // poderes perdidos por el Anciano…): disimular SIEMPRE, o se delataría.
  const anyAlive = players.some((p) => p.alive && p.role != null && def.roles.includes(p.role));
  if (anyAlive) return true;
  // Rol activado pero nunca repartido (composición secreta): fingirlo SIEMPRE,
  // se revelen o no los roles al morir — nadie ha visto morir a ese rol.
  const dealt = def.roles.some((r) => roleDealt(game, r)) || players.some((p) => p.role != null && def.roles.includes(p.role));
  if (!dealt && game.fakeAllSelected) return true;
  // Rol muerto (o en el centro): solo hace falta fingir si los roles no se revelan.
  return !game.revealDead;
}

/** Lo que la cadena de muertes necesita (y muta) de la partida. */
export interface ChainGame {
  powersLost?: boolean;
  deathTick?: number;
  alguacilId?: string | null;
}

export interface ChainResult {
  deaths: DeathRecord[];
  pendings: PendingEntry[];
  logs: LogEntry[];
  powersLost: boolean;
  wolfDeath: boolean;
}

// ——— Resolución de muertes en cadena (enamorados, cazador, niño salvaje, caballero…) ———
// players: array mutable de copias. Devuelve efectos acumulados.
export function applyDeathsChain(
  players: GamePlayer[],
  initialDeaths: { pid: string; cause: DeathCause }[],
  game: ChainGame,
): ChainResult {
  const logs: LogEntry[] = [];
  const pendings: PendingEntry[] = [];
  const deaths: DeathRecord[] = [];
  let powersLost = game.powersLost || false;
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const queue = initialDeaths.slice();

  while (queue.length) {
    const { pid, cause } = queue.shift()!;
    const p = byId[pid];
    if (!p || !p.alive) continue;
    p.alive = false;
    p.causeOfDeath = cause;
    p.deathAt = (game.deathTick = (game.deathTick || 0) + 1);
    deaths.push({ pid, cause, role: p.role });

    if (p.role === 'anciano' && ['linchado', 'veneno', 'flecha'].includes(cause) && !powersLost) {
      powersLost = true;
      logs.push({ kind: 'evento', txt: '💀 ¡El pueblo ha matado al Anciano! Los aldeanos pierden sus poderes como castigo.' });
    }
    if (p.role === 'caballero' && cause === 'lobos') {
      // La espada oxidada responde EN EL ACTO: el primer lobo hacia su
      // izquierda cae en este mismo amanecer, dentro de la propia cadena
      // (regla de la mesa; el juego oficial lo demora una noche, pero ese
      // retardo resultaba invisible y confuso en la app). La mesa es un
      // círculo: la búsqueda recorre (idx+d)%n y da la vuelta si hace falta.
      const wolves = players.filter((x) => x.alive && isWolfSide(x));
      if (wolves.length) queue.push({ pid: nearestClockwise(players, pid, wolves).id, cause: 'oxido' });
    }
    if (p.lover) {
      const partner = players.find((x) => x.alive && x.lover && x.id !== pid);
      if (partner) queue.push({ pid: partner.id, cause: 'pena' });
    }
    // El castigo del Anciano también desarma al Cazador (pierde su disparo).
    if (p.role === 'cazador' && cause !== 'pena_sin_disparo' && !powersLost) {
      pendings.push({ type: 'cazador', pid });
    }
    if (game.alguacilId === pid) {
      pendings.push({ type: 'alguacil_pick', pid });
    }
  }

  // El niño salvaje se transforma si su modelo ha muerto.
  for (const p of players) {
    if (p.alive && p.role === 'nino_salvaje' && p.modelId && !p.transformed) {
      const model = byId[p.modelId];
      if (model && !model.alive) p.transformed = true;
    }
  }
  // ¿Ha muerto algún miembro de la manada? (condición del Gran Lobo Feroz)
  const wolfDeath = deaths.some((d) => {
    const p = byId[d.pid];
    return isWolfSide(p) || d.role === 'lobo_albino';
  });
  return { deaths, pendings, logs, powersLost, wolfDeath };
}

function nearestClockwise(players: GamePlayer[], fromId: string, candidates: GamePlayer[]): GamePlayer {
  const sorted = players.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = sorted.findIndex((p) => p.id === fromId);
  const n = sorted.length;
  for (let d = 1; d < n; d++) {
    const p = sorted[(idx + d) % n];
    if (candidates.some((c) => c.id === p.id)) return p;
  }
  return candidates[0];
}

/** Lo que el amanecer necesita saber de la partida. */
export interface DawnGame extends ChainGame {
  acts?: Acts;
  wolfDeathOccurred?: boolean;
  /** Para variar deterministamente la ambientación (broma del cuervo). */
  seed?: number;
  night?: number;
}

export interface DawnGameUpdates {
  powersLost: boolean;
  wolfDeathOccurred: boolean;
  infectoPowerUsed?: boolean;
}

export interface DawnResult {
  players: GamePlayer[];
  logs: LogEntry[];
  pendings: PendingEntry[];
  gameUpdates: DawnGameUpdates;
  deaths: DeathRecord[];
  gitanaAnnounce: string | null;
  cuervoAnnounce: string | null;
  osoAnnounce: string | null;
}

// ——— Amanecer: aplica todas las acciones nocturnas ———
// Devuelve { players (mutados), logs, pendings, gameUpdates, deaths }
export function resolveDawn(game: DawnGame, playersIn: GamePlayer[]): DawnResult {
  const players = playersIn.map((p) => ({ ...p, powers: { ...(p.powers || {}) } }));
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const acts = game.acts || {};
  const logs: LogEntry[] = [];
  const kills: { pid: string; cause: DeathCause }[] = [];
  const protectedId = acts.defensorTarget ?? null;
  const actorProtectedId = (acts.actor && acts.actor.power === 'defensor') ? acts.actor.target : null;
  const healedId = acts.brujaHeal ?? null;

  const wolfBites: { pid: string; main?: boolean; albino?: boolean }[] = [];
  const victimId = acts.wolfVictim || null;
  if (victimId) wolfBites.push({ pid: victimId, main: true });
  if (acts.ferozVictim) wolfBites.push({ pid: acts.ferozVictim, main: false });
  if (acts.albinoVictim) wolfBites.push({ pid: acts.albinoVictim, main: false, albino: true });

  let infectedPid: string | null = null;
  for (const bite of wolfBites) {
    const p = byId[bite.pid];
    if (!p || !p.alive) continue;
    // El Salvador anula el ataque lobuno ENTERO (también el del Lobo Blanco):
    // sin mordisco no hay muerte… ni infección posible.
    if (bite.pid === protectedId || bite.pid === actorProtectedId) continue; // protegido
    // Infección: el contagio ocurre en el mordisco; la cura de la Bruja llega
    // después y ya no lo impide (la víctima no muere, pero queda infectada).
    if (bite.main && acts.infectoUsed) {
      p.infected = true;
      infectedPid = p.id;
      continue;
    }
    if (bite.pid === healedId) continue; // curado por la bruja
    if (p.role === 'anciano' && !p.ancianoHit) { p.ancianoHit = true; continue; } // primera vida
    kills.push({ pid: bite.pid, cause: 'lobos' });
  }
  if (acts.brujaPoison) kills.push({ pid: acts.brujaPoison, cause: 'veneno' });

  const chain = applyDeathsChain(players, kills, game);
  logs.push(...chain.logs);

  // Encantados por el gaitero.
  if (acts.gaiteroTargets) {
    for (const pid of acts.gaiteroTargets) {
      const p = byId[pid];
      if (p) p.charmed = true;
    }
  }

  const gameUpdates: DawnGameUpdates = {
    powersLost: chain.powersLost,
    wolfDeathOccurred: game.wolfDeathOccurred || chain.wolfDeath,
  };
  if (infectedPid) gameUpdates.infectoPowerUsed = true;

  // Gruñido del oso (la voz lo anuncia también al amanecer).
  let osoAnnounce: string | null = null;
  const domador = players.find((p) => p.alive && p.role === 'domador');
  if (domador) {
    const neigh = aliveNeighbors(players, domador.id);
    if (domador.infected || neigh.some((x) => isWolfSide(x))) {
      logs.push({ kind: 'evento', txt: '🐻 Se oye un gruñido: el oso del Domador huele a un hombre lobo cerca.' });
      osoAnnounce = 'Y un detalle más… se oye un gruñido grave. El oso del Domador está inquieto: huele a hombre lobo entre los vecinos de su amo.';
    }
  }
  // El cuervo señala públicamente (y la voz lo anuncia al amanecer).
  let cuervoAnnounce: string | null = null;
  const markId = acts.cuervoTarget ?? ((acts.actor && acts.actor.power === 'cuervo') ? acts.actor.target : null);
  if (markId && byId[markId]) {
    const marked = byId[markId];
    if (marked.alive) {
      logs.push({ kind: 'evento', txt: `🐦‍⬛ El Cuervo ha señalado a ${marked.name}: carga con 2 votos extra en su contra.` });
      cuervoAnnounce = `Sobre el tejado de ${marked.name} han aparecido plumas negras: el Cuervo lo ha señalado, y hoy carga con dos votos extra en su contra.`;
    } else {
      // El señalado no vivió para cargar con los votos: la voz lo cuenta con
      // sorna (misma información, cero pistas: el Cuervo actuó igualmente).
      const jokes = [
        `Sobre el tejado de ${marked.name} amanecen plumas negras: el Cuervo lo señaló durante la noche… pero ya no queda nadie en esa casa que cargue con votos. Sus plumas fueron en vano.`,
        `El Cuervo dejó caer sus plumas sobre el tejado de ${marked.name}… mala puntería esta vez: a esa puerta ya no llama nadie. Dos votos de más para un vecino de menos.`,
        `Plumas negras sobre la casa de ${marked.name}. El Cuervo afinó la sospecha… pero otros llegaron antes. Nadie en casa: plumas desperdiciadas.`,
      ];
      cuervoAnnounce = jokes[((game.seed || 0) + (game.night || 0)) % jokes.length];
      logs.push({ kind: 'evento', txt: `🐦‍⬛ El Cuervo señaló a ${marked.name}… que ya no está: sus plumas fueron en vano.` });
    }
  }
  // La pregunta de la Gitana se anuncia en voz alta al amanecer y los muertos
  // la responden de viva voz, todos a una (regla oficial): sin diálogos.
  let gitanaAnnounce: string | null = null;
  const gitanaText = acts.gitanaText
    || (acts.gitanaQIdx !== undefined && acts.gitanaQIdx !== null ? GITANA_QUESTIONS[acts.gitanaQIdx] : null);
  if (gitanaText) {
    const anyDead = players.some((p) => !p.alive);
    if (anyDead) {
      logs.push({ kind: 'evento', txt: `🔯 La Gitana preguntó a los espíritus: «${gitanaText}». Los muertos responden todos a una: sí o no.` });
      gitanaAnnounce = `La Gitana preguntó a los espíritus: «${gitanaText}». Espíritus del más allá: poneos de acuerdo y responded todos a una, en voz alta y con honestidad. Solo podéis decir sí… o no.`;
    } else {
      logs.push({ kind: 'evento', txt: `🔯 La Gitana preguntó: «${gitanaText}», pero ningún espíritu puede responder todavía.` });
      gitanaAnnounce = `La Gitana preguntó a los espíritus: «${gitanaText}»… pero ningún espíritu puede responder todavía.`;
    }
  }

  return { players, logs, pendings: chain.pendings, gameUpdates, deaths: chain.deaths, gitanaAnnounce, cuervoAnnounce, osoAnnounce };
}

// ¿Puede este jugador REGISTRAR la decisión del día? El Tonto del Pueblo
// descubierto ya no vota, pero sí puede anotar lo que decida el pueblo (no es
// un voto ponderado, es quien lo escribe): si se le negara, bastaría con que
// el Cabeza de Turco lo designara para que NADIE pudiera registrar el juicio
// del día siguiente y la partida quedara colgada.
export function canRegisterVote(
  game: { soloVoteId?: string | null },
  p: Pick<GamePlayer, 'id' | 'alive'> | null | undefined,
): boolean {
  if (!p || !p.alive) return false;
  return !game.soloVoteId || game.soloVoteId === p.id;
}

// ——— Condiciones de victoria ———
// powersLost: el pueblo mató al Anciano y los aldeanos perdieron sus poderes.
// Sin él, la paridad contaba como «resistencia» a un Cazador sin flecha o a
// una Bruja sin veneno, y la partida no terminaba nunca.
export function checkWinner(players: GamePlayer[], powersLost = false): WinnerId | null {
  const alive = players.filter((p) => p.alive);
  if (!alive.length) return 'nadie';
  const wolfish = alive.filter((p) => isWolfSide(p) || p.role === 'lobo_albino');
  const others = alive.filter((p) => !isWolfSide(p) && p.role !== 'lobo_albino');

  if (alive.length === 1 && alive[0].role === 'lobo_albino') return 'lobo_albino';
  if (alive.length === 2 && alive.every((p) => p.lover)) {
    // Si solo quedan los enamorados, gana el amor — sea cual sea el bando de
    // la pareja — y Cupido comparte su victoria: la historia es obra suya.
    return 'enamorados';
  }
  const gaitero = alive.find((p) => p.role === 'gaitero');
  if (gaitero && alive.every((p) => p.id === gaitero.id || p.charmed)) return 'gaitero';
  const sectario = alive.find((p) => p.role === 'sectario');
  if (sectario && !alive.some((p) => p.id !== sectario.id && p.sect !== sectario.sect)) return 'sectario';
  if (wolfish.length === 0) return 'pueblo';
  if (alive.every((p) => isWolfSide(p))) {
    // Todo lo que queda es manada. Si el Albino sigue entre ellos, oficialmente
    // la caza continúa (él busca quedarse solo)… salvo que la manada lo supere
    // en el voto del día: entonces su suerte está echada y ganan los lobos.
    const albinos = alive.filter((p) => p.role === 'lobo_albino').length;
    if (!albinos || alive.length - albinos > albinos) return 'lobos';
    return null;
  }

  // Paridad: si los lobos igualan o superan al resto, el pueblo ya no puede
  // ganar la votación y la partida termina… salvo que quede un Cazador o una
  // Bruja con veneno (aún podrían matar a un lobo), o que el único "lobo" sea
  // el Albino (que busca su victoria en solitario y seguirá cazando).
  const realWolves = alive.some((p) => isWolfSide(p) && p.role !== 'lobo_albino');
  // El castigo del Anciano desarma al Cazador (pierde su flecha) y a la Bruja
  // (no puede usar el veneno): ya no son resistencia frente a la paridad.
  const resistance = !powersLost && others.some((p) =>
    p.role === 'cazador' || (p.role === 'bruja' && (p.powers || {}).poison !== false));
  // El Tonto del Pueblo descubierto ya no vota: no cuenta como resistencia en la
  // paridad (no puede ayudar a linchar a un lobo en el día).
  const voters = others.filter((p) => !p.revealedTonto);
  // Con el Lobo Blanco vivo entre aldeanos, el desenlace no está escrito: a él
  // le conviene linchar lobos comunes para quedarse solo, así que la paridad
  // no cierra la partida (equivale a la «resistencia» del cazador o la bruja).
  const albinoAlive = alive.some((p) => p.role === 'lobo_albino');
  if (realWolves && !albinoAlive && wolfish.length >= voters.length && !resistance) return 'lobos';
  return null;
}

export const WINNER_LABELS: Record<WinnerId, string> = {
  pueblo: '🏡 ¡El Pueblo ha ganado! Los hombres lobo han sido exterminados.',
  lobos: '🐺 ¡Los Hombres Lobo han ganado! Castronegro es suyo.',
  enamorados: '💘 ¡Los Enamorados han ganado! El amor triunfa sobre todo.',
  gaitero: '🎶 ¡El Gaitero ha ganado! Todo el pueblo baila al son de su música.',
  lobo_albino: '🌕 ¡El Hombre Lobo Albino ha ganado! Es el único superviviente.',
  sectario: '🌗 ¡El Abominable Sectario ha ganado! Su secta domina Castronegro.',
  angel: '😇 ¡El Ángel ha ganado! Ha regresado al cielo en el primer juicio.',
  nadie: '💀 No queda nadie con vida en Castronegro…',
};

/** Lo que la resolución del voto necesita saber de la partida. */
export interface VoteGame extends ChainGame {
  dayNum: number;
  revealDead?: boolean;
  hideNightCauses?: boolean;
  wolfDeathOccurred?: boolean;
}

export interface VoteGameUpdates {
  lastLynch: DeathNote | null;
  lastLoveDeath: DeathNote | null;
  lastTontoReveal?: string | null;
  powersLost?: boolean;
  wolfDeathOccurred?: boolean;
}

export interface VoteResult {
  players: GamePlayer[];
  logs: LogEntry[];
  pendings: PendingEntry[];
  gameUpdates: VoteGameUpdates;
  winner: WinnerId | null;
}

// ——— Resolución del voto del día ———
// choice: pid | 'nadie' | 'empate'. Devuelve mutaciones a aplicar.
export function resolveVote(game: VoteGame, playersIn: GamePlayer[], choice: string): VoteResult | null {
  const players = playersIn.map((p) => ({ ...p, powers: { ...(p.powers || {}) } }));
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const logs: LogEntry[] = [];
  let pendings: PendingEntry[] = [];
  const gameUpdates: VoteGameUpdates = { lastLynch: null, lastLoveDeath: null, lastTontoReveal: null }; // el ocaso anuncia el rol, el tonto y la muerte por amor si proceden
  let winner: WinnerId | null = null;

  if (choice === 'nadie') {
    logs.push({ kind: 'dia', txt: '🕊️ El pueblo no ha condenado a nadie hoy.' });
  } else if (choice === 'empate') {
    const cabeza = players.find((p) => p.alive && p.role === 'cabeza_turco');
    if (cabeza) {
      const chain = applyDeathsChain(players, [{ pid: cabeza.id, cause: 'sacrificio' }], game);
      logs.push({ kind: 'dia', txt: `🐐 La votación acabó en empate: ${cabeza.name} muere como Cabeza de Turco.` });
      logs.push(...chain.logs);
      pendings = pendings.concat(chain.pendings, [{ type: 'cabeza_pick', pid: cabeza.id }]);
      Object.assign(gameUpdates, { powersLost: chain.powersLost, wolfDeathOccurred: game.wolfDeathOccurred || chain.wolfDeath });
      annotateDeaths(chain.deaths, byId, logs, game);
      const cd = chain.deaths.find((d) => d.cause === 'sacrificio');
      if (cd) gameUpdates.lastLynch = { name: byId[cd.pid].name, role: cd.role, hideRole: !!cd.hideRole };
    } else {
      logs.push({ kind: 'dia', txt: '🤝 La votación acabó en empate: hoy no muere nadie.' });
    }
  } else {
    const target = byId[choice];
    if (!target || !target.alive) return null;
    if (target.role === 'tonto' && !target.revealedTonto) {
      target.revealedTonto = true;
      gameUpdates.lastTontoReveal = target.name; // el ocaso lo explica en voz alta
      logs.push({ kind: 'dia', txt: `🤪 ¡${target.name} era el Tonto del Pueblo! Se salva del linchamiento, pero pierde su derecho a voto.` });
    } else if (target.role === 'angel' && game.dayNum === 1) {
      applyDeathsChain(players, [{ pid: target.id, cause: 'linchado' }], game);
      logs.push({ kind: 'dia', txt: `😇 El pueblo ha eliminado a ${target.name}… ¡que era el Ángel! Gana la partida en solitario.` });
      winner = 'angel';
    } else {
      const chain = applyDeathsChain(players, [{ pid: target.id, cause: 'linchado' }], game);
      logs.push(...chain.logs);
      pendings = pendings.concat(chain.pendings);
      Object.assign(gameUpdates, { powersLost: chain.powersLost, wolfDeathOccurred: game.wolfDeathOccurred || chain.wolfDeath });
      annotateDeaths(chain.deaths, byId, logs, game);
      const ld = chain.deaths.find((d) => d.cause === 'linchado');
      if (ld) gameUpdates.lastLynch = { name: byId[ld.pid].name, role: ld.role, hideRole: !!ld.hideRole };
      // Si el linchado estaba enamorado, su pareja muere de amor: la voz lo anuncia.
      const lv = chain.deaths.find((d) => d.cause === 'pena');
      if (lv) gameUpdates.lastLoveDeath = { name: byId[lv.pid].name, role: lv.role, hideRole: !!lv.hideRole };
    }
  }

  // El linchamiento pudo matar al Anciano en esta misma resolución: la victoria
  // se comprueba con los poderes YA perdidos.
  if (!winner) winner = checkWinner(players, gameUpdates.powersLost ?? !!game.powersLost);
  return { players, logs, pendings, gameUpdates, winner };
}

const HIDDEN_NIGHT_CAUSES: DeathCause[] = ['lobos', 'veneno', 'oxido', 'pena'];

export function annotateDeaths(
  deaths: DeathRecord[],
  byId: Record<string, GamePlayer>,
  logs: LogEntry[],
  game: { revealDead?: boolean; hideNightCauses?: boolean },
): void {
  for (const d of deaths) {
    const p = byId[d.pid];
    const reveal = game.revealDead && !d.hideRole;
    const def = d.role ? ROLES[d.role] : undefined;
    const roleTxt = reveal ? ` Era ${def?.emoji || ''} ${def?.name || d.role}.` : '';
    // Con «ocultar causas» activo, las muertes nocturnas no explican quién fue.
    if (game.hideNightCauses && HIDDEN_NIGHT_CAUSES.includes(d.cause)) {
      logs.push({ kind: 'muerte', txt: `💀 ${p.name} ha aparecido sin vida esta mañana.${roleTxt}` });
      continue;
    }
    const causeTxt = ({
      lobos: 'devorado por los lobos', veneno: 'envenenado por la Bruja', linchado: 'linchado por el pueblo',
      pena: 'muerto de pena por amor', flecha: 'abatido por la flecha del Cazador', oxido: 'infectado por el óxido de la espada del Caballero',
      sacrificio: 'sacrificado por el empate',
    } as Record<string, string>)[d.cause] || 'muerto';
    logs.push({ kind: 'muerte', txt: `💀 ${p.name} ha sido ${causeTxt}.${roleTxt}` });
  }
}

// La palabra clave se «quema» al pronunciarse en una llamada (enamorados,
// encantados). En cuanto la música va a sonar se RESERVA la palabra nueva de
// cada llamado (kwNext, desde la reserva): así su panel la enseña JUNTO al
// botón de confirmar, mientras la llamada en voz alta sigue usando la vieja.
// El relevo (keyword ← kwNext) se consuma al confirmar, en actions. Una
// reserva sin consumar (paso saltado) se reutiliza la noche siguiente.
export function reserveNextKeywords(
  game: { keywordsActive?: boolean; kwPool?: string[]; kwIdx?: number },
  players: { id: string; keyword?: string | null; kwNext?: string | null }[],
  pids: string[],
): Record<string, { kwNext: string }> {
  const pool = game.kwPool || [];
  const patches: Record<string, { kwNext: string }> = {};
  if (!game.keywordsActive) return patches;
  for (const pid of pids) {
    const p = players.find((x) => x.id === pid);
    if (!p || !p.keyword || p.kwNext) continue;
    const idx = game.kwIdx || 0;
    if (idx >= pool.length) continue; // reserva agotada: la palabra queda fija
    game.kwIdx = idx + 1;
    patches[pid] = { kwNext: pool[idx] };
  }
  return patches;
}

// Efecto del ángel devorado la primera noche.
export function angelNightWin(
  deaths: DeathRecord[],
  byId: Record<string, GamePlayer>,
  game: { night?: number },
): WinnerId | null {
  if (game.night !== 1) return null;
  const angelDeath = deaths.find((d) => d.role === 'angel');
  return angelDeath ? 'angel' : null;
}
