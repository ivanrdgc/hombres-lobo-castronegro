<script lang="ts">
  // «Ese nombre ya existe»: reconectarse como ese jugador desde este
  // dispositivo (port de takeoverModal v1). Lee el nombre de app.ui.modal.
  import { app } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';

  const name = $derived((app.ui.modal?.name as string | undefined) ?? '');

  function takeoverConfirm() {
    const n = name;
    app.ui.modal = null;
    guard(() => A.takeOverPlayer(app.route.slug!, n));
  }
</script>

<h3>👤 Ese nombre ya existe</h3>
<p class="small-note">Ya hay un jugador llamado <b>{name}</b> en este grupo. Si eres tú, puedes desconectar su dispositivo anterior y continuar desde este. Si no, elige otro nombre.</p>
<button class="violet block" data-a="takeover-confirm" data-p={name} onclick={takeoverConfirm}>🔌 Soy yo: conectarme como {name}</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Elegir otro nombre</button>
