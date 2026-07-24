<script lang="ts">
  // Cómo se juega Ávalon: guía paso a paso, con un ▶️ de lectura en voz alta en
  // CADA apartado (solo en el lobby), y los roles clicables → detalle.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLES } from '../../roles';
  import type { RoleId } from '../../roles';
  import { HOW_TO } from '../../texts';

  const GOOD: RoleId[] = ['merlin', 'percival', 'servant'];
  const EVIL: RoleId[] = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'];
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const keyOf = (i: number) => 'av-howto:' + i;

  function openDetail(r: RoleId) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'av-role-detail', role: r, back: 'av-help', backScroll: scroll };
  }
</script>

<!-- Mismo rótulo que el botón que lo abre (vocabulario estable, B29). -->
<h3 style="margin:0 0 4px">🎲 Cómo se juega</h3>

{#each HOW_TO as sec, i (i)}
  {@const st = localAudioState(keyOf(i))}
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
    <h3 style="flex:1;margin:0;font-size:1.02rem">{sec.heading}</h3>
    {#if canPlay}
      {#if st === 'playing'}
        <button class="small ghost" data-a="av-play-howto" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech(keyOf(i), [])}>⏹️</button>
      {:else if st === 'loading'}
        <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
      {:else}
        <button class="small ghost" data-a="av-play-howto" data-p={String(i)} aria-label="Escuchar este apartado" title="Escuchar" style="font-size:1.05rem;line-height:1" onclick={() => toggleLocalSpeech(keyOf(i), [sec.heading, ...sec.items])}>▶️</button>
      {/if}
    {/if}
  </div>
  {#each sec.items as it, j (j)}<p class="small-note" style="margin:7px 0">{it}</p>{/each}
{/each}

<h3 style="margin-top:16px">🏰 Roles del Bien</h3>
<div class="chips" style="margin-top:6px">
  {#each GOOD as r (r)}<button class="chip rolechip" data-a="av-role" data-p={r} onclick={() => openDetail(r)}>{ROLES[r].emoji} {ROLES[r].name}</button>{/each}
</div>
<h3 style="margin-top:14px">🗡️ Roles del Mal</h3>
<div class="chips" style="margin-top:6px">
  {#each EVIL as r (r)}<button class="chip rolechip" data-a="av-role" data-p={r} onclick={() => openDetail(r)}>{ROLES[r].emoji} {ROLES[r].name}</button>{/each}
</div>

<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
