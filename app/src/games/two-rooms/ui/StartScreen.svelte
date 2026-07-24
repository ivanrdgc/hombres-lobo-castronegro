<script lang="ts">
  // «Empezar partida» de Two Rooms: dos decisiones y nada más — quién juega y
  // qué dispositivo pone la voz en cada sala. Cada tarjeta es UNA decisión, con
  // su consecuencia escrita debajo (cuántas rondas salen, qué sala se queda sin
  // voz); el resumen de quién juega no se repite: lo lleva el propio SeatPicker.
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
  <h2>💣 Two Rooms: empezar</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="two_rooms" onState={(s) => (seat = s)} />
  {#if tooFew}<p class="small-note">⚠️ Hacen falta al menos {MIN_PLAYERS} jugadores.</p>{/if}
  {#if tooMany}<p class="small-note">⚠️ Máximo {MAX_PLAYERS}: deja fuera a {chosen.length - MAX_PLAYERS}.</p>{/if}
  {#if !tooFew && !tooMany}
    <!-- La consecuencia de a cuánta gente has marcado, ahí mismo. -->
    <p class="small-note">⏱️ Saldrán <b>{rounds} rondas</b> de {mins} minutos, y cada sala mandará <b>{hostages === 1 ? 'un rehén' : `${hostages} rehenes`}</b> por ronda. Bandos, roles y salas los reparte la app al azar.</p>
  {/if}
</div>

<div class="card">
  <!-- Aquí solo se habla de «la voz»: en Two Rooms no hay narrador de carne y
       hueso, habla la app por los altavoces que elijáis. Un nombre por cosa. -->
  <h3>🔊 ¿Qué dispositivo pone la voz?</h3>
  <p class="small-note" style="margin-top:6px">Las dos salas están separadas: un solo dispositivo se oye solo en una. (El temporizador sale siempre en la pantalla de todos.)</p>
  <div class="btnrow" style="margin-top:6px">
    <button class="small {voiceMode === 'single' ? 'primary' : 'ghost'}" data-a="tr-voice-mode" data-p="single" onclick={() => (voiceMode = 'single')}>🔊 Una sola voz</button>
    <button class="small {voiceMode === 'perRoom' ? 'primary' : 'ghost'}" data-a="tr-voice-mode" data-p="perRoom" onclick={() => (voiceMode = 'perRoom')}>🔊🔊 Una voz por sala</button>
    <button class="small {voiceMode === 'all' ? 'primary' : 'ghost'}" data-a="tr-voice-mode" data-p="all" onclick={() => (voiceMode = 'all')}>📣 Todos los móviles</button>
  </div>

  {#if voiceMode === 'all'}
    <p class="small-note">📣 Cada sala se oye sola, sin dispositivos de más. Puede quedar algo «a coro».</p>
  {:else}
    <div style="margin-top:10px">
      <p class="small-note" style="margin:0 0 4px"><b>{voiceMode === 'perRoom' ? '🔊 Voz de la Sala 1' : '🔊 La voz'}</b></p>
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
    </div>
  {/if}

  <!-- El resultado de lo elegido, en una línea; el consejo largo, plegado. -->
  {#if voiceMode === 'perRoom'}
    <p class="small-note">{#if speaker1P}✅ Sala 1: <b>{narratorP?.name || '¿?'}</b> · Sala 2: <b>{speaker1P.name}</b>. Pantalla encendida y volumen alto.{:else}⚠️ Falta la voz de la Sala 2: sin ella, esa sala se queda muda.{/if}</p>
  {:else if voiceMode === 'single' && narratorP}
    <p class="small-note">⚠️ Solo hablará en la sala de <b>{narratorP.name}</b>{seat.chosen.includes(narratorP.id) ? ' (que además juega)' : ''}: la otra se queda muda y sigue el reloj en pantalla.</p>
  {/if}
  {#if displaced && voiceMode !== 'all'}
    <p class="small-note">💤 <b>{displaced.name}</b> ponía la voz la última vez, pero su dispositivo está inactivo: la voz pasa a este. Si vuelve, tócalo arriba.</p>
  {/if}
  <details class="trref">
    <summary data-a="tr-ref-voice">📖 Cuál elegir</summary>
    <p class="small-note">Lo ideal es un dispositivo que NO juegue en cada sala (una tele, una tablet vieja): se quedan clavados donde están. Si la voz de una sala es un jugador y cruza como rehén, la app la pasa a otro móvil de los que se quedan.</p>
  </details>
</div>

<div id="form-error">
  {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
</div>
<button class="primary block" disabled={tooFew || tooMany} data-a="tr-start" onclick={startNow}>💣 Repartir y empezar ({chosen.length} jugadores)</button>

<style>
  .trref { margin-top: 12px; border-top: 1px solid var(--line, #2a2f45); padding-top: 8px; }
  .trref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #d8a24a); }
</style>
