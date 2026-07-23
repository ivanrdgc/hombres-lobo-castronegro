// Catálogo, reparto y tablero de «Secret Hitler» (Secret Hitler). Módulo
// puro (testeable en Node). La app hace de máster OCULTO: reparte roles, calcula
// el conocimiento nocturno, y más adelante barajará el mazo de decretos y los
// poderes presidenciales sin que nadie manosee cartas físicas.

export type Faction = 'liberal' | 'fascist';
export type RoleId = 'liberal' | 'fascist' | 'hitler';
export type PolicyId = 'liberal' | 'fascist';
export type PowerType = 'peek' | 'investigate' | 'special' | 'execution';

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

export const ROLE_LABEL: Record<RoleId, string> = {
  liberal: '🕊️ Liberal',
  fascist: '🐷 Fascista',
  hitler: '💀 Hitler',
};

/** Facción del rol (Hitler cuenta como fascista a efectos de bando). */
export function factionOf(r: RoleId): Faction {
  return r === 'liberal' ? 'liberal' : 'fascist';
}

/** Nº de fascistas SIN contar a Hitler, según las reglas oficiales. */
export function fascistCountFor(n: number): number {
  if (n <= 6) return 1;
  if (n <= 8) return 2;
  return 3;
}

/** Con 5-6 jugadores, Hitler conoce a su fascista; con 7+, no sabe quiénes son. */
export function hitlerKnowsFascists(n: number): boolean {
  return n <= 6;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Baraja determinista por semilla (para rebarajar el mazo de descartes). */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  return shuffled(arr, mulberry32(seed >>> 0));
}

export interface DealResult {
  roles: Record<string, RoleId>;
}

/** Reparte 1 Hitler, `fascistCountFor(n)` fascistas y el resto liberales. */
export function dealRoles(players: { id: string; order?: number }[], seed: number): DealResult {
  const rnd = mulberry32(seed);
  const n = players.length;
  const fas = fascistCountFor(n);
  const deck: RoleId[] = ['hitler'];
  for (let i = 0; i < fas; i++) deck.push('fascist');
  while (deck.length < n) deck.push('liberal');
  const dealt = shuffled(deck, rnd);
  const seated = players.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const roles: Record<string, RoleId> = {};
  seated.forEach((p, i) => { roles[p.id] = dealt[i]; });
  return { roles };
}

/** Lo que ve cada jugador en su carta (calculado en oculto por la app). */
export type Knowledge =
  | { kind: 'fascist-team'; fascists: string[]; hitler: string } // fascista: ve a los suyos y a Hitler
  | { kind: 'hitler-knows'; fascists: string[] } // Hitler con 5-6: ve a su fascista
  | { kind: 'hitler-blind' } // Hitler con 7+: no sabe quiénes son
  | { kind: 'liberal' }; // liberal: nada

export function knowledgeOf(roles: Record<string, RoleId>, playerIds: string[], pid: string): { role: RoleId; faction: Faction; knows: Knowledge } {
  const role = roles[pid];
  const faction = factionOf(role);
  const n = playerIds.length;
  const fascists = playerIds.filter((p) => roles[p] === 'fascist');
  const hitler = playerIds.find((p) => roles[p] === 'hitler') || '';
  let knows: Knowledge;
  if (role === 'fascist') knows = { kind: 'fascist-team', fascists: fascists.filter((p) => p !== pid), hitler };
  else if (role === 'hitler') knows = hitlerKnowsFascists(n) ? { kind: 'hitler-knows', fascists } : { kind: 'hitler-blind' };
  else knows = { kind: 'liberal' };
  return { role, faction, knows };
}

// ——— Tablero de poderes presidenciales por tramo de jugadores ———
// Clave: nº de decreto FASCISTA recién promulgado (1..5) → poder que dispara.
const POWERS_56: Record<number, PowerType | undefined> = { 3: 'peek', 4: 'execution', 5: 'execution' };
const POWERS_78: Record<number, PowerType | undefined> = { 2: 'investigate', 3: 'special', 4: 'execution', 5: 'execution' };
const POWERS_910: Record<number, PowerType | undefined> = { 1: 'investigate', 2: 'investigate', 3: 'special', 4: 'execution', 5: 'execution' };

/** Poder que dispara promulgar el `fascistPolicies`-ésimo decreto fascista. */
export function powerFor(n: number, fascistPolicies: number): PowerType | null {
  const table = n <= 6 ? POWERS_56 : n <= 8 ? POWERS_78 : POWERS_910;
  return table[fascistPolicies] ?? null;
}

export const LIBERAL_TRACK = 5; // 5 decretos liberales → ganan los liberales
export const FASCIST_TRACK = 6; // 6 decretos fascistas → ganan los fascistas
export const VETO_AT = 5; // con 5 decretos fascistas se desbloquea el veto

/** Mazo inicial de decretos: 6 liberales + 11 fascistas, barajado. */
export function newDeck(seed: number): PolicyId[] {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const deck: PolicyId[] = [];
  for (let i = 0; i < 6; i++) deck.push('liberal');
  for (let i = 0; i < 11; i++) deck.push('fascist');
  return shuffled(deck, rnd);
}
