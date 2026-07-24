<script lang="ts">
  // «🎴 Mi carta»: la ÚNICA puerta a lo tuyo (B34) — tus 3 cartas de
  // integridad, si llevas la de LÍDER y todo lo que has investigado. Se llama
  // igual que la pastilla flotante que la abre, y el cuerpo de la partida no
  // tiene ningún otro «ver mi carta». Se abre con un gesto tuyo (la pastilla, o
  // al confirmar una investigación) y, como el móvil acaba plano sobre la mesa
  // (postura de MESA, B28), se TAPA SOLA a los pocos segundos: lo único que
  // queda a la vista son «las reglas», que son públicas e iguales para todos.
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
  <!-- Un solo nombre para esto, aquí y en la pastilla que lo abre: «Mi carta». -->
  <h3 style="margin:0 0 6px">🎴 Mi carta{#if inGame} <span class="small-note" style="font-weight:400">· solo la ves tú</span>{/if}</h3>
  {#if inGame}
    {#if show}
      <div class="rolecard"><span class="remoji">{bandOfPid(game, my.id) === 'honest' ? '👮' : '🦹'}</span>
        <span class="rname">Juegas con {BAND_LABEL[bandOfPid(game, my.id)]}</span>
        <!-- NUMERADAS como en el tablero y en el diario: sin esto no podías
             saber qué vio quien «investiga la carta 2 de ti». -->
        <div class="rdesc">{game.cards[my.id].map((c, i) => `${i + 1}) ${cardLabel(c)}`).join(' · ')}</div>
        <div class="rextra">Tu bando es la MAYORÍA de tus tres cartas: la tercera es del bando contrario y no te delata.
          Los números son los que usa la mesa al investigarte: si el diario dice «tu carta 2», eso es lo que han visto.
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

      <!-- La cortina se rotula por lo que HACE, no con otro nombre para la carta. -->
      <button class="ghost block" style="margin-top:10px" data-a="gc-hide" onclick={hide}>🙈 Tapar</button>
      <p class="small-note" style="text-align:center">Se tapa sola en unos segundos, por si dejas el móvil en la mesa.</p>
    {:else}
      <button class="primary block" data-a="gc-reveal" onclick={() => (show = true)}>👁 Destapar</button>
      <p class="small-note" style="text-align:center">Tapada y guardada hasta el final: destápala cuando nadie mire tu pantalla.</p>
    {/if}
  {:else}
    <p class="small-note">No juegas esta partida, así que no tienes cartas: miras de espectador y ves lo mismo que la mesa.</p>
  {/if}
  <RefRows title="📖 Las reglas: bandos, líderes y qué hace cada acción" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={close}>Cerrar</button>
