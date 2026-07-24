<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta INICIAL (recuerda: pudo
  // cambiar) y el mazo completo de la partida. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { unaNocheGame } from '../../actions';
  import { ROLES } from '../../roles';
  import type { RoleId } from '../../types';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? unaNocheGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = $derived(game
    ? (game.selectedRoles || []).map((r: RoleId) => ({
      emoji: ROLES[r].emoji,
      name: ROLES[r].name,
      note: `×${game.composition[r] || 0}`,
      desc: ROLES[r].desc,
    }))
    : []);
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta inicial</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="🃏 El mazo de esta partida (3 cartas quedan en el centro)" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
