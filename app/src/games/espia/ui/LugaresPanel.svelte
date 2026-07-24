<script lang="ts">
  // Las 30 localizaciones A MANO durante la ronda (sin abrir el 🎴), con
  // tachones LOCALES: el espía descarta lo que cada respuesta tumba y los
  // agentes miden hasta dónde pueden afinar sin regalar el lugar. Las marcas
  // son de este móvil (localStorage), como el cuaderno del Sonar.
  import { LOCATIONS } from '../locations';
  import { loadMarks, marksKey, saveMarks } from '../marks';
  import type { EspiaState } from '../types';
  import LugaresGrid from './LugaresGrid.svelte';

  const { game, spy = false }: { game: EspiaState; spy?: boolean } = $props();

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
  }
  const clear = () => {
    marks = {};
    saveMarks(key, {});
  };
  const crossed = $derived(Object.keys(marks).length);
</script>

<div class="card">
  <h3>📍 Las {LOCATIONS.length} localizaciones · quedan {LOCATIONS.length - crossed} en pie</h3>
  <p class="small-note" style="margin-top:0">
    {spy
      ? 'Tu mapa del tesoro: escucha las respuestas y ve TACHANDO lo que ya no encaja. Cuando solo quede una, revélate y adivina.'
      : 'La carta de referencia de la mesa. Toca un lugar para TACHARLO y seguir por dónde va el espía… o para no pasarte de exacto en tus respuestas.'}
  </p>
  <LugaresGrid crossable={true} crossed={marks} onPick={toggle} />
  <p class="small-note">
    🔒 Los tachones son solo de este móvil: no se envían a nadie y no aparecen en ninguna otra pantalla. Vuelve a tocar un lugar para destacharlo.
  </p>
  {#if crossed}
    <button class="small ghost" data-a="espia-lugares-clear" onclick={clear}>🧹 Borrar mis tachones ({crossed})</button>
  {/if}
</div>
