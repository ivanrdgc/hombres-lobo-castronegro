<script lang="ts">
  // Antes de repartir: quién se sienta (y en qué orden) y qué móvil pone la
  // voz. Dos decisiones, dos tarjetas, y el botón de empezar al alcance.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS } from '../engine';
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
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece Skull.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startSkull(pids, narrator));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/skull`)}>←</button>
  <h2>💀 Skull: nueva partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega y en qué orden?</h3>
  <SeatPicker {group} {meId} gameId="skull" onState={(s) => (seat = s)} />
  <p class="small-note">El orden es el de la mesa: marca los turnos. Cada jugador empieza con 3 flores 🌸 y 1 calavera 💀.</p>
  <p class="small-note" style="margin:0">
    Se sientan <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span>
    {#if n < MIN_PLAYERS}<br />⚠️ Faltan jugadores: Skull necesita {MIN_PLAYERS} como mínimo.{/if}
    {#if n > MAX_PLAYERS}<br />⚠️ Sobran: como mucho juegan {MAX_PLAYERS}.{/if}
  </p>
</div>

<div class="card">
  <h3>🔊 ¿Qué móvil pone la voz?</h3>
  <p class="small-note" style="margin-top:6px">Relata en alto lo público —apuestas, pujas y desenlace—; jamás lo que hay en las pilas. Puede ponerla alguien que también juega.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note" style="margin-bottom:0">La pone <b>{narratorP.name}</b>{seat.chosen.includes(narratorP.id) ? ', que además juega' : ' (no juega)'}.</p>{/if}
</div>

<div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
<button class="primary block" disabled={!okStart} data-a="sk-start" onclick={startNow}>💀 Empezar: cada uno coloca su primer disco</button>
