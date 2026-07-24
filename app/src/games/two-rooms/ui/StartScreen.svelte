<script lang="ts">
  // «Empezar partida» de Two Rooms: quién juega (SeatPicker del shell) y qué
  // dispositivo pone la voz. La app reparte bandos, roles y las dos salas.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, roundsFor, minutesForRound } from '../engine';
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

  let narrPick = $state<string | null>(null);
  const narrator = $derived.by(() => {
    const cand = narrPick ?? defaultNarrator(app.players, group.lastNarratorId, meId, now0);
    return cand && !matchOf(cand) ? cand : meId ?? null;
  });
  const narratorP = $derived(app.players.find((p) => p.id === narrator));
  const displaced = $derived.by(() => {
    if (narrPick) return null;
    const rem = app.players.find((p) => p.id === group.lastNarratorId);
    return rem && !isActiveDevice(rem, now0) && rem.id !== meId ? rem : null;
  });

  const tooFew = $derived(chosen.length < MIN_PLAYERS);
  const tooMany = $derived(chosen.length > MAX_PLAYERS);
  // Rondas y rehenes escalan con la mesa: conviene verlo ANTES de empezar.
  const rounds = $derived(roundsFor(chosen.length));
  const mins = $derived(Array.from({ length: rounds }, (_, i) => minutesForRound(i + 1, rounds)).join(', '));
  const hostages = $derived(Math.max(1, Math.ceil(Math.floor(chosen.length / 2) / 4)));

  // Modo de voz: un narrador (single), uno por sala (perRoom) o todos los
  // móviles (all). El altavoz de la Sala 1 es `narrator` (el masterId).
  // Por defecto UNO POR SALA: con `single` la Sala 2 se queda sin voz y sin
  // wakeLock (pantallas apagándose), que es justo lo que no queremos.
  let voiceMode = $state<'single' | 'perRoom' | 'all'>('perRoom');
  const speakerCands = $derived(rows.filter((p) => !matchOf(p.id)));
  let spk1Pick = $state<string | null>(null);
  const speaker1 = $derived.by(() => {
    if (voiceMode !== 'perRoom') return null;
    const cand = spk1Pick ?? speakerCands.find((p) => p.id !== narrator)?.id ?? null;
    return cand && cand !== narrator && !matchOf(cand) ? cand : null;
  });
  const speaker1P = $derived(app.players.find((p) => p.id === speaker1));

  function startNow() {
    const pids = chosen.map((p) => p.id);
    const iNarrate = voiceMode === 'all' ? pids.includes(meId ?? '') : (meId === narrator || meId === speaker1);
    if (iNarrate) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la partida.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startTwoRooms(pids, voiceMode, narrator, speaker1));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/two_rooms`)}>←</button>
  <h2>💣 Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="two_rooms" onState={(s) => (seat = s)} />
  <p class="small-note">La app repartirá bandos, roles (Presidente y Bombardero) y las dos salas al azar.</p>
</div>

<div class="card">
  <h3>🔊 ¿Cómo suena la voz?</h3>
  <p class="small-note" style="margin-top:6px">Las dos salas están separadas, así que un solo altavoz solo llega a una. Elige según los dispositivos que tengáis (el temporizador siempre sale en la pantalla de cada móvil).</p>
  <div class="btnrow" style="margin-top:6px">
    <button class="small {voiceMode === 'single' ? 'primary' : 'ghost'}" data-a="tr-voice-mode" data-p="single" onclick={() => (voiceMode = 'single')}>🔊 Un narrador</button>
    <button class="small {voiceMode === 'perRoom' ? 'primary' : 'ghost'}" data-a="tr-voice-mode" data-p="perRoom" onclick={() => (voiceMode = 'perRoom')}>🔊🔊 Uno por sala</button>
    <button class="small {voiceMode === 'all' ? 'primary' : 'ghost'}" data-a="tr-voice-mode" data-p="all" onclick={() => (voiceMode = 'all')}>📣 Todos los móviles</button>
  </div>

  {#if voiceMode === 'all'}
    <p class="small-note">📣 Sonarán TODOS los móviles de los jugadores: cada sala se oye sola, sin dispositivos de más. Puede quedar algo «a coro».</p>
  {:else}
    <div style="margin-top:10px">
      <p class="small-note" style="margin:0 0 4px"><b>🔊 {voiceMode === 'perRoom' ? 'Voz de la Sala 1' : '¿Qué dispositivo narra?'}</b></p>
      <div class="btnrow">
        {#each speakerCands as p (p.id)}
          <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
            {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if voiceMode === 'perRoom'}
    <div style="margin-top:10px">
      <p class="small-note" style="margin:0 0 4px"><b>🔊 Voz de la Sala 2</b></p>
      <div class="btnrow">
        {#each speakerCands.filter((p) => p.id !== narrator) as p (p.id)}
          <button class="small {speaker1 === p.id ? 'primary' : 'ghost'}" data-a="tr-pick-narrator2" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (spk1Pick = p.id)}>
            {speaker1 === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
          </button>
        {/each}
      </div>
      <p class="small-note">Poned un dispositivo en cada sala; ambos narran lo mismo. Lo ideal es que NO jueguen (una tele, una tablet vieja): así se quedan clavados en su sala. Si el altavoz es un jugador y cruza como rehén, la app pasa la voz de esa sala a otro móvil de los que se quedan.</p>
    </div>
  {/if}

  {#if displaced && voiceMode !== 'all'}
    <p class="small-note">💤 <b>{displaced.name}</b> ponía la voz la última vez, pero su dispositivo está inactivo: la voz pasa a este. Si vuelve, tócalo arriba.</p>
  {/if}
  {#if voiceMode === 'perRoom'}
    <p class="small-note">🔊 Sala 1: <b>{narratorP?.name || '¿?'}</b>{#if speaker1P} · Sala 2: <b>{speaker1P.name}</b>{:else} · <span style="opacity:.8">falta elegir la voz de la Sala 2 (si no, esa sala se queda sin audio)</span>{/if}. Pantalla encendida y volumen alto.</p>
  {:else if voiceMode === 'single' && narratorP}
    <p class="small-note">🔊 <b>{narratorP.name}</b> pone la voz{seat.chosen.includes(narratorP.id) ? ' y también juega' : ' (no juega: tele o altavoz)'}. ⚠️ Solo llegará a su sala: la otra se queda MUDA y sigue el temporizador en pantalla (y sin nadie que mantenga la pantalla encendida).</p>
  {/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">
    💣 Jugarán <b>{chosen.length}</b>{chosen.length ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span>
  </p>
  {#if tooFew}<p class="small-note">⚠️ Two Rooms necesita al menos {MIN_PLAYERS} jugadores.</p>{/if}
  {#if tooMany}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores: deja fuera a {chosen.length - MAX_PLAYERS}.</p>{/if}
  {#if !tooFew && !tooMany}
    <p class="small-note">⏱️ Con {chosen.length} jugadores se juegan <b>{rounds} rondas</b> de {mins} minutos, y cada sala manda <b>{hostages === 1 ? 'un rehén' : `${hostages} rehenes`}</b> por ronda.</p>
  {/if}
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="primary block" disabled={tooFew || tooMany} data-a="tr-start" onclick={startNow}>💣 ¡Empezar!</button>
</div>
