<script lang="ts">
  import { app } from '../core/sync/store.svelte';

  // El body refleja el estado ocupado (bloquea toques repetidos vía CSS).
  $effect(() => {
    document.body.classList.toggle('busy', !!app.ui.busy);
  });
</script>

{#if app.ui.busy}
  <div class="toast">📡 Enviando…</div>
{:else if app.ui.lastOk}
  <div class="toast ok">✔️ Recibido</div>
{/if}
