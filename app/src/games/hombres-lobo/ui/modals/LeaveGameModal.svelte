<script lang="ts">
  // Confirmación de «Abandonar la partida»: salida inmediata con el rol
  // revelado y sin efectos de última hora.
  import { app, me } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { ROLES } from '../../roles';

  const my = $derived(me());
  const r = $derived(my?.role ? ROLES[my.role] : null);

  function confirm() {
    app.ui.modal = null;
    void guard(() => A.leaveGame());
  }
</script>

<h3>🚪 Abandonar la partida</h3>
<p class="small-note">Tu carta se revelará a todo el pueblo{#if r} (eres <b>{r.emoji} {r.name}</b>){/if} y quedas fuera al instante, <b>sin efectos de última hora</b>: ni flecha del Cazador, ni muertes de pena. La partida sigue sin ti y no se puede volver a entrar.</p>
<button class="danger block" data-a="leave-game-confirm" onclick={confirm}>🚪 Sí, abandono</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Sigo jugando</button>
