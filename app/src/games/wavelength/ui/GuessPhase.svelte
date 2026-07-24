<script lang="ts">
  // Fase de adivinar. Aquí la postura cambia de bando (B28):
  //  · 👥 EQUIPO: el dial es la MESA. Una sola marca para todos, que se manosea
  //    entre varios y se mira desde donde cada uno esté sentado: pista en
  //    grande, barra alta, pomo gordo y el número cantado.
  //  · 🃏 El Psíquico sigue teniendo el secreto en la mano: su dial no pinta la
  //    diana (solo mientras mantiene pulsado), porque es justo el rato en que
  //    los demás se mueven, se asoman y él tiene el móvil en la mesa.
  // Una sola palabra para la cosa que se mueve: LA MARCA (el botón, la aguja
  // roja y la voz dicen lo mismo). «Marcador» se ha quedado para los puntos.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const inTeam = $derived(game.playerIds.includes(my.id) && !iAmPsychic);
  const psychicName = $derived(game.names[psychicId(game)] || '¿?');
  const pickedBy = $derived(game.pickBy ? game.names[game.pickBy] || '' : '');
  const pickedByMe = $derived(game.pickBy === my.id);
  // Cuántos móviles MÁS enseñan esta misma marca (el equipo, menos yo).
  const others = $derived(Math.max(1, game.playerIds.length - 2));
  const othersTxt = $derived(others === 1 ? 'el otro móvil del equipo la ve igual'
    : `los otros ${others} móviles del equipo la ven igual`);

  // La marca vive en el DOC (todos ven la misma). `drag` es solo el valor
  // mientras el dedo va por la barra: se publica al soltar.
  let drag = $state<number | null>(null);
  const pos = $derived(drag ?? game.pick ?? 50);
  // Confirmación en dos toques, anclada al valor: si la marca se mueve (yo u
  // otro), se desarma sola. Fijar es siempre sobre lo que la mesa está viendo.
  let armedAt = $state<number | null>(null);
  const armed = $derived(armedAt !== null && armedAt === game.pick);

  // Sin `guard`: su cerrojo «una acción a la vez» descartaría en silencio el
  // toque de confirmar que llega pisando al último arrastre. Mover la marca es
  // una escritura menuda e idempotente; si se pierde, el siguiente arrastre la
  // repone.
  async function publish(v: number) {
    drag = v;
    try { await A.movePick(v); } catch { /* la marca se repone al siguiente arrastre */ }
    if (drag === v) drag = null;
  }
</script>

{#if inTeam}
  <div class="actionpanel"><h3>🎚️ ¿Dónde apuntaba la pista?</h3>
    {#if game.clueText}
      <p class="clue"><b class="big">«{game.clueText}»</b><span class="by">la pista de {psychicName}</span></p>
    {:else}
      <p class="clue"><span class="by">{psychicName} la dijo en voz alta y no la apuntó: recordadla entre todos (no puede repetirla).</span></p>
    {/if}

    <Dial spectrumId={game.spectrumId} selectable={true} value={pos} onpick={(v) => (drag = v)} onpickend={publish} />

    <!-- El número ya está dos veces donde toca (el grande del dial y el botón
         de fijar): esta línea solo dice de QUIÉN es la mano, que en una mesa se
         ve y en el móvil no. -->
    <p class="who">
      {#if game.pick === null}
        ⚪ Nadie la ha movido todavía. Arrastrad el pomo entre todos: es la MISMA marca en todos vuestros móviles.
      {:else if pickedByMe}
        🟢 La marca la has puesto <b>tú</b> y {othersTxt}.
      {:else}
        🟢 La marca la ha puesto <b>{pickedBy || 'el equipo'}</b> y la veis igual todos.
      {/if}
    </p>

    <button class="primary block" data-a="wl-guess-confirm" disabled={game.pick === null}
      onclick={() => { if (armed) guard(A.castGuess); else armedAt = game.pick; }}>
      {armed ? `✅ Sí: fijar en ${game.pick} y puntuar` : `✅ Fijar la marca en ${game.pick ?? '—'}`}
    </button>
    {#if game.pick === null}
      <p class="small-note" style="margin-top:6px">Hasta que no la mováis no hay nada que fijar.</p>
    {:else if armed}
      <p class="warn">⚠️ El segundo toque cierra la ronda y revela el objetivo. No se puede deshacer.</p>
      <button class="ghost block" data-a="wl-guess-cancel" onclick={() => (armedAt = null)}>↩️ No: seguir moviéndola</button>
    {:else}
      <p class="small-note" style="margin-top:6px">Pedirá un segundo toque: la fija uno por todos, cuando estéis de acuerdo.</p>
    {/if}

    <!-- La referencia, aquí mismo: en esta pantalla es donde se decide, y lo que
         puntúa cada franja no se lleva de memoria (B25). Dice lo mismo, con las
         mismas palabras, que la pastilla «📖 Reglas». -->
    <details class="ref">
      <summary data-a="wl-ref-guess">📖 Cuánto puntúa cada franja y qué se puede hacer</summary>
      <p class="small-note">La diana (que no veis) es una franja de ±15 alrededor del objetivo: su centro vale <b>4</b> puntos, la parte media <b>3</b> y la exterior <b>2</b>. Fuera de ella, <b>0</b>. Ajustar un par de puntos importa.</p>
      <p class="small-note">Podéis debatir sin prisa y mover la marca las veces que queráis: solo cuenta dónde esté al fijarla, y la mueve cualquiera del equipo.</p>
      <p class="small-note">{psychicName} ya no puede añadir nada ni hacer gestos: si lo intenta, ignoradle. Los puntos son del equipo y también suyos.</p>
    </details>
  </div>
{:else if iAmPsychic}
  <div class="privacy" data-a="wl-private">
    🙈 <b>Sigues teniendo el objetivo en el móvil</b>, y es cuando más se asoman: pantalla hacia ti hasta que se revele.
  </div>
  <div class="card">
    {#if game.clueText}<p class="clue" style="margin-top:0">💬 Tu pista: <b>«{game.clueText}»</b></p>{/if}
    <Dial spectrumId={game.spectrumId} target={game.target} marker={game.pick} legend="result" secret={true} />
    <p class="small-note" style="margin-top:2px">
      {game.pick === null ? 'Aún no han movido nada.' : `Van por ${game.pick}${pickedBy ? ` (la movió ${pickedBy})` : ''}. La fijan ellos: tú ya no tocas el dial.`}
    </p>
  </div>
{:else}
  <div class="card">
    {#if game.clueText}<p class="clue" style="margin-top:0">💬 La pista: <b>«{game.clueText}»</b></p>{/if}
    <Dial spectrumId={game.spectrumId} marker={game.pick} />
    <p class="small-note" style="margin-top:2px">
      {game.pick === null ? 'El equipo aún no ha movido la marca; para ti el objetivo sigue siendo secreto.' : `La marca va por ${game.pick}${pickedBy ? `, la movió ${pickedBy}` : ''}.`}
    </p>
  </div>
{/if}

<style>
  /* La pista es la carta que estaría en el centro de la mesa: se lee entre
     todos, a veces desde el otro lado. Va sola, grande y sin adornos. */
  .clue { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; margin: 8px 0; font-size: 0.95rem; text-align: center; }
  .clue .big { display: block; font-size: 1.5rem; line-height: 1.2; color: var(--moon); }
  .clue .by { display: block; font-size: 0.8rem; color: var(--muted); margin-top: 3px; }
  .who { font-size: 0.95rem; color: var(--muted); margin: 8px 0 0; }
  .who b { color: var(--text); }
  .warn { font-size: 0.82rem; color: var(--moon); margin: 6px 0 0; }
  .ref { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .ref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
  /* Mismo aviso permanente que en la fase de pista (postura de mano). */
  .privacy {
    position: sticky; top: 0; z-index: 3;
    background: color-mix(in srgb, var(--danger) 22%, var(--bg-1));
    border: 1px solid var(--danger); border-radius: var(--r-1);
    padding: 10px 12px; margin: 10px 0 0; font-size: 0.88rem; line-height: 1.35;
    box-shadow: var(--shadow-1);
  }
  .privacy b { color: var(--moon); }
</style>
