<script lang="ts">
  // Fase de adivinar: el equipo (todos menos el Psíquico) mueve UN marcador
  // compartido y, tras debatir, uno lo fija con doble toque. El Psíquico ya no
  // interviene. OJO con el objetivo: la diana solo se pinta en el móvil del
  // Psíquico — el dispositivo que pone la voz sin jugar suele estar en el
  // centro de la mesa, y cualquiera puede entrar con «👀 Mirar».
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId } from '../engine';
  import { spectrumById } from '../spectrums';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const inTeam = $derived(game.playerIds.includes(my.id) && !iAmPsychic);
  const psychicName = $derived(game.names[psychicId(game)] || '¿?');
  const pickedBy = $derived(game.pickBy ? game.names[game.pickBy] || '' : '');
  const pickedByMe = $derived(game.pickBy === my.id);
  const spec = $derived(spectrumById(game.spectrumId));

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
      <p class="clue">💬 La pista de <b>{psychicName}</b>: <b class="big">«{game.clueText}»</b></p>
    {:else}
      <p class="clue">💬 <b>{psychicName}</b> ya ha dado su pista en voz alta (no la apuntó, y no puede repetirla): recordadla entre todos.</p>
    {/if}
    <p class="hint">El dial va de <b>{spec?.left ?? '0'}</b> (0) a <b>{spec?.right ?? '100'}</b> (100). Debatid y arrastrad el pomo: el marcador es el MISMO para todo el equipo, lo mueva quien lo mueva.</p>

    <Dial spectrumId={game.spectrumId} selectable={true} value={pos} onpick={(v) => (drag = v)} onpickend={publish} />

    <p class="who">
      {#if game.pick === null}
        ⚪ Nadie lo ha movido todavía.
      {:else if pickedByMe}
        🟢 Marcador en <b>{game.pick}</b>: lo has puesto <b>tú</b> (todos lo ven ahí).
      {:else}
        🟢 Marcador en <b>{game.pick}</b>: lo movió <b>{pickedBy || 'el equipo'}</b>.
      {/if}
    </p>

    <button class="primary block" data-a="wl-guess-confirm" disabled={game.pick === null}
      onclick={() => { if (armed) guard(A.castGuess); else armedAt = game.pick; }}>
      {armed ? `✅ Sí: fijar en ${game.pick} y puntuar` : `✅ Fijar la marca en ${game.pick ?? '—'}`}
    </button>
    {#if game.pick === null}
      <p class="small-note" style="margin-top:6px">Arrastra el pomo (o toca en la barra) para poder fijarlo: hasta entonces no hay nada que puntuar.</p>
    {:else if armed}
      <p class="warn">⚠️ Segundo toque = se acaba la ronda y se revela el objetivo. No se puede deshacer.</p>
      <button class="ghost block" data-a="wl-guess-cancel" onclick={() => (armedAt = null)}>↩️ No: seguir moviéndolo</button>
    {:else}
      <p class="small-note" style="margin-top:6px">Pide un segundo toque para confirmar: nadie cierra la ronda por accidente. Lo fija uno por todos, cuando estéis de acuerdo.</p>
    {/if}

    <!-- La chuleta, aquí mismo: en esta pantalla es donde se decide, y lo que
         puntúa cada franja no se lleva de memoria. -->
    <details class="ref">
      <summary data-a="wl-ref-guess">📖 Cuánto puntúa cada franja y qué se puede hacer</summary>
      <p class="small-note">La diana (que no veis) es una franja de ±15 alrededor del objetivo: su centro vale <b>4</b> puntos, la parte media <b>3</b> y la exterior <b>2</b>. Fuera de ella, <b>0</b>. Ajustar un par de puntos importa.</p>
      <p class="small-note">Podéis debatir sin prisa y mover el marcador las veces que queráis: solo cuenta dónde esté al fijarlo, y lo mueve cualquiera del equipo.</p>
      <p class="small-note">{psychicName} ya no puede añadir nada ni hacer gestos: si lo intenta, ignoradle. Los puntos son del equipo y también suyos.</p>
    </details>
  </div>
{:else if iAmPsychic}
  <div class="narration">🎚️ Ya diste tu pista. El equipo está colocando el marcador… tú, cara de póker: ni una palabra, ni un gesto.</div>
  <div class="card">
    {#if game.clueText}<p class="clue" style="margin-top:0">💬 Tu pista: <b>«{game.clueText}»</b></p>{/if}
    <Dial spectrumId={game.spectrumId} target={game.target} marker={game.pick} legend="result" />
    <p class="small-note" style="margin-top:2px">
      {game.pick === null ? 'Aún no han movido nada.' : `Van por ${game.pick}${pickedBy ? ` (lo movió ${pickedBy})` : ''}. Lo fijan ellos: tú ya no tocas el dial.`}
    </p>
  </div>
{:else}
  <div class="narration">👀 Miras de espectador: para ti el objetivo sigue siendo secreto. <b>{psychicName}</b> ya dio su pista y el equipo está colocando el marcador.</div>
  <div class="card">
    {#if game.clueText}<p class="clue" style="margin-top:0">💬 La pista: <b>«{game.clueText}»</b></p>{/if}
    <Dial spectrumId={game.spectrumId} marker={game.pick} />
    <p class="small-note" style="margin-top:2px">
      {game.pick === null ? 'El equipo aún no ha movido el marcador.' : `Marcador en ${game.pick}${pickedBy ? `, movido por ${pickedBy}` : ''}.`}
    </p>
  </div>
{/if}

<style>
  .clue { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; margin: 8px 0; font-size: 0.95rem; }
  .clue .big { font-size: 1.1rem; color: var(--moon); }
  .who { font-size: 0.85rem; color: var(--muted); margin: 6px 0 0; }
  .who b { color: var(--text); }
  .warn { font-size: 0.82rem; color: var(--moon); margin: 6px 0 0; }
  .ref { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; }
  .ref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); }
</style>
