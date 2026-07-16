<script lang="ts">
  // Pantalla «Empezar partida»: aquí (y solo aquí) se decide quién juega, en
  // qué orden se sientan, quién narra y en qué modo. La mesa ya no configura
  // personas: los valores por defecto son sensatos (dispositivos activos,
  // orden y narrador recordados) y casi siempre basta con pulsar Empezar.
  import { app, me, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isActiveDevice } from '../../../core/sync/presence';
  import { seatingOrder } from '../../../shell/ui-helpers';
  import { seatInsertIndex } from '../../../core/util/seat-insert';
  import { wolfCountFor, OFFICIAL_MIN_PLAYERS, CASUAL_MIN_PLAYERS } from '../roles';
  import { unlockAudio } from '../../../core/audio/engine';
  import { play } from '../../../core/audio/player';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import Flash from '../../../shell/Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  // Presencia: congelada al abrir para la preselección (que nadie «se caiga»
  // de la lista mientras la miras); viva (cada 10 s) para el badge 💤.
  const now0 = Date.now();
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 10000);
    return () => clearInterval(t);
  });

  const meId = $derived(me()?.id);
  const meName = $derived(me()?.name ?? 'este dispositivo');

  // ——— ¿Quién juega? ———
  // Selección local con preselección: activos que no estén marcados «no juega».
  // Tocar una fila la invierte y RECUERDA la preferencia (isPlayer) para la próxima.
  let local = $state<Record<string, boolean>>({});
  const isSel = (p: PlayerDoc) => local[p.id] ?? (p.isPlayer !== false && isActiveDevice(p, now0));
  function toggle(p: PlayerDoc) {
    if (moved) { moved = false; return; } // clic fantasma tras arrastrar
    const v = !isSel(p);
    local[p.id] = v;
    void guard(() => A.setPlayerActive(p.id, v));
  }

  // Reordenación por arrastre (misma mecánica que la mesa de la v2.0): durante
  // el arrastre manda un orden local; al soltar se persiste en group.seating.
  let dragOrder = $state<string[] | null>(null);
  const order = $derived(dragOrder ?? seatingOrder(group, app.players));
  const rows = $derived(order.map((id) => app.players.find((p) => p.id === id)).filter((p): p is PlayerDoc => !!p));

  let listEl: HTMLElement | null = $state(null);
  let dragging = $state<string | null>(null);
  let dragXY = $state({ x: 0, y: 0 });
  let start = { x: 0, y: 0 };
  let moved = false;
  let pointerId = -1;

  function onPointerDown(e: PointerEvent, pid: string) {
    const handle = (e.target as HTMLElement).closest('[data-drag]');
    if (!handle) return;
    e.preventDefault();
    dragging = pid;
    dragOrder = order.slice();
    app.ui.dragging = true;
    moved = false;
    pointerId = e.pointerId;
    start = { x: e.clientX, y: e.clientY };
    dragXY = { x: 0, y: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointerId || !listEl || !dragOrder) return;
    e.preventDefault();
    dragXY = { x: e.clientX - start.x, y: e.clientY - start.y };
    const others = [...listEl.querySelectorAll<HTMLElement>('.player')].filter((r) => r.dataset.p !== dragging);
    const rects = others.map((r) => r.getBoundingClientRect());
    const rest = dragOrder.filter((id) => id !== dragging);
    const idx = seatInsertIndex(rects, e.clientX, e.clientY);
    const next = rest.slice(0, idx).concat([dragging], rest.slice(idx));
    if (next.join('|') !== dragOrder.join('|')) {
      // Compensa el salto del reflow para que el bloque siga al dedo.
      const el = listEl.querySelector<HTMLElement>(`.player[data-p="${dragging}"]`);
      const b0 = el?.getBoundingClientRect();
      dragOrder = next;
      moved = true;
      requestAnimationFrame(() => {
        const b1 = el?.getBoundingClientRect();
        if (b0 && b1) {
          start.x += b1.left - b0.left;
          start.y += b1.top - b0.top;
          dragXY = { x: e.clientX - start.x, y: e.clientY - start.y };
        }
      });
    }
  }

  function onPointerUp() {
    if (!dragging) return;
    const finalOrder = dragOrder;
    const didMove = moved;
    dragging = null;
    app.ui.dragging = false;
    if (didMove && finalOrder) {
      guard(() => A.setSeating(finalOrder)).then(() => (dragOrder = null));
    } else {
      dragOrder = null;
    }
  }

  // ——— ¿Quién narra? (modo) ———
  const MODES: { id: 'auto' | 'guiado' | 'manual'; emoji: string; name: string; desc: string }[] = [
    { id: 'auto', emoji: '🤖', name: 'La app narra', desc: 'La app dirige la partida y pone la voz. Nadie narra en persona.' },
    { id: 'guiado', emoji: '📖', name: 'Narro yo (guiado)', desc: 'Narras en persona y tu pantalla te guía paso a paso; tú registras las decisiones. No juegas.' },
    { id: 'manual', emoji: '🎩', name: 'Narro yo (manual)', desc: 'Sin guion: la app solo reparte las cartas y lleva el registro. No juegas.' },
  ];
  let mode = $state<'auto' | 'guiado' | 'manual'>('auto');

  let narrPick = $state<string | null>(null);
  const narrator = $derived(narrPick
    ?? ((app.players.some((p) => p.id === group.lastNarratorId) ? group.lastNarratorId : meId) ?? null));
  const narratorP = $derived(app.players.find((p) => p.id === narrator));

  // ——— Resumen y validación ———
  const chosen = $derived(rows.filter((p) => isSel(p)));
  const finalPlayers = $derived(mode === 'auto' ? chosen : chosen.filter((p) => p.id !== meId));
  const sleepy = $derived(app.players.filter((p) => !isSel(p) && p.isPlayer !== false && !isActiveDevice(p, now0)));
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

<svelte:document onpointermove={onPointerMove} onpointerup={onPointerUp} onpointercancel={onPointerUp} />

<div class="topbar">
  <button class="small ghost" data-a="back-lobby-game" aria-label="Volver" title="Volver" style="font-size:1.25rem;line-height:1;padding:6px 12px" onclick={() => navigate(`/g/${group.id}/hombres_lobo`)}>←</button>
  <h2>🎬 Empezar partida</h2>
</div>
<Flash />

<div class="card">
  <h3>🎮 ¿Quién juega?</h3>
  <div class="players seatable" bind:this={listEl}>
    {#each rows as p (p.id)}
      <div
        class="player selectable {isSel(p) ? 'selected' : 'off'} {dragging === p.id ? 'dragging' : ''}"
        style={dragging === p.id ? `transform: translate(${dragXY.x}px, ${dragXY.y}px)` : ''}
        data-a="start-player"
        data-p={p.id}
        onpointerdown={(e) => onPointerDown(e, p.id)}
        onclick={() => toggle(p)}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') toggle(p); }}
      >
        <span class="draghandle" data-a="noop" data-drag={p.id} title="Arrastra para ordenar">⠿</span>
        <span class="pname">{p.name}</span>
        {#if !isActiveDevice(p, now)}<span class="badge zz" title="Sin señales recientes de este dispositivo">💤</span>{/if}
        {#if p.id === meId}<span class="badge you">Tú</span>{/if}
        <span class="selmark">{isSel(p) ? '✅' : '⬜'}</span>
      </div>
    {/each}
  </div>
  <p class="small-note">Toca a alguien para incluirlo o dejarlo fuera; arrastra el asa ⠿ para poner el orden de la mesa (sentido horario, como estáis sentados). Ambas cosas se recuerdan.</p>
  {#if sleepy.length}
    <p class="small-note">💤 {sleepy.map((p) => p.name).join(', ')} {sleepy.length > 1 ? 'llevan' : 'lleva'} un rato sin dar señales: {sleepy.length > 1 ? 'quedan fuera' : 'queda fuera'} salvo que los toques.</p>
  {/if}
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
      {#each rows as p (p.id)}
        <button class="small {narrator === p.id ? 'primary' : 'ghost'}" data-a="pick-narrator" data-p={p.id} style="flex:0 1 auto;min-width:0" onclick={() => (narrPick = p.id)}>
          {narrator === p.id ? '🔊 ' : ''}{p.name}{p.id === meId ? ' (tú)' : ''}{!isActiveDevice(p, now) ? ' 💤' : ''}
        </button>
      {/each}
    </div>
    <p class="small-note">
      {#if narratorP && isSel(narratorP)}🔊 <b>{narratorP.name}</b> pone la voz y también juega (mismo móvil).{:else if narratorP}🔊 <b>{narratorP.name}</b> solo pone la voz (tele o altavoz): no recibe carta.{/if}
      Mantened ese dispositivo con la pantalla encendida y volumen alto.
    </p>
    <button class="ghost block" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; }}>🗣️ Probar o configurar la voz de este dispositivo</button>
  {:else}
    <p class="small-note" style="margin-top:10px">📖 Narras tú (<b>{meName}</b>) desde este dispositivo y no recibes carta.</p>
  {/if}
</div>

<div class="card">
  <p class="small-note" style="margin-top:0">
    🎮 Jugarán <b>{finalPlayers.length}</b>{finalPlayers.length ? ': ' : ''}<span style="opacity:.75">{finalPlayers.map((p) => p.name).join(', ')}</span>
    · 🐺 <b>{lobos}</b> lobo{lobos > 1 ? 's' : ''}
  </p>
  {#if tooFew}
    <p class="small-note">⚠️ Mínimo {minP} jugadores{casual ? '' : ` (reglas oficiales). Para jugar desde ${CASUAL_MIN_PLAYERS}, activa el modo casual en los ajustes del juego`}.</p>
  {/if}
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="primary block" disabled={tooFew}
    data-a={mode === 'auto' ? 'start-auto' : mode === 'guiado' ? 'start-guided' : 'start-manual'}
    onclick={startNow}>🎬 ¡Empezar!</button>
</div>
