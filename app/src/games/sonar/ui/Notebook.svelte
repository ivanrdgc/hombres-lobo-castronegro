<script lang="ts">
  // 🎧🗒️ La herramienta central del juego, en UNA tarjeta: lo que el rival ha
  // cantado (su tira de rumbos) y, justo debajo, el cuaderno donde se apunta lo
  // que se deduce. Estaban en dos tarjetas separadas y se leían como dos cosas
  // sin relación; se miran a la vez, así que van juntas.
  // Las marcas son LOCALES de este móvil (localStorage, NO Firestore): son
  // deducciones, no estado de la partida, y cada móvil apunta lo suyo sin
  // chivarle nada a nadie.
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
  <h3>🎧 Lo que ha cantado el {tag} · 🗒️ vuestro cuaderno</h3>
  <p class="small-note" style="margin:0">
    Cada rumbo que canta el rival queda apuntado aquí; con las flechas y el mapa de abajo se le acorrala. Salió de {home}.
  </p>

  {#if moves.length}
    <div class="sntrack">
      {#each moves as a, i (i)}
        <span class="snmark" class:snlast={i === moves.length - 1} title={label(a)}>
          <b>{arrow(a)}</b><i>{i + 1}</i>
        </span>
      {/each}
    </div>
    <p class="small-note" style="margin:2px 0 0">
      El último ({moves.length}) fue <b>{arrow(moves[moves.length - 1])} {label(moves[moves.length - 1])}</b>.
      Probad su ruta desde varias salidas: las islas y los bordes descartan caminos.
      🤫 = se deslizó sin decir rumbo (1 o 2 casillas); ⏫ = emergió y cantó cuadrante.
    </p>
  {:else}
    <p class="small-note" style="margin:8px 0 0">Aún no ha navegado: en cuanto lo haga, su rumbo aparecerá aquí numerado.</p>
  {/if}

  <hr class="sep" />

  <p class="small-note" style="margin:0">
    🗒️ <b>Cuaderno (solo en tu móvil).</b> Toca una casilla y va pasando por ❌ descartada → ⭕ candidata → limpia.
    Nadie más ve tus marcas: es tu papel y boli para tachar dónde NO puede estar.
  </p>
  <MapGrid sub={game.subs[team]} {team} {notes} onNote={toggle} />
  <p class="small-note" style="margin:0 0 8px">
    {#if out || maybe}❌ {out} descartada{out === 1 ? '' : 's'} · ⭕ {maybe} candidata{maybe === 1 ? '' : 's'}. {/if}
    Vuestro submarino sale de referencia para medir el alcance del torpedo.
  </p>
  <button class="small ghost" data-a="sn-notes-clear" disabled={!vals.length} onclick={clear}>🧹 Borrar mis marcas ({vals.length})</button>
</div>

<style>
  .sntrack { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0; }
  .snmark { display: inline-flex; flex-direction: column; align-items: center; min-width: 32px; padding: 3px 4px 1px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg2); }
  .snmark b { font-size: 1.05rem; line-height: 1.1; }
  .snmark i { font-size: 0.58rem; font-style: normal; color: var(--muted); }
  .snmark.snlast { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--bg-1)); }
</style>
