<script lang="ts">
  // Fase de pistas: SOLO el encriptador del equipo activo ve el código y escribe
  // las 3 pistas. Su equipo y el rival esperan (aún no ven nada del código).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { encoderId, TEAM_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const iEncode = $derived(encoderId(game, game.active) === my.id);
  const encName = $derived(game.names[encoderId(game, game.active)] || '¿?');
  const words = $derived(game.words[game.active]);
  let c0 = $state(''); let c1 = $state(''); let c2 = $state('');
  const ready = $derived(!!c0.trim() && !!c1.trim() && !!c2.trim());
</script>

{#if iEncode}
  <div class="actionpanel"><h3>🔐 Eres el encriptador ({TEAM_LABEL[game.active]})</h3>
    <p class="hint">Tu código secreto es <b>{game.code.join(' - ')}</b>. Da una pista para cada cifra, EN ESE ORDEN, y dilas también en voz alta.</p>
    <div class="declue"><span class="dn">{game.code[0]}</span><span class="dw">{words[game.code[0] - 1]}</span>
      <input class="block" data-a="de-clue-0" bind:value={c0} maxlength="30" placeholder="Pista para «{words[game.code[0] - 1]}»" autocomplete="off" /></div>
    <div class="declue"><span class="dn">{game.code[1]}</span><span class="dw">{words[game.code[1] - 1]}</span>
      <input class="block" data-a="de-clue-1" bind:value={c1} maxlength="30" placeholder="Pista para «{words[game.code[1] - 1]}»" autocomplete="off" /></div>
    <div class="declue"><span class="dn">{game.code[2]}</span><span class="dw">{words[game.code[2] - 1]}</span>
      <input class="block" data-a="de-clue-2" bind:value={c2} maxlength="30" placeholder="Pista para «{words[game.code[2] - 1]}»" autocomplete="off" /></div>
    <button class="primary block" style="margin-top:8px" data-a="de-clue-give" disabled={!ready}
      onclick={() => guard(() => A.giveClues([c0, c1, c2]))}>💬 Dar las 3 pistas</button>
  </div>
{:else}
  <div class="narration">🔐 <b>{encName}</b> (equipo {TEAM_LABEL[game.active]}) está preparando las pistas de su código…</div>
{/if}

<style>
  .declue { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  .declue .dn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-weight: 800; }
  .declue .dw { flex: 0 0 auto; font-size: 0.78rem; font-weight: 700; min-width: 62px; }
  .declue input { flex: 1; }
</style>
