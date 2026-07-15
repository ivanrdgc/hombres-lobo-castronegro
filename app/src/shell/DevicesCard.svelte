<script lang="ts">
  // Tarjeta de dispositivos: común a la mesa y al lobby de cada juego.
  // Reordenación por arrastre (dedo o ratón): en Svelte se reordena un array
  // local durante el arrastre y el framework mueve las filas; al soltar se
  // persiste el orden. La geometría (¿delante de quién va?) es seatInsertIndex.
  import { app, me } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../games/hombres-lobo/actions';
  import { seatingOrder } from './ui-helpers';
  import { seatInsertIndex } from '../core/util/seat-insert';
  import type { GroupDoc } from '../core/sync/schema';

  const { group }: { group: GroupDoc } = $props();

  const my = $derived(me());
  const n = $derived(app.players.length);
  const nJug = $derived(app.players.filter((p) => p.isPlayer !== false).length);

  // Durante el arrastre manda el orden local; en reposo, el del grupo.
  let dragOrder = $state<string[] | null>(null);
  const order = $derived(dragOrder ?? seatingOrder(group, app.players));

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
    const rows = [...listEl.querySelectorAll<HTMLElement>('.player')].filter((r) => r.dataset.p !== dragging);
    const rects = rows.map((r) => r.getBoundingClientRect());
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
</script>

<svelte:document onpointermove={onPointerMove} onpointerup={onPointerUp} onpointercancel={onPointerUp} />

<div class="card">
  <h3>📱 Dispositivos ({n}) · 🎮 {nJug} jugarán</h3>
  <div class="players seatable" bind:this={listEl}>
    {#each order.map((id) => app.players.find((p) => p.id === id)).filter((p) => !!p) as p (p.id)}
      <div
        class="player selectable {dragging === p.id ? 'dragging' : ''}"
        style={dragging === p.id ? `transform: translate(${dragXY.x}px, ${dragXY.y}px)` : ''}
        data-a="player-menu"
        data-p={p.id}
        onpointerdown={(e) => onPointerDown(e, p.id)}
        onclick={() => {
          if (moved) { moved = false; return; } // clic fantasma tras arrastrar
          if (group.status === 'lobby') app.ui.modal = { type: 'player-menu', pid: p.id };
        }}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter' && group.status === 'lobby') app.ui.modal = { type: 'player-menu', pid: p.id }; }}
      >
        <span class="draghandle" data-a="noop" data-drag={p.id} title="Arrastra para ordenar">⠿</span>
        <span class="pname">{p.name}</span>
        {#if p.isPlayer === false}<span class="badge">📺 no juega</span>{/if}
        {#if p.id === group.lastNarratorId}<span class="badge">🔊 narrador</span>{/if}
        {#if my && p.id === my.id}<span class="badge you">Tú</span>{/if}
      </div>
    {/each}
  </div>
  <p class="small-note">🪑 La lista sigue el orden de la mesa (sentido horario): arrastra el asa ⠿ para ajustarlo; se recuerda entre partidas. Toca un dispositivo para marcarlo como jugador o solo-pantalla, elegirlo como 🔊 narrador de los modos automáticos (también recordado) o expulsarlo.</p>
</div>
