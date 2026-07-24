<script lang="ts">
  // «🎴 Mi carta y las reglas» (B19/B21): tu identidad secreta y la chuleta de
  // TODOS los personajes y pistas. Accesible en cualquier fase.
  // 🍽️ MESA (B28) + UNA SOLA PUERTA (B34): esta pastilla es el ÚNICO sitio
  // donde se abre tu carta, así que pulsarla YA es el gesto y la carta entra
  // destapada (antes pedía un segundo toque en un 👁 de dentro). Se vuelve a
  // tapar sola, como en el resto del juego. Lo público —el reparto, los 8
  // personajes, las 8 pistas y cómo se gana— se queda a la vista, que para eso
  // es público.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { shadowHGame } from '../../actions';
  import { charRefRows, pistaRefRows, factionSummary } from '../../chars';
  import RefRows from '../../../../shell/RefRows.svelte';
  import SecretPeek from '../SecretPeek.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? shadowHGame(g) : null);
  const my = $derived(me());
  // Las mismas filas que el desplegable «📖» del panel de acción: la chuleta se
  // consulta desde donde se decide y desde aquí, y dice siempre lo mismo.
  const rows = charRefRows();
  // El mazo de pistas es público en el original: saber qué 8 cartas hay es
  // media deducción (si ves una cura, sabes que solo 4 cartas curan y a quién).
  const pistaRows = pistaRefRows();
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Mi carta</h3>
  <SecretPeek {game} pid={my.id} />

  <h3 style="margin:16px 0 4px">📖 Las reglas: lo que sabe toda la mesa</h3>
  <p class="small-note" style="margin:0"><b>{factionSummary(game.playerIds.length)}</b> El reparto es público; lo secreto es quién es quién. El resto de personajes se quedan fuera.</p>
  <p class="small-note" style="margin:6px 0 0">🏹 Los Cazadores ganan cuando no queda ninguna 🌑 Sombra en pie; las Sombras, cuando no queda ningún Cazador. Los 🧭 neutrales cumplen su objetivo propio y pueden ganar aparte.</p>
  <RefRows title="🎭 Los 8 personajes posibles" {rows} />
  <RefRows title="🔮 Las 8 pistas posibles" rows={pistaRows} />
  <p class="small-note" style="margin:8px 0 0">Siempre son estas ocho: cuatro quitan 1 punto de vida y cuatro lo curan, según el bando de quien la recibe. Solo la leen quien la da y quien la recibe; si te deja a 0, mueres.</p>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
