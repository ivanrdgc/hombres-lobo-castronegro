<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tus discos (mano y pila propia) y la
  // chuleta de reglas. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { skullGame, inHand, placed } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? skullGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const hand = $derived(game && my && inGame ? inHand(game, my.id) : { flowers: 0, skulls: 0 });
  const stack = $derived(game && my && inGame ? placed(game, my.id) : []);
  const rows = [
    { emoji: '🌸', name: 'Flor', note: '3 por jugador', desc: 'Segura de levantar: suma para la apuesta.' },
    { emoji: '💀', name: 'Calavera', note: '1 por jugador', desc: 'Si el que revela la destapa, falla y pierde un disco AL AZAR. Ponértela a ti mismo es un arma de doble filo: tú la levantas primero.' },
    { emoji: '🗣️', name: 'La apuesta', desc: '«Levantaré N flores seguidas sin topar calavera» (máx.: discos en mesa). Los demás suben o pasan; el que puja más alto revela.' },
    { emoji: '🎲', name: 'El revelado', desc: 'Primero TODA tu pila; luego el disco de arriba de las pilas que elijas. Logradas las N flores: un reto ⭐. Dos ⭐ (o quedar el último con discos) ganan la partida.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus discos</h3>
  {#if inGame}
    <div class="rolecard"><span class="remoji">💠</span>
      <span class="rname">En mano: {'🌸'.repeat(hand.flowers)}{'💀'.repeat(hand.skulls)}{hand.flowers + hand.skulls === 0 ? '—' : ''}</span>
      <div class="rdesc">Tu pila (de abajo arriba): {stack.length ? stack.map((d) => (d === 'skull' ? '💀' : '🌸')).join(' ') : 'vacía'}. Solo tú la ves.</div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin discos propios.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
