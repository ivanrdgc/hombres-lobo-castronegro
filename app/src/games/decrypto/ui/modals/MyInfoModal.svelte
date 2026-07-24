<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tus 4 palabras clave y la chuleta de
  // reglas y fichas. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { decryptoGame, teamOf } from '../../actions';
  import { TEAM_LABEL } from '../../engine';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? decryptoGame(g) : null);
  const my = $derived(me());
  const team = $derived(game && my ? teamOf(game, my.id) : null);
  const rows = [
    { emoji: '🔐', name: 'El encriptador', note: 'rota cada ronda', desc: 'Recibe un código de 3 cifras (1-4) y da UNA pista por cifra, en ese orden. Después calla.' },
    { emoji: '🔓', name: 'Descifrar (tu equipo)', desc: 'Con las pistas, tu equipo (sin el encriptador) registra el orden del código. Fallar = ficha de ERROR ❌.' },
    { emoji: '🕵️', name: 'Interceptar (el rival)', note: 'desde la 2.ª transmisión', desc: 'El rival intenta adivinar tu código con las pistas de hoy y las anteriores. Acertar = ficha de INTERCEPCIÓN.' },
    { emoji: '🏆', name: 'Fichas', desc: '2 intercepciones GANAN la partida · 2 errores propios la PIERDEN.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus palabras clave</h3>
  {#if team}
    <div class="rolecard"><span class="remoji">🔑</span>
      <span class="rname">Equipo {TEAM_LABEL[team]}</span>
      <div class="rdesc">{game.words[team].map((w, i) => `${i + 1} ${w}`).join(' · ')}</div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin palabras propias.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
