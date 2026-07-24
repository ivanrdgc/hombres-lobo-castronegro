<script lang="ts">
  // Fase de pistas (verbal): la app lleva el TURNO. Con 6-10 personas el «¿a
  // quién le toca?» era la pregunta garantizada; ahora hay banner de turno, la
  // lista marca quién ha hablado y solo al final aparece el botón de votar (así
  // un toque de más no corta las pistas, y «↩️ Atrás» deshace el que sí).
  //
  // Pasada de UI: la lista va numerada y con «(tú)», y quien no habla ahora ve
  // en una línea cuándo le toca y qué se espera de él mientras tanto.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { clueOrder, cluesGiven, cluesDone, currentCluePid, nextCluePid } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const order = $derived(clueOrder(game));
  const given = $derived(cluesGiven(game));
  const allDone = $derived(cluesDone(game));
  const cur = $derived(currentCluePid(game));
  const next = $derived(nextCluePid(game));
  const myTurn = $derived(inGame && cur === my.id);
  const myIdx = $derived(order.indexOf(my.id));
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  // Cuántos quedan por hablar antes que yo (para el «hablas tú después de…»).
  const beforeMe = $derived(myIdx >= 0 ? myIdx - given : -1);
  const prevOfMe = $derived(myIdx > 0 ? order[myIdx - 1] : null);
  const queue = $derived(beforeMe > 1 ? ` (quedan ${beforeMe} antes que tú)` : '');
</script>

{#if allDone}
  <div class="narration">👉 Ya ha hablado toda la mesa. Comentad en voz alta lo que os ha chirriado y, cuando queráis, a votar.</div>
{:else if myTurn}
  <div class="narration">🗣️ <b>¡Te toca a ti!</b> Di EN VOZ ALTA una sola palabra: ni tan obvia que regale la secreta, ni tan vaga que parezcas el Camaleón.</div>
{:else}
  <div class="narration">🗣️ Habla <b>{nm(cur)}</b>: una palabra en voz alta.</div>
{/if}

<!-- B29 · un dato, un sitio: de quién es el turno se decía cuatro veces (banda,
     título, línea personal y botón). Ahora la banda lo dice una vez y esta
     tarjeta es solo el ORDEN y lo que se espera de mí. -->
<div class="card">
  <h3 style="margin-bottom:2px">🔁 Pistas dichas: {given} de {game.playerIds.length}</h3>
  <p class="small-note" style="margin:0">✅ ya ha hablado · 🗣️ habla ahora</p>
  <div class="chorder">
    {#each order as pid, i (pid)}
      <span class="chturn {i < given ? 'done' : ''} {i === given ? 'now' : ''}" data-a="ch-turn" data-p={pid}>
        <b class="chnum">{i + 1}</b>{i < given ? '✅ ' : i === given ? '🗣️ ' : ''}{nm(pid)}{#if pid === my.id} <span class="chyou">tú</span>{/if}
      </span>
    {/each}
  </div>

  {#if !inGame}
    <p class="small-note" style="margin-top:0">👀 Miras de espectador: la mesa canta sus pistas por turnos.</p>
  {:else if allDone}
    <button class="primary block" data-a="ch-start-vote" onclick={() => guard(A.startVote)}>👉 Abrir la votación</button>
  {:else if myTurn}
    <p class="small-note" style="margin-top:0">{#if next}Dila en voz alta primero; el botón solo pasa el turno a <b>{nm(next)}</b>.{:else}Dila en voz alta primero: eres el último y con tu pista se cierra la vuelta.{/if}</p>
    <button class="primary block" data-a="ch-clue-next" onclick={() => guard(() => A.stepClue(1))}>✅ Ya he dicho mi pista</button>
  {:else}
    <p class="small-note" style="margin-top:0">
      {#if beforeMe > 0}
        Ve pensando la tuya: hablas el <b>{myIdx + 1}.º</b>, después de <b>{nm(prevOfMe)}</b>{queue}.
      {:else}
        Ya has dicho la tuya. Escucha al resto: la del Camaleón sonará vaga o demasiado parecida a una anterior.
      {/if}
    </p>
    <button class="block" data-a="ch-clue-next" onclick={() => guard(() => A.stepClue(1))}>⏭️ {nm(cur)} ya ha dicho la suya</button>
  {/if}

  {#if inGame && given > 0}
    <div style="text-align:center;margin-top:8px">
      <button class="small ghost" data-a="ch-clue-back" onclick={() => guard(() => A.stepClue(-1))}>↩️ Atrás (volver al turno anterior)</button>
    </div>
  {/if}

  <details class="chref">
    <summary data-a="ch-clue-ref">📖 ¿Qué es una buena pista? (y cómo se gana)</summary>
    <div class="settingrow"><div class="sinfo">
      <div class="sname">🔑 Si sabes la palabra</div>
      <div class="sdesc">Una sola palabra que demuestre que la conoces, pero que no se la regale al Camaleón. Demasiado obvia y la adivina; demasiado vaga y sospecharán de ti.</div>
    </div></div>
    <div class="settingrow"><div class="sinfo">
      <div class="sname">🦎 Si eres el Camaleón</div>
      <div class="sdesc">No la conoces: pesca por dónde van las anteriores y suelta algo que encaje con el tema sin comprometerte.</div>
    </div></div>
    <div class="settingrow"><div class="sinfo">
      <div class="sname">👉 Después</div>
      <div class="sdesc">Se debate y se vota en secreto. Si señaláis al Camaleón, aún puede escapar adivinando la palabra; si señaláis a un inocente o hay empate, gana él.</div>
    </div></div>
  </details>
</div>
{#if inGame}<MyCard {game} pid={my.id} mini={true} />{/if}

<style>
  .chorder { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; }
  .chturn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 11px; border-radius: 999px; font-size: 0.88rem; font-weight: 600;
    border: 1px solid var(--border, #2c3047); background: var(--card2, #222639);
    color: var(--text, #eceaf6);
  }
  /* Ya no se atenúa a media luz: el orden completo tiene que leerse de un vistazo. */
  .chturn.done { color: var(--muted, #a9a6c0); text-decoration: line-through; }
  .chturn.now { border-color: var(--accent, #f2b552); box-shadow: 0 0 0 1px var(--accent, #f2b552) inset; }
  /* El orden es información pública: el ordinal también se lee (era 0,6). */
  .chnum { font-size: 0.76rem; opacity: 0.82; font-weight: 700; }
  .chyou { font-size: 0.72rem; font-weight: 700; color: var(--accent, #f2b552); }
  .chref { margin-top: 10px; border-top: 1px solid var(--border, #2c3047); padding-top: 8px; }
  .chref summary { cursor: pointer; font-size: 0.84rem; color: var(--accent, #f2b552); padding: 4px 0; }
</style>
