<script lang="ts">
  // Panel de la fase de pista: el Jefe del equipo de turno escribe palabra +
  // número; el resto espera. La pista se valida ANTES de enviarla (es
  // irreversible): una sola palabra y que no esté en el tablero.
  // El mapa va arriba, en su tarjeta; aquí solo está lo que hay que HACER.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { clueProblem, teamMembers, TEAM_LABEL } from '../engine';
  import BoardRef from './BoardRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my, stalled = false }: {
    game: CodenamesState; my: PlayerDoc; stalled?: boolean;
  } = $props();
  const iAmSpy = $derived(game.spymaster[game.turn] === my.id);
  const spyName = $derived(game.names[game.spymaster[game.turn]] || '¿?');
  // Quién tocará cuando llegue la pista: quien espera quiere saber a quién mira.
  const agents = $derived(teamMembers(game, game.turn)
    .filter((pid) => pid !== game.spymaster[game.turn])
    .map((pid) => game.names[pid] || '¿?'));
  let word = $state('');
  // `num` es el número de la pista; `inf` la marca como ∞ (ilimitada).
  let num = $state(1);
  let inf = $state(false);
  const problem = $derived(clueProblem(game, word));
  const label = $derived(inf ? '∞' : String(num));
  // Qué significa el número elegido, dicho donde se elige (contrato B25·1): el
  // 0 y el ∞ son las dos jugadas que nadie recuerda de un juego a otro.
  const numMeans = $derived(inf
    ? '∞: seguid con las que quedaron pendientes de pistas anteriores. Sin límite de toques.'
    : num === 0
      ? '0: ninguna de tus casillas se parece a esa palabra (sirve para alejarlos de una trampa). Sin límite de toques.'
      : `${num}: la palabra conecta ${num} casilla${num === 1 ? '' : 's'} tuya${num === 1 ? '' : 's'}. Podrán tocar hasta ${num + 1} veces.`);
</script>

{#if iAmSpy}
  <div class="actionpanel"><h3>💬 Da tu pista</h3>
    <p class="hint">Una palabra que conecte casillas tuyas y cuántas son. <b>Dila también en voz alta</b>: tocan {agents.join(', ') || 'tus agentes'}.</p>

    <label class="cnlab" for="cn-clue-word">1 · La palabra</label>
    <input id="cn-clue-word" class="block" data-a="cn-clue-word" bind:value={word} maxlength="24" placeholder="p. ej. «fuego»" autocomplete="off" autocapitalize="none" />

    <p class="cnlab">2 · El número</p>
    <div class="cnnums" role="group" aria-label="Número de la pista">
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as k (k)}
        <button class="small {!inf && num === k ? 'primary' : 'ghost'}" data-a="cn-clue-num" data-p={String(k)} onclick={() => { num = k; inf = false; }}>{k}</button>
      {/each}
      <button class="small {inf ? 'primary' : 'ghost'}" data-a="cn-clue-num" data-p="inf" onclick={() => (inf = true)}>∞</button>
    </div>
    <p class="small-note" style="margin-top:6px">{numMeans}</p>

    <!-- El botón gris nunca se queda mudo: siempre está escrito POR QUÉ no se
         puede enviar (y la pista es irreversible: mejor pararla aquí). -->
    {#if problem}<p class="small-note" data-a="cn-clue-bad" style={word ? 'color:var(--danger)' : ''}>{word ? '⚠️' : '✍️'} {problem}</p>{/if}
    <button class="primary block" data-a="cn-clue-give" disabled={!!problem} onclick={() => guard(() => A.giveClue(word, num, inf))}>💬 Dar la pista{word ? ` «${word}»` : ''} · {label}</button>
    <BoardRef {game} />
  </div>
{:else}
  <!-- Pantalla de espera: la misma para los suyos, para el rival y para los
       espectadores. Nada de lo que hay aquí sale del mapa. -->
  <div class="actionpanel"><h3>⏳ {spyName} escribe su pista</h3>
    <p class="hint">La pista es pública y la oiréis todos. Mientras, mirad el tablero y pensad qué palabras podrían caer del equipo {TEAM_LABEL[game.turn]}.</p>
    {#if stalled}
      <p class="small-note">⏭️ ¿{spyName} no puede seguir (sin batería, se ha ido)? En el menú <b>⋯</b> tenéis «Saltar el turno de {spyName}».</p>
    {/if}
    <BoardRef {game} />
  </div>
{/if}

<style>
  .cnlab { display: block; margin: 12px 0 5px; font-size: 0.8rem; font-weight: 700; color: var(--muted, #a9a6c0); }
  /* Los once números en una rejilla propia: con `.btnrow` heredaban
     `min-width: 130px` y salían dos por fila, seis filas de altura. Aquí caben
     en dos filas y cada uno mantiene los 44 px de objetivo táctil. */
  .cnnums { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .cnnums button { min-width: 0; min-height: 44px; padding: 0; font-size: 1.05rem; font-weight: 700; border-radius: 10px; }
</style>
