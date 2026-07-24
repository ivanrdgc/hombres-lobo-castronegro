<script lang="ts">
  // «Empezar partida»: tres decisiones y un botón — quién juega y en qué orden
  // (SeatPicker del shell), cómo es la ronda (duración y dónde suena la voz) y
  // el resumen con el ¡Empezar!.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as G from '../../../core/sync/group-actions';
  import * as A from '../actions';
  import { ESPIA_MIN_PLAYERS, ESPIA_MAX_PLAYERS, ESPIA_DURATIONS_MIN, ESPIA_DEFAULT_MIN } from '../engine';
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

  // ——— ¿Quién juega? ———
  let seat = $state<{ order: string[]; chosen: string[] }>({ order: [], chosen: [] });
  const byId = (id: string) => app.players.find((p) => p.id === id);
  const rows = $derived(seat.order.map(byId).filter((p): p is PlayerDoc => !!p));
  const chosen = $derived(seat.chosen.map(byId).filter((p): p is PlayerDoc => !!p));

  // ——— ¿Dónde suena la voz? ———
  let narrPick = $state<string | null>(null);
  // El recordado solo si sigue activo y no está en otra partida.
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

  // ——— Duración (recordada en settings.espiaMin) ———
  const minutes = $derived((group.settings || {}).espiaMin || ESPIA_DEFAULT_MIN);

  // ——— Validación ———
  const tooFew = $derived(chosen.length < ESPIA_MIN_PLAYERS);
  const tooMany = $derived(chosen.length > ESPIA_MAX_PLAYERS);

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la ronda.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startEspia(pids, narrator, minutes));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/espia`)}>←</button>
  <h2>🕵️ El Espía: empezar</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="espia" onState={(s) => (seat = s)} />
  <p class="small-note">El primero reparte y hace la primera pregunta; el turno de repartir rota cada ronda.</p>
</div>

<div class="card">
  <h3>⏱ ¿Cuánto dura la ronda?</h3>
  <div class="btnrow" style="margin-top:6px">
    {#each ESPIA_DURATIONS_MIN as m (m)}
      <button class="small {minutes === m ? 'primary' : 'ghost'}" data-a="espia-duration" data-p={String(m)}
        onclick={() => guard(() => G.setSettings({ espiaMin: m }))}>{m} min{m === 8 ? ' (oficial)' : ''}</button>
    {/each}
  </div>
  <h3 style="margin-top:14px">🔊 ¿Dónde suena la voz?</h3>
  <p class="small-note" style="margin-top:2px">Un solo móvil ambienta la ronda: arranque, avisos de tiempo y desenlaces. También juega.</p>
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
  {#if narratorP}<p class="small-note">🔊 <b>{narratorP.name}</b>: pantalla encendida y volumen alto{seat.chosen.includes(narratorP.id) ? '' : ' (no juega: tele o altavoz)'}.</p>{/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">
    🕵️ Ronda de <b>{minutes} min</b> con <b>{chosen.length}</b> jugador{chosen.length === 1 ? '' : 'es'}{chosen.length ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span>
  </p>
  {#if tooFew}<p class="small-note">⚠️ Hacen falta al menos {ESPIA_MIN_PLAYERS} jugadores.</p>{/if}
  {#if tooMany}<p class="small-note">⚠️ Máximo {ESPIA_MAX_PLAYERS} (7 papeles + el espía): deja fuera a {chosen.length - ESPIA_MAX_PLAYERS}. Los demás pueden mirar de espectadores.</p>{/if}
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="primary block" disabled={tooFew || tooMany} data-a="espia-start" onclick={startNow}>🕵️ Repartir identidades y empezar</button>
</div>
