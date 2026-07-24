<script lang="ts">
  // El 🎴 ya no hace falta para jugar: tu mano y tu pila están en la pantalla
  // de partida, sin abrir nada (postura 🃏 mano). Aquí queda el recordatorio
  // de bolsillo —qué hace cada disco y cómo se resuelve un reto— con un
  // resumen de lo tuyo por comodidad.
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
    { emoji: '🌸', name: 'Flor', note: '3 por jugador', desc: 'Segura: cada flor levantada suma para la apuesta.' },
    { emoji: '💀', name: 'Calavera', note: '1 por jugador', desc: 'Quien la destapa falla el reto y pierde un disco AL AZAR. Ponértela en tu propia pila es arma de doble filo: tú la levantas primero.' },
    { emoji: '🗣️', name: 'Apostar', desc: '«Levantaré tantas flores seguidas sin topar calavera», como mucho los discos que haya en la mesa. Los demás suben o pasan; pasar es definitivo y quien puja más alto revela.' },
    { emoji: '🎲', name: 'Revelar', desc: 'Tu pila entera primero, de arriba abajo; luego el disco de arriba de las ajenas que elijas. Logradas las flores: un reto ⭐. Dos ⭐ (o quedar el único con discos) ganan la partida.' },
    { emoji: '🔄', name: 'Nueva ronda', desc: 'Cada uno recoge TODA su pila: solo se pierde el disco descartado al fallar. Empieza quien ganó el reto o, si falló, quien perdió el disco.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus discos</h3>
  {#if inGame}
    <p class="small-note" style="margin:0 0 10px">
      En mano <b>{'🌸'.repeat(hand.flowers)}{'💀'.repeat(hand.skulls)}{hand.flowers + hand.skulls === 0 ? '—' : ''}</b>
      · en tu pila, de abajo arriba, <b>{stack.length ? stack.map((d) => (d === 'skull' ? '💀' : '🌸')).join(' ') : 'nada'}</b>.
      Lo tienes también en la partida, sin abrir nada: nadie más mira tu móvil.
    </p>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin discos propios.</p>
  {/if}
  <RefRows title="📖 Reglas de bolsillo" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
