<script lang="ts">
  // «Cómo se juega Codenames»: la guía larga, con un ▶️ de lectura por apartado
  // (solo fuera de partida; dentro, la voz está ocupada narrando).
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import Rules from '../Rules.svelte';

  const canPlay = $derived(viewGroup()?.status !== 'playing');
</script>

<h3 style="margin:0 0 4px">🕵️ Cómo se juega Codenames</h3>
<Rules audio={canPlay} />
<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
