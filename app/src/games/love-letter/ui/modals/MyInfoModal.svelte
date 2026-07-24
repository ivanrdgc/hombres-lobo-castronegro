<script lang="ts">
  // El flotante 📖 de Love Letter son LAS REGLAS: qué hace cada carta y cómo se
  // gana. Tu mano ya está siempre en la pantalla de partida (B28 · postura de
  // mano) y aquí no se vuelve a enseñar (B34·4). El recuento de lo que ha salido
  // solo aparece si la mesa juega con él (B33).
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
  const track = $derived((g?.settings || {}).llTrack !== false);
  // Cuántas copias de cada carta han salido ya: es público y contarlas ES el
  // juego… salvo en modo difícil, donde contar vuelve a ser cosa tuya.
  const out = $derived(game ? outCounts(game) : null);
  const rows = $derived((Object.keys(CARD_INFO) as Card[]).map((c) => ({
    emoji: CARD_INFO[c].emoji, name: `${CARD_INFO[c].name} (${VALUE[c]})`,
    note: copiesNote(c, out ? out[c] : 0, track && !!out),
    desc: CARD_INFO[c].short,
  })));
</script>

{#if game}
  <!-- El mismo nombre que la pastilla flotante que lo abre (B34·3). -->
  <h3 style="margin:0 0 6px">📖 Las reglas</h3>
  <!-- Un dato, un sitio (B29·1): tu mano, los descartes y el recuento ya están en
       la pantalla de partida. Aquí solo lo que allí no cabe: cómo se gana la
       ronda y qué hace cada carta. -->
  <p class="lead" data-a="ll-rules-lead">Gana la ronda quien quede en pie o tenga la carta más alta al agotarse el mazo. Siempre queda <b>1 carta apartada</b> que nadie verá.</p>
  {#if !track}
    <p class="lead" data-a="ll-hard-note">🧠 Jugáis en <b>modo difícil</b>: la app no lleva la cuenta de lo que ya ha salido. Abajo tienes cuántas copias trae el mazo de cada carta; el resto, en los descartes de la mesa.</p>
  {/if}
  {#if inGame && !hand.length}
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
