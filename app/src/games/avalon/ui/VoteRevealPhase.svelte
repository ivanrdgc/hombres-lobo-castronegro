<script lang="ts">
  // Destape del voto: se muestran TODOS los votos (públicos, como en el
  // original). Cualquiera en juego (o el dispositivo que narra) continúa.
  import { isMaster } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const v = $derived(game.lastVote!);
  const nm = (pid: string) => game.names[pid] || '¿?';
  // El altavoz que no juega también puede continuar (el motor ya se lo permite):
  // sin esto, con la mesa mirando la tele, el botón no salía en ninguna pantalla.
  const canGo = $derived(game.playerIds.includes(my.id) || isMaster());
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
    <!-- El contador vive en el tablero de arriba (que ya suma este rechazo):
         aquí solo lo que PASA AHORA. -->
    <p class="small-note">No hay misión: el liderazgo pasa al siguiente y se vuelve a proponer para la misma misión. {game.voteTrack + 1 >= 5 ? '⚠️ Era el quinto rechazo seguido: el reino cae en el caos y gana el Mal.' : 'Cada rechazo enciende un punto del contador de arriba; a los cinco seguidos, gana el Mal.'}</p>
  {/if}
  {#if canGo}
    <button class="primary block" data-a="av-vote-continue" onclick={() => guard(A.continueAfterVote)}>{v.approved ? '⚔️ A la misión' : game.voteTrack >= 4 ? '🗡️ Quinto rechazo: el reino cae' : '↪️ Siguiente propuesta'}</button>
  {:else}
    <p class="small-note">Esperando a que la mesa continúe…</p>
  {/if}
</div>
