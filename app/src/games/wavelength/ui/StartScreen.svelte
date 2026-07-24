<script lang="ts">
  // «Empezar partida» de Wavelength: tres decisiones en orden de importancia
  // —quién juega, hasta cuándo jugáis y dónde suena la voz— y el botón de
  // arrancar al final, con el recuento de quién entra.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import * as A from '../actions';
  import { MIN_PLAYERS, MAX_PLAYERS, goalOptions } from '../engine';
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

  // Meta: sin ella la partida no terminaba nunca y «Terminar» borraba los
  // puntos sin resumen. Índice 0 = una vuelta a la mesa (lo que espera todo
  // el mundo: que cada uno haya sido Psíquico una vez).
  let goalIdx = $state(0);
  const goals = $derived(goalOptions(Math.max(n, MIN_PLAYERS)));
  const goal = $derived(goals[Math.min(goalIdx, goals.length - 1)] ?? null);

  function startNow() {
    const pids = chosen.map((p) => p.id);
    if (narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Sintonizad.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startWavelength(pids, narrator, goal));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/wavelength`)}>←</button>
  <h2>📡 Wavelength: empezar</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="wavelength" onState={(s) => (seat = s)} />
  <!-- El aviso de «faltan jugadores» NO se repite aquí: vive pegado al botón
       de empezar, que es lo que se queda bloqueado. -->
  <p class="small-note">Por ese orden rotará el Psíquico, uno por ronda.</p>
</div>

<div class="card">
  <h3>🏁 ¿Hasta cuándo jugáis?</h3>
  <div class="btnrow" style="margin-top:6px">
    {#each goals as g, i (i)}
      <button class="small {goalIdx === i ? 'primary' : 'ghost'}" data-a="wl-goal" data-p={String(i)} style="flex:0 1 auto;min-width:0" onclick={() => (goalIdx = i)}>
        {g ? g.label : '♾️ Sin meta (las que queráis)'}
      </button>
    {/each}
  </div>
  <p class="small-note">Al cumplirse sale el resumen final con el total del equipo; aun así podéis seguir con rondas de propina.</p>
</div>

<div class="card">
  <h3>🔊 ¿En qué móvil suena la voz?</h3>
  <div class="btnrow" style="margin-top:6px">
    {#each rows.filter((p) => !matchOf(p.id)) as p (p.id)}
      <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
        {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
      </button>
    {/each}
  </div>
  {#if narratorP}<p class="small-note">🔊 <b>{narratorP.name}</b> pone la voz{seat.chosen.includes(narratorP.id) ? ' y también juega' : ' (no juega)'}. Solo canta el espectro y el resultado: el objetivo, nunca.</p>{/if}
</div>

<p class="small-note" style="text-align:center;margin-top:14px">📡 Jugarán <b>{n}</b>{n ? ': ' : ''}<span style="opacity:.75">{chosen.map((p) => p.name).join(', ')}</span></p>
<div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
<!-- Aquí no se reparte nada (ni cartas ni roles): lo que arranca es la primera
     ronda. Y si el botón está apagado, el motivo va justo debajo, no en un
     aviso a media pantalla de distancia (B25). -->
<button class="primary block" disabled={!okStart} data-a="wl-start" onclick={startNow}>📡 Empezar la ronda 1</button>
{#if !okStart}
  <p class="small-note" style="text-align:center;margin:6px 0 0">
    ⚠️ {n < MIN_PLAYERS
      ? `Faltan ${MIN_PLAYERS - n} para empezar: hacen falta ${MIN_PLAYERS} (con menos no hay equipo que debata).`
      : `Sobran ${n - MAX_PLAYERS}: como mucho juegan ${MAX_PLAYERS}.`}
  </p>
{/if}
