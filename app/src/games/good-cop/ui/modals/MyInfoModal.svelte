<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tus 3 cartas de integridad y la
  // chuleta del juego. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { goodCopGame } from '../../actions';
  import { bandOfPid, BAND_LABEL } from '../../engine';
  import { cardLabel } from '../../cards';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? goodCopGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '👮', name: 'Honestos', desc: 'Ganan si cae el 👑 Jefe (el líder corrupto). Su líder es el 🕵️ Agente: protegedlo.' },
    { emoji: '🦹', name: 'Corruptos', desc: 'Ganan si cae el 🕵️ Agente. Su líder es el 👑 Jefe: que no lo encuentren.' },
    { emoji: '🔍', name: 'Investigar', desc: 'Miras EN SECRETO una carta boca abajo de otro. Nadie más ve el resultado.' },
    { emoji: '🔫', name: 'Armarse · 🎯 Apuntar · 💥 Disparar', desc: 'Una acción por turno. El arma y la diana son públicas; disparar gasta la bala, elimina al blanco y destapa sus cartas.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus cartas de integridad</h3>
  {#if inGame}
    <div class="rolecard"><span class="remoji">{bandOfPid(game, my.id) === 'honest' ? '👮' : '🦹'}</span>
      <span class="rname">Eres de {BAND_LABEL[bandOfPid(game, my.id)]}</span>
      <div class="rdesc">{game.cards[my.id].map(cardLabel).join(' · ')}</div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin cartas propias.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
