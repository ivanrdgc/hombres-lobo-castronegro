<script lang="ts">
  // Alguien debe descubrir (perder) una influencia. Solo el afectado elige cuál
  // de sus cartas ocultas revela; los demás esperan.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { CHARACTERS } from '../chars';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const loser = $derived(game.losing[0]?.pid || null);
  const mine = $derived(loser === my.id);
  const reasonTxt: Record<string, string> = {
    golpe: 'por el golpe de Estado', asesinato: 'por el asesinato',
    desafio: 'por perder el desafío', bloqueo: 'por el bloqueo mentiroso',
  };
  const reason = $derived(game.losing[0] ? reasonTxt[game.losing[0].reason] : '');
  // Índices de las cartas AÚN ocultas (las que puede descubrir).
  const options = $derived((game.hands[my.id] || []).map((h, i) => ({ ...h, i })).filter((x) => !x.lost));
</script>

{#if mine}
  <div class="narration">💥 Pierdes una influencia {reason}. Elige qué carta descubres (queda fuera de juego).</div>
  <div class="actionpanel">
    {#each options as card (card.i)}
      <button class="loseopt block" data-a="coup-lose" data-p={String(card.i)} onclick={() => guard(() => A.chooseLoss(card.i))}>
        <b>{CHARACTERS[card.char].emoji} {CHARACTERS[card.char].name}</b>
        <span>{CHARACTERS[card.char].power}</span>
      </button>
    {/each}
  </div>
{:else}
  <div class="narration">💥 <b>{game.names[loser || ''] || '¿?'}</b> tiene que descubrir una influencia {reason}…</div>
{/if}

<style>
  .loseopt { display: flex; flex-direction: column; gap: 2px; text-align: left; }
  .loseopt span { font-size: 0.8rem; opacity: 0.8; font-weight: 400; }
</style>
