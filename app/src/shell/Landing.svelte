<script lang="ts">
  // Portada: crear la mesa. COMPONENTE EJEMPLAR del port v1→Svelte:
  // - textos en español idénticos a la v1
  // - data-a conservados en los botones (los usan los e2e)
  // - ids de inputs conservados (inp-name, inp-group)
  // - acciones envueltas en guard()
  import { app } from '../core/sync/store.svelte';
  import { guard } from '../core/sync/guard';
  import * as A from '../games/hombres-lobo/actions';
  import { randomGroupName } from './ui-helpers';
  import Flash from './Flash.svelte';

  let name = $state('');
  let groupName = $state(app.ui.suggestedGroup || randomGroupName());

  function crear() {
    if (!name.trim()) {
      app.ui.formError = 'Escribe tu nombre.';
      return;
    }
    if (!groupName.trim()) {
      app.ui.formError = 'Escribe el nombre del grupo.';
      return;
    }
    app.ui.suggestedGroup = groupName;
    // El modal «grupo ya existe» necesita saber qué se escribió:
    app.ui.modal = null;
    guard(() => A.createGroup(name.trim(), groupName.trim()), { form: true }).then(() => {
      if (app.ui.modal?.type === 'group-exists') {
        app.ui.modal = { ...app.ui.modal, group: groupName.trim(), name: name.trim() };
      }
    });
  }
</script>

<span class="moon">🎲</span>
<h1 class="title-hero">Juegos digitales</h1>
<p class="subtitle">Montad primero vuestra mesa; después elegís a qué jugar</p>
<Flash />
<div class="card">
  <h3>🪑 Nueva mesa</h3>
  <label for="inp-name">Tu nombre</label>
  <input type="text" id="inp-name" maxlength="24" placeholder="P. ej. María" autocomplete="off" bind:value={name} />
  <label for="inp-group">Nombre de la mesa</label>
  <div style="display:flex;gap:8px">
    <input type="text" id="inp-group" maxlength="30" autocomplete="off" style="flex:1" bind:value={groupName} />
    <button class="small ghost" data-a="reroll-group" title="Otro nombre al azar" style="font-size:1.2rem"
      onclick={() => (groupName = randomGroupName())}>🎲</button>
  </div>
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="primary block" data-a="create-group" onclick={crear}>🪑 Crear la mesa</button>
  <p class="small-note">Comparte luego el enlace y cada amigo entra desde su móvil. Los usuarios y el orden de asiento se configuran una vez y sirven para todos los juegos. ¿Te han invitado? Abre directamente el enlace que te hayan pasado.</p>
</div>
