<script lang="ts">
  // Menú del máster sobre un jugador en modo manual (port de manualPlayerModal
  // de la v1): muerte/vida, rol a pantalla completa, enamorado y Ladrón.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { ROLES } from '../../roles';

  const pid = $derived(String(app.ui.modal?.pid ?? ''));
  const p = $derived(app.players.find((x) => x.id === pid));
  const r = $derived(p?.role ? ROLES[p.role] : undefined);
  const game = $derived(app.group?.game);
  const hasCupido = $derived(((game?.composition || {}).cupido || 0) > 0);
  const hasCenter = $derived((game?.centerCards || []).length > 0);

  function toggleDead() {
    const id = pid;
    app.ui.modal = null;
    void guard(() => A.manualToggleDead(id));
  }
  function toggleLover() {
    const id = pid;
    app.ui.modal = null;
    void guard(() => A.manualToggleLover(id));
  }
</script>

{#if p}
  <h3>{r?.emoji || ''} {p.name} — {r?.name || ''}{p.lover ? ' 💘' : ''}{p.alive === false ? ' 💀' : ''}</h3>
  <p class="small-note">{r?.desc || ''}</p>
  <button class={p.alive ? 'danger block' : 'violet block'} data-a="manual-toggle-dead" data-p={p.id} onclick={toggleDead}>{p.alive ? '💀 Marcar como muerto' : '✨ Revivir'}</button>
  <button class="block" data-a="show-role-full" data-p={p.id} onclick={() => (app.ui.modal = { type: 'show-role', pid })}>👁 Mostrar su rol a pantalla completa</button>
  {#if hasCupido}
    <button class="block" data-a="manual-toggle-lover" data-p={p.id} onclick={toggleLover}>{p.lover ? '💔 Quitar la marca de enamorado' : '💘 Marcar como enamorado'}</button>
  {/if}
  {#if hasCenter}
    <button class="block" data-a="open-thief-swap" data-p={p.id} onclick={() => (app.ui.modal = { type: 'thief-swap', pid })}>🃏 Cambio de carta del Ladrón…</button>
  {/if}
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{/if}
