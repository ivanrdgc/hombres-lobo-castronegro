<script lang="ts">
  // Final: bando ganador, cartas destapadas de todos y marcador.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { BAND_LABEL, bandOfPid, isLeader } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GoodCopState } from '../types';
  import PlayersBoard from './PlayersBoard.svelte';

  const { game, my }: { game: GoodCopState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'honest' ? '👮' : '🦹'}</span>
  <h3 style="margin:6px 0">¡Ganan {game.winner ? BAND_LABEL[game.winner] : ''}!</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card"><h3>🃏 Todas las cartas</h3>
  <PlayersBoard game={{ ...game, cards: Object.fromEntries(Object.entries(game.cards).map(([pid, cs]) => [pid, cs.map((c) => ({ ...c, up: true }))])) }} {my} /></div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{bandOfPid(game, pid) === 'honest' ? '👮' : '🦹'} {nm(pid)}{isLeader(game, pid) ? ' ⭐' : ''}{game.winner === bandOfPid(game, pid) ? ' ✅' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="gc-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="gc-back-lobby" onclick={() => guard(() => A.endGoodCop())}>🏁 Terminar y volver al lobby</button>
