<script lang="ts">
  // ¿Quién juega? — lista única compartida por las pantallas «Empezar partida»
  // de todos los juegos (extraída de Hombres Lobo al llegar el segundo juego):
  // tocar = incluir/excluir (recordado en isPlayer), arrastrar ⠿ = orden de
  // mesa (persistido en group.seating). Informa al padre con {order, chosen}.
  import { app } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../core/sync/group-actions';
  import { isActiveDevice } from '../core/sync/presence';
  import { seatingOrder } from './ui-helpers';
  import { seatInsertIndex } from '../core/util/seat-insert';
  import type { GroupDoc, PlayerDoc } from '../core/sync/schema';

  const { group, meId, onState }: {
    group: GroupDoc;
    meId: string | null | undefined;
    onState: (s: { order: string[]; chosen: string[] }) => void;
  } = $props();

  // Presencia: congelada al abrir para la preselección (que nadie «se caiga»
  // de la lista mientras la miras); viva (cada 10 s) para el badge 💤.
  const now0 = Date.now();
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 10000);
    return () => clearInterval(t);
  });

  // Selección local con preselección: activos que no estén marcados «no juega».
  let local = $state<Record<string, boolean>>({});
  const isSel = (p: PlayerDoc) => local[p.id] ?? (p.isPlayer !== false && isActiveDevice(p, now0));
  function toggle(p: PlayerDoc) {
    if (moved) { moved = false; return; } // clic fantasma tras arrastrar
    const v = !isSel(p);
    local[p.id] = v;
    void guard(() => A.setPlayerActive(p.id, v));
  }

  // Reordenación por arrastre: durante el arrastre manda un orden local; al
  // soltar se persiste en group.seating.
  let dragOrder = $state<string[] | null>(null);
  const order = $derived(dragOrder ?? seatingOrder(group, app.players));
  const rows = $derived(order.map((id) => app.players.find((p) => p.id === id)).filter((p): p is PlayerDoc => !!p));

  // El padre recibe el orden efectivo y los elegidos (en orden de mesa).
  $effect(() => {
    onState({ order: rows.map((p) => p.id), chosen: rows.filter((p) => isSel(p)).map((p) => p.id) });
  });

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

  // Aviso de dispositivos dormidos que quedan fuera por defecto.
  const sleepy = $derived(app.players.filter((p) => !isSel(p) && p.isPlayer !== false && !isActiveDevice(p, now0)));
</script>

<svelte:document onpointermove={onPointerMove} onpointerup={onPointerUp} onpointercancel={onPointerUp} />

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
