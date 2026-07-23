<script lang="ts">
  // Menú de un dispositivo de la mesa: expulsión del grupo y, si está en una
  // partida, sacarlo de ella (quién juega y el narrador se deciden al empezar
  // cada partida). Lee el pid de app.ui.modal.
  import { app, me, matchOf } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../core/sync/group-actions';
  import { isActiveDevice } from '../../core/sync/presence';
  import { gameDef } from '../../games/registry';

  const pid = $derived((app.ui.modal?.pid as string | undefined) ?? '');
  const p = $derived(app.players.find((x) => x.id === pid));
  const self = $derived(!!p && p.id === me()?.id);
  const inactive = $derived(!!p && !isActiveDevice(p, Date.now()));
  const busy = $derived(matchOf(pid));
  const busyDef = $derived(busy ? gameDef(busy.gameId) : null);

  // Ojo: pid es un $derived de app.ui.modal — hay que CAPTURARLO antes de
  // cerrar el modal, o llegaría vacío a la acción.
  function kick() {
    const id = pid;
    app.ui.modal = null;
    guard(() => A.kickPlayer(id));
  }

  function kickFromMatch() {
    const id = pid;
    app.ui.modal = null;
    guard(() => A.removeFromMatch(id));
  }
</script>

{#if p}
  <h3>📱 {p.name}{self ? ' (tú)' : ''}</h3>
  {#if inactive}<p class="small-note">💤 Este dispositivo lleva un rato sin dar señales (pantalla apagada, otra pestaña o sin conexión).</p>{/if}
  {#if busy && busyDef}
    <p class="small-note">{busyDef.emoji} Está en una partida de <b>{busyDef.name}</b>.</p>
    <button class="violet block" data-a="kick-from-match" data-p={p.id} onclick={kickFromMatch}>⛔ Sacarlo de la partida</button>
  {/if}
  {#if self}
    <button class="danger block" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Abandonar la mesa</button>
  {:else}
    <button class="danger block" data-a="kick" data-p={p.id} onclick={kick}>👢 Expulsar del grupo</button>
  {/if}
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{/if}
