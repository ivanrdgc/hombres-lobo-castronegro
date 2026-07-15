<script lang="ts">
  import { app } from '../core/sync/store.svelte';
</script>

{#if app.flash}
  <div class="flash">
    {app.flash}
    <button class="small ghost" style="float:right" data-a="dismiss-flash" onclick={() => (app.flash = null)}>✕</button>
  </div>
{/if}
