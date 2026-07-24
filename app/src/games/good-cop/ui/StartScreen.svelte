<script lang="ts">
  // Empezar partida: dos decisiones (quiénes juegan y quién pone la voz) y un
  // botón. Cada dato en un solo sitio (B29): el reparto público se dice junto a
  // la selección de jugadores, no repetido abajo.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, bandCounts } from '../engine';
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
  const counts = $derived(bandCounts(n));

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la redada.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startGoodCop(pids, narrator));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/good_cop`)}>←</button>
  <h2>🚔 Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="good_cop" onState={(s) => (seat = s)} />
  <!-- El reparto es público: hay que saberlo ANTES de empezar a deducir. -->
  {#if okStart}
    <p class="small-note">🧮 Sois {n}: saldrán <b>{counts.honest} 👮 honestos</b> y <b>{counts.crook} 🦹 corruptos</b>, y cada uno recibirá 3 cartas (2 de su bando y 1 del contrario). Esto lo sabe toda la mesa.</p>
  {:else if n < MIN_PLAYERS}
    <p class="small-note">⚠️ Hacen falta al menos {MIN_PLAYERS} jugadores (sois {n}).</p>
  {:else}
    <p class="small-note">⚠️ Como mucho {MAX_PLAYERS} jugadores (sois {n}).</p>
  {/if}
</div>

<div class="card">
  <h3>🔊 ¿Quién pone la voz?</h3>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">Sonará en el móvil de <b>{narratorP.name}</b>{seat.chosen.includes(narratorP.id) ? ', que también juega' : ' (no juega)'}. Solo canta acciones públicas: armas, dianas y disparos, nunca cartas.</p>{/if}
</div>

<div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
<button class="primary block" disabled={!okStart} data-a="gc-start" onclick={startNow}>🚔 Repartir cartas y empezar</button>
