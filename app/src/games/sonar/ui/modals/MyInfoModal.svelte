<script lang="ts">
  // «🎴 Mi submarino + referencia» (B19/B21): tu tripulación, el estado de tu
  // submarino y la chuleta de todas las acciones. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { sonarGame } from '../../actions';
  import { teamOf, COST_TORPEDO, COST_DRONE, COST_SILENCE, MAX_ENERGY, MAX_HP } from '../../engine';
  import { cellName, quadrantOf } from '../../map';
  import { ACTION_REF } from '../../texts';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? sonarGame(g) : null);
  const my = $derived(me());
  const myTeam = $derived(game && my ? teamOf(game, my.id) : null);
  const sub = $derived(game && myTeam ? game.subs[myTeam] : null);
  // Con la energía que hay AHORA, qué se puede pagar ya y qué no: es la duda
  // que se tiene con la carta abierta.
  const afford = $derived(!sub ? [] : ([
    ['🚀 Torpedo', COST_TORPEDO], ['🛰️ Dron', COST_DRONE], ['🤫 Silencio', COST_SILENCE],
  ] as [string, number][]).map(([n, c]) => `${n}: ${sub.energy >= c ? '✅ sí' : `❌ faltan ${c - sub.energy} ⚡`}`));
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu submarino</h3>
  {#if myTeam && sub}
    <div class="rolecard"><span class="remoji">{myTeam === 'red' ? '🔴' : '🔵'}</span>
      <span class="rname">Tripulas el submarino {myTeam === 'red' ? 'Rojo' : 'Azul'}</span>
      <div class="rdesc">❤️ {sub.hp} de {MAX_HP} · ⚡ {sub.energy} de {MAX_ENERGY} · 📍 {cellName(sub.pos)}, cuadrante {quadrantOf(sub.pos)} (secreto: solo tu equipo lo ve)</div>
      <div class="rdesc">Con {sub.energy} ⚡ → {afford.join(' · ')}</div>
      <div class="rdesc">Estela: {sub.trail.length} casilla{sub.trail.length === 1 ? '' : 's'} que ya no podéis cruzar (⏫ emerger la borra).</div>
      <div class="rdesc">Turnos alternos, UNA acción por turno. Ganar da +1 punto a cada tripulante y el marcador se acumula.</div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin submarino propio (las posiciones son secretas).</p>
  {/if}
  <RefRows title="📖 Acciones del turno" rows={ACTION_REF} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
