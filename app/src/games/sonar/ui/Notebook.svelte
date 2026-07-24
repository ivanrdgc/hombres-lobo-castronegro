<script lang="ts">
  // 🎧🗒️ La herramienta de la tripulación, en UNA tarjeta: lo que el rival ha
  // cantado (su tira de rumbos, numerada) y, justo debajo, el mapa en blanco
  // donde se apunta lo que se deduce. Se miran a la vez, así que van juntas.
  // Postura de EQUIPO: esto lo mira el corro entero, sin gestos ni modales.
  // Las marcas son LOCALES de este móvil (localStorage, NO Firestore): son
  // deducciones, no estado de la partida, y cada móvil apunta lo suyo.
  import { rival } from '../engine';
  import { DIR_ARROW, type Cell } from '../map';
  import type { Announce, SonarState, Team } from '../types';
  import MapGrid from './MapGrid.svelte';

  const { game, team }: { game: SonarState; team: Team } = $props();
  const foe = $derived(rival(team));
  const tag = $derived(foe === 'red' ? '🔴 Rojo' : '🔵 Azul');
  // Cada submarino sale de las 3 columnas de su lado: es el dato que hace
  // abordable la triangulación (poco más de 20 salidas posibles en vez de 56).
  const home = $derived(foe === 'red' ? 'la A, la B o la C' : 'la F, la G o la H');
  const moves: Announce[] = $derived(game.moves[foe]);
  const arrow = (a: Announce) => (a === 'silence' ? '🤫' : a === 'surface' ? '⏫' : DIR_ARROW[a]);
  const label = (a: Announce) =>
    (a === 'silence' ? 'maniobró en silencio: 1 o 2 casillas, rumbo desconocido'
      : a === 'surface' ? 'emergió: borró su estela y cantó cuadrante'
        : a === 'N' ? 'Norte' : a === 'S' ? 'Sur' : a === 'E' ? 'Este' : 'Oeste');

  // Una libreta por partida y equipo; la revancha cambia la semilla, así que
  // empieza en blanco sin tener que borrar nada a mano.
  const key = $derived(`hlc_sonar_notes_${game.startedAt}_${game.seed}_${team}`);
  let notes = $state<Record<string, number>>({});
  let loadedFor = '';
  $effect(() => {
    const k = key;
    if (loadedFor === k) return;
    loadedFor = k;
    try { notes = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch { notes = {}; }
  });
  const save = () => { try { localStorage.setItem(key, JSON.stringify(notes)); } catch { /* sin storage */ } };
  // Tres estados por toque: sin marcar → ❌ descartada → ⭕ candidata → limpia.
  function toggle(c: Cell) {
    const k = `${c.x},${c.y}`;
    const next = ((notes[k] || 0) + 1) % 3;
    const copy = { ...notes };
    if (next) copy[k] = next; else delete copy[k];
    notes = copy;
    save();
  }
  const clear = () => { notes = {}; save(); };
  const vals = $derived(Object.values(notes));
  const out = $derived(vals.filter((v) => v === 1).length);
  const maybe = $derived(vals.filter((v) => v === 2).length);
</script>

<div class="card">
  <h3>🎧 Cazar al {tag}</h3>
  <p class="small-note" style="margin:0">
    Salió de {home} y cada rumbo que canta queda aquí, numerado. Probad su ruta desde varias salidas: las islas y los bordes descartan caminos.
  </p>

  {#if moves.length}
    <div class="sntrack">
      {#each moves as a, i (i)}
        <span class="snmark" class:snlast={i === moves.length - 1} title={label(a)}>
          <b>{arrow(a)}</b><i>{i + 1}</i>
        </span>
      {/each}
    </div>
    <p class="small-note" style="margin:4px 0 0">🤫 = se deslizó sin decir rumbo (1 o 2 casillas) · ⏫ = emergió y cantó cuadrante.</p>
  {:else}
    <p class="small-note" style="margin:8px 0 0">Aún no ha navegado: en cuanto lo haga, su rumbo aparecerá aquí.</p>
  {/if}

  <hr class="sep" />

  <p class="small-note" style="margin:0">
    🗒️ <b>Vuestro cuaderno.</b> Tocad una casilla y va pasando por ❌ descartada → ⭕ candidata → limpia. Es papel y boli: solo vive en este móvil.
  </p>
  <MapGrid sub={game.subs[team]} {team} {notes} onNote={toggle} />
  <div class="snfoot">
    <span class="small-note" style="margin:0">
      {#if out || maybe}❌ {out} · ⭕ {maybe} · {/if}vuestro submarino sale de referencia para medir el alcance del torpedo.
    </span>
    <button class="small ghost" data-a="sn-notes-clear" disabled={!vals.length} onclick={clear}>🧹 Borrar ({vals.length})</button>
  </div>
</div>

<style>
  .sntrack { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0; }
  .snmark { display: inline-flex; flex-direction: column; align-items: center; min-width: 36px; padding: 4px 5px 2px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg2); }
  .snmark b { font-size: 1.2rem; line-height: 1.1; }
  .snmark i { font-size: 0.6rem; font-style: normal; color: var(--muted); }
  .snmark.snlast { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--bg-1)); }
  .snfoot { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
  .snfoot span { flex: 1; }
</style>
