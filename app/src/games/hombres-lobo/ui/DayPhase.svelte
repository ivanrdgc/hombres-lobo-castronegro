<script lang="ts">
  // Fase de día (port de dayPhase() + juezButton() de la v1): narración del
  // debate, pendientes, votación y cierre del día.
  // B25/B26: el parte del amanecer (quién ha muerto y qué se ha oído) va ARRIBA
  // y en claro — es lo público de la mesa y no debería haber que bucear en la
  // crónica; y ninguna pantalla se queda sin decir a quién se espera.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { canRegisterVote } from '../engine';
  import { narr } from '../texts/corpus';
  import { cuervoMarkId } from './labels';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import PlayersGrid from './PlayersGrid.svelte';
  import PendingPanel from './PendingPanel.svelte';
  import VotePanel from './VotePanel.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const players = $derived(app.players.filter((p) => p.inGame));
  const head = $derived((game.pending || [])[0]);
  const mutedTontos = $derived(players.filter((p) => p.alive && p.revealedTonto));
  const dawn = $derived(game.lastDawn || null);
  const alive = $derived(players.filter((p) => p.alive));
  // Público desde el amanecer: la voz ya lo ha anunciado a toda la mesa.
  const marked = $derived(cuervoMarkId(game));
  // ¿Este dispositivo tiene delante una lista de acción (ActionGrid)? Entonces
  // esa YA es la parrilla del pueblo: no se repite otra debajo.
  const actingHere = $derived.by(() => {
    if (head) {
      if (head.type === 'cazador' || head.type === 'alguacil_pick' || head.type === 'cabeza_pick') return my.id === head.pid;
      if (head.type === 'alguacil_elect') return !!my.alive;
      return false; // sirvienta: botones sí/no, sin lista
    }
    if ((game.votesLeft || 0) > 0 && !game.vote) return canRegisterVote(game, my);
    return false;
  });
</script>

<!-- El parte del amanecer y la voz que lo cuenta son UNA sola cosa: una tarjeta,
     no dos bloques seguidos diciendo lo mismo con distinta letra. -->
<div class="card"><h3>☀️ Día {game.dayNum} en Castronegro</h3>
  <p class="daynarr">{narr(((game.lastDawn || {}).deaths || []).length ? 'dia_debate' : 'dia_debate_tranquilo', `${game.seed}:d${game.dayNum}:${game.votesLeft}`)}</p>
  {#if dawn}
    {#if dawn.deaths.length}
      <p class="dawndead">💀 {dawn.deaths.map((d) => d.name + (d.role ? ` — ${d.role}` : '')).join(' · ')}</p>
      {#if !dawn.deaths.some((d) => d.role)}<p class="small-note">Sus cartas se quedan boca abajo: nadie sabrá qué eran.</p>{/if}
    {:else}
      <p class="dawndead">🌤️ Esta noche no ha muerto nadie.</p>
    {/if}
    {#if dawn.oso}<p class="small-note">🐻 {dawn.oso}</p>{/if}
    {#if dawn.cuervo}<p class="small-note">🐦‍⬛ {dawn.cuervo}</p>{/if}
    {#if dawn.gitana}<p class="small-note">🔯 {dawn.gitana}</p>{/if}
  {/if}
  <p class="small-note">🏘️ Quedan <b>{alive.length}</b> vivos de {players.length}.</p>
</div>
{#if mutedTontos.length}<div class="flash">🤪 {mutedTontos.map((p) => p.name).join(' y ')} {mutedTontos.length > 1 ? 'ya no votan' : 'ya no vota'} (Tonto del Pueblo al descubierto), aunque sigue{mutedTontos.length > 1 ? 'n' : ''} deliberando con el pueblo.</div>{/if}
<!-- Las acciones secretas de día (Juez, Sirvienta) viven DENTRO de la carta, y
     a la carta se entra por UN solo sitio (B34): la pastilla 🎴 de abajo, igual
     en todos los móviles. Aquí no va ningún «ver mi carta» del cuerpo: con los
     móviles desbloqueados sobre la mesa, todas las pantallas deben verse
     iguales, tengas poder o no. -->
{#if head}
  <PendingPanel {head} {group} {my} {players} />
{:else if (game.votesLeft || 0) > 0 && !game.vote}
  <VotePanel {group} {my} {players} />
{:else if game.vote}
  <!-- Texto neutro: mencionar a la Sirvienta delataría que está en juego. -->
  <div class="actionpanel"><h3>⏳ Juicio en curso…</h3><p class="hint">Un instante de silencio antes de revelar el destino del condenado. No hay nada que tocar: sigue en unos segundos.</p></div>
{:else}
  <div class="card"><h3>🌆 El día ha terminado</h3>
    <p class="small-note">Comentad la jugada con calma. Cuando estéis listos, que alguien mande al pueblo a dormir.</p>
    {#if my.alive}<button class="primary block" data-a="begin-night" onclick={() => guard(A.startNextNight)}>🌙 Empezar la noche</button>
    {:else}<p class="small-note">💀 Tú ya no puedes: lo hará cualquiera de los {alive.length} vivos ({alive.map((p) => p.name).join(', ')}). Mientras, puedes destapar las cartas del pueblo desde la lista de abajo.</p>{/if}</div>
{/if}
{#if !actingHere}
  <PlayersGrid {players} title="🏘️ El pueblo" showAlguacil={game.alguacilId || null} {marked} viewer={my} />
{/if}

<style>
  .dawndead { font-size: 0.98rem; line-height: 1.45; color: var(--moon); }
  /* La voz del amanecer, dentro de la tarjeta del día (antes iba en un bloque
     `.narration` aparte que repetía el mismo momento dos veces). */
  .daynarr { margin: 2px 0 10px; font-size: 0.94rem; line-height: 1.5; opacity: 0.9; font-style: italic; }
</style>
