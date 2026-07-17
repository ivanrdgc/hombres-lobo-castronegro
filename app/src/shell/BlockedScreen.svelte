<script lang="ts">
  // Partida en curso y sin sesión válida: esperar o reconectarse por nombre
  // (port de blockedScreen v1).
  import { app } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../core/sync/group-actions';
  import type { GroupDoc } from '../core/sync/schema';
  import Flash from './Flash.svelte';

  const { group }: { group: GroupDoc } = $props();

  let name = $state('');

  function reconectar() {
    if (!name.trim()) {
      app.ui.formError = 'Escribe tu nombre exacto.';
      return;
    }
    guard(() => A.takeOverPlayer(app.route.slug!, name.trim()), { form: true });
  }
</script>

<span class="moon">🌙</span>
<h1 class="title-hero">{group.name}</h1>
<Flash />
<div class="card">
  <h3>⏳ Hay una partida en curso</h3>
  <p style="color:var(--muted)">No se puede entrar hasta que termine. Vuelve a intentarlo en un rato.</p>
  <button class="primary block" data-a="retry" onclick={() => location.reload()}>🔄 Reintentar</button>
  <hr class="sep" />
  <p class="small-note">¿Ya estabas jugando y has perdido la sesión? Escribe tu nombre exacto para reconectarte:</p>
  <input type="text" id="inp-name" maxlength="24" placeholder="Tu nombre en la partida" autocomplete="off" bind:value={name} />
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="violet block" data-a="reconnect" onclick={reconectar}>🔌 Reconectar</button>
</div>
