<script lang="ts">
  // Final: facción ganadora, identidades destapadas y marcador (con neutrales).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { charOf, factionOf } from '../engine';
  import { FACTION_LABEL } from '../chars';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ShadowHState } from '../types';
  import PlayersBoard from './PlayersBoard.svelte';

  const { game, my }: { game: ShadowHState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<!-- Sin bando ganador es EMPATE (cayeron a la vez los últimos de ambos): antes
     el titular se quedaba en «¡Ganan !». -->
<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'hunter' ? '🏹' : game.winner === 'shadow' ? '🌑' : '🤝'}</span>
  <h3 style="margin:6px 0">{game.winner ? `¡Ganan ${FACTION_LABEL[game.winner]}!` : '🤝 Empate: ningún bando gana'}</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
  {#if game.winners.some((p) => factionOf(game, p) === 'neutral')}
    <p class="small-note">🧭 También ganan: {game.winners.filter((p) => factionOf(game, p) === 'neutral').map(nm).join(', ')} (objetivo propio cumplido).</p>
  {/if}
</div>

<div class="card"><h3>🎭 Todas las identidades</h3>
  <PlayersBoard {game} {my} /></div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    {@const c = charOf(game, pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{c.emoji} {nm(pid)} · {c.name}{game.winners.includes(pid) ? ' ✅' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sh-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="sh-back-lobby" onclick={() => guard(() => A.endShadowH())}>🏁 Terminar y volver al lobby</button>
