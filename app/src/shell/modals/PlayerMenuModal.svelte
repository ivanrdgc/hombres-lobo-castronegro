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

  // Renombrar (B31): el id del doc no cambia, solo el nombre visible, así que
  // funciona igual a media partida. El campo arranca con el nombre actual.
  let renaming = $state(false);
  let newName = $state('');
  function openRename() {
    newName = p?.name ?? '';
    renaming = true;
  }
  function saveName() {
    const id = pid;
    const value = newName;
    guard(() => A.renamePlayer(id, value), { form: true }).then(() => {
      if (!app.ui.formError) app.ui.modal = null;
    });
  }

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
    {#if A.leaveEndsMatch(busy.gameId)}
      <p class="small-note">⚠️ En {busyDef.name} el reparto no sobrevive a una baja: sacarlo <b>termina la partida para todos</b>. (Si solo se le apagó el móvil, mejor «Reconectar como {p.name}» desde otro dispositivo.)</p>
    {/if}
    <button class="violet block" data-a="kick-from-match" data-p={p.id} onclick={kickFromMatch}>⛔ Sacarlo de la partida{A.leaveEndsMatch(busy.gameId) ? ' (la termina)' : ''}</button>
  {/if}
  {#if renaming}
    <label for="inp-rename">Nombre nuevo</label>
    <input type="text" id="inp-rename" maxlength="24" autocomplete="off" bind:value={newName}
      onkeydown={(e) => { if (e.key === 'Enter') saveName(); }} />
    <div id="form-error">{#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}</div>
    <button class="primary block" data-a="rename-save" onclick={saveName}>✏️ Llamarse {newName.trim() || '…'}</button>
    <button class="ghost block" data-a="rename-cancel" onclick={() => { renaming = false; app.ui.formError = null; }}>Cancelar</button>
  {:else}
    <button class="block" data-a="rename-open" data-p={p.id} onclick={openRename}>✏️ Cambiar el nombre{self ? '' : ` de ${p.name}`}</button>
    {#if self}
      <button class="danger block" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Abandonar la mesa</button>
    {:else}
      <button class="danger block" data-a="kick" data-p={p.id} onclick={kick}>👢 Expulsar del grupo</button>
    {/if}
  {/if}
  {#if !renaming}<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>{/if}
{/if}
