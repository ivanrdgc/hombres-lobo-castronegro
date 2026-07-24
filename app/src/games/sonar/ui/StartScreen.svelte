<script lang="ts">
  // «Empezar partida» de Captain Sonar: quién juega (SeatPicker del shell) y
  // CÓMO suena la voz (mecanismo compartido: un narrador, un altavoz por
  // equipo o todos los móviles). La app reparte tripulaciones y posiciones.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, BEST_PLAYERS } from '../engine';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';
  import SeatPicker from '../../../shell/SeatPicker.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();
  const now0 = Date.now();
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 10000); return () => clearInterval(t); });
  const meId = $derived(me()?.id);

  let seat = $state<{ order: string[]; chosen: string[] }>({ order: [], chosen: [] });
  const byId = (id: string) => app.players.find((p) => p.id === id);
  const rows = $derived(seat.order.map(byId).filter((p): p is PlayerDoc => !!p));
  const chosen = $derived(seat.chosen.map(byId).filter((p): p is PlayerDoc => !!p));
  const n = $derived(chosen.length);

  let narrPick = $state<string | null>(null);
  const narrator = $derived.by(() => {
    const cand = narrPick ?? defaultNarrator(app.players, group.lastNarratorId, meId, now0);
    return cand && !matchOf(cand) ? cand : meId ?? null;
  });

  // Modo de voz compartido: single / perRoom (uno por equipo) / all. Por
  // defecto perRoom: este juego se juega en DOS corros separados y un solo
  // altavoz deja a media mesa sin oír los anuncios.
  let voiceMode = $state<'single' | 'perRoom' | 'all'>('perRoom');
  const speakerCands = $derived(rows.filter((p) => !matchOf(p.id)));
  let spk1Pick = $state<string | null>(null);
  const speaker1 = $derived.by(() => {
    if (voiceMode !== 'perRoom') return null;
    const cand = spk1Pick ?? speakerCands.find((p) => p.id !== narrator)?.id ?? null;
    return cand && cand !== narrator && !matchOf(cand) ? cand : null;
  });
  const okStart = $derived(n >= MIN_PLAYERS && n <= MAX_PLAYERS && (voiceMode !== 'perRoom' || !!speaker1));

  function startNow() {
    const pids = chosen.map((p) => p.id);
    const iNarrate = voiceMode === 'all' ? pids.includes(meId ?? '') : (meId === narrator || meId === speaker1);
    if (iNarrate) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Inmersión.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startSonar(pids, voiceMode, narrator, speaker1));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/sonar`)}>←</button>
  <h2>⚓ Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="sonar" onState={(s) => (seat = s)} />
  <p class="small-note">La app repartirá dos tripulaciones al azar (🔴 y 🔵) y colocará los submarinos en secreto, cada uno en las 3 columnas de su lado. Luego, cada tripulación a su corro. Lo ideal: de {BEST_PLAYERS} jugadores.</p>
</div>

<div class="card">
  <h3>🔊 ¿Cómo suena la voz?</h3>
  <p class="small-note" style="margin-top:6px">Si las tripulaciones se sientan separadas, un solo altavoz no llega a las dos. Todo lo que narra es público (rumbos, torpedos, dron), así que da igual cuántos móviles lo digan.</p>
  <div class="btnrow" style="margin-top:6px">
    <button class="small {voiceMode === 'single' ? 'primary' : 'ghost'}" data-a="sn-voice-mode" data-p="single" onclick={() => (voiceMode = 'single')}>🔊 Un narrador</button>
    <button class="small {voiceMode === 'perRoom' ? 'primary' : 'ghost'}" data-a="sn-voice-mode" data-p="perRoom" onclick={() => (voiceMode = 'perRoom')}>🔊🔊 Uno por equipo</button>
    <button class="small {voiceMode === 'all' ? 'primary' : 'ghost'}" data-a="sn-voice-mode" data-p="all" onclick={() => (voiceMode = 'all')}>📣 Todos los móviles</button>
  </div>

  {#if voiceMode === 'all'}
    <p class="small-note">📣 Sonarán TODOS los móviles de los jugadores: cada corro se oye solo. Puede quedar algo «a coro».</p>
  {:else}
    <div style="margin-top:10px">
      <p class="small-note" style="margin:0 0 4px"><b>🔊 {voiceMode === 'perRoom' ? 'Altavoz del primer corro' : '¿Qué dispositivo narra?'}</b></p>
      <div class="btnrow">
        {#each speakerCands as p (p.id)}
          <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
            {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
          </button>
        {/each}
      </div>
    </div>
    {#if voiceMode === 'perRoom'}
      <div style="margin-top:10px">
        <p class="small-note" style="margin:0 0 4px"><b>🔊 Altavoz del segundo corro</b></p>
        <div class="btnrow">
          {#each speakerCands.filter((p) => p.id !== narrator) as p (p.id)}
            <button class="small {speaker1 === p.id ? 'primary' : 'ghost'}" data-a="sn-pick-speaker2" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (spk1Pick = p.id)}>
              {speaker1 === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
            </button>
          {/each}
        </div>
        {#if !speaker1}<p class="small-note">⚠️ Elige un segundo altavoz (distinto del primero).</p>{/if}
        <p class="small-note" style="margin:6px 0 0">🔀 Al repartir, la app se asegura de que los dos altavoces caigan en tripulaciones DISTINTAS: así cada corro tiene su voz.</p>
      </div>
    {/if}
  {/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">⚓ Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
  {#if n < MIN_PLAYERS}<p class="small-note">⚠️ Captain Sonar necesita al menos {MIN_PLAYERS} jugadores.</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okStart} data-a="sn-start" onclick={startNow}>⚓ ¡Inmersión!</button>
</div>
