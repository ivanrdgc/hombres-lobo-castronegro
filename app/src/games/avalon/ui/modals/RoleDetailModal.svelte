<script lang="ts">
  // Detalle de un rol de Ávalon: qué es, de qué bando y CÓMO funciona paso a
  // paso. `back` devuelve al modal de origen (guardando su scroll). El ▶️ de
  // lectura en voz alta solo en el lobby (en partida delataría).
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLES } from '../../roles';
  import { ROLE_HELP } from '../../role-help';
  import type { RoleId } from '../../roles';

  const roleId = $derived(String(app.ui.modal?.role ?? '') as RoleId);
  const back = $derived(app.ui.modal?.back as string | undefined);
  const r = $derived(roleId in ROLES ? ROLES[roleId] : null);
  const help = $derived(roleId in ROLE_HELP ? ROLE_HELP[roleId] : null);
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const audioKey = $derived('av-role:' + roleId);
  const audio = $derived(localAudioState(audioKey));

  function speechTexts(): string[] {
    if (!r) return [];
    const t: string[] = [`${r.name}.`, `Bando: ${r.team === 'evil' ? 'el Mal' : 'el Bien'}.`, r.desc];
    if (help) { t.push('Cómo funciona.'); t.push(...help.steps); if (help.tip) t.push(`Un consejo: ${help.tip}`); }
    return t;
  }
  function close() {
    const m = app.ui.modal;
    app.ui.modal = back ? { type: back, scroll: m?.backScroll } : null;
  }
</script>

{#if r}
  <div style="text-align:center">
    <span style="font-size:3rem;display:block">{r.emoji}</span>
    <h3 style="font-family:var(--font-display);color:var(--moon);font-size:1.3rem">{r.name}</h3>
    <div class="chips" style="justify-content:center;margin-top:8px">
      <span class="chip">{r.team === 'evil' ? '🗡️ Bando del Mal' : '🏰 Bando del Bien'}</span>
      {#if help}<span class="chip">🕐 {help.when}</span>{/if}
      {#if canPlay}
        {#if audio === 'playing'}
          <button class="small ghost" data-a="av-role-play" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech(audioKey, [])}>⏹️</button>
        {:else if audio === 'loading'}
          <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
        {:else}
          <button class="small ghost" data-a="av-role-play" aria-label="Leer este rol en voz alta" title="Leer en voz alta" style="font-size:1rem;line-height:1" onclick={() => toggleLocalSpeech(audioKey, speechTexts())}>▶️</button>
        {/if}
      {/if}
    </div>
  </div>
  <p class="small-note" style="font-size:0.92rem;margin-top:12px">{r.desc}</p>
  {#if help}
    <h3 style="margin-top:14px">🧭 Cómo funciona</h3>
    <ol class="howlist">{#each help.steps as s, i (i)}<li>{s}</li>{/each}</ol>
    {#if help.tip}<p class="small-note">💡 {help.tip}</p>{/if}
  {/if}
  <button class="primary block" data-a={back ? 'av-role-back' : 'close-modal'} onclick={close}>{back ? '↩️ Volver' : '✔️ Listo'}</button>
{/if}
