<script lang="ts">
  // Cómo se juega Ávalon + los roles (clicables → detalle). Lectura en voz alta
  // local (▶️) del cómo-se-juega, solo en el lobby.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLES } from '../../roles';
  import type { RoleId } from '../../roles';
  import { HOW_TO } from '../../texts';

  const GOOD: RoleId[] = ['merlin', 'percival', 'servant'];
  const EVIL: RoleId[] = ['assassin', 'morgana', 'mordred', 'oberon', 'minion'];
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const howto = $derived(localAudioState('av-howto'));
  const howtoText = HOW_TO.flatMap((s) => [s.heading.replace(/^[^ ]+ /, ''), ...s.items]);

  function openDetail(r: RoleId) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'av-role-detail', role: r, back: 'av-help', backScroll: scroll };
  }
</script>

<div style="display:flex;align-items:center;gap:8px">
  <h3 style="flex:1;margin:0">🏰 Cómo se juega</h3>
  {#if canPlay}
    {#if howto === 'playing'}
      <button class="small ghost" data-a="av-play-howto" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('av-howto', [])}>⏹️</button>
    {:else if howto === 'loading'}
      <button class="small ghost" disabled aria-label="Preparando"><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="av-play-howto" aria-label="Escuchar" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('av-howto', howtoText)}>▶️</button>
    {/if}
  {/if}
</div>
{#each HOW_TO as sec (sec.heading)}
  <h3 style="margin-top:14px">{sec.heading}</h3>
  {#each sec.items as it, i (i)}<p class="small-note" style="margin:7px 0">• {it}</p>{/each}
{/each}

<h3 style="margin-top:14px">🏰 Roles del Bien</h3>
<div class="chips" style="margin-top:6px">
  {#each GOOD as r (r)}<button class="chip rolechip" data-a="av-role" data-p={r} onclick={() => openDetail(r)}>{ROLES[r].emoji} {ROLES[r].name}</button>{/each}
</div>
<h3 style="margin-top:14px">🗡️ Roles del Mal</h3>
<div class="chips" style="margin-top:6px">
  {#each EVIL as r (r)}<button class="chip rolechip" data-a="av-role" data-p={r} onclick={() => openDetail(r)}>{ROLES[r].emoji} {ROLES[r].name}</button>{/each}
</div>

<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
