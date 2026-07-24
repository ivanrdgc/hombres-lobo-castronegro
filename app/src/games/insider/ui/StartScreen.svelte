<script lang="ts">
  // «Empezar partida» de Insider: quién juega y en qué orden (SeatPicker del
  // shell), qué dispositivo pone la voz, y la duración del interrogatorio.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as G from '../../../core/sync/group-actions';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, INSIDER_DURATIONS_MIN, INSIDER_DEFAULT_MIN } from '../engine';
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
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 10000);
    return () => clearInterval(t);
  });

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

  const minutes = $derived((group.settings || {}).insiderMin || INSIDER_DEFAULT_MIN);

  const tooFew = $derived(chosen.length < MIN_PLAYERS);
  const tooMany = $derived(chosen.length > MAX_PLAYERS);

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la partida.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startInsider(pids, narrator, minutes));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/insider`)}>←</button>
  <h2>🤫 Insider: empezar</h2>
</div>
<Flash />

<!-- Dos tarjetas y el botón: (1) quién se sienta, (2) cómo será la ronda. El
     recuento de elegidos vive PEGADO a la lista donde se arregla, no en una
     tarjeta suelta al final. -->
<div class="card">
  <h3>👥 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="insider" onState={(s) => (seat = s)} />
  <p class="small-note" data-a="ins-chosen">
    Jugarán <b>{chosen.length}</b>{chosen.length ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span>
  </p>
  {#if tooFew}<p class="small-note">⚠️ Faltan jugadores: Insider necesita {MIN_PLAYERS} como mínimo.</p>{/if}
  {#if tooMany}<p class="small-note">⚠️ Sois demasiados: deja fuera a {chosen.length - MAX_PLAYERS} (máximo {MAX_PLAYERS}). Quien quede fuera puede mirar de espectador.</p>{/if}
  <p class="small-note">El primero de la lista es el Maestro de la primera ronda; el papel rota en cada ronda.</p>
</div>

<div class="card">
  <h3>⚙️ Cómo será la ronda</h3>
  <p class="small-note" style="margin:0">⏱ <b>Tiempo para adivinar la palabra</b></p>
  <div class="btnrow" style="margin-top:6px">
    {#each INSIDER_DURATIONS_MIN as m (m)}
      <button class="small {minutes === m ? 'primary' : 'ghost'}" data-a="ins-duration" data-p={String(m)}
        onclick={() => guard(() => G.setSettings({ insiderMin: m }))}>{m} min{m === 5 ? ' (oficial)' : ''}</button>
    {/each}
  </div>
  <p class="small-note" style="margin-top:14px">🔊 <b>Qué móvil pone la voz</b> — anuncia al Maestro, avisa del tiempo y remata el desenlace. Nunca dice la palabra.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if displaced}
    <p class="small-note">💤 <b>{displaced.name}</b> ponía la voz la última vez, pero su dispositivo está inactivo: la voz pasa a este. Si vuelve, tócalo arriba.</p>
  {/if}
  {#if narratorP}<p class="small-note">Sonará en el móvil de <b>{narratorP.name}</b>{seat.chosen.includes(narratorP.id) ? ' (que además juega)' : ' (no juega: tele o altavoz)'}: pantalla encendida y volumen alto.</p>{/if}
</div>

<div id="form-error">
  {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
</div>
<button class="primary block" disabled={tooFew || tooMany} data-a="ins-start" onclick={startNow}>🤫 Repartir cartas y empezar</button>
<p class="small-note" style="text-align:center">Cada móvil recibirá su carta en secreto; el reloj no arranca hasta que todos confirméis.</p>
