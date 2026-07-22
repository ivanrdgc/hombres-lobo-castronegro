<script lang="ts">
  // Final: se destapan todos los bandos, el ganador y el porqué.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLE_LABEL, factionOf } from '../roles';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const meId = my.id;
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="narration">📣 Cae el telón: se destapan todos los bandos.</div>

<div class="card" style="text-align:center">
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS[game.winner] : ''}</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
  <p class="small-note" style="font-weight:700">🕊️ {game.liberalPolicies} decretos liberales · 🐷 {game.fascistPolicies} fascistas</p>
</div>

<div class="card">
  <h3>🎭 Los bandos</h3>
  {#each game.playerIds as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo">
        <div class="sname">{nm(pid)}{pid === meId ? ' (tú)' : ''} {game.alive[pid] === false ? '💀' : ''}</div>
        <div class="sdesc">{factionOf(game.roles[pid]) === 'fascist' ? '🐷' : '🕊️'} {ROLE_LABEL[game.roles[pid]]}</div>
      </div>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sh-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (mismos jugadores)</button>
<button class="ghost block" data-a="sh-back-lobby" onclick={() => guard(() => A.endSecretHitler())}>🏁 Terminar y volver al lobby</button>
