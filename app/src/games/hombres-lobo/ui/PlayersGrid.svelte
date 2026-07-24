<script lang="ts">
  // Parrilla de jugadores (port de playersGrid() de la v1): estado de vida,
  // insignias, «dead-peek» para los muertos y nota del narrador.
  // B25/B26: la información PÚBLICA que la mesa ya conoce se ve en la ficha
  // (⭐ voto doble, 🐦‍⬛ dos votos extra, 🤪 sin voto, 👥 inocente) y ninguna
  // insignia queda sin explicar: debajo va su leyenda, siempre visible.
  import { app, me, viewGroup } from '../../../core/sync/store.svelte';
  import { ROLES } from '../roles';
  import type { RoleId } from '../roles';
  import type { PlayerDoc } from '../../../core/sync/schema';

  const {
    players,
    title = 'Jugadores',
    showAlguacil = null,
    marked = null,
    viewer = null,
  }: {
    players: PlayerDoc[];
    title?: string;
    showAlguacil?: string | null;
    /** Señalado por el Cuervo: 2 votos extra (solo de día, ya es público). */
    marked?: string | null;
    viewer?: PlayerDoc | null;
  } = $props();

  // Los muertos pueden descubrir, si quieren, el rol de cualquier jugador
  // (como en el juego físico: los eliminados observan la noche con los ojos abiertos).
  const canPeek = $derived(!!(viewer && viewer.inGame && viewer.alive === false
    && viewGroup()?.game && viewGroup()!.game!.phase !== 'end'));
  const peeked = $derived(app.ui.deadPeek || {});
  const marks = (p: PlayerDoc) =>
    `${p.infected ? ' 🧛' : ''}${p.transformed ? ' 🐾→🐺' : ''}${p.wolfSide ? ' →🐺' : ''}${p.lover ? ' 💘' : ''}${p.charmed ? ' 🎶' : ''}`;
  const roleDef = (r: RoleId | null | undefined) => (r ? ROLES[r] : undefined);
  const narratorId = $derived(viewGroup()?.masterId ?? null);
  const narratorP = $derived(app.players.find((p) => p.id === narratorId));

  const aliveN = $derived(players.filter((p) => p.alive).length);
  const deadN = $derived(players.filter((p) => p.alive === false).length);
  // La leyenda solo enseña las insignias que HAY en esta mesa: nada de glosario
  // inventado, y nada de un emoji suelto sin explicación.
  const legend = $derived.by(() => {
    const l: string[] = [];
    if (showAlguacil && players.some((p) => p.id === showAlguacil)) l.push('⭐ Alguacil: su voto vale doble');
    if (marked && players.some((p) => p.id === marked)) l.push('🐦‍⬛ señalado por el Cuervo: 2 votos extra hoy');
    if (players.some((p) => p.revealedTonto)) l.push('🤪 Tonto descubierto: ya no vota');
    if (players.some((p) => p.role === 'aldeano_aldeano')) l.push('👥 inocente certificado por su carta');
    if (narratorId && players.some((p) => p.id === narratorId)) l.push('🔊 narra la partida');
    if (deadN) l.push('💀 muerto');
    return l;
  });

  // Un jugador muerto puede descubrir roles tocando a los jugadores (solo lo ve él).
  function deadPeek(pid: string) {
    const my = me();
    if (!my || my.alive !== false) return;
    if (!app.ui.deadPeek) app.ui.deadPeek = {};
    app.ui.deadPeek[pid] = !app.ui.deadPeek[pid];
  }
</script>

<div class="card"><h3>{title}</h3>
<p class="small-note" style="margin-top:0">{aliveN} vivos{deadN ? ` · ${deadN} en el cementerio` : ''}</p>
<div class="players">
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
      <!-- Los muertos ven las marcas ocultas (encantados 🎶, enamorados 💘…)
           de un vistazo, sin tener que tocar jugador a jugador. -->
      {#if canPeek && marks(p)}<span class="badge">{marks(p).trim()}</span>{/if}
      {#if p.id === narratorId}<span class="badge">🔊</span>{/if}
      {#if p.role === 'aldeano_aldeano'}<span class="badge">👥 inocente</span>{/if}
      {#if showAlguacil === p.id}<span class="badge">⭐ ×2</span>{/if}
      {#if marked === p.id && p.alive}<span class="badge">🐦‍⬛ +2</span>{/if}
      {#if p.revealedTonto}<span class="badge">🤪</span>{/if}
      {#if p.id === me()?.id}<span class="badge you">Tú</span>{/if}
      {#if p.alive === false}<span>💀</span>{/if}
    </div>
  {/each}
</div>
{#if legend.length}<p class="small-note">{legend.join(' · ')}</p>{/if}
{#if narratorP && !narratorP.inGame}<p class="small-note">🔊 Narra: {narratorP.name}</p>{/if}
{#if canPeek}<p class="small-note">💀 Estás muerto: toca un jugador para descubrir su rol (solo tú lo ves). Y recuerda: los muertos no hablan.</p>{/if}
</div>
