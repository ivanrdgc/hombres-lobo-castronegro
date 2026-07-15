<script lang="ts">
  // Parrilla de jugadores (port de playersGrid() de la v1): estado de vida,
  // insignias, «dead-peek» para los muertos y nota del narrador.
  import { app, me } from '../../../core/sync/store.svelte';
  import { ROLES } from '../roles';
  import type { RoleId } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';

  const {
    players,
    title = 'Jugadores',
    showAlguacil = null,
    viewer = null,
  }: {
    players: PlayerDoc[];
    title?: string;
    showAlguacil?: string | null;
    viewer?: PlayerDoc | null;
  } = $props();

  // Los muertos pueden descubrir, si quieren, el rol de cualquier jugador
  // (como en el juego físico: los eliminados observan la noche con los ojos abiertos).
  const canPeek = $derived(!!(viewer && viewer.inGame && viewer.alive === false
    && app.group?.game && app.group.game.phase !== 'end'));
  const peeked = $derived(app.ui.deadPeek || {});
  const marks = (p: PlayerDoc) =>
    `${p.infected ? ' 🧛' : ''}${p.transformed ? ' 🐾→🐺' : ''}${p.wolfSide ? ' →🐺' : ''}${p.lover ? ' 💘' : ''}${p.charmed ? ' 🎶' : ''}`;
  const roleDef = (r: RoleId | null | undefined) => (r ? ROLES[r] : undefined);
  const narratorId = $derived(app.group?.masterId ?? null);
  const narratorP = $derived(app.players.find((p) => p.id === narratorId));

  // Un jugador muerto puede descubrir roles tocando a los jugadores (solo lo ve él).
  function deadPeek(pid: string) {
    const my = me();
    if (!my || my.alive !== false) return;
    if (!app.ui.deadPeek) app.ui.deadPeek = {};
    app.ui.deadPeek[pid] = !app.ui.deadPeek[pid];
  }
</script>

<div class="card"><h3>{title}</h3><div class="players">
  {#each players as p (p.id)}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="player {p.alive === false ? 'dead' : ''} {canPeek ? 'selectable' : ''}"
      data-a={canPeek ? 'dead-peek' : undefined}
      data-p={canPeek ? p.id : undefined}
      onclick={() => { if (canPeek) deadPeek(p.id); }}
      role={canPeek ? 'button' : undefined}
      tabindex={canPeek ? 0 : undefined}
      onkeydown={(e) => { if (canPeek && e.key === 'Enter') deadPeek(p.id); }}
    >
      <span class="pname">{p.name}
        {#if canPeek && peeked[p.id]}<br /><small style="color:var(--accent)">{roleDef(p.role)?.emoji || '❔'} {roleDef(p.role)?.name || '—'}{marks(p)}</small>{/if}
      </span>
      {#if p.id === narratorId}<span class="badge">🔊</span>{/if}
      {#if p.role === 'aldeano_aldeano'}<span class="badge" title="Sus dos caras muestran un aldeano">👥 inocente</span>{/if}
      {#if showAlguacil === p.id}<span class="badge">⭐</span>{/if}
      {#if p.revealedTonto}<span class="badge">🤪</span>{/if}
      {#if p.id === me()?.id}<span class="badge you">Tú</span>{/if}
      {#if p.alive === false}<span>💀</span>{/if}
    </div>
  {/each}
</div>
{#if narratorP && !narratorP.inGame}<p class="small-note">🔊 Narra: {narratorP.name}</p>{/if}
{#if canPeek}<p class="small-note">💀 Estás muerto: toca un jugador para descubrir su rol (solo tú lo ves). Y recuerda: los muertos no hablan.</p>{/if}
</div>
