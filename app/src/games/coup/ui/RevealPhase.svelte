<script lang="ts">
  // Reparto de Coup: cada cual mira sus DOS influencias y confirma. Cuando todos
  // han confirmado, cualquiera arranca (empieza el jugador que marca la app).
  import { app } from '../../../core/sync/store.svelte';
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

<div class="narration">🃏 Coup. Cada uno esconde dos influencias. Mira tus cartas sin que nadie vea tu pantalla: son tu vida en la corte.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <div class="card">
      <h3 style="margin-top:0">🎴 Tus dos influencias</h3>
      {#each myCards as card, i (i)}
        <div class="revcard"><b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b><span>{CHARACTERS[card.char].power}</span></div>
      {/each}
      <button class="primary block" data-a="coup-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo</button>
    </div>
  {:else}
    <div class="card"><p class="small-note">🎴 Tus cartas están listas. Míralas a solas y confirma.</p>
      <button class="primary block" data-a="coup-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mis influencias</button></div>
  {/if}
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else}
  <div class="card"><h3>▶️ Todos listos</h3>
    <p class="small-note">Empieza <b>{starterName}</b>. A partir de ahí, por turnos alrededor de la mesa.</p>
    <button class="primary block" data-a="coup-begin" onclick={() => guard(A.beginPlay)}>▶️ Empezar</button></div>
{/if}

<style>
  .revcard { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; margin: 8px 0; border-radius: 10px; background: #1e2236; border: 1px solid var(--line, #2a2f45); }
  .revcard span { font-size: 0.82rem; color: var(--muted, #97a); }
</style>
