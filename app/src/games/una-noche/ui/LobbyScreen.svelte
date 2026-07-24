<script lang="ts">
  // Lobby de Una Noche, al estilo de Los Hombres Lobo: intro con lectura en voz
  // alta (▶️) + «cómo se juega», y una tarjeta del MAZO con las cartas actuales
  // y un botón para configurarlo (modal). La selección de quién juega se hace
  // después, en «Empezar partida».
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { ROLES, CENTER_COUNT, recommendedComposition, compositionSize } from '../roles';
  import { INTRO_LOBBY } from '../texts';
  import type { RoleId } from '../types';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 10000); return () => clearInterval(t); });

  // Estimación de cuántos jugarían ahora (selección definitiva al empezar).
  const est = $derived(app.players.filter((p) => !matchOf(p.id)
    && (p.isPlayerFor?.una_noche ?? p.isPlayer) !== false && isActiveDevice(p, now)).length);
  const need = $derived(est + CENTER_COUNT);

  const comp = $derived.by(() => {
    const s = group.settings?.unaNoche as Record<string, number> | undefined;
    return s && compositionSize(s) > 0 ? s : recommendedComposition(est || 5);
  });
  const total = $derived(compositionSize(comp));
  const deckRoles = $derived((Object.keys(comp) as RoleId[]).filter((r) => (comp[r] || 0) > 0 && ROLES[r]));

  const introAudio = $derived(localAudioState('una-intro'));
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <h2>🌘 Una Noche</h2>
</div>
<Flash />

<div class="card">
  <div style="display:flex;align-items:center;gap:8px">
    <h3 style="flex:1;margin:0">🌘 Una Noche en Castronegro</h3>
    {#if introAudio === 'playing'}
      <button class="small ghost" data-a="una-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('una-intro', [])}>⏹️</button>
    {:else if introAudio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="una-play-intro" aria-label="Escuchar la introducción" title="Escuchar" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('una-intro', INTRO_LOBBY)}>▶️</button>
    {/if}
  </div>
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:9px 0">{p}</p>{/each}
  <button class="block" data-a="una-open-help" onclick={() => (app.ui.modal = { type: 'una-help' })}>🎲 Cómo se juega y los roles</button>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'una-demo' })}>🎓 Tutorial interactivo (2 min)</button>
</div>

<div class="card">
  <h3>🎴 El mazo</h3>
  <p class="small-note">Ahora mismo jugarían <b>{est}</b> (la selección definitiva se hace al empezar): el mazo debe sumar <b>{need}</b> cartas ({est} + {CENTER_COUNT} al centro). Llevas <b class:danger-text={total !== need}>{total}</b>{total === need ? ' ✅' : total < need ? ` (faltan ${need - total})` : ` (sobran ${total - need})`}.</p>
  <div class="chips" style="margin-top:6px">
    {#each deckRoles as r (r)}<button class="chip rolechip" data-a="una-role" data-p={r} onclick={() => (app.ui.modal = { type: 'una-role-detail', role: r })}>{ROLES[r].emoji} {ROLES[r].name}{(comp[r] || 0) > 1 ? ` ×${comp[r]}` : ''}</button>{/each}
  </div>
  <button class="block" data-a="una-open-deck" onclick={() => (app.ui.modal = { type: 'una-deck' })}>🎴 Elegir mazo</button>
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">De 3 a 10 jugadores. El narrador (voz de la app) llama a cada rol; puede jugar también o solo poner la voz.</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/una_noche/empezar`)}>🌘 Empezar partida</button>
</div>
