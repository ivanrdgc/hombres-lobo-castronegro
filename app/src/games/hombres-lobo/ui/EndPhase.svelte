<script lang="ts">
  // Fin de partida (port de endPhase() de la v1): pancarta del ganador,
  // revelado de todos los roles y vuelta al lobby.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES } from '../roles';
  import type { RoleId } from '../roles';
  import { WINNER_LABELS } from '../engine';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const players = $derived(app.players.filter((p) => p.inGame));
  const winnerLabel = $derived(game.winner ? WINNER_LABELS[game.winner] : undefined);
  const roleDef = (r: RoleId | null | undefined) => (r ? ROLES[r] : undefined);
  // Al final todo es público: las marcas secretas (encantados del Gaitero,
  // enamorados, infectados, transformados) acompañan al revelado de roles.
  const marks = (p: PlayerDoc) =>
    `${p.infected ? ' 🧛' : ''}${p.transformed ? ' 🐾→🐺' : ''}${p.wolfSide ? ' →🐺' : ''}${p.lover ? ' 💘' : ''}${p.charmed ? ' 🎶' : ''}`;
</script>

<div class="winbanner card">
  <span class="wemoji">{(winnerLabel || '🏁').slice(0, 2)}</span>
  <h2>{winnerLabel || 'Fin de la partida'}</h2>
  {#if game.winner === 'enamorados' && players.some((p) => p.role === 'cupido')}
    <!-- Regla oficial: si los enamorados ganan, Cupido gana con ellos (viva o
         muerto): la pareja fue obra de sus flechas. -->
    <p class="hint">💘 Cupido comparte la victoria: la pareja fue obra de sus flechas.</p>
  {/if}
</div>
<div class="card"><h3>🎭 Los roles eran…</h3><div class="players">
  {#each players as p (p.id)}
    <div class="player {p.alive === false ? 'dead' : ''}">
      <span>{roleDef(p.role)?.emoji || '❔'}</span>
      <span class="pname">{p.name}{marks(p)}<br /><small style="color:var(--muted)">{roleDef(p.role)?.name || ''}</small></span>
      {#if p.alive === false}<span>💀</span>{:else}<span>❤️</span>{/if}
    </div>
  {/each}
</div></div>
<!-- Al reabrir el lobby, TODOS los dispositivos aterrizan en el lobby del
     juego recién jugado (lo recoloca ui-hygiene en la transición). -->
<button class="primary block" data-a="back-lobby" onclick={() => guard(A.backToLobby)}>🔁 Volver al lobby</button>
