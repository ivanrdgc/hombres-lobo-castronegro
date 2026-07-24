<script lang="ts">
  // «📖 Las reglas» (papeles y puntos), PLEGADAS dentro de la pantalla en la que
  // se decide (B25/B26 §4): nadie tiene que salirse de la fase —ni preguntar en
  // voz alta— para recordar qué hace el Maestro, qué gana el Insider o cuánto
  // suma cazarlo. Son idénticas para todos: no delatan a nadie.
  // Un solo nombre en toda la app (B34 §3): esto son «las reglas»; «la chuleta»
  // no existe. `fixed` = ya estás en la hoja de reglas (la de 🎴): sin plegar.
  import RefRows from '../../../shell/RefRows.svelte';

  const { fixed = false }: { fixed?: boolean } = $props();
  // Plegadas de salida en las fases; una vez tocado, manda el jugador.
  let toggled = $state(false);
  const shown = $derived(fixed || toggled);

  const rows = [
    { emoji: '🎓', name: 'Maestro', note: 'público · rota cada ronda', desc: 'Conoce la palabra. Solo responde «sí», «no» o «no lo sé», y confirma cuando alguien la dice. No puede ser el Insider ni recibir votos.' },
    { emoji: '🕵️', name: 'Insider', note: 'secreto · 1 por ronda', desc: 'También conoce la palabra: empuja las preguntas hacia ella sin cantarse. Gana si la mesa la adivina y luego NO lo señala.' },
    { emoji: '👥', name: 'Equipo', note: 'los demás', desc: 'No conocen la palabra: preguntan de sí o no para cercarla y, una vez adivinada, cazan al Insider con el voto.' },
    { emoji: '🏆', name: 'Puntos', desc: 'Insider cazado: +1 para todo el equipo, Maestro incluido (el Insider no puntúa) · Insider que escapa: +2 para él · tiempo agotado sin palabra: no puntúa nadie.' },
  ];
</script>

{#if shown}
  <RefRows title="📖 Las reglas: papeles y puntos" {rows} />
  {#if !fixed}
    <button class="ghost block ref" data-a="ins-ref" onclick={() => (toggled = false)}>🔼 Ocultar las reglas</button>
  {/if}
{:else}
  <button class="ghost block ref" data-a="ins-ref" onclick={() => (toggled = true)}>📖 Las reglas: papeles y puntos</button>
{/if}

<style>
  /* Botón secundario, pero con altura de dedo (≥44 px): el móvil manda. */
  .ref { font-size: 0.92rem; font-weight: 500; min-height: 44px; margin-top: 10px; }
</style>
