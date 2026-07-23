<script lang="ts">
  // Tus influencias (privadas): personajes que aún ocultas y tus monedas. Se
  // pliega y despliega con disimulo, como la carta de rol de los demás juegos.
  import { CHARACTERS } from '../chars';
  import type { CoupState } from '../types';

  const { game, pid }: { game: CoupState; pid: string } = $props();
  let open = $state(false);
  const cards = $derived(game.hands[pid] || []);
</script>

{#if !open}
  <div style="text-align:center;margin:8px 0">
    <button class="small ghost" data-a="coup-peek" onclick={() => (open = true)}>👁 Ver mis influencias</button>
  </div>
{:else}
  <div class="myhand" data-a="coup-myhand" role="button" tabindex="0"
    onclick={() => (open = false)} onkeydown={(e) => { if (e.key === 'Enter') open = false; }}>
    <div class="mhhead">🎴 Tus influencias · 🪙 {game.coins[pid] || 0}</div>
    <div class="mhcards">
      {#each cards as card, i (i)}
        {#if card.lost}
          <div class="mh lost">{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}<span>descubierta</span></div>
        {:else}
          <div class="mh"><b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b><span>{CHARACTERS[card.char].power}</span></div>
        {/if}
      {/each}
    </div>
    <p class="small-note" style="margin:6px 0 0">Solo tú ves esto. Toca para ocultar.</p>
  </div>
{/if}

<style>
  .myhand { border: 1px solid var(--accent, #d8a24a); border-radius: 12px; padding: 10px 12px; margin: 8px 0; background: var(--card, #171a2b); cursor: pointer; }
  .mhhead { font-weight: 700; margin-bottom: 8px; }
  .mhcards { display: flex; flex-direction: column; gap: 6px; }
  .mh { display: flex; flex-direction: column; gap: 1px; padding: 6px 10px; border-radius: 8px; background: #1e2236; }
  .mh span { font-size: 0.78rem; color: var(--muted, #97a); }
  .mh.lost { opacity: 0.55; text-decoration: line-through; }
</style>
