<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta INICIAL (recuerda: pudo
  // cambiar) y el mazo completo de la partida. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { unaNocheGame } from '../../actions';
  import { ROLES } from '../../roles';
  import type { RoleId } from '../../types';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? unaNocheGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = $derived(game ? (game.selectedRoles || []).filter((r: RoleId) => !!ROLES[r]) : []);
  // Cada fila abre el detalle del rol (como las chips de «🎴 Cartas en juego»)
  // y al cerrarlo se vuelve aquí, al mismo sitio de la lista (B12).
  function open(r: RoleId) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'una-role-detail', role: r, back: 'una-mycard', backScroll: scroll };
  }
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta inicial</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} startOpen />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <h3 style="margin:16px 0 2px">🃏 El mazo de esta partida (3 cartas quedan en el centro)</h3>
  <p class="small-note" style="margin:2px 0 6px">Es público: toca cualquiera para ver cómo funciona.</p>
  {#each rows as r (r)}
    <button class="settingrow rowbtn" data-a="una-mycard-role" data-p={r} onclick={() => open(r)}>
      <div class="sinfo">
        <div class="sname">{ROLES[r].emoji} {ROLES[r].name}<span style="opacity:.65;font-weight:400"> · ×{game.composition[r] || 0}</span></div>
        <div class="sdesc">{ROLES[r].desc}</div>
      </div>
      <span class="chev">ℹ️</span>
    </button>
  {/each}
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>

<style>
  /* Fila pulsable: hereda la pinta de .settingrow (global) y le quita el
     cromado de botón (fondo, borde redondeado, negrita). */
  .rowbtn {
    width: 100%; text-align: left; font-weight: 400; font-size: 1rem;
    background: none; border: none; border-bottom: 1px solid var(--border);
    border-radius: 0; color: inherit;
  }
  .rowbtn:active { background: rgba(255, 255, 255, 0.05); transform: none; }
  .rowbtn .chev { flex: 0 0 auto; opacity: 0.7; }
</style>
