<script lang="ts">
  // Reparto de Coup: cada cual ve sus DOS influencias y confirma. Juego de MANO
  // (B28): las cartas salen directas, sin «👁 Ver mis influencias» —el móvil ya
  // está mirando hacia ti y no se va a soltar en toda la partida—. Cuando todos
  // han confirmado, cualquiera arranca (empieza el jugador que marca la app).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { CHARACTERS } from '../chars';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
  const starterName = $derived(game.names[game.playerIds[game.turnIdx]] || '¿?');
  const myCards = $derived(game.hands[my.id] || []);
</script>

<div class="narration">🃏 Se reparte la corte de Castronegro. Sujeta el móvil mirando a ti: nadie más debe ver tu pantalla en toda la partida.</div>

{#if inGame && !game.seen[my.id]}
  <div class="card" data-a="coup-deal">
    <h3 style="margin-top:0">🎴 Tu mano: dos influencias</h3>
    {#each myCards as card, i (i)}
      <div class="revcard"><b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b><span>{CHARACTERS[card.char].power}</span></div>
    {/each}
    <p class="small-note">Se quedan a la vista el resto de la partida: no tendrás que pedirlas cada vez.</p>
    <button class="primary block" data-a="coup-seen" onclick={() => guard(A.confirmSeen)}>✅ Lo tengo</button>
  </div>
{:else if pend.length}
  <div class="waitlist">⏳ Falta por confirmar: {pend.join(', ')}</div>
{:else}
  <!-- El botón nombra la consecuencia y ya no se llama como el «Empezar partida»
       del lobby, que hace otra cosa (B29·4). -->
  <div class="card"><h3 style="margin-top:0">▶️ Todos han visto su mano</h3>
    <p class="small-note" style="margin-top:0">Después se juega por turnos, en el orden de la mesa. Puede arrancar cualquiera.</p>
    <button class="primary block" data-a="coup-begin" onclick={() => guard(A.beginPlay)}>▶️ Que empiece {starterName}</button></div>
{/if}

<style>
  .revcard { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; margin: 8px 0; border-radius: 10px; background: #1e2236; border: 1px solid var(--line, #2a2f45); }
  .revcard span { font-size: 0.82rem; color: var(--muted, #97a); }
</style>
