<script lang="ts">
  // Detalle de un rol de Una Noche: qué es, cuándo actúa y CÓMO funciona paso a
  // paso. Mismo formato que el RoleDetailModal de Los Hombres Lobo. Se abre
  // desde las listas de roles (cómo se juega, mazo, chips). `back` devuelve al
  // modal de origen. Fuera de partida, ▶️ lo lee en voz alta en este dispositivo.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { localAudioState, toggleLocalSpeech } from '../../../../shell/explain-audio';
  import { ROLES } from '../../roles';
  import { ROLE_HELP } from '../../role-help';
  import type { RoleId } from '../../types';

  const TEAM: Record<string, { emoji: string; name: string }> = {
    lobos: { emoji: '🐺', name: 'Los Hombres Lobo' },
    tanner: { emoji: '🪢', name: 'En solitario' },
    pueblo: { emoji: '🏡', name: 'El Pueblo' },
  };

  const roleId = $derived(String(app.ui.modal?.role ?? '') as RoleId);
  const back = $derived(app.ui.modal?.back as string | undefined);
  const r = $derived(roleId in ROLES ? ROLES[roleId] : null);
  const help = $derived(roleId in ROLE_HELP ? ROLE_HELP[roleId] : null);
  const team = $derived(r ? TEAM[r.team] : null);

  // El ▶️ solo en el LOBBY: en partida, leer un rol en alto delata (el status
  // del doc del grupo se queda en 'lobby'; la partida vive en viewGroup()).
  const canPlay = $derived(viewGroup()?.status !== 'playing');
  const audioKey = $derived('una-role:' + roleId);
  const audio = $derived(localAudioState(audioKey));

  function speechTexts(): string[] {
    if (!r) return [];
    const t: string[] = [`${r.name}.`];
    if (team) t.push(`Bando: ${team.name}.`);
    if (help) t.push(`Cuándo: ${help.when}.`);
    t.push(r.desc);
    if (help) {
      t.push('Cómo funciona.');
      t.push(...help.steps);
      if (help.tip) t.push(`Un consejo: ${help.tip}`);
    }
    return t;
  }

  function close() {
    // Devuelve también el scroll del modal de origen (lo restaura ModalHost
    // vía .scroll) y el targetN si veníamos del mazo de «Empezar» (B12).
    const m = app.ui.modal;
    app.ui.modal = back ? { type: back, scroll: m?.backScroll, targetN: m?.backTargetN } : null;
  }
</script>

{#if r}
  <div style="text-align:center">
    <span style="font-size:3rem;display:block">{r.emoji}</span>
    <h3 style="font-family:var(--font-display);color:var(--moon);font-size:1.3rem">{r.name}</h3>
    <div class="chips" style="justify-content:center;margin-top:8px">
      {#if team}<span class="chip">{team.emoji} Bando: {team.name}</span>{/if}
      {#if help}<span class="chip">🕐 {help.when}</span>{/if}
      {#if canPlay}
        {#if audio === 'playing'}
          <button class="small ghost" data-a="una-role-play" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech(audioKey, [])}>⏹️</button>
        {:else if audio === 'loading'}
          <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
        {:else}
          <button class="small ghost" data-a="una-role-play" aria-label="Leer este rol en voz alta" title="Leer en voz alta" style="font-size:1rem;line-height:1" onclick={() => toggleLocalSpeech(audioKey, speechTexts())}>▶️</button>
        {/if}
      {/if}
    </div>
  </div>
  <p class="small-note" style="font-size:0.92rem;margin-top:12px">{r.desc}</p>
  {#if help}
    <h3 style="margin-top:14px">🧭 Cómo funciona</h3>
    <ol class="howlist">
      {#each help.steps as s, i (i)}<li>{s}</li>{/each}
    </ol>
    {#if help.tip}<p class="small-note">💡 {help.tip}</p>{/if}
  {/if}
  <button class="primary block" data-a={back ? 'una-role-back' : 'close-modal'} onclick={close}>{back ? '↩️ Volver' : '✔️ Listo'}</button>
{/if}
