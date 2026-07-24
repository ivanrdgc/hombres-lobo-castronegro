<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tus 3 cartas de integridad, lo que has
  // investigado y la chuleta del juego. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { goodCopGame } from '../../actions';
  import { bandOfPid, isLeader, BAND_LABEL } from '../../engine';
  import { cardLabel } from '../../cards';
  import { refRows } from '../../texts';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? goodCopGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  // Historial privado: antes, si otro investigaba antes de que pulsaras
  // «Entendido», tu resultado se perdía para siempre.
  const seen = $derived(game && my ? (game.peeks?.[my.id] || []) : []);
  const rows = $derived(refRows(game?.playerIds.length || 0));
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus cartas de integridad</h3>
  {#if inGame}
    <div class="rolecard"><span class="remoji">{bandOfPid(game, my.id) === 'honest' ? '👮' : '🦹'}</span>
      <span class="rname">Eres de {BAND_LABEL[bandOfPid(game, my.id)]}</span>
      <div class="rdesc">{game.cards[my.id].map(cardLabel).join(' · ')}</div>
      <div class="rextra">Tu bando es la MAYORÍA de tus tres cartas: la tercera es siempre del bando contrario y no te delata.
        {#if isLeader(game, my.id)}<br /><b>Y llevas la carta de LÍDER: si caes, tu bando pierde en el acto.</b> No lo digas en voz alta.{/if}</div>
    </div>
    <h3 style="margin:16px 0 2px">🔍 Lo que has investigado</h3>
    {#if seen.length}
      {#each seen as p, i (i)}
        <div class="settingrow"><div class="sinfo">
          <div class="sname">{game.names[p.target] || '¿?'} · carta {p.idx + 1}</div>
          <div class="sdesc">{cardLabel({ kind: p.kind, role: p.role as never, up: false })}</div>
        </div></div>
      {/each}
      <p class="small-note">Solo tú ves esta lista, y se conserva hasta el final de la partida.</p>
    {:else}
      <p class="small-note" style="margin-top:2px">Todavía nada. Cuando investigues, el resultado quedará aquí guardado: no hace falta memorizarlo.</p>
    {/if}
  {:else}
    <p class="small-note">👀 Miras de espectador: sin cartas propias.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
