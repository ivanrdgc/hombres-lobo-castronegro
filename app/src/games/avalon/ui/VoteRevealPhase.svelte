<script lang="ts">
  // Destape del voto: se muestran TODOS los votos (públicos, como en el
  // original). Cualquiera en juego (o el narrador) continúa.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const v = $derived(game.lastVote!);
  const nm = (pid: string) => game.names[pid] || '¿?';
  const canGo = $derived(game.playerIds.includes(my.id));
</script>

<!-- El titular iba dos veces (narración + título). Se queda el título, con el
     recuento dentro, y debajo los nombres, que es lo que la mesa discute. -->
<div class="card">
  <h3>{v.approved ? '✅ Propuesta aprobada' : '👎 Propuesta rechazada'} · {v.approvals.length} a {v.rejections.length}</h3>
  <p class="small-note">👍 A favor: <b>{v.approvals.length ? v.approvals.map(nm).join(', ') : '—'}</b></p>
  <p class="small-note">👎 En contra: <b>{v.rejections.length ? v.rejections.map(nm).join(', ') : '—'}</b></p>
  {#if v.approved}
    <p class="small-note">Parten a la misión {game.quest}: <b>{v.team.map(nm).join(', ')}</b>.</p>
  {:else}
    <p class="small-note">Propuestas rechazadas seguidas: <b>{game.voteTrack + 1}/5</b> (a las 5, gana el Mal).</p>
  {/if}
  {#if canGo}
    <button class="primary block" data-a="av-vote-continue" onclick={() => guard(A.continueAfterVote)}>{v.approved ? '⚔️ A la misión' : game.voteTrack >= 4 ? '🗡️ Quinto rechazo: el reino cae' : '↪️ Siguiente propuesta'}</button>
  {:else}
    <p class="small-note">Esperando a que la mesa continúe…</p>
  {/if}
</div>
