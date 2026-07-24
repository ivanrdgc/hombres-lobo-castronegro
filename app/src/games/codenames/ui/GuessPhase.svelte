<script lang="ts">
  // Fase de toques: los agentes del equipo de turno eligen una casilla en el
  // tablero (arriba) y la CONFIRMAN aquí —un roce no puede destapar al asesino—
  // o pasan. El Jefe y el rival solo miran.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { canGuess, canPass, teamMembers } from '../engine';
  import BoardRef from './BoardRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my, sel = null, onconfirm, oncancel }: {
    game: CodenamesState; my: PlayerDoc; sel?: number | null;
    onconfirm: () => void; oncancel: () => void;
  } = $props();
  const iGuess = $derived(canGuess(game, my.id));
  const mayPass = $derived(canPass(game));
  const clue = $derived(game.clue);
  // Intentos: -1 es «sin límite» (pistas de 0 y de ∞).
  const left = $derived(game.guessesLeft < 0 ? 'sin límite' : String(game.guessesLeft));
  const clueNum = $derived(clue?.unlimited ? '∞' : String(clue?.num ?? 0));
  const selWord = $derived(sel === null ? null : game.words[sel]);
  // A quién mira el que espera: los agentes del equipo de turno, por su nombre.
  const agents = $derived(teamMembers(game, game.turn)
    .filter((pid) => pid !== game.spymaster[game.turn])
    .map((pid) => game.names[pid] || '¿?'));
</script>

<div class="narration">
  💬 Pista del equipo {game.turn === 'red' ? '🔴 rojo' : '🔵 azul'}: <b>«{clue?.word ?? ''}»</b> para {clueNum}. Toques restantes: <b>{left}</b>.
</div>

{#if iGuess}
  <div class="actionpanel"><h3>👉 Os toca destapar</h3>
    <!-- Dos pasos (contrato de UI): tocar en el tablero MARCA; este botón, que
         nombra la palabra, es el que destapa. Un roce no puede acabar la partida. -->
    <p class="hint">{selWord === null
      ? 'Toca arriba la palabra que creas de tu equipo: se marca, y aquí la confirmas.'
      : `Vas a destapar «${selWord}». Si es vuestra seguís; si no, se acaba el turno.`}</p>
    <button class="primary block" data-a="cn-confirm" disabled={selWord === null} onclick={onconfirm}>
      {selWord === null ? '👉 Elige una palabra arriba' : `👉 Confirmar «${selWord}»`}
    </button>
    {#if selWord !== null}
      <button class="ghost block" style="margin-top:6px" data-a="cn-unselect" onclick={oncancel}>↩️ Elegir otra</button>
    {/if}
    <button class="ghost block" style="margin-top:6px" data-a="cn-pass" disabled={!mayPass} onclick={() => guard(A.passTurn)}>🤐 Pasar el turno</button>
    {#if !mayPass}<p class="small-note">Aún no podéis pasar: hay que destapar al menos UNA palabra por turno.</p>{/if}
    <BoardRef {game} />
  </div>
{:else}
  <div class="actionpanel"><h3>👀 Toca el equipo {game.turn === 'red' ? '🔴 rojo' : '🔵 azul'}</h3>
    <p class="hint">Esperáis a <b>{agents.join(', ') || 'sus agentes'}</b>, que {agents.length === 1 ? 'está decidiendo' : 'están decidiendo'} qué destapar. Mirad el tablero: cada casilla que abran os dice algo a vosotros también.</p>
    <BoardRef {game} />
  </div>
{/if}
