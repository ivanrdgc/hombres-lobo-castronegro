<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu lealtad (con lo que sabes) y los
  // roles EN JUEGO de esta partida. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { avalonGame } from '../../actions';
  import { ROLES } from '../../roles';
  import type { RoleId } from '../../roles';
  import RefRows from '../../../../shell/RefRows.svelte';
  import RoleCard from '../RoleCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? avalonGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = $derived(game
    ? [...new Set(Object.values(game.roles))].map((r) => ({
      emoji: ROLES[r as RoleId].emoji,
      name: ROLES[r as RoleId].name,
      note: ROLES[r as RoleId].team === 'good' ? 'Bien' : 'Mal',
      desc: ROLES[r as RoleId].desc,
    }))
    : []);
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <RoleCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="🎭 Roles en juego" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
