// Historial legible de lo que un jugador VIO e HIZO durante la única noche. Se
// reconstruye desde game.acts + originalRole (la carta que le TOCÓ, que es la
// que decide qué hace de noche). Lo usan «Mi carta» (solo el propio jugador,
// durante la partida) y la pantalla final (el de todos). No revela nada que el
// jugador no supiera ya en su turno.
import { ROLES } from './roles';
import { nightIs } from './engine';
import type { GameState, RoleId } from './types';

export function playerHistory(game: GameState, pid: string): string[] {
  const acts = game.acts || {};
  const role = game.originalRole?.[pid];
  if (!role) return [];
  const rn = (r?: RoleId | null) => (r ? `${ROLES[r].emoji} ${ROLES[r].name}` : '¿?');
  const nm = (p: string) => game.names?.[p] || '¿?';
  const mates = (r: RoleId) => (game.playerIds || []).filter((o) => o !== pid && nightIs(game, o, r)).map(nm);
  const out: string[] = [];

  // El Doble actúa el primero: copia una carta y, si es instantánea, su acción.
  if (role === 'doble') {
    if (!acts.dobleTarget || !acts.dobleRole) { out.push('👯 No llegaste a copiar ninguna carta.'); return out; }
    const dr = acts.dobleRole;
    out.push(`👯 Miraste la carta de ${nm(acts.dobleTarget)}: era ${rn(dr)}. Te convertiste en ${rn(dr)}.`);
    if (acts.dobleView?.kind === 'player') out.push(`🔮 (como Vidente) Viste que ${nm(acts.dobleView.pid)} es ${rn(acts.dobleView.role)}.`);
    else if (acts.dobleView?.kind === 'center') out.push(`🔮 (como Vidente) En el centro viste: ${acts.dobleView.roles.map((r) => rn(r)).join(', ')}.`);
    if (acts.dobleCard != null) out.push(`🃏 (como Ladrón) Robaste una carta y pasaste a ser ${rn(acts.dobleCard)}.`);
    if (dr === 'alborotadora' && acts.dobleActed) out.push('🌀 (como Alborotadora) Intercambiaste las cartas de otros dos, sin mirarlas.');
    if (dr === 'borracho' && acts.dobleActed) out.push('🍺 (como Borracho) Cambiaste tu carta por una del centro, a ciegas.');
    if (dr === 'lobo') { const m = mates('lobo'); out.push(m.length ? `🐺 (como Lobo) Tu manada: ${m.join(', ')}.` : '🐺 (como Lobo) No había otro lobo despierto.'); }
    if (dr === 'mason') { const m = mates('mason'); out.push(m.length ? `🧱 (como Masón) La otra hermandad: ${m.join(', ')}.` : '🧱 (como Masón) No había otro masón despierto.'); }
    if (dr === 'esbirro') { const w = mates('lobo'); out.push(w.length ? `😈 (como Esbirro) Los lobos son: ${w.join(', ')}.` : '😈 (como Esbirro) No había lobos despiertos.'); }
    if (dr === 'insomne') { const c = (acts.insomneCard || {})[pid]; if (c) out.push(`😴 (como Insomne) Al final tu carta era ${rn(c)}.`); }
    return out;
  }

  switch (role) {
    case 'lobo':
      if (acts.loneWolfCard != null) out.push(`🐺 Eras el único lobo. Miraste la carta ${(acts.loneWolfPeek ?? 0) + 1} del centro: ${rn(acts.loneWolfCard)}.`);
      else { const m = mates('lobo'); out.push(m.length ? `🐺 Reconociste a tu manada: ${m.join(', ')}.` : '🐺 Reconociste a la manada.'); }
      break;
    case 'esbirro': { const w = mates('lobo'); out.push(w.length ? `😈 Los hombres lobo son: ${w.join(', ')}.` : '😈 No había ningún lobo: ambas cartas estaban en el centro.'); break; }
    case 'mason': { const m = mates('mason'); out.push(m.length ? `🧱 La otra hermandad masónica: ${m.join(', ')}.` : '🧱 Eras el único masón: el otro estaba en el centro.'); break; }
    case 'vidente':
      if (acts.videnteView?.kind === 'player') out.push(`🔮 Miraste la carta de ${nm(acts.videnteView.pid)}: era ${rn(acts.videnteView.role)}.`);
      else if (acts.videnteView?.kind === 'center') out.push(`🔮 Miraste dos cartas del centro: ${acts.videnteView.roles.map((r) => rn(r)).join(', ')}.`);
      else out.push(acts.videnteDone ? '🔮 Decidiste no mirar ninguna carta.' : '🔮 No llegaste a mirar ninguna carta.');
      break;
    case 'ladron':
      if (acts.ladronTarget) out.push(`🃏 Robaste la carta de ${nm(acts.ladronTarget)}. Tu nueva carta: ${rn(acts.ladronCard)}.`);
      else out.push('🃏 No robaste ninguna carta: seguiste con la tuya.');
      break;
    case 'alborotadora':
      if (acts.alborotadoraPair) out.push(`🌀 Intercambiaste las cartas de ${nm(acts.alborotadoraPair[0])} y ${nm(acts.alborotadoraPair[1])}, sin mirarlas.`);
      else out.push('🌀 No intercambiaste ninguna carta.');
      break;
    case 'borracho':
      if (acts.borrachoCenter != null) out.push(`🍺 Cambiaste tu carta por la carta ${acts.borrachoCenter + 1} del centro, sin mirarla: ni tú sabes cuál tienes ahora.`);
      else out.push('🍺 Cambiaste tu carta por una del centro, a ciegas.');
      break;
    case 'insomne': { const c = (acts.insomneCard || {})[pid]; out.push(c ? `😴 Al final de la noche miraste tu carta: ${rn(c)}.` : '😴 Mirabas tu carta al final de la noche.'); break; }
    default:
      out.push('🌙 Tu carta no actúa de noche: dormiste plácidamente.');
  }
  return out;
}
