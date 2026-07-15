<script lang="ts">
  // Menú de un dispositivo de la mesa: jugará/no jugará, narrador o expulsión
  // (port de playerMenuModal v1). Lee el pid de app.ui.modal.
  import { app, me } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';

  const pid = $derived((app.ui.modal?.pid as string | undefined) ?? '');
  const p = $derived(app.players.find((x) => x.id === pid));
  const self = $derived(!!p && p.id === me()?.id);
  const active = $derived(!!p && p.isPlayer !== false);
  const isNarr = $derived(!!p && app.group?.lastNarratorId === p.id);

  // Ojo: pid es un $derived de app.ui.modal — hay que CAPTURARLO antes de
  // cerrar el modal, o llegaría vacío a la acción.
  function togglePlayer() {
    const id = pid;
    const cur = app.players.find((x) => x.id === id);
    app.ui.modal = null;
    guard(() => A.setPlayerActive(id, cur ? cur.isPlayer === false : true));
  }

  function narratorDevice() {
    const id = pid;
    app.ui.modal = null;
    guard(() => A.setNarratorDevice(id));
  }

  function kick() {
    const id = pid;
    app.ui.modal = null;
    guard(() => A.kickPlayer(id));
  }
</script>

{#if p}
  <h3>📱 {p.name}{self ? ' (tú)' : ''}</h3>
  <button class={active ? 'block' : 'violet block'} data-a="toggle-player" data-p={p.id} onclick={togglePlayer}>{active ? '📺 No jugará (solo pantalla o narrador)' : '🎮 Jugará la partida'}</button>
  {#if isNarr}
    <p class="small-note">🔊 Este dispositivo es el narrador de los modos automáticos. Para cambiarlo, toca a otro dispositivo.</p>
  {:else}
    <button class="violet block" data-a="narrator-device" data-p={p.id} onclick={narratorDevice}>🔊 Narrará en automático (pondrá la voz)</button>
  {/if}
  {#if !self}<button class="danger block" data-a="kick" data-p={p.id} onclick={kick}>👢 Expulsar del grupo</button>{/if}
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{/if}
