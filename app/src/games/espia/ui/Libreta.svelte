<script lang="ts">
  // 📝 MI LIBRETA: las 30 localizaciones con tachones propios. No es tu carta
  // —es una herramienta— así que no vive en la pastilla 🎴 sino en la pantalla,
  // con su propio verbo (docs/UX.md · B34): una sola puerta para cada cosa.
  // Los tachones son LOCALES (localStorage de este móvil, como el cuaderno del
  // Sonar) y el rótulo es idéntico para el espía y para un agente: si al espía
  // le pusiera «tu mapa del tesoro», el botón lo delataría de reojo (B28).
  // Se cierra sola: unos tachones a la vista cuentan lo que su dueño ya sabe.
  import { LOCATIONS } from '../locations';
  import { loadMarks, marksKey, saveMarks } from '../marks';
  import type { EspiaState } from '../types';
  import LugaresGrid from './LugaresGrid.svelte';

  const { game }: { game: EspiaState } = $props();

  const key = $derived(marksKey(game.startedAt, game.round));
  let marks = $state<Record<string, boolean>>({});
  let loadedFor = '';
  $effect(() => {
    const k = key;
    if (loadedFor === k) return;
    loadedFor = k; // una libreta por ronda: al repartir de nuevo, en blanco
    marks = loadMarks(k);
  });

  let open = $state(false);
  let touched = $state(0);
  const hide = () => (open = false);
  /** Cada tachón reinicia la cuenta atrás del auto-cerrado. */
  const bump = () => (touched = Date.now());

  // 25 s por INACTIVIDAD: hay 30 pastillas que leer, y cada tachón vuelve a
  // poner el contador a cero.
  $effect(() => {
    if (!open) return;
    void touched;
    const t = setTimeout(hide, 25000);
    return () => clearTimeout(t);
  });

  // …y al moverse la partida (fase, ronda, votación, pausa): nadie se queda con
  // la libreta abierta porque el juego avanzó por su cuenta. Se compara el
  // MOMENTO por valores: cada snapshot de Firestore reemplaza el doc entero, y
  // disparar con eso cerraría la libreta a media lectura.
  let moment = '';
  $effect(() => {
    const now = `${game.phase}|${game.round}|${game.voteSeq}|${game.vote ? 1 : 0}|${game.paused ? 1 : 0}`;
    if (now === moment) return;
    moment = now;
    hide();
  });

  function toggle(id: string) {
    const next = { ...marks };
    if (next[id]) delete next[id];
    else next[id] = true;
    marks = next;
    saveMarks(key, next);
    bump();
  }
  const clear = () => {
    marks = {};
    saveMarks(key, {});
    bump();
  };
  const crossed = $derived(Object.keys(marks).length);
</script>

{#if !open}
  <button class="ghost block door" data-a="espia-notes" onclick={() => { open = true; bump(); }}>
    <span>📝 Mi libreta</span>
    <small>tacha las localizaciones que descartes · nadie más las ve</small>
  </button>
{:else}
  <div class="card">
    <h3>📝 Mi libreta · quedan {LOCATIONS.length - crossed} en pie</h3>
    <p class="small-note" style="margin-top:0">Toca una localización para tacharla cuando una respuesta la descarte (y otra vez para devolverla). 🔒 Los tachones solo existen en este móvil.</p>
    <LugaresGrid crossable={true} crossed={marks} onPick={toggle} />
    {#if crossed}
      <button class="small ghost" style="margin-top:10px" data-a="espia-lugares-clear" onclick={clear}>🧹 Borrar mis tachones ({crossed})</button>
    {/if}
  </div>
  <button class="ghost block" data-a="espia-notes-close" onclick={hide}>🙈 Cerrar la libreta (si no, se cierra sola)</button>
{/if}

<style>
  /* Puerta a la libreta: alta y rotulada, se pulsa con el pulgar sin mirar…
     y es la MISMA en todos los móviles de la mesa. */
  .door {
    margin: 12px 0 4px; min-height: 52px; padding: 8px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-size: 0.95rem; font-weight: 600; line-height: 1.15;
  }
  .door small { font-size: 0.72rem; font-weight: 400; color: var(--muted); }
</style>
