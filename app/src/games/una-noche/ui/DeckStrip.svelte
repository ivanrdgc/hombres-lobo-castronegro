<script lang="ts">
  // Tira de «Cartas en juego» durante la partida. En Una Noche la composición
  // del mazo es PÚBLICA (todos saben qué roles hay: es la base de la deducción),
  // así que se muestran TODAS las cartas del mazo. Se toca una y abre su detalle
  // (qué hace y cómo se juega), igual que la tira de Los Hombres Lobo.
  import { app } from '../../../core/sync/store.svelte';
  import { ROLES, CENTER_COUNT } from '../roles';
  import type { GameState, RoleId } from '../types';

  const { game }: { game: GameState } = $props();

  const list = $derived(
    (Object.entries(game.composition || {}) as [RoleId, number][])
      .filter(([id, n]) => n > 0 && !!ROLES[id]),
  );
  const open = (id: RoleId) => (app.ui.modal = { type: 'una-role-detail', role: id });
</script>

{#if list.length}
  <div class="card">
    <h3>🎴 Cartas en juego</h3>
    <div class="chips">
      {#each list as [id, n] (id)}
        <button class="chip rolechip" data-a="una-ingame-role" data-p={id} onclick={() => open(id)}>{ROLES[id].emoji} {ROLES[id].name}{n > 1 ? ` ×${n}` : ''}</button>
      {/each}
    </div>
    <p class="small-note">La composición es pública: estas son todas las cartas ({CENTER_COUNT} están en el centro). Toca una para ver cómo funciona.</p>
  </div>
{/if}
