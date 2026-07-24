<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu papel de esta ronda (Psíquico o
  // equipo) y la chuleta de puntuación. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { wavelengthGame, psychicId } from '../../actions';
  import { spectrumLabel } from '../../spectrums';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? wavelengthGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const iAmPsychic = $derived(!!game && !!my && psychicId(game) === my.id);
  const rows = [
    { emoji: '🙈', name: 'Cómo se coge el móvil', desc: 'El Psíquico sujeta el suyo mirando hacia él y no lo enseña a nadie (su diana va tapada: aparece mientras mantiene pulsado). El equipo comparte un dial público que se mira y se mueve entre todos.' },
    { emoji: '🔮', name: 'El Psíquico', note: 'rota cada ronda', desc: 'Ve la diana en su dial y da UNA pista en voz alta que caiga justo ahí (puede escribirla para que la mesa la relea). Después calla: ni aclaraciones ni tocar el dial.' },
    { emoji: '🎚️', name: 'El equipo', desc: 'Debate la pista y mueve el marcador, que es COMPARTIDO: se ve igual en todos los móviles. Uno lo fija por consenso, con doble toque. El Psíquico no participa.' },
    { emoji: '📏', name: 'El dial', note: 'de 0 a 100', desc: '0 es el extremo izquierdo del espectro, 100 el derecho y 50 el centro. La app dice el objetivo en esa escala.' },
    { emoji: '🎯', name: 'Puntos por cercanía', desc: 'Centro de la diana: 4 · cerca: 3 · rozando: 2 · fuera: 0. Los suma el Psíquico de la ronda y también el total del equipo.' },
    { emoji: '⏭️', name: 'Salidas del menú ⋯', desc: '«Saltar ronda» la anula sin puntuar y pasa el turno (la pulsa cualquiera). «Terminar» cierra la partida para todos y borra el marcador.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu papel en esta ronda</h3>
  {#if inGame}
    <div class="rolecard"><span class="remoji">{iAmPsychic ? '🔮' : '🎚️'}</span>
      <span class="rname">{iAmPsychic ? 'Eres el Psíquico' : 'Eres del equipo'}</span>
      <div class="rdesc">Espectro: <b>{spectrumLabel(game.spectrumId)}</b>.
        {iAmPsychic ? '🙈 Solo tú ves la diana: móvil hacia ti y no la enseñes a nadie, tampoco a los tuyos.' : 'Interpretad la pista y colocad el marcador entre todos.'}</div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
