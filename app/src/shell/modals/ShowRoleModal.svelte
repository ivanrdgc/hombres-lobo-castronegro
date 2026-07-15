<script lang="ts">
  // Carta de un jugador a pantalla completa, para enseñársela a quien toque
  // (port de showRoleModal de la v1).
  import { app } from '../../core/sync/store.svelte';
  import { ROLES } from '../../games/hombres-lobo/roles';

  const pid = $derived(String(app.ui.modal?.pid ?? ''));
  const p = $derived(app.players.find((x) => x.id === pid));
  const r = $derived(p?.role ? ROLES[p.role] : undefined);
</script>

{#if p}
  <div class="rolecard" style="margin:24px 0;padding:34px 16px">
    <span class="remoji" style="font-size:5rem">{r?.emoji || '❔'}</span>
    <span class="rname" style="font-size:1.9rem">{r?.name || '—'}</span>
    <div class="rteam">{p.name}</div>
    <div class="rdesc">{r?.desc || ''}</div>
  </div>
  <button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Visto</button>
{/if}
