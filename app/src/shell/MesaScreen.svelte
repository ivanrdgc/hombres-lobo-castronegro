<script lang="ts">
  // La mesa: usuarios y orden ya configurados; desde aquí se elige el juego
  // (port de mesaScreen v1).
  import { app } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../games/hombres-lobo/actions';
  import { GAMES } from './ui-helpers';
  import type { GroupDoc, PlayerDoc } from '../core/sync/schema';
  import Flash from './Flash.svelte';
  import DevicesCard from './DevicesCard.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const shareUrl = $derived(location.origin + '/g/' + group.id);
  let copied = $state(false);

  // Copia el enlace de la mesa (con fallback execCommand sobre #share-url).
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const inp = document.getElementById('share-url') as HTMLInputElement | null;
      if (inp) {
        inp.select();
        document.execCommand('copy');
      }
    }
    copied = true;
  }
</script>

<div class="topbar">
  <h2>🪑 {group.name}</h2>
  <button class="small ghost" data-a="leave" onclick={() => (app.ui.modal = { type: 'confirm-leave' })}>🚪 Salir</button>
</div>
<div class="card">
  <h3>🔗 Invita a tu mesa</h3>
  <div class="linkbox">
    <input type="text" id="share-url" value={shareUrl} readonly />
    <button class="small primary" data-a="copy-url" onclick={copyUrl}>📋 Copiar</button>
  </div>
  <div id="copy-feedback">
    {#if copied}<p class="copyok">✔️ Enlace copiado: compártelo por WhatsApp o donde quieras.</p>{/if}
  </div>
</div>
<Flash />
<DevicesCard group={group} />
<div class="card">
  <h3>🗣️ Configuración de voz</h3>
  <p class="small-note">La voz se usa al narrar en automático y al leer la explicación del juego: configúrala en el dispositivo que hará de narrador.</p>
  <button class="ghost block" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; }}>🗣️ Configurar la voz de este dispositivo</button>
</div>
<div class="card">
  <h3>🎮 ¿A qué jugamos?</h3>
  {#each GAMES as j (j.id)}
    <div class="card" style="margin:10px 0 4px">
      <h3>{j.emoji} {j.name}</h3>
      <p class="small-note">{j.desc}</p>
      <button class="primary block" data-a="select-game" data-p={j.id} onclick={() => { app.ui.lobbyView = 'game'; guard(() => A.selectGame(j.id)); }}>{j.emoji} Jugar a esto</button>
    </div>
  {/each}
  <p class="small-note">Más juegos, próximamente… Cualquiera puede elegir: la mesa entera entra al juego con los usuarios y el orden ya puestos.</p>
</div>
<div class="card">
  <button class="danger block" data-a="confirm-delete-group" onclick={() => (app.ui.modal = { type: 'confirm-delete' })}>🗑️ Eliminar la mesa</button>
</div>
