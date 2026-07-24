<script lang="ts">
  // Lobby de Una Noche. B29: la primera pantalla del juego tiene UN solo
  // trabajo: decir de qué va en dos líneas y dejar tres caminos claros —
  // aprender (tutorial), consultar (cómo se juega) y jugar (empezar). El nombre
  // del juego lo dice la cabecera y no se repite debajo; el mazo va después,
  // como contexto de la partida que se va a montar.
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { localAudioState, toggleLocalSpeech } from '../../../shell/explain-audio';
  import { gameMeta, POSTURE_HINT } from '../../registry';
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
  const posture = POSTURE_HINT[gameMeta('una_noche').posture];
</script>

<div class="topbar">
  <button class="small ghost" data-a="change-game" aria-label="Volver a la mesa" title="Volver a la mesa" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}`)}>←</button>
  <!-- Nombre completo: en un móvil estrecho preferimos que baje de línea a que
       lo corte el «…» de .topbar h2. -->
  <h2 style="white-space:normal;line-height:1.2">🌘 Una Noche en Castronegro</h2>
  {#if introAudio === 'playing'}
    <button class="small ghost" data-a="una-play-intro" aria-label="Detener la lectura" title="Detener" onclick={() => toggleLocalSpeech('una-intro', [])}>⏹️</button>
  {:else if introAudio === 'loading'}
    <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
  {:else}
    <button class="small ghost" data-a="una-play-intro" aria-label="Escuchar la introducción" title="Escuchar la introducción" style="font-size:1.1rem;line-height:1" onclick={() => toggleLocalSpeech('una-intro', INTRO_LOBBY)}>▶️</button>
  {/if}
</div>
<Flash />

<!-- (a) De qué va, en dos líneas, y los tres caminos. -->
<div class="card">
  {#each INTRO_LOBBY as p, i (i)}<p style="margin:0 0 9px">{p}</p>{/each}
  <p class="small-note" style="margin:0 0 10px">👥 De 3 a 10 jugadores · ⏱️ unos 10 minutos. {posture}</p>
  <button class="primary block" data-a="open-start" onclick={() => navigate(`/g/${group.id}/una_noche/empezar`)}>🌘 Empezar partida</button>
  <button class="block" data-a="open-demo" onclick={() => (app.ui.modal = { type: 'una-demo' })}>🎓 Aprender jugando (2 min)</button>
  <button class="block" data-a="una-open-help" onclick={() => (app.ui.modal = { type: 'una-help' })}>📖 Cómo se juega y los roles</button>
</div>

<!-- (b) Contexto de la partida que se va a montar: qué cartas hay en el mazo. -->
<div class="card">
  <h3>🎴 El mazo · {total} carta{total === 1 ? '' : 's'}</h3>
  <p class="small-note" style="margin:0 0 6px">Una carta por jugador y {CENTER_COUNT} al centro. Ahora mismo sois <b>{est}</b>, así que hacen falta <b>{need}</b>{total === need ? ' ✅' : total < need ? ` (te faltan ${need - total})` : ` (te sobran ${total - need})`}.</p>
  <div class="chips">
    {#each deckRoles as r (r)}<button class="chip rolechip" data-a="una-role" data-p={r} onclick={() => (app.ui.modal = { type: 'una-role-detail', role: r })}>{ROLES[r].emoji} {ROLES[r].name}{(comp[r] || 0) > 1 ? ` ×${comp[r]}` : ''}</button>{/each}
  </div>
  <button class="block" data-a="una-open-deck" onclick={() => (app.ui.modal = { type: 'una-deck' })}>🎴 Cambiar el mazo</button>
</div>
