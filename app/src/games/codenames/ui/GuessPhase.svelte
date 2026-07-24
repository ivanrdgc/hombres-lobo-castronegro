<script lang="ts">
  // Panel de la fase de toques: los agentes del equipo de turno eligen casilla
  // en el tablero (arriba) y la CONFIRMAN aquí —un roce no puede destapar al
  // asesino— o pasan. La pista va en su banda, encima del tablero.
  // Tres pantallas de espera, porque hay tres papeles distintos esperando: el
  // Jefe que acaba de hablar (y tiene que callarse y guardar su mapa), el
  // equipo rival y quien mira. Ninguna dice nada que no sea público.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { canGuess, canPass, teamMembers, TEAM_LABEL } from '../engine';
  import BoardRef from './BoardRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my, sel = null, onconfirm, oncancel }: {
    game: CodenamesState; my: PlayerDoc; sel?: number | null;
    onconfirm: () => void; oncancel: () => void;
  } = $props();
  const iGuess = $derived(canGuess(game, my.id));
  const iAmTurnSpy = $derived(game.spymaster[game.turn] === my.id);
  const mayPass = $derived(canPass(game));
  const selWord = $derived(sel === null ? null : game.words[sel]);
  // A quién mira el que espera: los agentes del equipo de turno, por su nombre.
  const agents = $derived(teamMembers(game, game.turn)
    .filter((pid) => pid !== game.spymaster[game.turn])
    .map((pid) => game.names[pid] || '¿?'));
</script>

{#if iGuess}
  <div class="actionpanel"><h3>👉 Destapad una palabra</h3>
    <!-- Dos pasos (contrato de UI): tocar en el tablero MARCA; este botón, que
         nombra la palabra, es el que destapa. Un roce no puede acabar la partida. -->
    <p class="hint">{selWord === null
      ? 'Tocad arriba la palabra que creáis vuestra: se marca, y aquí la confirmáis.'
      : `Si «${selWord}» es vuestra, seguís; si no, se acaba el turno.`}</p>
    <button class="primary block" data-a="cn-confirm" disabled={selWord === null} onclick={onconfirm}>
      {selWord === null ? '👉 Elegid una palabra arriba' : `👉 Destapar «${selWord}»`}
    </button>
    {#if selWord !== null}
      <button class="ghost block" style="margin-top:6px" data-a="cn-unselect" onclick={oncancel}>↩️ Elegir otra</button>
    {/if}
    <button class="ghost block" style="margin-top:6px" data-a="cn-pass" disabled={!mayPass} onclick={() => guard(A.passTurn)}>🤐 Pasar el turno</button>
    {#if !mayPass}<p class="small-note">Para pasar hay que destapar al menos UNA palabra por turno.</p>{/if}
    <BoardRef {game} />
  </div>
{:else if iAmTurnSpy}
  <div class="actionpanel"><h3>🤐 Ahora te callas</h3>
    <p class="hint">Ya diste tu pista: no puedes añadir nada, ni gestos, ni caras. Y cuidado con el mapa —si sueltas el móvil o te acercas a mirar con ellos, tápalo antes con «🙈 Taparlo».</p>
    <BoardRef {game} />
  </div>
{:else}
  <div class="actionpanel"><h3>👀 Toca el equipo {TEAM_LABEL[game.turn]}</h3>
    <p class="hint">Esperáis a <b>{agents.join(', ') || 'sus agentes'}</b>: mientras deciden, no se les sopla. Cada casilla que abran os dice algo a vosotros también.</p>
    <BoardRef {game} />
  </div>
{/if}
