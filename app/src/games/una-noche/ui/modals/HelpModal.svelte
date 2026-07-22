<script lang="ts">
  // Cómo se juega Una Noche + lista de roles (orden de la noche), con lectura en
  // voz alta local (▶️) del cómo-se-juega y de cada rol, como en el original.
  import { app } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLES, ACTION_ROLES } from '../../roles';
  import { HOWTO } from '../../texts';
  import type { RoleId } from '../../types';

  const NIGHT = ACTION_ROLES;
  const PASSIVE: RoleId[] = ['aldeano', 'cazador', 'tanner'];
  // Fuera de partida (el lobby): leer en voz alta no delata nada.
  const canPlay = $derived(app.group?.status !== 'playing');
  const howto = $derived(localAudioState('una-howto'));

  const teamLabel = (r: RoleId) => (ROLES[r].team === 'lobos' ? 'Hombres Lobo' : ROLES[r].team === 'tanner' ? 'en solitario' : 'El Pueblo');
  const roleSpeech = (r: RoleId) => [`${ROLES[r].name}.`, `Bando: ${teamLabel(r)}.`, ROLES[r].desc];
</script>

<div style="display:flex;align-items:center;gap:8px">
  <h3 style="flex:1;margin:0">🌘 Cómo se juega</h3>
  {#if canPlay}
    {#if howto === 'playing'}
      <button class="small ghost" data-a="una-play-howto" aria-label="Detener" title="Detener" onclick={() => toggleLocalSpeech('una-howto', [])}>⏹️</button>
    {:else if howto === 'loading'}
      <button class="small ghost" disabled aria-label="Preparando"><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="una-play-howto" aria-label="Escuchar" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('una-howto', HOWTO)}>▶️</button>
    {/if}
  {/if}
</div>
{#each HOWTO as p, i (i)}<p class="small-note" style="margin:8px 0">{p}</p>{/each}

<h3 style="margin-top:14px">🌙 Orden de la noche</h3>
{#each NIGHT as r (r)}
  {@const audio = localAudioState('una-role:' + r)}
  <div class="settingrow" style="align-items:center">
    <div class="sinfo"><div class="sname">{ROLES[r].emoji} {ROLES[r].name}</div><div class="sdesc">{ROLES[r].desc}</div></div>
    {#if canPlay}
      <div class="btnrow" style="flex:0 0 auto">
        {#if audio === 'playing'}
          <button class="small ghost" data-a="una-play-role" data-p={r} aria-label="Detener" onclick={() => toggleLocalSpeech('una-role:' + r, [])}>⏹️</button>
        {:else if audio === 'loading'}
          <button class="small ghost" disabled aria-label="Preparando"><span class="spinner"></span></button>
        {:else}
          <button class="small ghost" data-a="una-play-role" data-p={r} aria-label="Leer este rol" title="Leer en voz alta" onclick={() => toggleLocalSpeech('una-role:' + r, roleSpeech(r))}>▶️</button>
        {/if}
      </div>
    {/if}
  </div>
{/each}

<h3 style="margin-top:14px">🛌 Sin acción de noche</h3>
{#each PASSIVE as r (r)}
  {@const audio = localAudioState('una-role:' + r)}
  <div class="settingrow" style="align-items:center">
    <div class="sinfo"><div class="sname">{ROLES[r].emoji} {ROLES[r].name}</div><div class="sdesc">{ROLES[r].desc}</div></div>
    {#if canPlay}
      <div class="btnrow" style="flex:0 0 auto">
        {#if audio === 'playing'}
          <button class="small ghost" data-a="una-play-role" data-p={r} aria-label="Detener" onclick={() => toggleLocalSpeech('una-role:' + r, [])}>⏹️</button>
        {:else if audio === 'loading'}
          <button class="small ghost" disabled aria-label="Preparando"><span class="spinner"></span></button>
        {:else}
          <button class="small ghost" data-a="una-play-role" data-p={r} aria-label="Leer este rol" title="Leer en voz alta" onclick={() => toggleLocalSpeech('una-role:' + r, roleSpeech(r))}>▶️</button>
        {/if}
      </div>
    {/if}
  </div>
{/each}

<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
