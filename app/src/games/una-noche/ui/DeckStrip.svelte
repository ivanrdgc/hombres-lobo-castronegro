<script lang="ts">
  // Tira de «Cartas en juego» durante la partida. En Una Noche la composición
  // del mazo es PÚBLICA (todos saben qué roles hay: es la base de la deducción),
  // así que se muestran TODAS las cartas del mazo, con el recuento por bando
  // —lo que en la mesa real está a la vista no se memoriza—. Se toca una y abre
  // su detalle (qué hace y cómo se juega), igual que la tira de Los Hombres Lobo.
  import { app } from '../../../core/sync/store.svelte';
  import { ROLES, CENTER_COUNT } from '../roles';
  import type { GameState, RoleId } from '../types';

  const { game }: { game: GameState } = $props();

  const list = $derived(
    (Object.entries(game.composition || {}) as [RoleId, number][])
      .filter(([id, n]) => n > 0 && !!ROLES[id])
      .sort((a, b) => (ROLES[a[0]].wake ?? 99) - (ROLES[b[0]].wake ?? 99)),
  );
  const total = $derived(list.reduce((a, [, n]) => a + n, 0));
  const teamN = (t: string) => list.filter(([id]) => ROLES[id].team === t).reduce((a, [, n]) => a + n, 0);
  const open = (id: RoleId) => (app.ui.modal = { type: 'una-role-detail', role: id });
</script>

{#if list.length}
  <div class="card">
    <h3>🎴 Las {total} cartas de esta partida</h3>
    <p class="small-note" style="margin:0 0 8px">{teamN('lobos')} 🐺 del bando lobo · {teamN('pueblo')} 🏡 del pueblo{#if teamN('tanner')} · {teamN('tanner')} 🪢 en solitario{/if}. {CENTER_COUNT} están en el centro y nadie sabe cuáles. Toca una para ver qué hace.</p>
    <div class="chips">
      {#each list as [id, n] (id)}
        <button class="chip rolechip" data-a="una-ingame-role" data-p={id} onclick={() => open(id)}>{ROLES[id].emoji} {ROLES[id].name}{n > 1 ? ` ×${n}` : ''} <span class="i">ℹ️</span></button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .rolechip .i { opacity: 0.65; font-size: 0.8em; }
</style>
