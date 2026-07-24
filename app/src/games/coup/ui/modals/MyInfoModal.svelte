<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tus influencias ocultas, tus monedas
  // y la chuleta completa de personajes y acciones. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { coupGame } from '../../actions';
  import { CHARACTERS, CHAR_ORDER, ACTIONS } from '../../chars';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyHand from '../MyHand.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? coupGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const charRows = $derived(CHAR_ORDER.map((c) => ({
    emoji: CHARACTERS[c].emoji, name: CHARACTERS[c].name, note: '3 copias', desc: CHARACTERS[c].power,
  })));
  const actionRows = [
    { emoji: ACTIONS.renta.emoji, name: 'Renta', desc: ACTIONS.renta.short },
    { emoji: ACTIONS.ayuda.emoji, name: 'Ayuda exterior', desc: ACTIONS.ayuda.short },
    { emoji: ACTIONS.golpe.emoji, name: 'Golpe de Estado', note: 'obligatorio con 10+ monedas', desc: ACTIONS.golpe.short },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus influencias</h3>
  {#if inGame}
    <MyHand {game} pid={my.id} />
    <p class="small-note">🪙 Tienes <b>{game.coins[my.id] ?? 0}</b> monedas.</p>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin cartas propias.</p>
  {/if}
  <RefRows title="🎭 Los 5 personajes (corte de 15 cartas)" rows={charRows} />
  <RefRows title="🪙 Acciones sin personaje" rows={actionRows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
