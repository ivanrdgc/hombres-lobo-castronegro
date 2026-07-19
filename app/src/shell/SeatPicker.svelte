<script lang="ts">
  // ¿Quién juega? — lista única compartida por las pantallas «Empezar partida»
  // de todos los juegos (extraída de Hombres Lobo al llegar el segundo juego):
  // tocar = incluir/excluir (recordado en isPlayer), arrastrar ⠿ = orden de
  // mesa (persistido en group.seating). Informa al padre con {order, chosen}.
  import { app, matchOf } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../core/sync/group-actions';
  import { isActiveDevice } from '../core/sync/presence';
  import { gameDef } from '../games/registry';
  import { seatingOrder } from './ui-helpers';
  import { seatInsertIndex } from '../core/util/seat-insert';
  import type { GroupDoc, PlayerDoc } from '../core/sync/schema';

  const { group, meId, gameId, onState }: {
    group: GroupDoc;
    meId: string | null | undefined;
    /** Juego cuya partida se está montando (el recuerdo quién-juega es por juego). */
    gameId: string;
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

  // Los ocupados por OTRA partida en curso no pueden entrar en esta.
  const busyOf = (p: PlayerDoc) => matchOf(p.id);

  // Selección local con preselección: activos que no estén marcados «no juega»
  // PARA ESTE JUEGO (isPlayerFor.<gameId>; isPlayer heredado como respaldo).
  let local = $state<Record<string, boolean>>({});
  const wants = (p: PlayerDoc) => (p.isPlayerFor?.[gameId] ?? p.isPlayer) !== false;
  const isSel = (p: PlayerDoc) =>
    !busyOf(p) && (local[p.id] ?? (wants(p) && isActiveDevice(p, now0)));
  function toggle(p: PlayerDoc) {
    if (moved) { moved = false; return; } // clic fantasma tras arrastrar
    if (busyOf(p)) return; // está jugando otra partida: se libera desde la mesa
    const v = !isSel(p);
    local[p.id] = v;
    void guard(() => A.setPlayerActive(gameId, p.id, v));
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
  const sleepy = $derived(app.players.filter((p) => !busyOf(p) && !isSel(p) && wants(p) && !isActiveDevice(p, now0)));
  // Y de los ocupados en otra partida.
  const busyList = $derived(app.players.filter((p) => !!busyOf(p)));
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
      {#if busyOf(p)}<span class="badge" title="Jugando a {gameDef(busyOf(p)!.gameId).name}">{gameDef(busyOf(p)!.gameId).emoji}</span>{/if}
      {#if !isActiveDevice(p, now)}<span class="badge zz" title="Sin señales recientes de este dispositivo">💤</span>{/if}
      {#if p.id === meId}<span class="badge you">Tú</span>{/if}
      <span class="selmark">{busyOf(p) ? '⛔' : isSel(p) ? '✅' : '⬜'}</span>
    </div>
  {/each}
</div>
<p class="small-note">Toca a alguien para incluirlo o dejarlo fuera; arrastra el asa ⠿ para poner el orden de la mesa (sentido horario, como estáis sentados). Ambas cosas se recuerdan.</p>
{#if busyList.length}
  <p class="small-note">⛔ {busyList.map((p) => p.name).join(', ')} {busyList.length > 1 ? 'están' : 'está'} en otra partida: para incluirlos, sácalos antes desde la mesa.</p>
{/if}
{#if sleepy.length}
  <p class="small-note">💤 {sleepy.map((p) => p.name).join(', ')} {sleepy.length > 1 ? 'llevan' : 'lleva'} un rato sin dar señales: {sleepy.length > 1 ? 'quedan fuera' : 'queda fuera'} salvo que los toques.</p>
{/if}
