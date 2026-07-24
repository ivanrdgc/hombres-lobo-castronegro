<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta (rol, palabra clave, lo que
  // sabes) y los roles activados de la mesa. Accesible en cualquier fase.
  // Como todo lo secreto en la mesa (B28), se cierra solo a los 12 s sin
  // tocarlo: un móvil boca arriba no puede quedarse con la carta abierta.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { ROLES } from '../../roles';
  import { explainRoleIds } from '../../texts/explain';
  import { autoHide } from '../autohide.svelte';
  import RefRows from '../../../../shell/RefRows.svelte';
  import RoleCard from '../RoleCard.svelte';

  const g = $derived(viewGroup());
  const my = $derived(me());
  const inGame = $derived(!!my && !!my.inGame);
  const rows = $derived(g
    ? explainRoleIds({ currentGame: g.currentGame, extraRoles: g.extraRoles }).map((id) => ({
      emoji: ROLES[id].emoji, name: ROLES[id].name, desc: ROLES[id].desc,
    }))
    : []);

  const inMatch = $derived(!!g?.game && g.game.phase !== 'end');
  const touch = autoHide(() => inMatch && app.ui.modal?.type === 'hl-mycard', () => (app.ui.modal = null));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onpointerdown={touch}>
  {#if g && my}
    <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
    {#if inGame}
      <RoleCard player={my} group={g} />
    {:else}
      <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
    {/if}
    {#if inMatch && inGame}<p class="small-note">Se cierra sola en unos segundos: el móvil vuelve a la mesa sin tu carta encima.</p>{/if}
    <RefRows title="🎴 Roles activados en esta mesa" {rows} />
  {/if}
  <button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
</div>
