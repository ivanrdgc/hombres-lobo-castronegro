<script lang="ts">
  // Chuleta de papeles y puntos, PLEGADA dentro de la pantalla en la que se
  // decide (B25/B26 §4): nadie tiene que salirse de la fase —ni preguntar en voz
  // alta— para recordar qué hace el Maestro, qué gana el Insider o cuánto suma
  // cazarlo. Es idéntica para todos: no delata a nadie.
  import RefRows from '../../../shell/RefRows.svelte';

  const { open = false }: { open?: boolean } = $props();
  // `null` = como venga de fuera; una vez tocado, manda el jugador.
  let toggled = $state<boolean | null>(null);
  const shown = $derived(toggled ?? open);

  const rows = [
    { emoji: '🎓', name: 'Maestro', note: 'público · rota cada ronda', desc: 'Conoce la palabra. Solo responde «sí», «no» o «no lo sé», y confirma cuando alguien la dice. No puede ser el Insider ni recibir votos.' },
    { emoji: '🕵️', name: 'Insider', note: 'secreto · 1 por ronda', desc: 'También conoce la palabra: empuja las preguntas hacia ella sin cantarse. Gana si la mesa la adivina y luego NO lo señala.' },
    { emoji: '👥', name: 'Equipo', note: 'los demás', desc: 'No conocen la palabra: preguntan de sí o no para cercarla y, una vez adivinada, cazan al Insider con el voto.' },
    { emoji: '🏆', name: 'Puntos', desc: 'Insider cazado: +1 al Maestro y a cada común · Insider que escapa: +2 para él · tiempo agotado sin palabra: no puntúa nadie.' },
  ];
</script>

{#if shown}
  <RefRows title="📖 Los papeles y los puntos" {rows} />
  <button class="ghost block ref" data-a="ins-ref" onclick={() => (toggled = false)}>🔼 Ocultar la chuleta</button>
{:else}
  <button class="ghost block ref" data-a="ins-ref" onclick={() => (toggled = true)}>📖 Los papeles y los puntos</button>
{/if}

<style>
  /* Botón secundario, pero con altura de dedo (≥44 px): el móvil manda. */
  .ref { font-size: 0.92rem; font-weight: 500; min-height: 44px; margin-top: 10px; }
</style>
