// Motor del juego (modo automático): pasos de la noche, resolución del amanecer,
// votaciones del día y condiciones de victoria. Módulo puro (testeable en Node).
import { ROLES, isWolfSide, aliveNeighbors } from './roles.js';

export const GITANA_QUESTIONS = [
  '¿Está viva la vidente?',
  '¿Hay algún hombre lobo entre los tres jugadores más veteranos de la mesa?',
  '¿Murió algún aldeano sin poderes esta noche?',
  '¿Queda más de un hombre lobo con vida?',
  '¿El último eliminado era del bando del pueblo?',
  '¿Hay algún enamorado con vida?',
];

// Definición ordenada de los pasos de la noche.
// silent: paso interno sin locución (no delata información).
export const NIGHT_STEPS = [
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
  { id: 'lobo_feroz', roles: ['lobo_feroz'] },
  { id: 'lobo_albino', roles: ['lobo_albino'], evenNights: true },
  { id: 'bruja', roles: ['bruja'] },
  { id: 'gaitero', roles: ['gaitero'] },
  { id: 'encantados', roles: [] },
  { id: 'gitana', roles: ['gitana'] },
  { id: 'amanecer', roles: [] },
];

const roleDealt = (game, roleId) => (game.composition && game.composition[roleId] > 0);

// Pasos que componen la noche `night` para esta partida.
export function computeNightSteps(game, players) {
  const steps = [];
  for (const s of NIGHT_STEPS) {
    if (s.firstNight && game.night !== 1) continue;
    if (s.evenNights && game.night % 2 !== 0) continue;
    // Primera noche sin sangre: los lobos se reconocen, pero nadie devora.
    if (game.noKillNight1 && game.night === 1
      && ['lobos', 'infecto_decision', 'lobo_feroz'].includes(s.id)) continue;
    if (s.id === 'lobos' || s.id === 'amanecer' || s.id === 'durmiendo') { steps.push(s.id); continue; }
    if (s.id === 'lobos_reconocen') {
      // Solo hace falta presentar a la manada cuando la primera noche es sin
      // sangre; si hay caza, los lobos se reconocen al elegir a su presa.
      if (game.noKillNight1) steps.push(s.id);
      continue;
    }
    if (s.id === 'enamorados') {
      if (roleDealt(game, 'cupido')) steps.push(s.id);
      continue;
    }
    if (s.id === 'encantados') {
      if (roleDealt(game, 'gaitero')) steps.push(s.id);
      continue;
    }
    // Se incluye si el rol se repartió o si alguien lo tiene ahora (ladrón/sirvienta pueden cambiar cartas).
    if (s.roles.some((r) => roleDealt(game, r)) || players.some((p) => s.roles.includes(p.role))) {
      steps.push(s.id);
    }
  }
  return steps;
}

const aliveWithRole = (players, roleId) => players.filter((p) => p.alive && p.role === roleId);

// ¿Quién debe actuar en este paso? null => paso "fantasma" (locución + espera falsa) o saltable.
export function stepActors(stepId, game, players) {
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
      // Los recién encantados deben reconocerse y confirmarlo: el juego espera.
      const targets = acts.gaiteroTargets || [];
      if (!targets.length) return null; // sin encantamiento (o gaitero inactivo)
      const pend = players.filter((p) => p.alive && targets.includes(p.id) && !(acts.encantadosSeen || {})[p.id]);
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

function idsOf(arr) { return arr.length ? arr.map((p) => p.id) : null; }

// ¿Debe anunciarse este paso aunque nadie actúe? (turno "fantasma" para disimular)
export function stepNeedsGhostAnnounce(stepId, game, players) {
  const def = NIGHT_STEPS.find((s) => s.id === stepId);
  if (!def || def.silent || stepId === 'amanecer' || stepId === 'lobos' || stepId === 'durmiendo') return false;
  if (stepId === 'enamorados' || stepId === 'encantados' || stepId === 'lobos_reconocen') return false;
  // Rol vivo pero sin poder utilizable (bruja sin pociones, zorro sin olfato,
  // poderes perdidos por el Anciano…): disimular SIEMPRE, o se delataría.
  const anyAlive = players.some((p) => p.alive && def.roles.includes(p.role));
  if (anyAlive) return true;
  // Rol muerto (o en el centro): solo hace falta fingir si los roles no se revelan.
  return !game.revealDead;
}

// ——— Resolución de muertes en cadena (enamorados, cazador, niño salvaje, caballero…) ———
// players: array mutable de copias. Devuelve efectos acumulados.
export function applyDeathsChain(players, initialDeaths, game) {
  const logs = [];
  const pendings = [];
  const deaths = [];
  let powersLost = game.powersLost || false;
  let rust = null;
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const queue = initialDeaths.slice();

  while (queue.length) {
    const { pid, cause } = queue.shift();
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
      const wolves = players.filter((x) => x.alive && isWolfSide(x));
      if (wolves.length) {
        const near = nearestClockwise(players, pid, wolves);
        rust = { wolfId: near.id };
      }
    }
    if (p.lover) {
      const partner = players.find((x) => x.alive && x.lover && x.id !== pid);
      if (partner) queue.push({ pid: partner.id, cause: 'pena' });
    }
    if (p.role === 'cazador' && cause !== 'pena_sin_disparo') {
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
  return { deaths, pendings, logs, powersLost, rust, wolfDeath };
}

function nearestClockwise(players, fromId, candidates) {
  const sorted = players.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = sorted.findIndex((p) => p.id === fromId);
  const n = sorted.length;
  for (let d = 1; d < n; d++) {
    const p = sorted[(idx + d) % n];
    if (candidates.some((c) => c.id === p.id)) return p;
  }
  return candidates[0];
}

// ——— Amanecer: aplica todas las acciones nocturnas ———
// Devuelve { players (mutados), logs, pendings, gameUpdates, deaths }
export function resolveDawn(game, playersIn) {
  const players = playersIn.map((p) => ({ ...p, powers: { ...(p.powers || {}) } }));
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const acts = game.acts || {};
  const logs = [];
  const kills = []; // {pid, cause}
  const protectedId = acts.defensorTarget ?? null;
  const actorProtectedId = (acts.actor && acts.actor.power === 'defensor') ? acts.actor.target : null;
  const healedId = acts.brujaHeal ?? null;

  const wolfBites = [];
  const victimId = acts.wolfVictim || null;
  if (victimId) wolfBites.push({ pid: victimId, main: true });
  if (acts.ferozVictim) wolfBites.push({ pid: acts.ferozVictim, main: false });
  if (acts.albinoVictim) wolfBites.push({ pid: acts.albinoVictim, main: false, albino: true });

  let infectedPid = null;
  for (const bite of wolfBites) {
    const p = byId[bite.pid];
    if (!p || !p.alive) continue;
    // Infección: ignora protecciones (el mordisco se produce igualmente).
    if (bite.main && acts.infectoUsed) {
      p.infected = true;
      infectedPid = p.id;
      continue;
    }
    if (!bite.albino && (bite.pid === protectedId || bite.pid === actorProtectedId)) continue; // protegido
    if (bite.pid === healedId) continue; // curado por la bruja
    if (p.role === 'anciano' && !p.ancianoHit) { p.ancianoHit = true; continue; } // primera vida
    kills.push({ pid: bite.pid, cause: 'lobos' });
  }
  if (acts.brujaPoison) kills.push({ pid: acts.brujaPoison, cause: 'veneno' });
  if (game.caballeroRust && game.caballeroRust.wolfId) {
    kills.push({ pid: game.caballeroRust.wolfId, cause: 'oxido' });
  }

  const chain = applyDeathsChain(players, kills, game);
  logs.push(...chain.logs);

  // Encantados por el gaitero.
  if (acts.gaiteroTargets) {
    for (const pid of acts.gaiteroTargets) {
      const p = byId[pid];
      if (p) p.charmed = true;
    }
  }

  const gameUpdates = {
    caballeroRust: chain.rust || null,
    powersLost: chain.powersLost,
    wolfDeathOccurred: game.wolfDeathOccurred || chain.wolfDeath,
  };
  if (infectedPid) gameUpdates.infectoPowerUsed = true;

  // Gruñido del oso.
  const domador = players.find((p) => p.alive && p.role === 'domador');
  if (domador) {
    const neigh = aliveNeighbors(players, domador.id);
    if (domador.infected || neigh.some((x) => isWolfSide(x))) {
      logs.push({ kind: 'evento', txt: '🐻 Se oye un gruñido: el oso del Domador huele a un hombre lobo cerca.' });
    }
  }
  // El cuervo señala públicamente (y la voz lo anuncia al amanecer).
  let cuervoAnnounce = null;
  const markId = acts.cuervoTarget ?? ((acts.actor && acts.actor.power === 'cuervo') ? acts.actor.target : null);
  if (markId && byId[markId]) {
    logs.push({ kind: 'evento', txt: `🐦‍⬛ El Cuervo ha señalado a ${byId[markId].name}: carga con 2 votos extra en su contra.` });
    cuervoAnnounce = `Sobre el tejado de ${byId[markId].name} han aparecido plumas negras: el Cuervo lo ha señalado, y hoy carga con dos votos extra en su contra.`;
  }
  // La pregunta de la Gitana se anuncia en voz alta al amanecer y los muertos
  // la responden de viva voz, todos a una (regla oficial): sin diálogos.
  let gitanaAnnounce = null;
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

  return { players, logs, pendings: chain.pendings, gameUpdates, deaths: chain.deaths, gitanaAnnounce, cuervoAnnounce };
}

// ——— Condiciones de victoria ———
export function checkWinner(players) {
  const alive = players.filter((p) => p.alive);
  if (!alive.length) return 'nadie';
  const wolfish = alive.filter((p) => isWolfSide(p) || p.role === 'lobo_albino');
  const others = alive.filter((p) => !isWolfSide(p) && p.role !== 'lobo_albino');

  if (alive.length === 1 && alive[0].role === 'lobo_albino') return 'lobo_albino';
  if (alive.length === 2 && alive.every((p) => p.lover)) return 'enamorados';
  const gaitero = alive.find((p) => p.role === 'gaitero');
  if (gaitero && alive.every((p) => p.id === gaitero.id || p.charmed)) return 'gaitero';
  const sectario = alive.find((p) => p.role === 'sectario');
  if (sectario && !alive.some((p) => p.id !== sectario.id && p.sect !== sectario.sect)) return 'sectario';
  if (wolfish.length === 0) return 'pueblo';
  if (alive.every((p) => isWolfSide(p) || p.role === 'lobo_albino')) return 'lobos';

  // Paridad: si los lobos igualan o superan al resto, el pueblo ya no puede
  // ganar la votación y la partida termina… salvo que quede un Cazador o una
  // Bruja con veneno (aún podrían matar a un lobo), o que el único "lobo" sea
  // el Albino (que busca su victoria en solitario y seguirá cazando).
  const realWolves = alive.some((p) => isWolfSide(p) && p.role !== 'lobo_albino');
  const resistance = others.some((p) =>
    p.role === 'cazador' || (p.role === 'bruja' && (p.powers || {}).poison !== false));
  if (realWolves && wolfish.length >= others.length && !resistance) return 'lobos';
  return null;
}

export const WINNER_LABELS = {
  pueblo: '🏡 ¡El Pueblo ha ganado! Los hombres lobo han sido exterminados.',
  lobos: '🐺 ¡Los Hombres Lobo han ganado! Castronegro es suyo.',
  enamorados: '💘 ¡Los Enamorados han ganado! El amor triunfa sobre todo.',
  gaitero: '🎶 ¡El Gaitero ha ganado! Todo el pueblo baila al son de su música.',
  lobo_albino: '🌕 ¡El Hombre Lobo Albino ha ganado! Es el único superviviente.',
  sectario: '🌗 ¡El Abominable Sectario ha ganado! Su secta domina Castronegro.',
  angel: '😇 ¡El Ángel ha ganado! Ha regresado al cielo en el primer juicio.',
  nadie: '💀 No queda nadie con vida en Castronegro…',
};

// ——— Resolución del voto del día ———
// choice: pid | 'nadie' | 'empate'. Devuelve mutaciones a aplicar.
export function resolveVote(game, playersIn, choice) {
  const players = playersIn.map((p) => ({ ...p, powers: { ...(p.powers || {}) } }));
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const logs = [];
  let pendings = [];
  const gameUpdates = { lastLynch: null }; // el ocaso anuncia el rol si procede
  let winner = null;

  if (choice === 'nadie') {
    logs.push({ kind: 'dia', txt: '🕊️ El pueblo no ha condenado a nadie hoy.' });
  } else if (choice === 'empate') {
    const cabeza = players.find((p) => p.alive && p.role === 'cabeza_turco');
    if (cabeza) {
      const chain = applyDeathsChain(players, [{ pid: cabeza.id, cause: 'sacrificio' }], game);
      logs.push({ kind: 'dia', txt: `🐐 La votación acabó en empate: ${cabeza.name} muere como Cabeza de Turco.` });
      logs.push(...chain.logs);
      pendings = pendings.concat(chain.pendings, [{ type: 'cabeza_pick', pid: cabeza.id }]);
      Object.assign(gameUpdates, { powersLost: chain.powersLost, wolfDeathOccurred: game.wolfDeathOccurred || chain.wolfDeath, caballeroRust: chain.rust || game.caballeroRust });
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
      logs.push({ kind: 'dia', txt: `🤪 ¡${target.name} era el Tonto del Pueblo! Se salva del linchamiento, pero pierde su derecho a voto.` });
    } else if (target.role === 'angel' && game.dayNum === 1) {
      const chain = applyDeathsChain(players, [{ pid: target.id, cause: 'linchado' }], game);
      logs.push({ kind: 'dia', txt: `😇 El pueblo ha eliminado a ${target.name}… ¡que era el Ángel! Gana la partida en solitario.` });
      winner = 'angel';
    } else {
      const chain = applyDeathsChain(players, [{ pid: target.id, cause: 'linchado' }], game);
      logs.push(...chain.logs);
      pendings = pendings.concat(chain.pendings);
      Object.assign(gameUpdates, { powersLost: chain.powersLost, wolfDeathOccurred: game.wolfDeathOccurred || chain.wolfDeath, caballeroRust: chain.rust || game.caballeroRust });
      annotateDeaths(chain.deaths, byId, logs, game);
      const ld = chain.deaths.find((d) => d.cause === 'linchado');
      if (ld) gameUpdates.lastLynch = { name: byId[ld.pid].name, role: ld.role, hideRole: !!ld.hideRole };
    }
  }

  if (!winner) winner = checkWinner(players);
  return { players, logs, pendings, gameUpdates, winner };
}

const HIDDEN_NIGHT_CAUSES = ['lobos', 'veneno', 'oxido', 'pena'];

export function annotateDeaths(deaths, byId, logs, game) {
  for (const d of deaths) {
    const p = byId[d.pid];
    const reveal = game.revealDead && !d.hideRole;
    const roleTxt = reveal ? ` Era ${ROLES[d.role]?.emoji || ''} ${ROLES[d.role]?.name || d.role}.` : '';
    // Con «ocultar causas» activo, las muertes nocturnas no explican quién fue.
    if (game.hideNightCauses && HIDDEN_NIGHT_CAUSES.includes(d.cause)) {
      logs.push({ kind: 'muerte', txt: `💀 ${p.name} ha aparecido sin vida esta mañana.${roleTxt}` });
      continue;
    }
    const causeTxt = {
      lobos: 'devorado por los lobos', veneno: 'envenenado por la Bruja', linchado: 'linchado por el pueblo',
      pena: 'muerto de pena por amor', flecha: 'abatido por la flecha del Cazador', oxido: 'infectado por el óxido de la espada del Caballero',
      sacrificio: 'sacrificado por el empate',
    }[d.cause] || 'muerto';
    logs.push({ kind: 'muerte', txt: `💀 ${p.name} ha sido ${causeTxt}.${roleTxt}` });
  }
}

// Efecto del ángel devorado la primera noche.
export function angelNightWin(deaths, byId, game) {
  if (game.night !== 1) return null;
  const angelDeath = deaths.find((d) => d.role === 'angel');
  return angelDeath ? 'angel' : null;
}
