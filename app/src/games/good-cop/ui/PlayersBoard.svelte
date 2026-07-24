<script lang="ts">
  // Tablero público, todo lo que en la mesa real está a la vista: cuántos hay de
  // cada bando, quién queda en pie, quién va armado 🔫, a quién apunta cada uno
  // 🎯, y de los caídos sus 3 cartas destapadas (con el bando que resultaron
  // ser). NADIE ve cartas de cara mientras vive, ni siquiera las suyas: los
  // móviles acaban sobre la mesa y el 🎴 (privado) ya te las enseña.
  import { cardLabel } from '../cards';
  import { aimersOf, bandCounts, bandOf, nextAlive } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GoodCopState } from '../types';

  const { game, my }: { game: GoodCopState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  // Quién me apunta a MÍ: con 6-8 filas, leerlas todas era imposible.
  const aimingAtMe = $derived(game.alive[my.id] ? aimersOf(game, my.id).map(nm) : []);

  const total = $derived(game.playerIds.length);
  const counts = $derived(bandCounts(total));
  const aliveN = $derived(game.playerIds.filter((p) => game.alive[p]).length);
  // Bando de un caído: solo cuando sus 3 cartas están destapadas (así el fin de
  // partida, que las destapa todas, también lo etiqueta sin filtrar nada).
  const shown = (pid: string) => game.cards[pid].every((c) => c.up);
  const bandOfShown = (pid: string) => bandOf(game.cards[pid]);
  const leaderOfShown = (pid: string) => game.cards[pid].find((c) => c.role)?.role ?? null;
  const fallen = $derived(game.playerIds.filter((p) => !game.alive[p] && shown(p)));
  const fallenLine = $derived.by(() => {
    const h = fallen.filter((p) => bandOfShown(p) === 'honest').length;
    return fallen.length ? `❌ Han caído: ${h} 👮 y ${fallen.length - h} 🦹` : '';
  });
  const inTurn = $derived(game.phase === 'turn');
  const nextPid = $derived(inTurn && aliveN > 1 ? nextAlive(game, game.turn) : null);
</script>

<!-- Los números públicos, sin memorizar (punto 7 del contrato de UI). -->
<div class="gctally">
  <span class="gcpill">🧮 {counts.honest} 👮 honestos · {counts.crook} 🦹 corruptos</span>
  <span class="gcpill">👥 {aliveN} en pie de {total}</span>
  {#if fallenLine}<span class="gcpill out">{fallenLine}</span>{/if}
</div>

<div class="gcboard">
  {#each game.playerIds as pid (pid)}
    {@const mine = pid === my.id}
    {@const dead = !game.alive[pid]}
    {@const turn = inTurn && game.turn === pid}
    <div class="gcrow {turn ? 'active' : ''} {dead ? 'out' : ''}">
      <div class="gcmain">
        <span class="gcname">{dead ? '❌ ' : ''}{nm(pid)}{mine ? ' (tú)' : ''}</span>
        {#if turn}<span class="gcbadge turnb">🎬 juega ahora</span>
        {:else if !dead && pid === nextPid}<span class="gcbadge">⏭️ siguiente</span>{/if}
        {#if dead}
          <span class="gcflag dead">
            {shown(pid)
              ? `era ${leaderOfShown(pid) ? (leaderOfShown(pid) === 'agent' ? 'el 🕵️ AGENTE' : 'el 👑 JEFE') : bandOfShown(pid) === 'honest' ? '👮 honesto' : '🦹 corrupto'}`
              : 'eliminado'}
          </span>
        {:else}
          {#if game.armed[pid]}<span class="gcflag gun">🔫 armado</span>{/if}
          {#if game.aimAt[pid]}<span class="gcflag aim">🎯 apunta a {nm(game.aimAt[pid]!)}</span>{/if}
          {#if !game.armed[pid] && !game.aimAt[pid]}<span class="gcflag calm">sin arma</span>{/if}
          {#if mine && aimingAtMe.length}<span class="gcflag danger" data-a="gc-aimed-at-me">⚠️ TE apuntan: {aimingAtMe.join(', ')}</span>{/if}
        {/if}
      </div>

      <div class="gccards">
        {#each game.cards[pid] as c, i (i)}
          <span class="gccard {c.up ? (c.kind === 'crook' ? 'crook' : 'honest') : 'back'}">
            <b class="gcidx">{i + 1}</b>{c.up ? cardLabel(c) : '🂠'}
          </span>
        {/each}
      </div>
    </div>
  {/each}
</div>
<p class="gclegend">🂠 carta boca abajo (nadie la ve) · 1 2 3 el número que dice el diario al investigar · 🔫 armado · 🎯 su diana. Al caer, las 3 cartas se destapan para todos.</p>

<style>
  .gctally { display: flex; flex-wrap: wrap; gap: 6px; }
  .gcpill { font-size: 0.78rem; padding: 4px 10px; border-radius: var(--r-full); border: 1px solid var(--border); background: var(--card2); color: var(--muted); }
  .gcpill.out { color: #e0aab2; border-color: color-mix(in srgb, var(--danger) 55%, var(--border)); }
  .gcboard { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 6px; }
  /* Una fila por jugador y, si cabe, una sola línea: con 8 en mesa el tablero
     no puede empujar el panel de acción fuera de la pantalla del móvil. */
  .gcrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 7px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--card2); }
  .gcrow.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
  .gcrow.out { opacity: 0.62; }
  .gcmain { flex: 1 1 150px; min-width: 0; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .gcname { font-size: 0.92rem; font-weight: 700; }
  .gcbadge { font-size: 0.72rem; padding: 2px 8px; border-radius: var(--r-full); border: 1px solid var(--border); color: var(--muted); }
  .gcbadge.turnb { border-color: var(--accent); color: var(--moon); background: color-mix(in srgb, var(--accent) 16%, transparent); }
  .gccards { display: flex; gap: 5px; flex-wrap: wrap; margin-left: auto; justify-content: flex-end; }
  .gccard { display: inline-flex; align-items: center; gap: 4px; font-size: 0.76rem; padding: 3px 7px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg-1); }
  .gcidx { font-size: 0.64rem; color: var(--ink-3); font-weight: 700; }
  .gccard.back { font-size: 0.95rem; padding: 2px 7px; }
  .gccard.honest { background: #1d3a4a; border-color: #3a7ca0; }
  .gccard.crook { background: #4a1d2a; border-color: #a03a5a; }
  .gcflag { font-size: 0.78rem; padding: 2px 8px; border-radius: var(--r-full); border: 1px solid var(--border); color: var(--muted); }
  .gcflag.gun { color: var(--moon); border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); }
  .gcflag.aim { color: #e0aab2; border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); }
  .gcflag.calm { opacity: 0.6; }
  .gcflag.danger { color: #f3c2c2; font-weight: 700; background: color-mix(in srgb, var(--danger) 20%, transparent); border-color: var(--danger); }
  .gcflag.dead { font-style: italic; }
  .gclegend { font-size: 0.76rem; color: var(--ink-3); line-height: 1.35; }
</style>
