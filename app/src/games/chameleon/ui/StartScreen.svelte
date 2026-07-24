<script lang="ts">
  // «Empezar partida» de El Camaleón: quién juega (SeatPicker) y qué dispositivo
  // pone la voz (opcional).
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
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'El Camaleón acecha.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startChameleon(pids, narrator));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/chameleon`)}>←</button>
  <h2>🦎 El Camaleón</h2>
</div>
<Flash />

<!-- B29: dos preguntas, dos tarjetas, y el resumen DENTRO de la pregunta que
     resume (antes iba en una tercera tarjeta que se leía como la misma cosa).
     La cabecera ya dice a qué juegas: aquí no se repite «empezar» tres veces. -->
<div class="card">
  <h3 style="margin-bottom:2px">🎮 ¿Quién juega?</h3>
  <p class="small-note" style="margin:0">Ponlos en el orden en que estáis sentados: ese será el orden de las pistas.</p>
  <SeatPicker {group} {meId} gameId="chameleon" onState={(s) => (seat = s)} />
  <p class="summary">🦎 Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.8">{chosen.map((p) => p.name).join(', ')}</span></p>
</div>

<div class="card">
  <h3 style="margin-bottom:2px">🔊 ¿En qué móvil suena la voz?</h3>
  <p class="small-note" style="margin:0">Anuncia el tema y el desenlace, nunca la palabra secreta. Quien la ponga puede jugar igual.</p>
  <div class="btnrow" style="margin-top:8px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">Sonará en <b>{narratorP.name}</b>{seat.chosen.includes(narratorP.id) ? ', que también juega' : ' (no juega)'}.</p>{/if}
</div>

<div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
<button class="primary block" disabled={!okStart} data-a="ch-start" onclick={startNow}>🦎 Repartir y empezar</button>
<!-- Lo deshabilitado explica por qué, y justo al lado del botón apagado. -->
{#if n < MIN_PLAYERS}
  <p class="small-note" style="text-align:center">⚠️ Faltan jugadores: marca al menos {MIN_PLAYERS}.</p>
{:else if n > MAX_PLAYERS}
  <p class="small-note" style="text-align:center">⚠️ Sois demasiados: el máximo son {MAX_PLAYERS}.</p>
{/if}

<style>
  .summary { margin: 10px 0 0; font-size: 0.95rem; }
</style>
