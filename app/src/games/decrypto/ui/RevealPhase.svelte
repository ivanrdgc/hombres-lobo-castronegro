<script lang="ts">
  // Resultado de la transmisión: se destapa el código real y las fichas. Cualquiera
  // pasa al siguiente medio-turno.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { TEAM_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const last = $derived(game.history[game.history.length - 1]);
  void my;
</script>

<div class="narration">📻 Código del {TEAM_LABEL[game.active]}: <b>{game.code.join(' - ')}</b></div>

{#if last}
  <div class="card">
    {#each last.clues as c, i (i)}<p class="small-note" style="margin:3px 0"><b>{game.code[i]}</b> ← {c}</p>{/each}
    <p class="small-note" style="margin:6px 0 0">
      {game.decode && game.decode.join('-') === game.code.join('-') ? '✅ El equipo descifró su código.' : `❌ El equipo falló (dijo ${game.decode?.join('-') || '—'}).`}
      {#if game.intercept}{game.intercept.join('-') === game.code.join('-') ? ' 🕵️ ¡Interceptado por el rival!' : ' 🔒 El rival no interceptó.'}{/if}
    </p>
  </div>
{/if}

<div class="card"><p class="small-note" style="margin:0">🔴 {game.tokens.red.intercepts}🕵️ · {game.tokens.red.errors}❌ &nbsp;|&nbsp; 🔵 {game.tokens.blue.intercepts}🕵️ · {game.tokens.blue.errors}❌</p></div>

<button class="primary block" data-a="de-next" onclick={() => guard(A.nextTransmission)}>▶️ Siguiente transmisión</button>
