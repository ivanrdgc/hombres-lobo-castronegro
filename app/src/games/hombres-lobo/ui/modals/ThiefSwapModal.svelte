<script lang="ts">
  // El máster aplica el cambio del Ladrón: enseña las dos cartas del centro
  // (port de thiefSwapModal de la v1).
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { ROLES } from '../../roles';
  import type { RoleId } from '../../roles';

  const pid = $derived(String(app.ui.modal?.pid ?? ''));
  const p = $derived(app.players.find((x) => x.id === pid));
  const cc = $derived(app.group?.game?.centerCards || []);

  const def = (r: RoleId | null | undefined) => (r ? ROLES[r] : undefined);

  function pick(idx: number) {
    const id = pid;
    app.ui.modal = null;
    void guard(() => A.manualSwapRole(id, idx));
  }
</script>

{#if p}
  <h3>🃏 El Ladrón: {p.name}</h3>
  <p class="small-note">Enséñale las dos cartas del centro. Si elige una, su carta actual ({def(p.role)?.emoji || ''} {def(p.role)?.name || ''}) pasa al centro.</p>
  <div class="centercards">
    {#each cc as card, i (i)}
      <div
        class="cc"
        data-a="thief-swap-pick"
        data-p="{pid}:{i}"
        onclick={() => pick(i)}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') pick(i); }}
      >
        <div style="font-size:2rem">{def(card)?.emoji || '❔'}</div><b>{def(card)?.name || card}</b>
        <div class="small-note">{def(card)?.desc || ''}</div>
      </div>
    {/each}
  </div>
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✋ Se queda su carta</button>
{/if}
