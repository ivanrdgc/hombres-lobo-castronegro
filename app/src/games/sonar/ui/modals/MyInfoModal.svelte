<script lang="ts">
  // «🎴 Mi submarino + referencia» (B19/B21): tu tripulación, el estado de tu
  // submarino y la chuleta de todas las acciones. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { sonarGame } from '../../actions';
  import { teamOf, COST_TORPEDO, COST_DRONE, COST_SILENCE } from '../../engine';
  import { cellName } from '../../map';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? sonarGame(g) : null);
  const my = $derived(me());
  const myTeam = $derived(game && my ? teamOf(game, my.id) : null);
  const rows = [
    { emoji: '🧭', name: 'Navegar', note: '+1 ⚡', desc: 'Una casilla al Norte, Sur, Este u Oeste. El rumbo SE ANUNCIA a toda la mesa. Prohibido: islas, bordes y tu propia estela.' },
    { emoji: '🚀', name: 'Torpedo', note: `${COST_TORPEDO} ⚡`, desc: 'Casilla a distancia 4 o menos. Directo: 2 de daño; pegadas: 1 (¡tu submarino también sufre la onda!). El disparo y el resultado son públicos.' },
    { emoji: '🛰️', name: 'Dron', note: `${COST_DRONE} ⚡`, desc: 'La app canta EN ALTO el cuadrante real del rival (Noroeste, Noreste, Suroeste o Sureste).' },
    { emoji: '🤫', name: 'Silencio', note: `${COST_SILENCE} ⚡`, desc: 'Te mueves una casilla SIN anunciar el rumbo (la mesa solo sabe que te moviste).' },
    { emoji: '⏫', name: 'Emerger', note: 'gratis', desc: 'Borra tu estela para poder volver a maniobrar… a cambio de cantar tu cuadrante. Siempre legal.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu submarino</h3>
  {#if myTeam}
    <div class="rolecard"><span class="remoji">{myTeam === 'red' ? '🔴' : '🔵'}</span>
      <span class="rname">Tripulas el submarino {myTeam === 'red' ? 'Rojo' : 'Azul'}</span>
      <div class="rdesc">❤️ {game.subs[myTeam].hp} de 3 · ⚡ {game.subs[myTeam].energy} de 6 · 📍 {cellName(game.subs[myTeam].pos)} (secreto: solo tu equipo lo ve)</div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin submarino propio (las posiciones son secretas).</p>
  {/if}
  <RefRows title="📖 Acciones del turno" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
