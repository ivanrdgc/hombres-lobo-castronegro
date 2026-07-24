<script lang="ts">
  // Fase de pista: el Jefe del equipo de turno introduce palabra (opcional) +
  // número; el resto espera. El tablero se ve arriba (los Jefes con el mapa).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my }: { game: CodenamesState; my: PlayerDoc } = $props();
  const iAmSpy = $derived(game.spymaster[game.turn] === my.id);
  const spyName = $derived(game.names[game.spymaster[game.turn]] || '¿?');
  let word = $state('');
  let num = $state(1);
</script>

{#if iAmSpy}
  <div class="actionpanel"><h3>💬 Tu pista (Jefe {game.turn === 'red' ? '🔴' : '🔵'})</h3>
    <p class="hint">Una palabra que relacione tus casillas y un número (cuántas). Dila también en voz alta.</p>
    <input id="cn-clue-word" class="block" data-a="cn-clue-word" bind:value={word} maxlength="24" placeholder="Palabra de la pista (p. ej. «fuego»)" autocomplete="off" />
    <div class="btnrow" style="margin-top:8px;flex-wrap:wrap">
      {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as k (k)}
        <button class="small {num === k ? 'primary' : 'ghost'}" data-a="cn-clue-num" data-p={String(k)} onclick={() => (num = k)}>{k}</button>
      {/each}
    </div>
    <button class="primary block" style="margin-top:8px" data-a="cn-clue-give" onclick={() => guard(() => A.giveClue(word, num))}>💬 Dar la pista{word ? ` «${word}»` : ''} · {num}</button>
  </div>
{:else}
  <div class="narration">💬 El Jefe {game.turn === 'red' ? '🔴 rojo' : '🔵 azul'} <b>{spyName}</b> está preparando su pista…</div>
{/if}
