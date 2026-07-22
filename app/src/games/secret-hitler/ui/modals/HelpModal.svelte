<script lang="ts">
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLE_LABEL } from '../../roles';
  import type { RoleId } from '../../roles';
  import { HOW_TO } from '../../texts';

  const ROLES_LIST: RoleId[] = ['liberal', 'fascist', 'hitler'];
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const howto = $derived(localAudioState('sh-howto'));
  const howtoText = HOW_TO.flatMap((s) => [s.heading.replace(/^[^ ]+ /, ''), ...s.items]);

  function openDetail(r: RoleId) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'sh-role-detail', role: r, back: 'sh-help', backScroll: scroll };
  }
</script>

<div style="display:flex;align-items:center;gap:8px">
  <h3 style="flex:1;margin:0">🏛️ Cómo se juega</h3>
  {#if canPlay}
    {#if howto === 'playing'}
      <button class="small ghost" data-a="sh-play-howto" title="Detener" onclick={() => toggleLocalSpeech('sh-howto', [])}>⏹️</button>
    {:else if howto === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="sh-play-howto" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('sh-howto', howtoText)}>▶️</button>
    {/if}
  {/if}
</div>
{#each HOW_TO as sec (sec.heading)}
  <h3 style="margin-top:14px">{sec.heading}</h3>
  {#each sec.items as it, i (i)}<p class="small-note" style="margin:7px 0">• {it}</p>{/each}
{/each}

<h3 style="margin-top:14px">🎭 Los roles</h3>
<div class="chips" style="margin-top:6px">
  {#each ROLES_LIST as r (r)}<button class="chip rolechip" data-a="sh-role" data-p={r} onclick={() => openDetail(r)}>{r === 'hitler' ? '💀' : r === 'fascist' ? '🐷' : '🕊️'} {ROLE_LABEL[r].replace(/^[^ ]+ /, '')}</button>{/each}
</div>

<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
