<script lang="ts">
  // Fin de partida (port de endPhase() de la v1): pancarta del ganador,
  // revelado de todos los roles y vuelta al lobby.
  import { app, navigate } from '../../../core/sync/store.svelte';
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
</script>

<div class="winbanner card">
  <span class="wemoji">{(winnerLabel || '🏁').slice(0, 2)}</span>
  <h2>{winnerLabel || 'Fin de la partida'}</h2>
</div>
<div class="card"><h3>🎭 Los roles eran…</h3><div class="players">
  {#each players as p (p.id)}
    <div class="player {p.alive === false ? 'dead' : ''}">
      <span>{roleDef(p.role)?.emoji || '❔'}</span>
      <span class="pname">{p.name}<br /><small style="color:var(--muted)">{roleDef(p.role)?.name || ''}</small></span>
      {#if p.alive === false}<span>💀</span>{:else}<span>❤️</span>{/if}
    </div>
  {/each}
</div></div>
<!-- Volver = a la mesa: además de reabrir el lobby del grupo, este dispositivo
     navega a /g/<mesa> (con URLs por juego, cada pantalla es una URL). -->
<button class="primary block" data-a="back-lobby" onclick={() => { navigate(`/g/${group.id}`); guard(A.backToLobby); }}>🔁 Volver al lobby</button>
