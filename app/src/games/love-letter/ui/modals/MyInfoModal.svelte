<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu mano actual y las 8 cartas del
  // mazo con copias, valores y efectos. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { loveLetterGame } from '../../actions';
  import { CARD_INFO, VALUE } from '../../cards';
  import type { Card } from '../../cards';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? loveLetterGame(g) : null);
  const my = $derived(me());
  const hand = $derived(game && my ? (game.hands[my.id] || []) : []);
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = $derived((Object.keys(CARD_INFO) as Card[]).map((c) => ({
    emoji: CARD_INFO[c].emoji, name: CARD_INFO[c].name,
    note: `valor ${VALUE[c]} · ${CARD_INFO[c].count} copia${CARD_INFO[c].count === 1 ? '' : 's'}`,
    desc: CARD_INFO[c].short,
  })));
</script>

{#if game}
  <h3 style="margin:0 0 4px">🎴 Tu mano</h3>
  {#if inGame && hand.length}
    {#each hand as c, i (i)}
      <div class="rolecard" style="margin:6px 0"><span class="remoji">{CARD_INFO[c].emoji}</span>
        <span class="rname">{CARD_INFO[c].name} ({VALUE[c]})</span>
        <div class="rdesc">{CARD_INFO[c].short}</div></div>
    {/each}
  {:else if inGame}
    <p class="small-note">Estás fuera de esta ronda (tus cartas ya se descartaron).</p>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <p class="small-note">🃏 Quedan <b>{game.deck.length}</b> cartas en el mazo · una apartada boca abajo{game.asideUp.length ? ` · boca arriba: ${game.asideUp.map((c) => CARD_INFO[c].name).join(', ')}` : ''}.</p>
  <RefRows title="🃏 Las 8 cartas del mazo (16 en total)" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
