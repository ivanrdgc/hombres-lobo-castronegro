<script lang="ts">
  // La mesa: SOLO personas (quién está, invitar, expulsar), las partidas en
  // curso (varias a la vez: mirar, sacar a alguien o terminarlas) y el
  // catálogo de juegos. Quién juega, el orden y el narrador se eligen al
  // empezar cada partida (pantalla «Empezar partida» del juego).
  import { app, me, navigate } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../core/sync/group-actions';
  import { isActiveDevice } from '../core/sync/presence';
  import { GAME_DEFS, gameDef } from '../games/registry';
  import { seatingOrder } from './ui-helpers';
  import { seatInsertIndex } from '../core/util/seat-insert';
  import type { GroupDoc, MatchDoc, PlayerDoc } from '../core/sync/schema';
  import Flash from './Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const shareUrl = $derived(location.origin + '/g/' + group.id);
  let copied = $state(false);

  // Presencia viva para el badge 💤.
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 10000);
    return () => clearInterval(t);
  });

  // ¿Qué partida ocupa a cada dispositivo? (para el icono y el menú)
  const busyOf = (pid: string): MatchDoc | undefined =>
    app.matches.find((m) => (m.members || []).includes(pid));

  const meId = $derived(me()?.id);

  // ——— Orden de la mesa por arrastre (mismo mecanismo que «Empezar partida»):
  // se puede reordenar también aquí, en la pantalla principal. Persiste en
  // group.seating (setSeating). Durante el arrastre manda un orden local. ———
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
    if (!(e.target as HTMLElement).closest('[data-drag]')) return;
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
      const el = listEl.querySelector<HTMLElement>(`.player[data-p="${dragging}"]`);
      const b0 = el?.getBoundingClientRect();
      dragOrder = next;
      moved = true;
      requestAnimationFrame(() => {
        const b1 = el?.getBoundingClientRect();
        if (b0 && b1) { start.x += b1.left - b0.left; start.y += b1.top - b0.top; dragXY = { x: e.clientX - start.x, y: e.clientY - start.y }; }
      });
    }
  }
  function onPointerUp() {
    if (!dragging) return;
    const finalOrder = dragOrder;
    const didMove = moved;
    dragging = null;
    app.ui.dragging = false;
    if (didMove && finalOrder) guard(() => A.setSeating(finalOrder)).then(() => (dragOrder = null));
    else dragOrder = null;
  }
  // Abre el menú del dispositivo (salvo que venga de un arrastre: clic fantasma).
  function openMenu(pid: string) {
    if (moved) { moved = false; return; }
    app.ui.modal = { type: 'player-menu', pid };
  }

  const names = (m: MatchDoc): string =>
    (m.members || []).map((pid) => app.players.find((p) => p.id === pid)?.name || '¿?').join(', ');

  // Estado breve de una partida para su tarjeta en la mesa.
  function statusLine(m: MatchDoc): string {
    const g = m.game as unknown as {
      phase?: string; night?: number; dayNum?: number; round?: number; mode?: string; espia?: boolean;
    } | null;
    if (!g) return '';
    if (g.espia) {
      const f = ({ reveal: 'identidades repartidas', play: 'el reloj corre', timeup: 'acusaciones finales', end: 'marcador' } as Record<string, string>)[g.phase || ''] || '';
      return `Ronda ${g.round || 1} · ${f}`;
    }
    if (g.phase === 'manual') return 'partida manual';
    if (g.phase === 'reveal') return 'repartiendo cartas';
    if (g.phase === 'night') return `noche ${g.night}`;
    if (g.phase === 'day') return `día ${g.dayNum}`;
    if (g.phase === 'end') return 'desenlace en pantalla';
    return '';
  }

  // Copia el enlace de la mesa (con fallback execCommand sobre #share-url).
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const inp = document.getElementById('share-url') as HTMLInputElement | null;
      if (inp) {
        inp.select();
        document.execCommand('copy');
      }
    }
    copied = true;
  }
</script>

<svelte:document onpointermove={onPointerMove} onpointerup={onPointerUp} onpointercancel={onPointerUp} />

<div class="topbar">
  <h2>🪑 {group.name}</h2>
</div>
<div class="card">
  <h3>🔗 Invita a tu mesa</h3>
  <div class="linkbox">
    <input type="text" id="share-url" value={shareUrl} readonly />
    <button class="small primary" data-a="copy-url" onclick={copyUrl}>📋 Copiar</button>
  </div>
  <div id="copy-feedback">
    {#if copied}<p class="copyok">✔️ Enlace copiado: compártelo por WhatsApp o donde quieras.</p>{/if}
  </div>
</div>
<Flash />
{#if app.matches.length}
  <div class="card">
    <h3>🎲 Partidas en curso</h3>
    {#each app.matches as m (m.id)}
      {@const def = gameDef(m.gameId)}
      <div class="card" style="margin:10px 0 4px" data-match={m.id}>
        <h3>{def.emoji} {def.name} <span class="chip">{statusLine(m)}</span></h3>
        <p class="small-note">{names(m)}</p>
        <div class="btnrow">
          <button class="small" data-a="watch-match" data-p={m.id}
            onclick={() => navigate(`/g/${group.id}/${m.gameId}/partida/${m.id}`)}>👀 Mirar</button>
          <button class="small danger" data-a="end-match-open" data-p={m.id}
            onclick={() => (app.ui.modal = { type: 'confirm-end-match', mid: m.id })}>🛑 Terminar…</button>
        </div>
      </div>
    {/each}
    <p class="small-note">Los que no estén en ninguna partida pueden empezar otra abajo.</p>
  </div>
{/if}
<div class="card">
  <h3>📱 Dispositivos ({app.players.length})</h3>
  <div class="players seatable" bind:this={listEl}>
    {#each rows as p (p.id)}
      {@const busy = busyOf(p.id)}
      <div
        class="player selectable {dragging === p.id ? 'dragging' : ''}"
        style={dragging === p.id ? `transform: translate(${dragXY.x}px, ${dragXY.y}px)` : ''}
        data-a="player-menu"
        data-p={p.id}
        data-busy={busy ? busy.gameId : undefined}
        onpointerdown={(e) => onPointerDown(e, p.id)}
        onclick={() => openMenu(p.id)}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') openMenu(p.id); }}
      >
        <span class="draghandle" data-a="noop" data-drag={p.id} title="Arrastra para ordenar la mesa">⠿</span>
        <span class="pname">{p.name}</span>
        {#if busy}<span class="badge" title="Jugando a {gameDef(busy.gameId).name}">{gameDef(busy.gameId).emoji}</span>{/if}
        {#if !isActiveDevice(p, now)}<span class="badge zz" title="Sin señales recientes de este dispositivo">💤</span>{/if}
        {#if p.id === meId}<span class="badge you">Tú</span>{/if}
      </div>
    {/each}
  </div>
  <p class="small-note">Arrastra el asa ⠿ para ordenar la mesa (sentido horario, como estáis sentados); se recuerda para todas las partidas. Toca un dispositivo para expulsarlo{app.matches.length ? ' o sacarlo de su partida' : ''}; toca el TUYO para abandonar la mesa.</p>
</div>
<div class="card">
  <h3>🗣️ Voz del narrador</h3>
  <p class="small-note" style="margin-top:0">Prueba y ajusta la voz de este dispositivo (motor, voz, velocidad y ambiente). Déjalo a punto aquí y las partidas sonarán sin cortes cuando le deis a jugar.</p>
  <button class="ghost block" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; }}>🗣️ Probar o configurar la voz de este dispositivo</button>
</div>
<div class="card">
  <h3>🎮 ¿A qué jugamos?</h3>
  {#each GAME_DEFS as j (j.id)}
    <div class="card" style="margin:10px 0 4px">
      <h3>{j.emoji} {j.name} <span class="chip" style="font-weight:400">👥 {j.minPlayers}–{j.maxPlayers}</span></h3>
      <p class="small-note">{j.desc}</p>
      <button class="primary block" data-a="select-game" data-p={j.id} onclick={() => { navigate(`/g/${group.id}/${j.id}`); guard(() => A.selectGame(j.id)); }}>{j.emoji} Jugar a esto</button>
    </div>
  {/each}
  <p class="small-note">Puede haber varias partidas a la vez: cada una con su grupo de la mesa.</p>
</div>
<p class="small-note" style="text-align:center;opacity:.7">La mesa se borra sola cuando se marchan todos: tocad vuestro nombre y «Abandonar» para dejarla.</p>
<!-- Sello del build a la vista: si un móvil enseña una fecha vieja, está
     sirviendo caché y cualquier «bug» debe verificarse tras recargar. -->
<p class="small-note" style="text-align:center;opacity:.55">{__APP_VERSION__}</p>
