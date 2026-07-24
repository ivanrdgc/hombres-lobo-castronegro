<script lang="ts">
  // «🎴 Mi carta» — la ÚNICA puerta a tu carta durante la partida (B34): la abre
  // la pastilla flotante y nada más. Dentro: tu carta (en cortina de privacidad,
  // que se cierra sola) y el mazo de la partida, que es público.
  import { untrack } from 'svelte';
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { unaNocheGame } from '../../actions';
  import { ROLES, CENTER_COUNT } from '../../roles';
  import type { RoleId } from '../../types';
  import MyCard from '../MyCard.svelte';
  import PrivacySheet from '../PrivacySheet.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? unaNocheGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = $derived(game ? (game.selectedRoles || []).filter((r: RoleId) => !!ROLES[r]) : []);

  // Un solo toque en la pastilla y la carta ya está delante: la cortina se abre
  // al entrar. Cuando se oculta sola (12 s) queda debajo el mazo y el botón para
  // volver a mirarla.
  let open = $state(true);
  // Al cambiar de fase (o de paso de la noche) nada secreto sobrevive. Ojo: la
  // primera escena se apunta cuando el juego ya está cargado —si no, el propio
  // arranque contaría como cambio y cerraría la cortina nada más abrirla—.
  const scene = $derived(game ? `${game.phase}:${game.stepIdx}` : '');
  let lastScene = untrack(() => (game ? scene : null)) as string | null;
  $effect(() => {
    if (!game) return;
    if (lastScene === null || scene === lastScene) { lastScene = scene; return; }
    lastScene = scene;
    open = false;
  });

  // Cada fila abre el detalle del rol (como las chips del mazo en partida) y al
  // cerrarlo se vuelve aquí, al mismo sitio de la lista (B12).
  function openRole(r: RoleId) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'una-role-detail', role: r, back: 'una-mycard', backScroll: scroll };
  }
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Mi carta</h3>
  {#if inGame}
    <p class="small-note" style="margin:2px 0 8px">Se mira en secreto, con el móvil tapado: la cortina se oculta sola.</p>
    <button class="primary block" data-a="una-show-card" onclick={() => (open = true)}>👁 Ver mi carta en secreto</button>
  {:else}
    <p class="small-note">👀 Miras de espectador: en esta partida no tienes carta.</p>
  {/if}

  <h3 style="margin:16px 0 2px">🃏 El mazo de esta partida</h3>
  <p class="small-note" style="margin:2px 0 6px">Es público, y {CENTER_COUNT} de estas cartas están en el centro. Toca cualquiera para ver cómo funciona.</p>
  {#each rows as r (r)}
    <button class="settingrow rowbtn" data-a="una-mycard-role" data-p={r} onclick={() => openRole(r)}>
      <div class="sinfo">
        <div class="sname">{ROLES[r].emoji} {ROLES[r].name}<span style="opacity:.65;font-weight:400"> · ×{game.composition[r] || 0}</span></div>
        <div class="sdesc">{ROLES[r].desc}</div>
      </div>
      <span class="chev">ℹ️</span>
    </button>
  {/each}

  {#if open && inGame}
    <PrivacySheet title="🎴 Mi carta" onclose={() => (open = false)}>
      <MyCard {game} pid={my.id} />
    </PrivacySheet>
  {/if}
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
