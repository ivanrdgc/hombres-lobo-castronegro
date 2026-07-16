<script lang="ts">
  // Fase de día (port de dayPhase() + juezButton() de la v1): narración del
  // debate, pendientes, votación y cierre del día.
  import { app, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { narr } from '../texts/corpus';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import RoleCard from './RoleCard.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import PendingPanel from './PendingPanel.svelte';
  import VotePanel from './VotePanel.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const players = $derived(app.players.filter((p) => p.inGame));
  const head = $derived((game.pending || [])[0]);
  // ¿Este dispositivo tiene delante una lista de acción (ActionGrid)? Entonces
  // esa YA es la parrilla del pueblo: no se repite otra debajo.
  const actingHere = $derived.by(() => {
    if (head) {
      if (head.type === 'cazador' || head.type === 'alguacil_pick' || head.type === 'cabeza_pick') return my.id === head.pid;
      if (head.type === 'alguacil_elect') return !!my.alive;
      return false; // sirvienta: botones sí/no, sin lista
    }
    if ((game.votesLeft || 0) > 0 && !game.vote) {
      return !!(my.alive && !my.revealedTonto && (!game.soloVoteId || game.soloVoteId === my.id));
    }
    return false;
  });
</script>

<div class="narration">☀️ {narr(((game.lastDawn || {}).deaths || []).length ? 'dia_debate' : 'dia_debate_tranquilo', `${game.seed}:d${game.dayNum}:${game.votesLeft}`)}</div>
<RoleCard player={my} {group} mini={true} />
{#if my.role === 'juez' && my.alive && my.powers?.juez !== false && game.phase === 'day'}
  <div class="card"><p class="small-note">⚖️ Solo tú ves esto: puedes exigir una segunda votación hoy (una vez por partida).</p>
    <button class="violet block" data-a="juez-arm"
      onclick={() => guard(async () => { await A.armJuez(); setFlash('⚖️ Hecho: tras el juicio de hoy habrá una segunda votación.'); })}>⚖️ Exigir segunda votación tras el juicio</button></div>
{/if}
{#if head}
  <PendingPanel {head} {group} {my} {players} />
{:else if (game.votesLeft || 0) > 0 && !game.vote}
  <VotePanel {group} {my} {players} />
{:else if game.vote}
  <div class="actionpanel"><h3>⏳ Juicio en curso…</h3><p class="hint">La Sirvienta medita su decisión.</p></div>
{:else}
  <div class="card"><h3>🌆 El día ha terminado</h3>
    <p class="small-note">Comentad la jugada con calma. Cuando estéis listos, que alguien mande al pueblo a dormir.</p>
    {#if my.alive}<button class="primary block" data-a="begin-night" onclick={() => guard(A.startNextNight)}>🌙 Empezar la noche</button>{/if}</div>
{/if}
{#if !actingHere}
  <PlayersGrid {players} title="🏘️ El pueblo" showAlguacil={game.alguacilId || null} viewer={my} />
{/if}
