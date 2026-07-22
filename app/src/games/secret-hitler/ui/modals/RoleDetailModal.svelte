<script lang="ts">
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLE_LABEL, factionOf } from '../../roles';
  import { ROLE_HELP } from '../../role-help';
  import type { RoleId } from '../../roles';

  const roleId = $derived(String(app.ui.modal?.role ?? '') as RoleId);
  const back = $derived(app.ui.modal?.back as string | undefined);
  const label = $derived(roleId in ROLE_LABEL ? ROLE_LABEL[roleId] : null);
  const help = $derived(roleId in ROLE_HELP ? ROLE_HELP[roleId] : null);
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const audioKey = $derived('sh-role:' + roleId);
  const audio = $derived(localAudioState(audioKey));

  function speechTexts(): string[] {
    if (!label || !help) return [];
    const t = [label + '.', `Bando: ${factionOf(roleId) === 'fascist' ? 'fascista' : 'liberal'}.`, ...help.steps];
    if (help.tip) t.push(`Un consejo: ${help.tip}`);
    return t;
  }
  function close() {
    const m = app.ui.modal;
    app.ui.modal = back ? { type: back, scroll: m?.backScroll } : null;
  }
</script>

{#if label && help}
  <div style="text-align:center">
    <span style="font-size:3rem;display:block">{roleId === 'hitler' ? '💀' : roleId === 'fascist' ? '🐷' : '🕊️'}</span>
    <h3 style="font-family:var(--font-display);color:var(--moon);font-size:1.3rem">{label}</h3>
    <div class="chips" style="justify-content:center;margin-top:8px">
      <span class="chip">{factionOf(roleId) === 'fascist' ? '🐷 Bando fascista' : '🕊️ Bando liberal'}</span>
      <span class="chip">🕐 {help.when}</span>
      {#if canPlay}
        {#if audio === 'playing'}
          <button class="small ghost" data-a="sh-role-play" title="Detener" onclick={() => toggleLocalSpeech(audioKey, [])}>⏹️</button>
        {:else if audio === 'loading'}
          <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
        {:else}
          <button class="small ghost" data-a="sh-role-play" title="Leer en voz alta" style="font-size:1rem;line-height:1" onclick={() => toggleLocalSpeech(audioKey, speechTexts())}>▶️</button>
        {/if}
      {/if}
    </div>
  </div>
  <h3 style="margin-top:14px">🧭 Cómo funciona</h3>
  <ol class="howlist">{#each help.steps as s, i (i)}<li>{s}</li>{/each}</ol>
  {#if help.tip}<p class="small-note">💡 {help.tip}</p>{/if}
  <button class="primary block" data-a={back ? 'sh-role-back' : 'close-modal'} onclick={close}>{back ? '↩️ Volver' : '✔️ Listo'}</button>
{/if}
