<script lang="ts">
  // Lo que abre la pastilla flotante. Codenames es un juego de EQUIPO, así que
  // aquí manda la puerta única (B34): tu papel y tu mapa VIVEN en la pantalla
  // de la partida, y este modal no los repite — es solo «las reglas».
  //
  // Dos alturas: las filas de referencia (lo que se consulta a media jugada, y
  // son las MISMAS que se pliegan dentro del panel de acción) y, plegado
  // debajo, «cómo se juega» entero, que dentro de la partida no tenía ninguna
  // otra puerta.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { codenamesGame } from '../../actions';
  import { boardRef } from '../../texts';
  import RefRows from '../../../../shell/RefRows.svelte';
  import Rules from '../Rules.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? codenamesGame(g) : null);
  const rows = $derived(game ? boardRef(game) : []);
</script>

{#if game}
  <RefRows title="📖 Las reglas" {rows} />
  <details class="cnall">
    <summary data-a="cn-all-rules">🎲 Cómo se juega, apartado por apartado</summary>
    <Rules />
  </details>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>

<style>
  .cnall { margin-top: 14px; border-top: 1px solid var(--border, #2c3047); }
  .cnall summary { cursor: pointer; font-size: 0.85rem; color: var(--muted, #a9a6c0); padding: 12px 0; }
</style>
