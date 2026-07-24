<script lang="ts">
  // Pantalla «Empezar partida»: aquí (y solo aquí) se decide quién juega, en
  // qué orden se sientan, quién narra y en qué modo. La mesa ya no configura
  // personas: los valores por defecto son sensatos (dispositivos activos,
  // orden y narrador recordados) y casi siempre basta con pulsar Empezar.
  // La lista quién-juega + orden es el SeatPicker compartido del shell.
  import { app, matchOf, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { defaultNarrator } from '../../../shell/ui-helpers';
  import { wolfCountFor, OFFICIAL_MIN_PLAYERS, CASUAL_MIN_PLAYERS } from '../roles';
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
  const meName = $derived(me()?.name ?? 'este dispositivo');

  // ——— ¿Quién juega? (SeatPicker) ———
  let seat = $state<{ order: string[]; chosen: string[] }>({ order: [], chosen: [] });
  const byId = (id: string) => app.players.find((p) => p.id === id);
  const rows = $derived(seat.order.map(byId).filter((p): p is PlayerDoc => !!p));
  const chosen = $derived(seat.chosen.map(byId).filter((p): p is PlayerDoc => !!p));

  // ——— ¿Quién narra? (modo) ———
  const MODES: { id: 'auto' | 'guiado' | 'manual'; emoji: string; name: string; desc: string }[] = [
    { id: 'auto', emoji: '🤖', name: 'La app narra', desc: 'La app dirige la partida y pone la voz. Nadie narra en persona.' },
    { id: 'guiado', emoji: '📖', name: 'Narro yo (guiado)', desc: 'Narras en persona y tu pantalla te guía paso a paso; tú registras las decisiones. No juegas.' },
    { id: 'manual', emoji: '🎩', name: 'Narro yo (manual)', desc: 'Sin guion: la app solo reparte las cartas y lleva el registro. No juegas.' },
  ];
  let mode = $state<'auto' | 'guiado' | 'manual'>('auto');

  let narrPick = $state<string | null>(null);
  // Por defecto, el altavoz recordado SOLO si sigue activo y libre: si su
  // dispositivo duerme (o está en otra partida), la voz se mueve sola a este.
  const narrator = $derived.by(() => {
    const cand = narrPick ?? defaultNarrator(app.players, group.lastNarratorId, meId, now0);
    return cand && !matchOf(cand) ? cand : meId ?? null;
  });
  const narratorP = $derived(app.players.find((p) => p.id === narrator));
  // Aviso cuando la voz se ha movido por inactividad del altavoz anterior.
  const displaced = $derived.by(() => {
    if (narrPick) return null; // elección explícita: sin avisos
    const rem = app.players.find((p) => p.id === group.lastNarratorId);
    return rem && !isActiveDevice(rem, now0) && rem.id !== meId ? rem : null;
  });

  // ——— Resumen y validación ———
  const finalPlayers = $derived(mode === 'auto' ? chosen : chosen.filter((p) => p.id !== meId));
  const casual = $derived(!!(group.settings || {}).casual);
  const minP = $derived(casual ? CASUAL_MIN_PLAYERS : OFFICIAL_MIN_PLAYERS);
  const tooFew = $derived(finalPlayers.length < minP);
  const lobos = $derived.by(() => {
    const n = Math.max(1, finalPlayers.length);
    const fixed = (group.settings || {}).wolvesCount || null;
    return Math.max(1, Math.min(Math.max(n - 1, 1), fixed || wolfCountFor(n)));
  });

  function startNow() {
    const pids = chosen.map((p) => p.id);
    // El gesto solo desbloquea el audio en el dispositivo que narra.
    if (mode === 'auto' && narrator === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'Que empiece la partida.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startGame(mode, mode === 'auto' ? narrator : null, pids));
  }
</script>

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/hombres_lobo`)}>←</button>
  <h2>🎬 Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <SeatPicker {group} {meId} gameId="hombres_lobo" onState={(s) => (seat = s)} />
</div>

<div class="card">
  <h3>🔊 ¿Quién narra?</h3>
  {#each MODES as m (m.id)}
    <div class="roletoggle {mode === m.id ? 'on' : ''}" data-a="start-mode" data-p={m.id}
      onclick={() => (mode = m.id)}
      role="radio" aria-checked={mode === m.id} tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter') mode = m.id; }}>
      <span class="remoji">{m.emoji}</span>
      <div class="rinfo"><div class="rname">{m.name}</div><div class="rdesc">{m.desc}</div></div>
      <span class="state">{mode === m.id ? '🔘' : '⚪'}</span>
    </div>
  {/each}
  {#if mode === 'auto'}
    <p class="small-note" style="margin-top:10px">La voz sonará en:</p>
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
    <p class="small-note">
      {#if narratorP && seat.chosen.includes(narratorP.id)}🔊 <b>{narratorP.name}</b> pone la voz y también juega (mismo móvil).{:else if narratorP}🔊 <b>{narratorP.name}</b> solo pone la voz (tele o altavoz): no recibe carta.{/if}
      Mantened ese dispositivo con la pantalla encendida y volumen alto.
    </p>
  {:else}
    <p class="small-note" style="margin-top:10px">📖 Narras tú (<b>{meName}</b>) desde este dispositivo y no recibes carta.</p>
  {/if}
</div>

<div class="card">
  <!-- Quiénes juegan ya está arriba, nombre a nombre: aquí solo lo que el botón
       necesita decir de sí mismo (cuántos reparte y cuántos lobos saldrán). -->
  {#if tooFew}
    <p class="small-note" style="margin-top:0">⚠️ Mínimo {minP} jugadores{casual ? '' : ` (reglas oficiales). Para jugar desde ${CASUAL_MIN_PLAYERS}, activa el modo casual en los ajustes del juego`}.</p>
  {/if}
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="primary block" disabled={tooFew}
    data-a={mode === 'auto' ? 'start-auto' : mode === 'guiado' ? 'start-guided' : 'start-manual'}
    onclick={startNow}>🎬 Repartir y empezar · {finalPlayers.length} jugando, {lobos} 🐺</button>
</div>
