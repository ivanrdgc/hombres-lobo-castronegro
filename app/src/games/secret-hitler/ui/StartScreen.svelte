<script lang="ts">
  // «Empezar partida» de Secret Hitler: quién juega y en qué orden
  // (SeatPicker) y qué dispositivo pone la voz.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, fascistCountFor } from '../roles';
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
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece Secret Hitler.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startSecretHitler(pids, narrator));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/secret_hitler`)}>←</button>
  <h2>🏛️ Secret Hitler: empezar</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="secret_hitler" onState={(s) => (seat = s)} />
  <p class="small-note">El orden es el de la mesa (la presidencia rota en ese sentido).{n >= MIN_PLAYERS ? ` Con ${n} jugadores: ${fascistCountFor(n)} fascista${fascistCountFor(n) === 1 ? '' : 's'} + Hitler.` : ''}</p>
</div>

<div class="card">
  <h3>🔊 ¿Dónde suena la voz?</h3>
  <p class="small-note" style="margin-top:6px">La voz ambienta y anuncia el estado público (presidencia, decretos, poderes). Puede ponerla alguien que también juega.</p>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">🔊 <b>{narratorP.name}</b> pone la voz{seat.chosen.includes(narratorP.id) ? ' y también juega' : ' (no juega)'}.</p>{/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">🏛️ Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
  {#if n < MIN_PLAYERS}<p class="small-note">⚠️ Secret Hitler necesita al menos {MIN_PLAYERS} jugadores.</p>{/if}
  {#if n > MAX_PLAYERS}<p class="small-note">⚠️ Máximo {MAX_PLAYERS} jugadores.</p>{/if}
  <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
  <button class="primary block" disabled={!okStart} data-a="sh-start" onclick={startNow}>🏛️ ¡Empezar!</button>
</div>
