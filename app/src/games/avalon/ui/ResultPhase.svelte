<script lang="ts">
  // Resultado de la misión: éxito o fracaso y cuántos sabotajes (nunca quién).
  // Cualquiera en juego (o el narrador) continúa a la siguiente misión.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { tally } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const q = $derived(game.lastQuest!);
  const score = $derived(tally(game));
  const canGo = $derived(game.playerIds.includes(my.id));
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="narration">{q.success ? '✅ Misión cumplida' : '💥 Misión saboteada'} · misión {q.quest}.</div>

<div class="card" style="text-align:center">
  <div style="font-size:2.4rem">{q.success ? '✅' : '💥'}</div>
  <h3 style="margin:4px 0">La misión {q.quest} {q.success ? 'ha tenido ÉXITO' : 'ha FRACASADO'}</h3>
  <p class="small-note">Equipo: {q.team.map(nm).join(', ')}.</p>
  <p class="small-note">{q.fails === 0 ? 'Ningún sabotaje' : `${q.fails} carta${q.fails === 1 ? '' : 's'} de sabotaje`}{q.required === 2 ? ' (hacían falta 2)' : ''}. La app nunca dice de quién.</p>
  <p class="small-note" style="font-weight:700">🏰 Bien {score.success} · Mal {score.fail} 🗡️</p>
  {#if canGo}
    <button class="primary block" data-a="av-result-continue" onclick={() => guard(A.continueAfterResult)}>▶️ Continuar</button>
  {:else}
    <p class="small-note">Esperando a que la mesa continúe…</p>
  {/if}
</div>
