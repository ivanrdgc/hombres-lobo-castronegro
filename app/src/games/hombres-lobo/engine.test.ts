// Tests del motor puro (roles + engine) — port de tests/engine.test.mjs (v1).
// Se conservan las aserciones de node:assert tal cual (funcionan bajo Vitest)
// para que el port sea literal; solo cambian los imports y los tipos.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  ROLES, buildDeck, dealRoles, wolfCountFor, isWolfSide, aliveNeighbors, effectiveTeam, generateKeywords,
} from './roles';
import type { RoleId } from './roles';
import {
  computeNightSteps, stepActors, resolveDawn, resolveVote, applyDeathsChain, checkWinner,
  rotateKeyword, stepNeedsGhostAnnounce, annotateDeaths,
} from './engine';
import type { GamePlayer, GameState } from './types';
import { narr, outro, loveDeathLine } from './texts/corpus';
import { EXPLANATIONS, explainSections, buildExplainSpeech } from './texts/explain';

const mkPlayers = (roles: RoleId[]): GamePlayer[] => roles.map((role, i) => ({
  id: 'p' + i, name: 'J' + i, order: i, inGame: true, role, alive: true,
  lover: false, charmed: false, infected: false, transformed: false,
  revealedTonto: false, ancianoHit: false, powers: { heal: true, poison: true, infect: true, zorro: true, juez: true },
}));

const mkGame = (over: Partial<GameState> = {}): GameState => ({
  night: 1, dayNum: 0, phase: 'night', stepIdx: 0, steps: [], acts: {},
  vote: null, votesLeft: 0, pending: [], winner: null, alguacilId: null,
  soloVoteId: null, juezArmed: null, powersLost: false, wolfDeathOccurred: false,
  gitanaQ: null, deathTick: 0, revealDead: true,
  composition: {}, centerCards: [], log: [], ...over,
});

test('wolfCountFor escala con los jugadores', () => {
  assert.equal(wolfCountFor(4), 1);
  assert.equal(wolfCountFor(8), 2);
  assert.equal(wolfCountFor(12), 3);
  assert.equal(wolfCountFor(18), 4);
});

test('buildDeck: tamaño correcto y lobos correctos para cada n', () => {
  for (let n = 3; n <= 24; n++) {
    const { deck } = buildDeck(n, ['vidente', 'bruja', 'cazador', 'cupido'], 42 + n);
    assert.equal(deck.length, n, `deck de ${n}`);
    const wolves = deck.filter((r) => ['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'].includes(r)).length;
    assert.equal(wolves, wolfCountFor(n));
  }
});

test('buildDeck: especiales de lobo sustituyen lobos comunes', () => {
  const { deck } = buildDeck(12, ['lobo_feroz', 'infecto', 'lobo_albino'], 7);
  const wolfish = deck.filter((r) => ['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'].includes(r));
  assert.equal(wolfish.length, 3);
  assert.ok(deck.includes('lobo_feroz') || deck.includes('infecto') || deck.includes('lobo_albino'));
});

test('buildDeck: hermanas ocupan 2 y hermanos 3 asientos (mesa grande)', () => {
  const { deck } = buildDeck(18, ['dos_hermanas', 'tres_hermanos'], 3);
  assert.equal(deck.filter((r) => r === 'dos_hermanas').length, 2);
  assert.equal(deck.filter((r) => r === 'tres_hermanos').length, 3);
});

test('buildDeck: el ladrón añade 2 aldeanos y las 2 sobrantes van al centro (regla oficial)', () => {
  const { deck, center, pool } = buildDeck(8, ['ladron', 'vidente'], 11);
  assert.equal(deck.length, 8);
  assert.equal(center.length, 2);
  assert.equal(pool.length, 10, 'mazo = jugadores + 2 cartas extra');
  assert.ok(pool.includes('ladron'));
  assert.equal(pool.filter((r) => r === 'aldeano').length >= 2, true, 'se añaden 2 aldeanos extra');
  // deck + center = pool exacto
  const all = deck.concat(center).sort().join(',');
  assert.equal(all, pool.slice().sort().join(','));
});

test('buildDeck: con ladrón siempre queda al menos un lobo repartido', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { deck } = buildDeck(8, ['ladron', 'vidente', 'bruja'], seed);
    assert.ok(deck.some((r) => ['hombre_lobo', 'lobo_feroz', 'infecto', 'lobo_albino'].includes(r)), 'seed ' + seed);
  }
});

test('buildDeck: mínimos oficiales de jugadores por rol (hermanas 12, hermanos 16)', () => {
  const r10 = buildDeck(10, ['dos_hermanas', 'tres_hermanos', 'vidente'], 5);
  assert.ok(!r10.deck.includes('dos_hermanas'));
  assert.ok(r10.dropped.some((d) => d.id === 'dos_hermanas' && d.reason === 'min'));
  assert.ok(r10.dropped.some((d) => d.id === 'tres_hermanos' && d.reason === 'min'));
  const r12 = buildDeck(12, ['dos_hermanas', 'vidente'], 5);
  assert.equal(r12.deck.filter((r) => r === 'dos_hermanas').length, 2);
  const r16 = buildDeck(16, ['tres_hermanos'], 5);
  assert.equal(r16.deck.filter((r) => r === 'tres_hermanos').length, 3);
});

test('buildDeck: número de lobos oficial (8→2, 12→3, 18→4)', () => {
  for (const [n, w] of [[8, 2], [11, 2], [12, 3], [17, 3], [18, 4]]) {
    const { deck } = buildDeck(n, [], 9);
    assert.equal(deck.filter((r) => r === 'hombre_lobo').length, w, `${n} jugadores`);
  }
});

test('buildDeck: el máster puede fijar el número de lobos', () => {
  const { deck } = buildDeck(8, ['vidente'], 9, 1);
  assert.equal(deck.filter((r) => r === 'hombre_lobo').length, 1, '1 lobo con 8 jugadores');
  const tres = buildDeck(6, [], 9, 3).deck.filter((r) => r === 'hombre_lobo').length;
  assert.equal(tres, 3, '3 lobos con 6 jugadores');
  const capped = buildDeck(4, [], 9, 4).deck.filter((r) => r === 'hombre_lobo').length;
  assert.equal(capped, 3, 'nunca más lobos que jugadores menos uno');
});

test('buildDeck: aldeanos fijados reservan asientos y los roles sobrantes se sortean', () => {
  const extras: RoleId[] = ['vidente', 'bruja', 'cazador', 'defensor'];
  // 8 jugadores, 2 lobos de tabla, 4 aldeanos fijados → solo 2 asientos para 4 roles.
  const { deck, dropped } = buildDeck(8, extras, 42, null, 4);
  assert.equal(deck.length, 8);
  assert.equal(deck.filter((r) => r === 'aldeano').length, 4, '4 aldeanos reservados');
  assert.equal(deck.filter((r) => r === 'hombre_lobo').length, 2, 'los lobos no se tocan');
  assert.equal(deck.filter((r) => extras.includes(r)).length, 2, 'entran 2 roles sorteados');
  assert.equal(dropped.filter((d) => d.reason === 'sitio').length, 2, 'los otros 2 se anuncian');
  // Pedir más aldeanos de los posibles: se capa y la partida sigue jugable.
  const big = buildDeck(8, extras, 42, null, 20);
  assert.equal(big.deck.filter((r) => r === 'hombre_lobo').length, 2);
  assert.equal(big.deck.filter((r) => r === 'aldeano').length, 6);
  // 0 aldeanos: los especiales llenan todos los asientos del pueblo.
  const zero = buildDeck(5, extras, 7, null, 0);
  assert.equal(zero.deck.filter((r) => r === 'aldeano').length, 0);
  assert.equal(zero.deck.filter((r) => extras.includes(r)).length, 4);
  // Auto (null): comportamiento clásico de relleno.
  const auto = buildDeck(8, ['vidente'], 9, null, null);
  assert.equal(auto.deck.filter((r) => r === 'aldeano').length, 5);
});

test('computeNightSteps: primera noche sin sangre — sin lobos ni feroz, con reconocimiento', () => {
  const players = mkPlayers(['hombre_lobo', 'lobo_feroz', 'vidente', 'bruja', 'aldeano']);
  const comp = { hombre_lobo: 1, lobo_feroz: 1, vidente: 1, bruja: 1, aldeano: 1 };
  const g1 = mkGame({ night: 1, composition: comp, noKillNight1: true });
  const s1 = computeNightSteps(g1, players);
  assert.ok(s1.includes('lobos_reconocen'), 'los lobos se reconocen igualmente');
  assert.ok(!s1.includes('lobos'), 'sin devorar la noche 1');
  assert.ok(!s1.includes('lobo_feroz'));
  assert.ok(s1.includes('vidente') && s1.includes('bruja'), 'el resto de roles actúa');
  // La noche 2 vuelve a la normalidad.
  const s2 = computeNightSteps(mkGame({ night: 2, composition: comp, noKillNight1: true }), players);
  assert.ok(s2.includes('lobos') && s2.includes('lobo_feroz'));
});

test('buildDeck: si no caben, se descartan (dropped)', () => {
  const extras: RoleId[] = ['vidente', 'bruja', 'cazador', 'cupido', 'defensor', 'anciano', 'zorro', 'cuervo', 'gitana', 'tonto'];
  const { deck, dropped } = buildDeck(5, extras, 99);
  assert.equal(deck.length, 5);
  assert.ok(dropped.length > 0);
});

test('dealRoles: asigna un rol a cada jugador', () => {
  const players = Array.from({ length: 9 }, (_, i) => ({ id: 'p' + i, order: i }));
  const { assignments, composition } = dealRoles(players, ['vidente', 'bruja'], 5);
  assert.equal(Object.keys(assignments).length, 9);
  assert.equal(Object.values(composition).reduce((a, b) => a + b, 0), 9);
});

test('computeNightSteps: noche 1 incluye pasos iniciales, noche 2 no', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'cupido', 'aldeano']);
  const g1 = mkGame({ night: 1, composition: { hombre_lobo: 1, vidente: 1, cupido: 1, aldeano: 1 } });
  const s1 = computeNightSteps(g1, players);
  assert.equal(s1[0], 'durmiendo', 'la noche empieza con todos durmiéndose');
  assert.ok(s1.includes('cupido'));
  assert.ok(s1.includes('enamorados'));
  assert.ok(s1.includes('vidente'));
  assert.ok(s1.includes('lobos'));
  assert.equal(s1[s1.length - 1], 'amanecer');
  const g2 = mkGame({ night: 2, composition: g1.composition });
  const s2 = computeNightSteps(g2, players);
  assert.ok(!s2.includes('cupido'));
  assert.ok(!s2.includes('enamorados'));
  assert.ok(s2.includes('vidente'));
});

test('computeNightSteps: lobo albino solo noches pares', () => {
  const comp = { hombre_lobo: 1, lobo_albino: 1, aldeano: 2 };
  const players = mkPlayers(['hombre_lobo', 'lobo_albino', 'aldeano', 'aldeano']);
  assert.ok(!computeNightSteps(mkGame({ night: 1, composition: comp }), players).includes('lobo_albino'));
  assert.ok(computeNightSteps(mkGame({ night: 2, composition: comp }), players).includes('lobo_albino'));
});

test('computeNightSteps: la muerte pública del Anciano salta los pasos de poder de pueblo', () => {
  const comp = { hombre_lobo: 1, vidente: 1, defensor: 1, bruja: 1, aldeano: 3 };
  const players = mkPlayers(['hombre_lobo', 'vidente', 'defensor', 'bruja', 'aldeano', 'aldeano', 'aldeano']);
  // Noche 2 normal: los roles de pueblo con poder despiertan.
  const normal = computeNightSteps(mkGame({ night: 2, composition: comp }), players);
  assert.ok(normal.includes('vidente') && normal.includes('defensor') && normal.includes('bruja'));
  // Anciano muerto y su muerte fue pública (revealDead): sus pasos se omiten…
  const publico = computeNightSteps(mkGame({ night: 2, composition: comp, powersLost: true, revealDead: true }), players);
  assert.ok(!publico.includes('vidente') && !publico.includes('defensor') && !publico.includes('bruja'), 'sin pasos de pueblo');
  assert.ok(publico.includes('lobos'), 'los lobos siguen cazando');
  // …pero si la muerte fue privada (revealDead=false) se mantiene el disimulo.
  const privado = computeNightSteps(mkGame({ night: 2, composition: comp, powersLost: true, revealDead: false }), players);
  assert.ok(privado.includes('vidente') && privado.includes('defensor'), 'muerte privada: siguen despertando');
});

test('generateKeywords: únicas, deterministas y suficientes', () => {
  const a = generateKeywords(18, 42);
  const b = generateKeywords(18, 42);
  assert.equal(a.length, 18);
  assert.equal(new Set(a).size, 18, 'sin repetidas');
  assert.deepEqual(a, b, 'misma semilla, mismas palabras');
  assert.notDeepEqual(generateKeywords(18, 43), a, 'semilla distinta, palabras distintas');
  assert.ok(a.every((k) => / de /.test(k)));
});

test('lobos_reconocen: solo en primera noche sin sangre; con caza van directos a la presa', () => {
  const players = mkPlayers(['hombre_lobo', 'perro_lobo', 'vidente', 'aldeano']);
  players[1].wolfSide = true; // el perro lobo eligió la manada
  const comp = { hombre_lobo: 1, perro_lobo: 1, vidente: 1, aldeano: 1 };
  // Con caza en la noche 1 no hay paso de presentación: se reconocen al elegir.
  const normal = computeNightSteps(mkGame({ composition: comp }), players);
  assert.ok(!normal.includes('lobos_reconocen'), 'sin paso de reconocimiento');
  assert.ok(normal.includes('lobos'), 'directos a la elección de víctima');
  // Con primera noche tranquila sí se presentan (y nadie muere).
  const game = mkGame({ composition: comp, noKillNight1: true });
  const steps = computeNightSteps(game, players);
  assert.ok(steps.includes('lobos_reconocen'));
  assert.ok(!steps.includes('lobos'));
  assert.deepEqual(stepActors('lobos_reconocen', game, players)!.sort(), ['p0', 'p1']);
  game.acts.lobosSeen = { p0: true };
  assert.deepEqual(stepActors('lobos_reconocen', game, players), ['p1']);
  game.acts.lobosSeen = { p0: true, p1: true };
  assert.equal(stepActors('lobos_reconocen', game, players), null);
  // La noche 2 ya no incluye el reconocimiento.
  const s2 = computeNightSteps(mkGame({ night: 2, composition: comp, noKillNight1: true }), players);
  assert.ok(!s2.includes('lobos_reconocen'));
});

test('encantados: TODOS los encantados (viejos y nuevos) despiertan y confirman', () => {
  const players = mkPlayers(['hombre_lobo', 'gaitero', 'aldeano', 'aldeano', 'aldeano']);
  const game = mkGame({ composition: { hombre_lobo: 1, gaitero: 1, aldeano: 3 } });
  const steps = computeNightSteps(game, players);
  assert.ok(steps.includes('encantados'));
  assert.ok(steps.indexOf('gaitero') < steps.indexOf('encantados'));
  assert.equal(stepActors('encantados', game, players), null, 'sin objetivos aún');
  // p4 quedó encantado una noche anterior; esta noche caen p2 y p3.
  players.find((p) => p.id === 'p4')!.charmed = true;
  game.acts.gaiteroTargets = ['p2', 'p3'];
  players.find((p) => p.id === 'p2')!.charmed = true;
  players.find((p) => p.id === 'p3')!.charmed = true;
  assert.deepEqual(stepActors('encantados', game, players)!.sort(), ['p2', 'p3', 'p4'],
    'todos los encantados se reconocen, como en el juego de mesa');
  game.acts.encantadosSeen = { p2: true, p4: true };
  assert.deepEqual(stepActors('encantados', game, players), ['p3']);
  game.acts.encantadosSeen = { p2: true, p3: true, p4: true };
  assert.equal(stepActors('encantados', game, players), null, 'todos confirmados');
  // Sin encantamiento nuevo esta noche (gaitero muerto o inactivo), nadie despierta.
  game.acts.gaiteroTargets = [];
  game.acts.encantadosSeen = {};
  assert.equal(stepActors('encantados', game, players), null, 'sin música no hay despertar');
});

test('auditoría: el Salvador anula el ataque entero — ni muerte ni infección; también frente al Albino', () => {
  // Infección sobre protegido: no ocurre (sin mordisco no hay contagio).
  const ps1 = mkPlayers(['infecto', 'defensor', 'aldeano', 'aldeano']);
  const g1 = mkGame({ acts: { wolfVictim: 'p2', infectoUsed: true, defensorTarget: 'p2' } });
  const d1 = resolveDawn(g1, ps1);
  const v1 = d1.players.find((p) => p.id === 'p2')!;
  assert.equal(v1.alive, true);
  assert.ok(!v1.infected, 'el protegido no queda infectado');
  // Sin protección, la infección sí ocurre (y la cura de la Bruja no la impide).
  const ps2 = mkPlayers(['infecto', 'bruja', 'aldeano', 'aldeano']);
  const g2 = mkGame({ acts: { wolfVictim: 'p2', infectoUsed: true, brujaHeal: 'p2' } });
  const d2 = resolveDawn(g2, ps2);
  assert.equal(d2.players.find((p) => p.id === 'p2')!.infected, true, 'curado pero contagiado');
  // El mordisco del Lobo Blanco también respeta al Salvador.
  const ps3 = mkPlayers(['lobo_albino', 'hombre_lobo', 'defensor', 'aldeano']);
  const g3 = mkGame({ night: 2, acts: { albinoVictim: 'p1', defensorTarget: 'p1' } });
  const d3 = resolveDawn(g3, ps3);
  assert.equal(d3.players.find((p) => p.id === 'p1')!.alive, true, 'lobo protegido del Albino');
});

test('auditoría: la paridad no cierra con el Lobo Blanco vivo (su caza puede torcer el final)', () => {
  // 1 lobo + 1 albino + 1 aldeano: al albino le conviene linchar al lobo, así
  // que nada está decidido: la partida sigue.
  const ps = mkPlayers(['hombre_lobo', 'lobo_albino', 'aldeano']);
  assert.equal(checkWinner(ps), null);
  // Sin albino, la misma foto sí es victoria lobuna.
  const ps2 = mkPlayers(['hombre_lobo', 'hombre_lobo', 'aldeano']);
  assert.equal(checkWinner(ps2), 'lobos');
});

test('si solo quedan los enamorados gana el amor (y Cupido con ellos), sea cual sea el bando', () => {
  const dosAldeanos = mkPlayers(['aldeano', 'vidente']);
  dosAldeanos.forEach((p) => (p.lover = true));
  assert.equal(checkWinner(dosAldeanos), 'enamorados');
  const dosLobos = mkPlayers(['hombre_lobo', 'hombre_lobo']);
  dosLobos.forEach((p) => (p.lover = true));
  assert.equal(checkWinner(dosLobos), 'enamorados');
  const mixta = mkPlayers(['hombre_lobo', 'vidente']);
  mixta.forEach((p) => (p.lover = true));
  assert.equal(checkWinner(mixta), 'enamorados');
});

test('la partida de Cupido: devorado la noche 1, lobo linchado, quedan los enamorados → enamorados', () => {
  // El caso real de la mesa: 4 jugadores — lobo (p0), cazador (p1), bruja (p2)
  // y Cupido (p3). Cupido enamora a cazador y bruja; los lobos lo devoran a él
  // la noche 1 y el pueblo lincha al lobo el día 1: quedan solo los enamorados.
  const players = mkPlayers(['hombre_lobo', 'cazador', 'bruja', 'cupido']);
  players[1].lover = true;
  players[2].lover = true;
  const g1 = mkGame({ night: 1, acts: { wolfVictim: 'p3' } });
  const dawn1 = resolveDawn(g1, players);
  assert.ok(dawn1.deaths.some((d) => d.pid === 'p3' && d.cause === 'lobos'), 'Cupido devorado');
  assert.equal(checkWinner(dawn1.players), null, 'con el lobo vivo la partida sigue');
  const g2 = mkGame({ night: 1, dayNum: 1, votesLeft: 1 });
  const vote = resolveVote(g2, dawn1.players, 'p0')!;
  assert.equal(vote.winner, 'enamorados', 'solo quedan los enamorados: gana el amor (y Cupido)');
});

test('gaitero: puede encantarse a sí mismo y su victoria solo exige a los DEMÁS vivos', () => {
  // Auto-encantado o no, da igual: la condición ignora su propio estado.
  const ps = mkPlayers(['gaitero', 'aldeano', 'hombre_lobo']);
  ps[1].charmed = true;
  ps[2].charmed = true;
  assert.equal(checkWinner(ps), 'gaitero');
  ps[0].charmed = true; // gaitero auto-encantado: nada cambia
  assert.equal(checkWinner(ps), 'gaitero');
  // Y si aún queda alguien sin encantar, no hay victoria del gaitero.
  const ps2 = mkPlayers(['gaitero', 'aldeano', 'hombre_lobo']);
  ps2[0].charmed = true;
  ps2[2].charmed = true;
  assert.equal(checkWinner(ps2), null);
});

test('caballero: devorado, su espada mata al lobo EN EL MISMO amanecer (la partida real de la mesa)', () => {
  // Partida de 4 con un solo lobo, reportada tres veces: lobo (p0), caballero
  // (p1) y dos aldeanos. Noche 1: el lobo devora al Caballero → ambos caen en
  // el mismo amanecer y el pueblo gana en el acto. (Regla de la mesa: el juego
  // oficial demora el tétanos una noche, pero ese retardo era invisible.)
  const players = mkPlayers(['hombre_lobo', 'caballero', 'aldeano', 'aldeano']);
  const g1 = mkGame({ night: 1, acts: { wolfVictim: 'p1' } });
  const dawn1 = resolveDawn(g1, players);
  assert.ok(dawn1.deaths.some((d) => d.pid === 'p1' && d.cause === 'lobos'), 'el caballero cae devorado');
  assert.ok(dawn1.deaths.some((d) => d.pid === 'p0' && d.cause === 'oxido'), 'y su espada reclama al lobo ese mismo amanecer');
  assert.equal(checkWinner(dawn1.players), 'pueblo');
});

test('caballero: la mesa es un círculo — la izquierda da la vuelta del último asiento al primero', () => {
  // Caballero en el último asiento (p3): su izquierda es p0 (wrap del círculo).
  const ps = mkPlayers(['hombre_lobo', 'aldeano', 'aldeano', 'caballero']);
  const d = resolveDawn(mkGame({ night: 1, acts: { wolfVictim: 'p3' } }), ps);
  assert.ok(d.deaths.some((x) => x.pid === 'p0' && x.cause === 'oxido'), 'la búsqueda da la vuelta a la mesa');
});

test('caballero: linchado o envenenado NO desata el óxido (solo al morir devorado)', () => {
  const ps = mkPlayers(['hombre_lobo', 'caballero', 'aldeano', 'aldeano']);
  const vote = resolveVote(mkGame({ night: 1, dayNum: 1, votesLeft: 1 }), ps, 'p1')!;
  assert.ok(vote.players.find((p) => p.id === 'p0')!.alive, 'linchar al caballero no oxida al lobo');
  const ps2 = mkPlayers(['hombre_lobo', 'caballero', 'aldeano', 'aldeano']);
  const dawn = resolveDawn(mkGame({ night: 1, acts: { brujaPoison: 'p1' } }), ps2);
  assert.ok(dawn.players.find((p) => p.id === 'p0')!.alive, 'el veneno tampoco');
});

test('resolveDawn: la marca del cuervo se anuncia al amanecer', () => {
  const players = mkPlayers(['hombre_lobo', 'cuervo', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { cuervoTarget: 'p3' } });
  const res = resolveDawn(game, players);
  assert.ok(res.cuervoAnnounce);
  assert.ok(res.cuervoAnnounce.includes('J3'));
  assert.ok(res.cuervoAnnounce.includes('dos votos'));
});

test('resolveDawn: si los lobos devoran al señalado por el cuervo, la voz bromea (plumas en vano)', () => {
  const players = mkPlayers(['hombre_lobo', 'cuervo', 'aldeano', 'aldeano']);
  // Los lobos devoran justo a quien el cuervo señaló.
  const game = mkGame({ night: 2, seed: 5, acts: { cuervoTarget: 'p3', wolfVictim: 'p3' } });
  const res = resolveDawn(game, players);
  assert.ok(res.deaths.some((d) => d.pid === 'p3'), 'el señalado ha muerto');
  assert.ok(res.cuervoAnnounce);
  assert.ok(res.cuervoAnnounce.includes('J3'));
  assert.ok(!res.cuervoAnnounce.includes('dos votos extra en su contra'), 'sin votos contra un muerto');
  assert.ok(/en vano|puntería|desperdiciadas/.test(res.cuervoAnnounce), 'tono de broma');
  assert.ok(res.logs.some((l) => l.txt.includes('en vano')), 'la crónica también lo recoge');
});

test('turno fantasma: disimula roles muertos (ocultos) y roles vivos sin poder', () => {
  // Bruja viva sin pociones: se disimula SIEMPRE (incluso con roles revelados).
  const conBruja = mkPlayers(['hombre_lobo', 'bruja', 'aldeano']);
  conBruja[1].powers = { heal: false, poison: false };
  assert.equal(stepNeedsGhostAnnounce('bruja', mkGame({ revealDead: true }), conBruja), true);
  // Bruja muerta con roles revelados: no hace falta fingir.
  conBruja[1].alive = false;
  assert.equal(stepNeedsGhostAnnounce('bruja', mkGame({ revealDead: true }), conBruja), false);
  // Bruja muerta con roles ocultos: turno fantasma.
  assert.equal(stepNeedsGhostAnnounce('bruja', mkGame({ revealDead: false }), conBruja), true);
});

test('stepActors: los roles vivos despiertan aunque no tengan poderes (disimulo)', () => {
  const players = mkPlayers(['hombre_lobo', 'bruja', 'zorro', 'aldeano']);
  players[1].powers = { heal: false, poison: false };
  players[2].powers = { zorro: false };
  const game = mkGame({});
  assert.deepEqual(stepActors('bruja', game, players), ['p1'], 'bruja sin pociones despierta igual');
  assert.deepEqual(stepActors('zorro', game, players), ['p2'], 'zorro sin olfato despierta igual');
  const lost = mkGame({ powersLost: true });
  assert.deepEqual(stepActors('bruja', lost, players), ['p1'], 'castigo del anciano: también despierta');
  lost.acts.brujaDone = true;
  assert.equal(stepActors('bruja', lost, players), null);
});

test('stepActors: lobos incluye infectados y transformados', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'aldeano', 'nino_salvaje']);
  players[2].infected = true;
  players[3].transformed = true;
  const game = mkGame();
  const actors = stepActors('lobos', game, players);
  assert.deepEqual(actors!.sort(), ['p0', 'p2', 'p3']);
});

test('stepActors: la vidente elige y luego debe confirmar que lo ha visto', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'aldeano']);
  const game = mkGame({ acts: { videnteTarget: 'p0' } });
  // Ha elegido pero no ha confirmado: sigue siendo la actriz del paso.
  assert.deepEqual(stepActors('vidente', game, players), ['p1']);
  game.acts.videnteSeen = true;
  assert.equal(stepActors('vidente', game, players), null);
  assert.ok(stepActors('lobos', game, players)!.length === 1);
});

test('resolveDawn: los lobos pueden devorar a uno de los suyos', () => {
  const players = mkPlayers(['hombre_lobo', 'hombre_lobo', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { wolfVictim: 'p1' } });
  const res = resolveDawn(game, players);
  assert.equal(res.players.find((p) => p.id === 'p1')!.alive, false);
  assert.equal(res.gameUpdates.wolfDeathOccurred, true, 'cuenta como muerte de lobo (condición del Feroz)');
});

test('resolveDawn: muerte simple por lobos', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { wolfVictim: 'p2' } });
  const res = resolveDawn(game, players);
  const dead = res.players.find((p) => p.id === 'p2')!;
  assert.equal(dead.alive, false);
  assert.equal(res.deaths.length, 1);
});

test('resolveDawn: el defensor protege', () => {
  const players = mkPlayers(['hombre_lobo', 'defensor', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { wolfVictim: 'p2', defensorTarget: 'p2' } });
  const res = resolveDawn(game, players);
  assert.equal(res.deaths.length, 0);
});

test('resolveDawn: la bruja cura y envenena', () => {
  const players = mkPlayers(['hombre_lobo', 'bruja', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { wolfVictim: 'p2', brujaHeal: 'p2', brujaPoison: 'p3' } });
  const res = resolveDawn(game, players);
  assert.equal(res.players.find((p) => p.id === 'p2')!.alive, true);
  assert.equal(res.players.find((p) => p.id === 'p3')!.alive, false);
  assert.equal(res.deaths[0].cause, 'veneno');
});

test('resolveDawn: el anciano sobrevive al primer ataque, no al segundo', () => {
  const players = mkPlayers(['hombre_lobo', 'anciano', 'aldeano', 'aldeano']);
  const g1 = mkGame({ acts: { wolfVictim: 'p1' } });
  const r1 = resolveDawn(g1, players);
  const anciano = r1.players.find((p) => p.id === 'p1')!;
  assert.equal(anciano.alive, true);
  assert.equal(anciano.ancianoHit, true);
  const g2 = mkGame({ night: 2, acts: { wolfVictim: 'p1' } });
  const r2 = resolveDawn(g2, r1.players);
  assert.equal(r2.players.find((p) => p.id === 'p1')!.alive, false);
});

test('resolveDawn: infección convierte en lobo sin matar', () => {
  const players = mkPlayers(['infecto', 'vidente', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { wolfVictim: 'p1', infectoUsed: true } });
  const res = resolveDawn(game, players);
  const v = res.players.find((p) => p.id === 'p1')!;
  assert.equal(v.alive, true);
  assert.equal(v.infected, true);
  assert.ok(isWolfSide(v));
  assert.equal(res.gameUpdates.infectoPowerUsed, true);
});

test('resolveDawn: cadena de enamorados', () => {
  const players = mkPlayers(['hombre_lobo', 'aldeano', 'aldeano', 'vidente']);
  players[1].lover = true; players[3].lover = true;
  const game = mkGame({ acts: { wolfVictim: 'p1' } });
  const res = resolveDawn(game, players);
  assert.equal(res.deaths.length, 2);
  assert.equal(res.players.find((p) => p.id === 'p3')!.alive, false);
  assert.equal(res.players.find((p) => p.id === 'p3')!.causeOfDeath, 'pena');
});

test('resolveDawn: cazador muerto genera pendiente de disparo', () => {
  const players = mkPlayers(['hombre_lobo', 'cazador', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: { wolfVictim: 'p1' } });
  const res = resolveDawn(game, players);
  assert.deepEqual(res.pendings, [{ type: 'cazador', pid: 'p1' }]);
});

test('resolveDawn: caballero devorado oxida al primer lobo hacia su izquierda EN ESE amanecer', () => {
  const players = mkPlayers(['hombre_lobo', 'caballero', 'aldeano', 'hombre_lobo']);
  const game = mkGame({ acts: { wolfVictim: 'p1' } });
  const res = resolveDawn(game, players);
  // Primer lobo hacia la izquierda de p1 (sentido de asientos): p3, no p0.
  assert.equal(res.players.find((p) => p.id === 'p3')!.alive, false);
  assert.equal(res.players.find((p) => p.id === 'p3')!.causeOfDeath, 'oxido');
  assert.ok(res.players.find((p) => p.id === 'p0')!.alive, 'el otro lobo sigue vivo');
});

test('resolveDawn: gran lobo feroz mata segunda víctima', () => {
  const players = mkPlayers(['lobo_feroz', 'aldeano', 'aldeano', 'aldeano', 'vidente']);
  const game = mkGame({ acts: { wolfVictim: 'p1', ferozVictim: 'p2' } });
  const res = resolveDawn(game, players);
  assert.equal(res.deaths.length, 2);
});

test('resolveDawn: gaitero encanta y gana cuando todos encantados', () => {
  const players = mkPlayers(['gaitero', 'hombre_lobo', 'aldeano']);
  const game = mkGame({ acts: { gaiteroTargets: ['p1', 'p2'] } });
  const res = resolveDawn(game, players);
  assert.ok(res.players.find((p) => p.id === 'p1')!.charmed);
  assert.equal(checkWinner(res.players), 'gaitero');
});

test('resolveDawn: gruñido del oso con lobo vecino', () => {
  const players = mkPlayers(['hombre_lobo', 'domador', 'aldeano', 'aldeano']);
  const game = mkGame({ acts: {} });
  const res = resolveDawn(game, players);
  assert.ok(res.logs.some((l) => l.txt.includes('oso')));
});

test('resolveDawn: la pregunta de la gitana la responden todos los muertos a una', () => {
  const players = mkPlayers(['hombre_lobo', 'gitana', 'aldeano', 'aldeano']);
  players[3].alive = false; players[3].deathAt = 1;
  const game = mkGame({ acts: { gitanaQIdx: 0 }, deathTick: 1 });
  const res = resolveDawn(game, players);
  assert.ok(res.gitanaAnnounce);
  assert.ok(res.gitanaAnnounce.includes('todos a una'), 'los espíritus responden en coro');
  assert.ok(!res.gitanaAnnounce.includes('J3'), 'sin médium concreto: responden entre todos');
});

test('resolveDawn: la gitana puede escribir su propia pregunta', () => {
  const players = mkPlayers(['hombre_lobo', 'gitana', 'aldeano', 'aldeano']);
  players[3].alive = false; players[3].deathAt = 1;
  const game = mkGame({ acts: { gitanaText: '¿Era Bruno el que roncaba anoche?' }, deathTick: 1 });
  const res = resolveDawn(game, players);
  assert.ok(res.gitanaAnnounce);
  assert.ok(res.gitanaAnnounce.includes('¿Era Bruno el que roncaba anoche?'));
  assert.ok(res.gitanaAnnounce.includes('todos a una'), 'la responden los muertos en coro');
});

test('resolveVote: linchamiento normal con revelación', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'aldeano', 'aldeano']);
  const game = mkGame({ phase: 'day', dayNum: 1, votesLeft: 1 });
  const res = resolveVote(game, players, 'p0')!;
  assert.equal(res.players.find((p) => p.id === 'p0')!.alive, false);
  assert.equal(res.winner, 'pueblo');
  assert.ok(res.logs.some((l) => l.txt.includes('Hombre Lobo')));
});

test('resolveVote: el tonto se salva y pierde el voto', () => {
  const players = mkPlayers(['hombre_lobo', 'tonto', 'aldeano', 'aldeano']);
  const game = mkGame({ phase: 'day', dayNum: 1 });
  const res = resolveVote(game, players, 'p1')!;
  const tonto = res.players.find((p) => p.id === 'p1')!;
  assert.equal(tonto.alive, true);
  assert.equal(tonto.revealedTonto, true);
  assert.equal(res.winner, null);
});

test('resolveVote: el ángel gana si lo linchan el día 1', () => {
  const players = mkPlayers(['hombre_lobo', 'angel', 'aldeano', 'aldeano']);
  const game = mkGame({ phase: 'day', dayNum: 1 });
  const res = resolveVote(game, players, 'p1')!;
  assert.equal(res.winner, 'angel');
});

test('resolveVote: el ángel NO gana el día 2', () => {
  const players = mkPlayers(['hombre_lobo', 'angel', 'aldeano', 'aldeano']);
  const game = mkGame({ phase: 'day', dayNum: 2 });
  const res = resolveVote(game, players, 'p1')!;
  assert.equal(res.winner, null);
  assert.equal(res.players.find((p) => p.id === 'p1')!.alive, false);
});

test('resolveVote: empate mata al cabeza de turco y este elige votante', () => {
  const players = mkPlayers(['hombre_lobo', 'cabeza_turco', 'aldeano', 'aldeano']);
  const game = mkGame({ phase: 'day', dayNum: 1 });
  const res = resolveVote(game, players, 'empate')!;
  assert.equal(res.players.find((p) => p.id === 'p1')!.alive, false);
  assert.ok(res.pendings.some((p) => p.type === 'cabeza_pick'));
});

test('resolveVote: empate sin cabeza de turco no mata a nadie', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'aldeano', 'aldeano']);
  const game = mkGame({ phase: 'day', dayNum: 1 });
  const res = resolveVote(game, players, 'empate')!;
  assert.equal(res.players.filter((p) => !p.alive).length, 0);
});

test('applyDeathsChain: matar al anciano por linchamiento quita poderes', () => {
  const players = mkPlayers(['hombre_lobo', 'anciano', 'vidente', 'aldeano']);
  const game = mkGame({});
  const chain = applyDeathsChain(players, [{ pid: 'p1', cause: 'linchado' }], game);
  assert.equal(chain.powersLost, true);
});

test('applyDeathsChain: niño salvaje se transforma al morir su modelo', () => {
  const players = mkPlayers(['hombre_lobo', 'nino_salvaje', 'aldeano', 'aldeano']);
  players[1].modelId = 'p2';
  const game = mkGame({});
  applyDeathsChain(players, [{ pid: 'p2', cause: 'linchado' }], game);
  assert.equal(players[1].transformed, true);
  assert.ok(isWolfSide(players[1]));
});

test('applyDeathsChain: detecta muerte de lobo (condición del feroz)', () => {
  const players = mkPlayers(['hombre_lobo', 'lobo_feroz', 'aldeano', 'aldeano']);
  const game = mkGame({});
  const chain = applyDeathsChain(players, [{ pid: 'p0', cause: 'linchado' }], game);
  assert.equal(chain.wolfDeath, true);
});

test('annotateDeaths: ocultar causas nocturnas', () => {
  const ps = mkPlayers(['hombre_lobo', 'bruja', 'aldeano']);
  const byId = Object.fromEntries(ps.map((p) => [p.id, p]));
  const logs: { kind: string; txt: string }[] = [];
  const game = mkGame({ revealDead: false, hideNightCauses: true });
  annotateDeaths([{ pid: 'p2', cause: 'lobos', role: 'aldeano' }, { pid: 'p1', cause: 'veneno', role: 'bruja' }], byId, logs, game);
  assert.ok(logs.every((l) => !l.txt.includes('lobos') && !l.txt.includes('envenenado')), 'sin causas');
  assert.ok(logs.every((l) => l.txt.includes('sin vida')), 'texto genérico');
  // Las causas públicas del día no se ocultan.
  const logs2: { kind: string; txt: string }[] = [];
  annotateDeaths([{ pid: 'p2', cause: 'linchado', role: 'aldeano' }], byId, logs2, game);
  assert.ok(logs2[0].txt.includes('linchado'));
});

test('checkWinner: victorias básicas', () => {
  let ps = mkPlayers(['hombre_lobo', 'aldeano']);
  ps[0].alive = false;
  assert.equal(checkWinner(ps), 'pueblo');

  ps = mkPlayers(['hombre_lobo', 'aldeano', 'vidente']);
  ps[1].alive = false; ps[2].alive = false;
  assert.equal(checkWinner(ps), 'lobos');

  ps = mkPlayers(['hombre_lobo', 'aldeano', 'vidente']);
  assert.equal(checkWinner(ps), null);
});

test('checkWinner: paridad — 1 lobo + 1 aldeano termina con victoria lobuna', () => {
  const ps = mkPlayers(['hombre_lobo', 'aldeano']);
  assert.equal(checkWinner(ps), 'lobos');
  // 2 lobos vs 2 aldeanos: también paridad.
  assert.equal(checkWinner(mkPlayers(['hombre_lobo', 'hombre_lobo', 'aldeano', 'aldeano'])), 'lobos');
  // 1 lobo vs 2 aldeanos: la partida sigue.
  assert.equal(checkWinner(mkPlayers(['hombre_lobo', 'aldeano', 'aldeano'])), null);
});

test('checkWinner: el Tonto descubierto no cuenta como votante en la paridad', () => {
  // Tonto revelado + aldeano + lobo: solo queda 1 votante no-lobo frente a 1
  // lobo → los lobos ya no pueden ser linchados → victoria lobuna.
  const ps = mkPlayers(['hombre_lobo', 'aldeano', 'tonto']);
  ps[2].revealedTonto = true;
  assert.equal(checkWinner(ps), 'lobos');
  // Si el tonto NO está descubierto, todavía vota: 1 lobo vs 2 → la partida sigue.
  assert.equal(checkWinner(mkPlayers(['hombre_lobo', 'aldeano', 'tonto'])), null);
});

test('checkWinner: la paridad respeta al cazador y a la bruja con veneno', () => {
  assert.equal(checkWinner(mkPlayers(['hombre_lobo', 'cazador'])), null, 'el cazador aún puede llevarse al lobo');
  const conBruja = mkPlayers(['hombre_lobo', 'bruja']);
  assert.equal(checkWinner(conBruja), null, 'la bruja aún puede envenenar');
  conBruja[1].powers = { heal: false, poison: false };
  assert.equal(checkWinner(conBruja), 'lobos', 'sin veneno ya no hay resistencia');
  // El albino en solitario no dispara la paridad: sigue cazando por su cuenta.
  assert.equal(checkWinner(mkPlayers(['lobo_albino', 'aldeano'])), null);
});

test('checkWinner: enamorados de bandos distintos, últimos dos', () => {
  const ps = mkPlayers(['hombre_lobo', 'vidente', 'aldeano']);
  ps[0].lover = true; ps[1].lover = true; ps[2].alive = false;
  assert.equal(checkWinner(ps), 'enamorados');
});

test('checkWinner: lobo albino último superviviente', () => {
  const ps = mkPlayers(['lobo_albino', 'hombre_lobo', 'aldeano']);
  ps[1].alive = false; ps[2].alive = false;
  assert.equal(checkWinner(ps), 'lobo_albino');
});

test('checkWinner: sectario gana si muere la otra mitad', () => {
  const ps = mkPlayers(['sectario', 'aldeano', 'hombre_lobo', 'aldeano']);
  ps[0].sect = 'A'; ps[1].sect = 'A'; ps[2].sect = 'B'; ps[3].sect = 'B';
  ps[2].alive = false; ps[3].alive = false;
  assert.equal(checkWinner(ps), 'sectario');
});

test('checkWinner: el perro lobo que elige lobos cuenta como lobo', () => {
  const ps = mkPlayers(['perro_lobo', 'aldeano']);
  ps[0].wolfSide = true;
  ps[1].alive = false;
  assert.equal(checkWinner(ps), 'lobos');
  assert.equal(effectiveTeam(ps[0]), 'lobos');
});

test('composición secreta: los roles activados no repartidos se fingen', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'aldeano', 'aldeano']);
  const comp = { hombre_lobo: 1, vidente: 1, aldeano: 2 };
  // bruja y cupido activados pero sin repartir; composición secreta.
  const g = mkGame({
    composition: comp, fakeAllSelected: true, keywordsActive: true,
    selectedRoles: ['vidente', 'bruja', 'cupido'],
  });
  const steps = computeNightSteps(g, players);
  assert.ok(steps.includes('bruja'), 'la bruja se finge aunque no se repartió');
  assert.ok(steps.includes('cupido') && steps.includes('enamorados'), 'cupido y enamorados fingidos');
  assert.equal(stepActors('bruja', g, players), null, 'nadie actúa: paso fantasma');
  assert.ok(stepNeedsGhostAnnounce('bruja', g, players), 'se anuncia por voz…');
  assert.ok(stepNeedsGhostAnnounce('bruja', { ...g, revealDead: true }, players),
    '…incluso con roles revelados al morir (nadie lo ha visto morir)');
  // Con composición pública no se finge nada.
  const pubSteps = computeNightSteps(mkGame({ composition: comp }), players);
  assert.ok(!pubSteps.includes('bruja') && !pubSteps.includes('cupido'));
});

test('checkWinner: lobos + albino a solas — la caza sigue si el albino no está en minoría', () => {
  const mk = (role: RoleId, extra: Partial<GamePlayer> = {}): GamePlayer =>
    ({ id: role + Math.random(), role, alive: true, powers: {}, ...extra });
  // 1 lobo + 1 albino: nadie domina el voto → la partida continúa.
  assert.equal(checkWinner([mk('hombre_lobo'), mk('lobo_albino')]), null);
  // 2 lobos + 1 albino: la manada controla el voto → ganan los lobos.
  assert.equal(checkWinner([mk('hombre_lobo'), mk('hombre_lobo'), mk('lobo_albino')]), 'lobos');
  // Solo lobos, sin albino: victoria lobuna clásica.
  assert.equal(checkWinner([mk('hombre_lobo'), mk('hombre_lobo')]), 'lobos');
});

test('applyDeathsChain: el castigo del Anciano desarma al Cazador', () => {
  // Anciano y cazador enamorados: linchan al anciano → castigo → el cazador
  // muere de pena, pero SIN disparo (los aldeanos perdieron sus poderes).
  const players: GamePlayer[] = [
    { id: 'a', role: 'anciano', alive: true, lover: true, powers: {} },
    { id: 'c', role: 'cazador', alive: true, lover: true, powers: {} },
    { id: 'l', role: 'hombre_lobo', alive: true, powers: {} },
    { id: 'x', role: 'aldeano', alive: true, powers: {} },
  ];
  const game = { powersLost: false };
  const res = applyDeathsChain(players, [{ pid: 'a', cause: 'linchado' }], game);
  assert.equal(res.powersLost, true);
  assert.ok(!res.pendings.some((pd) => pd.type === 'cazador'), 'sin flecha final');
  // Sin castigo, el mismo escenario sí dispara.
  const players2 = players.map((p) => ({ ...p, alive: true }));
  const res2 = applyDeathsChain(players2, [{ pid: 'c', cause: 'linchado' }], { powersLost: false });
  assert.ok(res2.pendings.some((pd) => pd.type === 'cazador'));
});

test('rotateKeyword: solo se usa cuando la palabra puede volver a sonar (gaitero repartido)', () => {
  // La condición vive en actions.confirmLover: con gaitero repartido rota;
  // sin él, la palabra queda fija. Aquí se comprueba el mecanismo puro.
  const game = { keywordsActive: true, kwPool: ['Faro de Bruma'], kwIdx: 0, night: 1 };
  const players = [{ id: 'p1', keyword: 'Luna de Plata' }];
  assert.equal(rotateKeyword(game, players, 'p1').p1.keyword, 'Faro de Bruma');
});

test('rotateKeyword: renueva desde la reserva y avisa; sin reserva no rompe', () => {
  const game = { keywordsActive: true, kwPool: ['Faro de Bruma', 'Puente de Hielo'], kwIdx: 0, night: 2 };
  const players = [{ id: 'p1', keyword: 'Luna de Plata' }, { id: 'p2', keyword: 'Brasa de Otoño' }];
  const patch1 = rotateKeyword(game, players, 'p1');
  assert.deepEqual(patch1, { p1: { keyword: 'Faro de Bruma', kwRenewedNight: 2 } });
  assert.equal(game.kwIdx, 1);
  const patch2 = rotateKeyword(game, players, 'p2');
  assert.equal(patch2.p2.keyword, 'Puente de Hielo');
  // Reserva agotada: no cambia nada (mejor palabra usada que ninguna).
  assert.deepEqual(rotateKeyword(game, players, 'p1'), {});
  // Sin palabras clave activas: no-op.
  assert.deepEqual(rotateKeyword({ keywordsActive: false, kwPool: ['X'], kwIdx: 0 }, players, 'p1'), {});
});

test('resolveDawn: el oso también se anuncia por voz (osoAnnounce)', () => {
  const players = mkPlayers(['hombre_lobo', 'domador', 'aldeano', 'aldeano']);
  const res = resolveDawn(mkGame({ acts: {} }), players);
  assert.ok(res.osoAnnounce && res.osoAnnounce.includes('oso'), 'gruñido con locución');
  const lejos = mkPlayers(['hombre_lobo', 'aldeano', 'domador', 'aldeano']);
  // vecinos del domador: aldeano y aldeano → sin gruñido
  const res2 = resolveDawn(mkGame({ acts: {} }), lejos);
  assert.equal(res2.osoAnnounce, null);
});

test('narración compuesta: ~100+ variantes por tipo, deterministas por sal', () => {
  for (const key of ['bruja', 'vidente', 'lobos', 'noche_cae', 'dia_debate', 'bienvenida']) {
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) seen.add(narr(key, 'seed' + i));
    assert.ok(seen.size >= 100, `${key}: ${seen.size} variantes (se esperaban ≥100)`);
    assert.equal(narr(key, 'fija'), narr(key, 'fija'), 'misma sal, misma frase');
  }
  const outs = new Set<string | null>();
  for (let i = 0; i < 300; i++) outs.add(outro('bruja', 's' + i));
  assert.ok(outs.size >= 15, 'despedidas de la bruja: ' + outs.size);
});

const speechWords = (t: string) => t.replace(/<[^>]+>/g, '')
  // eslint-disable-next-line no-misleading-character-class -- regex heredada de la v1: quita emojis y sus modificadores
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
  .replace(/[«»]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

test('explicación: la voz lee lo mismo que muestra el modal, incluidos roles y ajustes', () => {
  const group = { currentGame: 'hombres_lobo', extraRoles: ['vidente', 'bruja', 'cazador'], settings: { revealDead: true, alguacil: true } };
  const shownParts = [EXPLANATIONS.hombres_lobo.title];
  for (const sec of explainSections(group)) {
    if (sec.heading) shownParts.push(sec.heading);
    shownParts.push(...sec.items);
  }
  const shown = speechWords(shownParts.join(' '));
  const { text, segments } = buildExplainSpeech(group);
  assert.ok(segments.length >= 1, 'al menos un segmento');
  const spoken = speechWords(segments.map((s) => s.ssml.replace(/<break[^>]*>/g, ' ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')).join(' '));
  assert.equal(spoken, shown, 'lo leído coincide con lo mostrado, incluidos roles y ajustes');
  assert.equal(speechWords(text), shown, 'el texto plano (fallback del dispositivo) coincide');
  const breaks = segments.reduce((a, s) => a + (s.ssml.match(/<break/g) || []).length, 0);
  assert.ok(breaks >= 5, 'debe haber varias pausas: ' + breaks);
  for (const s of segments) assert.match(s.ssml, /^<speak>.*<\/speak>$/s, 'SSML bien formado');
});

test('explicación: con todos los roles se trocea en segmentos que caben en la API (≤5000 bytes)', () => {
  const all = Object.keys(ROLES).filter((id) => id !== 'hombre_lobo' && id !== 'aldeano');
  const { segments } = buildExplainSpeech({ currentGame: 'hombres_lobo', extraRoles: all, settings: { revealDead: true, showComposition: true, alguacil: true } });
  assert.ok(segments.length >= 2, 'con muchos roles debe haber varios segmentos: ' + segments.length);
  for (const s of segments) assert.ok(Buffer.byteLength(s.ssml, 'utf8') <= 5000, 'cada segmento cabe en la API');
});

test('resolveVote: linchar a un enamorado mata a su pareja de amor y lo registra para la voz', () => {
  const players = mkPlayers(['hombre_lobo', 'aldeano', 'vidente', 'bruja']);
  players[1].lover = true; players[2].lover = true; // aldeano y vidente, enamorados
  const game = mkGame({ phase: 'day', dayNum: 1, votesLeft: 1, revealDead: true });
  const res = resolveVote(game, players, players[1].id)!; // el pueblo lincha al aldeano enamorado
  assert.equal(res.gameUpdates.lastLynch?.name, 'J1', 'el linchado');
  assert.ok(res.gameUpdates.lastLoveDeath, 'debe registrarse la muerte por amor');
  assert.equal(res.gameUpdates.lastLoveDeath?.name, 'J2', 'la pareja muere de amor');
  assert.equal(res.players.find((p) => p.id === players[1].id)!.alive, false);
  assert.equal(res.players.find((p) => p.id === players[2].id)!.alive, false);
});

test('resolveVote: sin enamorados no hay muerte por amor', () => {
  const players = mkPlayers(['hombre_lobo', 'aldeano', 'vidente', 'bruja']);
  const game = mkGame({ phase: 'day', dayNum: 1, votesLeft: 1, revealDead: true });
  const res = resolveVote(game, players, players[1].id)!;
  assert.equal(res.gameUpdates.lastLoveDeath, null);
});

test('loveDeathLine: nombra a ambos y ofrece variedad', () => {
  const s = loveDeathLine('Ana', 'Beto', 'd1');
  assert.match(s, /Ana/); assert.match(s, /Beto/);
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(loveDeathLine('Ana', 'B' + i, 's'));
  assert.ok(seen.size >= 4, 'varias frases distintas: ' + seen.size);
});

test('aliveNeighbors: salta a los muertos en el círculo', () => {
  const ps = mkPlayers(['aldeano', 'aldeano', 'aldeano', 'aldeano', 'aldeano']);
  ps[1].alive = false; ps[4].alive = false;
  const n = aliveNeighbors(ps, 'p0');
  assert.deepEqual(n.map((x) => x.id).sort(), ['p2', 'p3']);
});

// ——— Partida completa simulada (integración del motor) ———
test('partida completa: los lobos devoran, el pueblo lincha, gana el pueblo', () => {
  const players = mkPlayers(['hombre_lobo', 'vidente', 'bruja', 'cazador', 'aldeano', 'aldeano']);
  const composition = { hombre_lobo: 1, vidente: 1, bruja: 1, cazador: 1, aldeano: 2 };
  let game = mkGame({ composition });
  let ps = players;

  // Noche 1
  game.steps = computeNightSteps(game, ps);
  assert.deepEqual(game.steps, ['durmiendo', 'vidente', 'lobos', 'bruja', 'amanecer']);
  game.acts = { videnteTarget: 'p0', wolfVictim: 'p4', brujaDone: true };
  const dawn1 = resolveDawn(game, ps);
  ps = dawn1.players;
  assert.equal(ps.find((p) => p.id === 'p4')!.alive, false);
  assert.equal(checkWinner(ps), null);

  // Día 1: linchan al lobo
  game = { ...game, phase: 'day', dayNum: 1, votesLeft: 1 };
  const vote = resolveVote(game, ps, 'p0')!;
  assert.equal(vote.winner, 'pueblo');
});

test('partida completa: la infección alcanza la paridad y los lobos ganan al alba', () => {
  const players = mkPlayers(['infecto', 'vidente', 'aldeano', 'aldeano', 'aldeano']);
  let game = mkGame({ composition: { infecto: 1, vidente: 1, aldeano: 3 } });
  // Noche 1: infectan a la vidente → 2 lobos vs 3 aldeanos, la partida sigue.
  game.acts = { wolfVictim: 'p1', infectoUsed: true, infectoDecided: true };
  const dawn = resolveDawn(game, players);
  const ps = dawn.players;
  assert.equal(checkWinner(ps), null);
  // Día: linchan a un aldeano → 2 lobos vs 2 aldeanos = paridad → victoria lobuna.
  game = { ...game, phase: 'day', dayNum: 1 };
  const v1 = resolveVote(game, ps, 'p2')!;
  assert.equal(v1.winner, 'lobos');
});
