<script lang="ts">
  // Final: equipo ganador y por qué. Otra partida re-reparte palabras.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { TEAM_LABEL, teamMembers } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  void my;
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'red' ? '🔴' : '🔵'}</span>
  <h3 style="margin:6px 0">¡Gana el equipo {game.winner ? TEAM_LABEL[game.winner] : ''}!</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card"><h3>🏆 Equipos</h3>
  {#each (['red', 'blue'] as const) as t (t)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{TEAM_LABEL[t]}{game.winner === t ? ' 👑' : ''}</div>
        <div class="sdesc">{teamMembers(game, t).map(nm).join(', ')}</div></div>
      <b>{game.tokens[t].intercepts}🕵️ · {game.tokens[t].errors}❌</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="de-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="de-back-lobby" onclick={() => guard(() => A.endDecrypto())}>🏁 Terminar y volver al lobby</button>
