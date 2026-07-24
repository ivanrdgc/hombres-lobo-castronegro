<script lang="ts">
  // Cuántas cartas quedan por robar y —si la mesa juega con el recuento de la
  // app— qué queda POR SALIR de cada una. Contar es media partida (B26·7: lo
  // público, en pantalla), así que la cuenta va hecha y en la pantalla donde se
  // decide, no escondida en un modal.
  // En MODO DIFÍCIL (B33) la tira desaparece: el mazo sigue diciendo cuánto le
  // queda, pero lo que ha salido está solo en los descartes de cada jugador
  // (justo encima), como en la mesa de verdad.
  import { CARD_INFO, VALUE } from '../cards';
  import type { Card } from '../cards';
  import { outCounts } from '../engine';
  import type { LoveLetterState } from '../types';

  const { game, track = true }: { game: LoveLetterState; track?: boolean } = $props();
  const out = $derived(outCounts(game));
  const ALL = Object.keys(CARD_INFO) as Card[];
</script>

<p class="lbl" data-a="ll-deck-left">
  🃏 <b>{game.deck.length}</b> por robar{track ? ' · lo que sigue sin salir:' : ''}
</p>
{#if track}
  <div class="strip">
    {#each ALL as c (c)}
      {@const left = CARD_INFO[c].count - out[c]}
      <span class="c {left ? '' : 'gone'}">{CARD_INFO[c].emoji}{VALUE[c]}<b>×{left}</b></span>
    {/each}
  </div>
{:else}
  <!-- El sitio donde la partida dice en qué modo se juega es justo aquel donde
       estaría lo que la app se calla. -->
  <p class="hard" data-a="ll-hard-mode">🧠 Modo difícil: la app no lleva la cuenta de lo que ha salido. Está ahí arriba, en los descartes de cada uno: míralos y acuérdate.</p>
{/if}

<style>
  .lbl { font-size: 0.82rem; color: var(--moon); font-weight: 700; margin: 10px 0 5px; line-height: 1.4; }
  /* Las 8, en rejilla de cuatro: se busca una carta por su sitio, no leyendo. */
  .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .c {
    font-size: 0.82rem; line-height: 1; padding: 6px 4px; border-radius: var(--r-1);
    background: var(--card2); border: 1px solid var(--border); white-space: nowrap; text-align: center;
  }
  .c b { font-weight: 700; color: var(--text); margin-left: 2px; }
  .c.gone { opacity: 0.45; text-decoration: line-through; }
  .hard { font-size: 0.8rem; color: var(--muted); margin: 0; line-height: 1.4; }
</style>
