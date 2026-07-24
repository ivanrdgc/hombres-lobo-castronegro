<script lang="ts">
  // Estado público de cada jugador: orden de turnos, favores, si está fuera o
  // protegido, y su PILA ENTERA de descartes (en la mesa real están todos a la
  // vista y contarlos es medio juego). Las manos son secretas: no salen aquí.
  import { CARD_INFO, VALUE } from '../cards';
  import type { LoveLetterState } from '../types';

  const { game, meId = null }: { game: LoveLetterState; meId?: string | null } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const pile = (pid: string) => game.discards[pid] || [];
</script>

<div class="llrow">
  {#each game.playerIds as pid, i (pid)}
    {@const d = pile(pid)}
    <div class="llp {game.turn === pid && game.phase === 'turn' ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="lln"><span class="llo">{i + 1}.</span> {game.alive[pid] ? '' : '❌ '}{game.protected[pid] ? '🛡️ ' : ''}{nm(pid)}{pid === meId ? ' (tú)' : ''}</div>
      <div class="llt">💌 {game.tokens[pid] || 0}<span class="llneed">/{game.need}</span></div>
      <div class="lld" data-a="ll-discards" data-p={pid} title={d.length ? d.map((c) => CARD_INFO[c].name).join(', ') : 'sin descartes'}>
        {#if d.length}{#each d as c, j (j)}<span class="llc">{CARD_INFO[c].emoji}{VALUE[c]}</span>{/each}{:else}sin descartes{/if}
      </div>
    </div>
  {/each}
</div>
<p class="small-note" style="margin:2px 0 0">🔢 El número es el orden de turnos · 💌 favores ganados de los {game.need} que hacen falta · debajo, TODO lo que ha descartado (emoji y valor). ❌ fuera de la ronda · 🛡️ protegido.</p>

<style>
  .llrow { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  /* 105 px de base: en un móvil de 360 px caben tres por fila sin partir nombres. */
  .llp { flex: 1 1 105px; min-width: 105px; padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); }
  .llp.active { border-color: #c86ab0; box-shadow: 0 0 0 1px #c86ab0 inset; }
  .llp.out { opacity: 0.55; }
  .lln { font-size: 0.85rem; font-weight: 700; overflow-wrap: anywhere; }
  .llo { opacity: 0.5; font-weight: 400; }
  .llt { font-size: 0.82rem; margin-top: 1px; }
  .llneed { color: var(--muted, #9aa); }
  /* Los descartes son información pública y de las más consultadas: 0,8 rem. */
  .lld { font-size: 0.8rem; color: var(--muted, #9aa); margin-top: 3px; display: flex; flex-wrap: wrap; gap: 4px; }
  .llc { white-space: nowrap; }
</style>
