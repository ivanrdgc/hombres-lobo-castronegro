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

<div class="topbar">
  <h2>🪑 {group.name}</h2>
  <button class="small ghost" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Salir</button>
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
  <div class="players">
    {#each app.players as p (p.id)}
      {@const busy = busyOf(p.id)}
      <div
        class="player selectable"
        data-a="player-menu"
        data-p={p.id}
        data-busy={busy ? busy.gameId : undefined}
        onclick={() => (app.ui.modal = { type: 'player-menu', pid: p.id })}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') app.ui.modal = { type: 'player-menu', pid: p.id }; }}
      >
        <span class="pname">{p.name}</span>
        {#if busy}<span class="badge" title="Jugando a {gameDef(busy.gameId).name}">{gameDef(busy.gameId).emoji}</span>{/if}
        {#if !isActiveDevice(p, now)}<span class="badge zz" title="Sin señales recientes de este dispositivo">💤</span>{/if}
        {#if me() && p.id === me()!.id}<span class="badge you">Tú</span>{/if}
      </div>
    {/each}
  </div>
  <p class="small-note">Quién juega, el orden de la mesa y quién narra se eligen al empezar cada partida. Toca un dispositivo para expulsarlo{app.matches.length ? ' o sacarlo de su partida' : ''}.</p>
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
<p class="small-note" style="text-align:center;opacity:.7">La mesa se borra sola cuando se marchan todos: usad «🚪 Salir» arriba para dejarla.</p>
<!-- Sello del build a la vista: si un móvil enseña una fecha vieja, está
     sirviendo caché y cualquier «bug» debe verificarse tras recargar. -->
<p class="small-note" style="text-align:center;opacity:.55">{__APP_VERSION__}</p>
