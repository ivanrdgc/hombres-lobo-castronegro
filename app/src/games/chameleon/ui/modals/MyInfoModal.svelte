<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta (palabra secreta o Camaleón)
  // y la chuleta de reglas y puntos. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { chamGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? chamGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🦎', name: 'El Camaleón', note: 'uno por ronda', desc: 'No conoce la palabra: improvisa pistas y, si lo pillan, aún gana adivinándola en la rejilla.' },
    { emoji: '🔑', name: 'El grupo', desc: 'Conoce la palabra secreta: pistas ni obvias (se la regalas) ni vagas (sospecharán de ti).' },
    { emoji: '🏆', name: 'Puntos', desc: 'Camaleón sin pillar +2 · pillado pero acierta +1 · pillado y falla: +1 a cada uno del grupo.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
