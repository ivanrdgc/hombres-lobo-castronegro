<script lang="ts">
  // Fase de adivinar el código. En 'intercept' actúa el equipo RIVAL; en
  // 'decode', el propio equipo (menos su encriptador). Cada uno con las pistas a
  // la vista; el que registra elige el orden de cifras.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { encoderId, teamOf, other, TEAM_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';
  import CodePicker from './CodePicker.svelte';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const myTeam = $derived(teamOf(game, my.id));
  const intercepting = $derived(game.phase === 'intercept');
  // ¿Le toca a MI equipo actuar en esta subfase? Interceptar → el rival del
  // activo; descifrar → el activo (y no el encriptador).
  const iCanAct = $derived.by(() => {
    if (!myTeam) return false;
    if (intercepting) return myTeam === other(game.active);
    return myTeam === game.active && my.id !== encoderId(game, game.active);
  });
  let code = $state<[number, number, number]>([0, 0, 0]);
  const ready = $derived(new Set(code).size === 3 && code.every((d) => d >= 1 && d <= 4));
</script>

<div class="narration">
  {#if intercepting}🕵️ El equipo {TEAM_LABEL[other(game.active)]} intenta INTERCEPTAR el código del {TEAM_LABEL[game.active]}.
  {:else}🔓 El equipo {TEAM_LABEL[game.active]} descifra su propio código.{/if}
</div>

<div class="card"><h3 style="margin:0 0 4px">💬 Pistas dadas</h3>
  {#each game.clues || [] as c, i (i)}<p class="small-note" style="margin:3px 0"><b>{i + 1}.ª pista:</b> {c}</p>{/each}
</div>

{#if iCanAct}
  <div class="actionpanel"><h3>{intercepting ? '🕵️ Vuestra intercepción' : '🔓 Vuestro descifrado'}</h3>
    <p class="hint">¿Qué cifra corresponde a cada pista? Poned el código en el orden de las pistas.</p>
    <CodePicker value={code} onchange={(c) => (code = c)} />
    <button class="primary block" data-a={intercepting ? 'de-intercept' : 'de-decode'} disabled={!ready}
      onclick={() => guard(() => (intercepting ? A.submitIntercept(code) : A.submitDecode(code)))}>
      {intercepting ? '🕵️ Registrar intercepción' : '🔓 Registrar descifrado'} {ready ? code.join('-') : ''}
    </button>
  </div>
{:else}
  <div class="card"><p class="hint">👀 {intercepting ? `El equipo ${TEAM_LABEL[other(game.active)]} delibera su intercepción…` : `El equipo ${TEAM_LABEL[game.active]} descifra su código…`}</p></div>
{/if}
