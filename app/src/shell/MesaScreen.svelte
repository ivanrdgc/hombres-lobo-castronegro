<script lang="ts">
  // La mesa: SOLO personas (quién está, invitar, expulsar) y el catálogo de
  // juegos. Quién juega, el orden y el narrador se eligen al empezar cada
  // partida (pantalla «Empezar partida» del juego).
  import { app, me, navigate } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../core/sync/group-actions';
  import { isActiveDevice } from '../core/sync/presence';
  import { GAME_DEFS } from '../games/registry';
  import type { GroupDoc, PlayerDoc } from '../core/sync/schema';
  import Flash from './Flash.svelte';

  const { group }: { group: GroupDoc; my: PlayerDoc } = $props();

  const shareUrl = $derived(location.origin + '/g/' + group.id);
  let copied = $state(false);

  // Presencia viva para el badge 💤.
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 10000);
    return () => clearInterval(t);
  });

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
<div class="card">
  <h3>📱 Dispositivos ({app.players.length})</h3>
  <div class="players">
    {#each app.players as p (p.id)}
      <div
        class="player selectable"
        data-a="player-menu"
        data-p={p.id}
        onclick={() => (app.ui.modal = { type: 'player-menu', pid: p.id })}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') app.ui.modal = { type: 'player-menu', pid: p.id }; }}
      >
        <span class="pname">{p.name}</span>
        {#if !isActiveDevice(p, now)}<span class="badge zz" title="Sin señales recientes de este dispositivo">💤</span>{/if}
        {#if me() && p.id === me()!.id}<span class="badge you">Tú</span>{/if}
      </div>
    {/each}
  </div>
  <p class="small-note">Quién juega, el orden de la mesa y quién narra se eligen al empezar cada partida. Toca un dispositivo para expulsarlo.</p>
</div>
<div class="card">
  <h3>🎮 ¿A qué jugamos?</h3>
  {#each GAME_DEFS as j (j.id)}
    <div class="card" style="margin:10px 0 4px">
      <h3>{j.emoji} {j.name}</h3>
      <p class="small-note">{j.desc}</p>
      <button class="primary block" data-a="select-game" data-p={j.id} onclick={() => { navigate(`/g/${group.id}/${j.id}`); guard(() => A.selectGame(j.id)); }}>{j.emoji} Jugar a esto</button>
    </div>
  {/each}
  <p class="small-note">Más juegos, próximamente… Cualquiera puede elegir: la mesa entera entra al juego.</p>
</div>
<div class="card">
  <button class="danger block" data-a="confirm-delete-group" onclick={() => (app.ui.modal = { type: 'confirm-delete' })}>🗑️ Eliminar la mesa</button>
</div>
