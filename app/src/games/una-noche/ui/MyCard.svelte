<script lang="ts">
  // Visor de TU carta y de lo que viste/hiciste esta noche. En Una Noche solo se
  // puede ver la carta INICIAL (la que te tocó y ya miraste): tu carta puede
  // haber cambiado de noche sin que lo sepas, así que NO es necesariamente tu
  // carta final. Se avisa con claridad.
  //
  // Postura 🍽️ MESA (B28): lo secreto se abre SIEMPRE en la cortina de
  // privacidad —igual en todos los móviles— y se oculta solo a los 12 s, para
  // que nadie se deje su carta desplegada boca arriba durante el debate.
  import { untrack } from 'svelte';
  import type { GameState, RoleId } from '../types';
  import PrivacySheet from './PrivacySheet.svelte';
  import RoleCard from './RoleCard.svelte';
  import { playerHistory } from '../history';

  // startOpen: en el modal «🎴 Tu carta inicial» la cortina se abre ya (el
  // título prometía la carta y estaba tras otro toque); en la partida el botón
  // es el mismo en todos los móviles y lo pulsa quien quiere.
  const { game, pid, startOpen = false }: { game: GameState; pid: string; startOpen?: boolean } = $props();
  const role = $derived(game.originalRole[pid] as RoleId);
  const history = $derived(playerHistory(game, pid));
  let open = $state(untrack(() => startOpen));
  // Al CAMBIAR de fase (o de paso de la noche) se cierra sola. Ojo: no basta con
  // poner `open = false` en un efecto —eso mataría el `startOpen` del modal en
  // el primer render—, hay que comparar con la escena anterior.
  const scene = $derived(`${game.phase}:${game.stepIdx}`);
  let lastScene = untrack(() => scene);
  $effect(() => {
    if (scene === lastScene) return;
    lastScene = scene;
    open = false;
  });
</script>

<div style="text-align:center;margin:10px 0">
  <button class="small ghost" data-a="una-show-card" onclick={() => (open = true)}>👁 Ver en secreto: con qué carta empecé y qué hice</button>
</div>

{#if open}
  <PrivacySheet title="🎴 Solo para tus ojos" onclose={() => (open = false)}>
    <RoleCard {role} note="⚠️ Es la carta con la que EMPEZASTE la noche. En Una Noche alguien pudo cambiártela sin que lo sepas: NO es necesariamente tu carta final." />
    {#if history.length}
      <div class="card">
        <h3>📝 Lo que viste e hiciste esta noche</h3>
        <ul class="histlist">{#each history as h (h)}<li>{h}</li>{/each}</ul>
        <p class="small-note">Solo tú ves esto. Al final de la partida se muestra el historial completo de todos.</p>
      </div>
    {/if}
  </PrivacySheet>
{/if}

<style>
  .histlist { margin: 4px 0 0; padding-left: 1.15rem; }
  .histlist li { margin: 5px 0; line-height: 1.35; }
</style>
