<script lang="ts">
  // «Empezar partida» de Love Letter: quién juega (SeatPicker) y qué dispositivo
  // pone la voz (opcional).
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
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

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece Love Letter.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startLoveLetter(pids, narrator));
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
  <p class="small-note">El orden es el de la mesa (marca los turnos). Cada uno empieza con una carta en la mano.</p>
</div>

<div class="card">
  <h3>🔊 ¿Dónde suena la voz?</h3>
  <p class="small-note" style="margin-top:6px">La voz solo relata las cartas jugadas y el desenlace (público); nunca tu mano. Puede ponerla alguien que también juega.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="pick {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">🔊 <b>{narratorP.name}</b> pone la voz{seat.chosen.includes(narratorP.id) ? ' y también juega' : ' (no juega)'}.</p>{/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">💌 Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
  {#if okStart}<p class="small-note">🏆 Con {n} jugadores gana quien reúna <b>{tokensToWin(n)} favores</b> (uno por ronda ganada). El mazo es siempre el mismo: 16 cartas, 8 tipos.</p>{/if}
  {#if n < MIN_PLAYERS}<p class="small-note">⚠️ Love Letter necesita al menos {MIN_PLAYERS} jugadores: marca {MIN_PLAYERS - n} más arriba.</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores: desmarca {n - MAX_PLAYERS} arriba.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okStart} data-a="ll-start" onclick={startNow}>💌 ¡Empezar!{okStart ? ` (${n} jugadores)` : ''}</button>
</div>

<style>
  /* Chips de dispositivo y ← de la cabecera con área de toque cómoda (B26·9). */
  .pick { min-height: 44px; padding: 10px 12px; font-size: 0.85rem; border-radius: 10px; }
  .topbar button { min-height: 44px; min-width: 44px; }
</style>
