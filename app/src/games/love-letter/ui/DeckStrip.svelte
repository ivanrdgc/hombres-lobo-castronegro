<script lang="ts">
  // Lo que queda POR SALIR de cada carta y cuántas quedan por robar. Contar es
  // media partida (B26·7: lo público, en pantalla), así que la cuenta va hecha y
  // en la pantalla donde se decide, no escondida en un modal.
  import { CARD_INFO, VALUE } from '../cards';
  import type { Card } from '../cards';
  import { outCounts } from '../engine';
  import type { LoveLetterState } from '../types';

  const { game }: { game: LoveLetterState } = $props();
  const out = $derived(outCounts(game));
  const ALL = Object.keys(CARD_INFO) as Card[];
</script>

<p class="lbl" data-a="ll-deck-left">
  🃏 <b>{game.deck.length}</b> por robar · lo que sigue sin salir:
</p>
<div class="strip">
  {#each ALL as c (c)}
    {@const left = CARD_INFO[c].count - out[c]}
    <span class="c {left ? '' : 'gone'}">{CARD_INFO[c].emoji}{VALUE[c]}<b>×{left}</b></span>
  {/each}
</div>

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
</style>
