<script lang="ts">
  // El 🎴 de Love Letter es la REFERENCIA del mazo. Tu mano ya está siempre en la
  // pantalla de partida (B28 · postura de mano), así que aquí no hace falta
  // volver a destaparla: lo que se viene a consultar es qué hace cada carta,
  // cuántas hay y cuántas siguen sin salir. Se abre en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { loveLetterGame, outCounts } from '../../actions';
  import { CARD_INFO, VALUE, copiesNote } from '../../cards';
  import type { Card } from '../../cards';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? loveLetterGame(g) : null);
  const my = $derived(me());
  const hand = $derived(game && my ? (game.hands[my.id] || []) : []);
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  // Cuántas copias de cada carta han salido ya: es público y contarlas ES el
  // juego, así que la app lo lleva por ti.
  const out = $derived(game ? outCounts(game) : null);
  const rows = $derived((Object.keys(CARD_INFO) as Card[]).map((c) => ({
    emoji: CARD_INFO[c].emoji, name: `${CARD_INFO[c].name} (${VALUE[c]})`,
    note: out ? copiesNote(c, out[c]) : `${CARD_INFO[c].count} en el mazo`,
    desc: CARD_INFO[c].short,
  })));
</script>

{#if game}
  <h3 style="margin:0 0 6px">🎴 El mazo, carta a carta</h3>
  <p class="lead" data-a="ll-out-counts">🃏 Quedan <b>{game.deck.length}</b> por robar y 1 apartada que nadie verá{game.asideUp.length ? `, y estas están fuera de la ronda boca arriba: ${game.asideUp.map((c) => CARD_INFO[c].name).join(', ')}` : ''}. Gana la ronda quien quede en pie o tenga la carta más alta al agotarse el mazo.</p>
  {#if inGame && hand.length}
    <p class="lead">🖐 En tu mano: <b>{hand.map((c) => `${CARD_INFO[c].emoji} ${CARD_INFO[c].name} (${VALUE[c]})`).join(' y ')}</b> — la tienes siempre a la vista en la pantalla de partida.</p>
  {:else if inGame}
    <p class="lead">❌ Estás fuera de ESTA ronda: en la siguiente se reparte otra vez y vuelves a jugar.</p>
  {/if}
  <div class="refwrap"><RefRows title="🃏 Las 8 cartas (16 en total)" {rows} /></div>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>

<style>
  /* Nada esencial por debajo de 0,8 rem (B26·9): el efecto de cada carta es lo
     más leído de este modal. */
  .lead { font-size: 0.88rem; color: var(--muted); margin: 8px 0; line-height: 1.45; }
  .refwrap :global(.sdesc) { font-size: 0.85rem; }
</style>
