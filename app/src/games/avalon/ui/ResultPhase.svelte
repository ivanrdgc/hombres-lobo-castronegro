<script lang="ts">
  // Resultado de la misión: éxito o fracaso y cuántos sabotajes (nunca quién).
  // Cualquiera en juego (o el dispositivo que narra) continúa a la siguiente.
  import { isMaster } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { tally, assassinId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const q = $derived(game.lastQuest!);
  const score = $derived(tally(game));
  // Igual que en el destape del voto: el altavoz que no juega también avanza.
  const canGo = $derived(game.playerIds.includes(my.id) || isMaster());
  const nm = (pid: string) => game.names[pid] || '¿?';
  // El botón dice ADÓNDE lleva (B29/«el botón dice lo que hace»): la siguiente
  // misión, el disparo del Asesino o el final de la partida.
  const next = $derived(
    score.fail >= 3 ? '🌅 Ver el final: el Mal gana'
      : score.success >= 3 ? (assassinId(game) ? '🗡️ Ahora dispara el Asesino' : '🌅 Ver el final: el Bien gana')
        : `▶️ Seguir a la misión ${q.quest + 1}`,
  );
</script>

<!-- Una sola vez el titular (antes: línea de narración + título de la tarjeta) y
     el marcador se queda en el tablero de arriba, que es su sitio: repetirlo
     aquí era el mismo dato dos veces en la misma pantalla (B29). -->
<div class="card" style="text-align:center">
  <div style="font-size:2.4rem">{q.success ? '✅' : '💥'}</div>
  <h3 style="margin:4px 0">La misión {q.quest} {q.success ? 'ha tenido ÉXITO' : 'ha FRACASADO'}</h3>
  <p class="small-note">Fueron {q.team.map(nm).join(', ')} · {q.fails === 0 ? 'ningún sabotaje' : `${q.fails} carta${q.fails === 1 ? '' : 's'} de sabotaje`}{q.required === 2 ? ' (hacían falta 2)' : ''}. Nunca se dice de quién.</p>
  {#if canGo}
    <button class="primary block" data-a="av-result-continue" onclick={() => guard(A.continueAfterResult)}>{next}</button>
  {:else}
    <p class="small-note">Esperando a que la mesa continúe…</p>
  {/if}
</div>
