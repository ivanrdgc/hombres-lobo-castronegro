<script lang="ts">
  // «Ese grupo ya existe»: entrar en él en vez de crear uno nuevo
  // (port de groupExistsModal v1). Lee grupo y nombre de app.ui.modal.
  import { app } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';

  const group = $derived((app.ui.modal?.group as string | undefined) ?? '');
  const name = $derived((app.ui.modal?.name as string | undefined) ?? '');

  function joinExisting() {
    const g = group;
    const n = name;
    app.ui.modal = null;
    guard(() => A.joinExistingGroup(g, n, false));
  }
</script>

<h3>🏘️ Ese grupo ya existe</h3>
<p class="small-note">El grupo <b>{group}</b> ya está creado. ¿Quieres entrar en él en vez de crear uno nuevo?</p>
<button class="primary block" data-a="join-existing" onclick={joinExisting}>🚪 Entrar en el grupo</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✏️ Elegir otro nombre de grupo</button>
