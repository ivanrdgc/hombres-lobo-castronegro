<script lang="ts">
  // Cómo se juega Una Noche + lista de roles (orden de la noche), con lectura en
  // voz alta local (▶️) del cómo-se-juega y de cada rol, como en el original.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLES, ACTION_ROLES } from '../../roles';
  import { HOW_TO } from '../../texts';
  import type { RoleId } from '../../types';

  const NIGHT = ACTION_ROLES;
  const PASSIVE: RoleId[] = ['aldeano', 'cazador', 'tanner'];
  // Fuera de partida (el lobby): leer en voz alta no delata nada.
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const keyOf = (i: number) => 'una-howto:' + i;

  // Salta al detalle guardando el scroll: al volver, este modal se restaura
  // donde estaba (B12; mismo patrón que Roles/Explicación de Los HL).
  function openDetail(r: RoleId) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'una-role-detail', role: r, back: 'una-help', backScroll: scroll };
  }
</script>

<h3 style="margin:0 0 4px">🌘 Cómo se juega Una Noche</h3>

{#each HOW_TO as sec, i (i)}
  {@const st = localAudioState(keyOf(i))}
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
    <h3 style="flex:1;margin:0;font-size:1.02rem">{sec.heading}</h3>
    {#if canPlay}
      {#if st === 'playing'}
        <button class="small ghost" data-a="una-play-howto" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech(keyOf(i), [])}>⏹️</button>
      {:else if st === 'loading'}
        <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
      {:else}
        <button class="small ghost" data-a="una-play-howto" data-p={String(i)} aria-label="Escuchar este apartado" title="Escuchar" style="font-size:1.05rem;line-height:1" onclick={() => toggleLocalSpeech(keyOf(i), sec.items)}>▶️</button>
      {/if}
    {/if}
  </div>
  {#each sec.items as it, j (j)}<p class="small-note" style="margin:7px 0">{it}</p>{/each}
{/each}

<h3 style="margin-top:16px">🌙 Orden de la noche</h3>
<p class="small-note" style="margin-top:2px">Toca un rol para ver en detalle cómo funciona.</p>
<div class="chips" style="margin-top:6px">
  {#each NIGHT as r (r)}
    <button class="chip rolechip" data-a="una-role" data-p={r} onclick={() => openDetail(r)}>{ROLES[r].emoji} {ROLES[r].name}</button>
  {/each}
</div>

<h3 style="margin-top:14px">🛌 Sin acción de noche</h3>
<div class="chips" style="margin-top:6px">
  {#each PASSIVE as r (r)}
    <button class="chip rolechip" data-a="una-role" data-p={r} onclick={() => openDetail(r)}>{ROLES[r].emoji} {ROLES[r].name}</button>
  {/each}
</div>

<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
