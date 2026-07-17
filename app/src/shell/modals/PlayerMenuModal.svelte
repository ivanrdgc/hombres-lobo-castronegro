<script lang="ts">
  // Menú de un dispositivo de la mesa: solo expulsión (quién juega, el orden y
  // el narrador se deciden al empezar cada partida). Lee el pid de app.ui.modal.
  import { app, me } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../core/sync/group-actions';
  import { isActiveDevice } from '../../core/sync/presence';

  const pid = $derived((app.ui.modal?.pid as string | undefined) ?? '');
  const p = $derived(app.players.find((x) => x.id === pid));
  const self = $derived(!!p && p.id === me()?.id);
  const inactive = $derived(!!p && !isActiveDevice(p, Date.now()));

  // Ojo: pid es un $derived de app.ui.modal — hay que CAPTURARLO antes de
  // cerrar el modal, o llegaría vacío a la acción.
  function kick() {
    const id = pid;
    app.ui.modal = null;
    guard(() => A.kickPlayer(id));
  }
</script>

{#if p}
  <h3>📱 {p.name}{self ? ' (tú)' : ''}</h3>
  {#if inactive}<p class="small-note">💤 Este dispositivo lleva un rato sin dar señales (pantalla apagada, otra pestaña o sin conexión).</p>{/if}
  {#if self}
    <p class="small-note">Para irte de la mesa usa «🚪 Salir», arriba.</p>
  {:else}
    <button class="danger block" data-a="kick" data-p={p.id} onclick={kick}>👢 Expulsar del grupo</button>
  {/if}
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{/if}
