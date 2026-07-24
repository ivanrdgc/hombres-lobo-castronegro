<script lang="ts">
  // «Empezar partida» de Love Letter: dos tarjetas y un botón — quién juega
  // (SeatPicker) y cómo se juega esta partida (el recuento de cartas y qué móvil
  // pone la voz).
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as G from '../../../core/sync/group-actions';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, tokensToWin } from '../engine';
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
  const narratorP = $derived(app.players.find((p) => p.id === narrator));
  const okStart = $derived(n >= MIN_PLAYERS && n <= MAX_PLAYERS);

  // ¿La app marca lo que ya ha salido? Ajuste de MESA: se recuerda entre
  // partidas y por defecto va encendido (B33). Apagarlo es el modo difícil.
  const track = $derived((group.settings || {}).llTrack !== false);
  const setTrack = (v: boolean) => guard(() => G.setSettings({ llTrack: v }));

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece Love Letter.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startLoveLetter(pids, narrator, track));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/love_letter`)}>←</button>
  <h2>💌 Love Letter: empezar</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="love_letter" onState={(s) => (seat = s)} />
  <p class="small-note">El orden de la lista es el de los turnos. Cada uno empieza con una carta en la mano, en su propio móvil.</p>
</div>

<!-- Las dos cosas que se deciden aparte de quién juega, en una sola tarjeta
     (B29·3): con qué ayuda se juega y dónde suena la voz. -->
<div class="card">
  <h3>⚙️ Cómo jugáis esta partida</h3>

  <p class="small-note" style="margin:0">🧮 <b>El recuento de cartas</b> — se recuerda para las siguientes partidas.</p>
  <div class="btnrow" style="margin-top:6px">
    <button class="pick {track ? 'primary' : 'ghost'}" style="flex:1;min-width:140px" data-a="ll-track" data-p="on" onclick={() => setTrack(true)}>🧮 Lo lleva la app</button>
    <button class="pick {track ? 'ghost' : 'primary'}" style="flex:1;min-width:140px" data-a="ll-track" data-p="off" onclick={() => setTrack(false)}>🧠 Lo lleváis vosotros</button>
  </div>
  <p class="small-note" data-a="ll-track-why">
    {#if track}
      La app va tachando lo que ya ha salido: en la mesa ves qué cartas siguen sin aparecer y, al adivinar con el Guardia, cuántas quedan de cada una.
    {:else}
      <b>Modo difícil</b>: la app solo dice cuántas cartas quedan por robar. Lo que ha salido no lo tacha nadie — está en los descartes de cada jugador, boca arriba, y hay que mirarlos y acordarse.
    {/if}
  </p>

  <p class="small-note" style="margin-top:14px">🔊 <b>Qué móvil pone la voz</b> — canta en alto las cartas jugadas y quién gana; nunca tu mano. Puede ponerla alguien que también juega.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="pick {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">Sonará en el móvil de <b>{narratorP.name}</b>{seat.chosen.includes(narratorP.id) ? ', que además juega' : ' (no juega)'}.</p>{/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">💌 Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
  {#if okStart}<p class="small-note">🏆 Gana quien reúna <b>{tokensToWin(n)} favores</b>, uno por ronda ganada. 🃏 Móvil en la mano y mirando hacia ti: la pantalla será tu carta.</p>{/if}
  {#if n < MIN_PLAYERS}<p class="small-note">⚠️ Love Letter necesita al menos {MIN_PLAYERS} jugadores: marca {MIN_PLAYERS - n} más arriba.</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores: desmarca {n - MAX_PLAYERS} arriba.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okStart} data-a="ll-start" onclick={startNow}>💌 Repartir cartas y empezar</button>
</div>

<style>
  /* Chips de dispositivo y ← de la cabecera con área de toque cómoda (B26·9). */
  .pick { min-height: 44px; padding: 10px 12px; font-size: 0.85rem; border-radius: 10px; }
  .topbar button { min-height: 44px; min-width: 44px; }
</style>
