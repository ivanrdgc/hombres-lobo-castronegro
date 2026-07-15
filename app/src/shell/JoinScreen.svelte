<script module lang="ts">
  // Manejador global de errores con código que abren modal (port del guard de
  // main.js v1): 'name-taken' abre el relevo de dispositivo con el nombre
  // escrito y 'group-taken' el aviso de grupo existente (la portada parchea
  // después los valores de sus inputs). Vive a nivel de módulo para cubrir
  // también a Landing, que solo lee app.ui.modal.
  import { setGuardCodedHandler } from '../core/sync/guard';
  import { app } from '../core/sync/store.svelte';

  // Equivalente al val('inp-name') de la v1: la pantalla montada registra cómo
  // leer su input de nombre.
  let readName: () => string = () => '';

  setGuardCodedHandler((code) => {
    if (code === 'name-taken') {
      app.ui.modal = { type: 'takeover', name: readName() };
      return true;
    }
    if (code === 'group-taken') {
      app.ui.modal = { type: 'group-exists', group: '', name: readName() };
      return true;
    }
    return false;
  });
</script>

<script lang="ts">
  // Pantalla de invitación: unirse a un grupo existente (port de joinScreen v1).
  import { guard } from '../core/sync/guard';
  import * as A from '../games/hombres-lobo/actions';
  import type { GroupDoc } from '../core/sync/schema';
  import Flash from './Flash.svelte';

  const { group }: { group: GroupDoc } = $props();

  // La sesión guardada ya no vale (te conectaste desde otro o te expulsaron).
  const hadSession = !!app.session;

  let name = $state('');
  readName = () => name.trim();

  function unirme() {
    if (!name.trim()) {
      app.ui.formError = 'Escribe tu nombre.';
      return;
    }
    guard(() => A.joinGroup(app.route.slug!, name.trim()), { form: true });
  }
</script>

<span class="moon">🌕</span>
<h1 class="title-hero">{group.name}</h1>
<p class="subtitle">Te han invitado a una partida de Los Hombres Lobo de Castronegro</p>
<Flash />
{#if hadSession}<div class="flash">Tu sesión ya no es válida en este dispositivo (quizá te conectaste desde otro o te expulsaron).</div>{/if}
<div class="card">
  <h3>🚪 Únete al grupo</h3>
  <label for="inp-name">Tu nombre</label>
  <input type="text" id="inp-name" maxlength="24" placeholder="¿Cómo te llamas?" autocomplete="off" bind:value={name} />
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="primary block" data-a="join" onclick={unirme}>🐺 Unirme</button>
  <p class="small-note">Jugadores en el grupo: {app.players.map((p) => p.name).join(', ') || 'ninguno todavía'}</p>
</div>
