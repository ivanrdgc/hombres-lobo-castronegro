<script lang="ts">
  // «🎴 Mi carta»: el ÚNICO sitio donde vive lo tuyo — tus 3 cartas de
  // integridad, si llevas la de LÍDER y todo lo que has investigado. Se abre
  // con un gesto tuyo (el 🎴, o al confirmar una investigación) y, como el
  // móvil acaba plano sobre la mesa (postura de MESA, B28), se OCULTA SOLA a
  // los pocos segundos: lo que queda a la vista es la chuleta, que es pública.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import { ackPeeks, goodCopGame } from '../../actions';
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

  // Se abre ya destapado (tocar el 🎴 ES el gesto) y se vuelve a tapar solo.
  let show = $state(true);
  $effect(() => {
    if (!show) return;
    const t = setTimeout(hide, 12000);
    return () => clearTimeout(t);
  });
  function markRead() {
    if (seen.some((p) => !p.ack)) guard(ackPeeks);
  }
  function hide() {
    show = false;
    markRead();
  }
  function close() {
    markRead();
    app.ui.modal = null;
  }
</script>

{#if game && my}
  {#if inGame}
    <h3 style="margin:0 0 6px">🎴 Lo tuyo, a solas</h3>
    {#if show}
      <div class="rolecard"><span class="remoji">{bandOfPid(game, my.id) === 'honest' ? '👮' : '🦹'}</span>
        <span class="rname">Juegas con {BAND_LABEL[bandOfPid(game, my.id)]}</span>
        <div class="rdesc">{game.cards[my.id].map(cardLabel).join(' · ')}</div>
        <div class="rextra">Tu bando es la MAYORÍA de tus tres cartas: la tercera es del bando contrario y no te delata.
          {#if isLeader(game, my.id)}<br /><b>Llevas la carta de LÍDER: si caes, tu bando pierde en el acto.</b> No lo digas en voz alta.{/if}</div>
      </div>

      <h3 style="margin:16px 0 2px">🔍 Lo que has visto</h3>
      {#if seen.length}
        {#each seen as p, i (i)}
          <div class="settingrow"><div class="sinfo">
            <div class="sname">{p.ack ? '' : '🆕 '}{game.names[p.target] || '¿?'} · carta {p.idx + 1}</div>
            <div class="sdesc">{cardLabel({ kind: p.kind, role: p.role as never, up: false })}</div>
          </div></div>
        {/each}
        <p class="small-note">Cada uno lleva 1 carta del bando contrario: una sola no prueba nada, dos del mismo bando sí.</p>
      {:else}
        <p class="small-note" style="margin-top:2px">Nada todavía. Investiga en tu turno y el resultado se guardará aquí hasta el final.</p>
      {/if}

      <button class="ghost block" style="margin-top:10px" data-a="gc-hide" onclick={hide}>🙈 Tapar ya</button>
      <p class="small-note" style="text-align:center">Se tapa sola en unos segundos, por si dejas el móvil en la mesa.</p>
    {:else}
      <button class="primary block" data-a="gc-reveal" onclick={() => (show = true)}>👁 Ver mis cartas y lo que he visto</button>
      <p class="small-note" style="text-align:center">Tapado y guardado hasta el final: ábrelo cuando nadie mire tu pantalla.</p>
    {/if}
  {:else}
    <h3 style="margin:0 0 6px">🎴 Miras de espectador</h3>
    <p class="small-note">Sin cartas propias: solo ves lo que ve toda la mesa.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={close}>Cerrar</button>
