<script lang="ts">
  // Punto de entrada NEUTRO a tu carta (postura 🍽️ MESA, B28): el mismo botón,
  // con el mismo texto y el mismo tamaño, en todos los móviles de la mesa —da
  // igual qué carta te haya tocado—. Antes la carta se desplegaba en la propia
  // pantalla de la fase: el marco iba teñido por bando y el panel del fascista
  // era más largo, así que abrirla delataba.
  //
  // Lo secreto vive dentro de la cortina, que se cierra sola y AL CAMBIAR DE
  // FASE: nadie se deja el bando desplegado cuando el móvil vuelve a la mesa.
  import { untrack } from 'svelte';
  import type { SHState } from '../types';
  import PrivacySheet from './PrivacySheet.svelte';
  import RoleCard from './RoleCard.svelte';

  // startOpen: en el modal «🎴 Mi carta» la cortina se abre ya (abrirlo YA es el
  // gesto); en la partida el botón es el mismo en todos los móviles.
  const { game, pid, startOpen = false }: { game: SHState; pid: string; startOpen?: boolean } = $props();

  let open = $state(untrack(() => startOpen));
  // Se cierra al cambiar de fase. Comparando con la anterior: un `open = false`
  // a secas mataría el `startOpen` del modal en el primer render.
  const scene = $derived(game.phase);
  let lastScene = untrack(() => scene);
  $effect(() => {
    if (scene === lastScene) return;
    lastScene = scene;
    open = false;
  });
</script>

<div style="text-align:center;margin:10px 0">
  <button class="small ghost" data-a="sh-show-card" onclick={() => (open = true)}>👁 Ver mi carta en secreto</button>
</div>

{#if open}
  <PrivacySheet title="🎴 Tu carta" onclose={() => (open = false)}>
    <RoleCard {game} {pid} note="Tu bando no cambia en toda la partida. Vuelve aquí siempre que dudes: abrir esta hoja no delata nada, todos tenéis el mismo botón." />
  </PrivacySheet>
{/if}
