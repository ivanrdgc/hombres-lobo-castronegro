<script lang="ts">
  // La libreta de localizaciones: las 30 pastillas con TACHONES LOCALES (viven
  // en el localStorage de este móvil, como el cuaderno del Sonar).
  // El texto es el MISMO para el espía y para un agente: si al espía le
  // pusiera «tu mapa del tesoro», el panel lo delataría de reojo. Y no se queda
  // fija en pantalla: vive dentro de PrivatePanel, que la cierra sola —unos
  // tachones a la vista cuentan lo que su dueño ya sabe.
  import { LOCATIONS } from '../locations';
  import { loadMarks, marksKey, saveMarks } from '../marks';
  import type { EspiaState } from '../types';
  import LugaresGrid from './LugaresGrid.svelte';

  const { game, onActivity }: { game: EspiaState; onActivity?: () => void } = $props();

  const key = $derived(marksKey(game.startedAt, game.round));
  let marks = $state<Record<string, boolean>>({});
  let loadedFor = '';
  $effect(() => {
    const k = key;
    if (loadedFor === k) return;
    loadedFor = k; // una libreta por ronda: al repartir de nuevo, en blanco
    marks = loadMarks(k);
  });

  function toggle(id: string) {
    const next = { ...marks };
    if (next[id]) delete next[id];
    else next[id] = true;
    marks = next;
    saveMarks(key, next);
    onActivity?.(); // cada tachón reinicia el auto-ocultado del panel
  }
  const clear = () => {
    marks = {};
    saveMarks(key, {});
    onActivity?.();
  };
  const crossed = $derived(Object.keys(marks).length);
</script>

<div class="card">
  <h3>📝 Quedan {LOCATIONS.length - crossed} lugares en pie</h3>
  <p class="small-note" style="margin-top:0">Toca un lugar para tacharlo cuando una respuesta lo descarte (y otra vez para devolverlo). 🔒 Solo se ve en este móvil.</p>
  <LugaresGrid crossable={true} crossed={marks} onPick={toggle} />
  {#if crossed}
    <button class="small ghost" style="margin-top:10px" data-a="espia-lugares-clear" onclick={clear}>🧹 Borrar mis tachones ({crossed})</button>
  {/if}
</div>
