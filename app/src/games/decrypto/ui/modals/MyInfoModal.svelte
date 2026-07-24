<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tus 4 palabras clave y la chuleta de
  // reglas y fichas. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { decryptoGame, teamOf } from '../../actions';
  import { MAX_ROUNDS, TEAM_LABEL, TOKENS_TO_WIN } from '../../engine';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? decryptoGame(g) : null);
  const my = $derived(me());
  const team = $derived(game && my ? teamOf(game, my.id) : null);
  const rows = [
    { emoji: '🔢', name: 'Pista nº ≠ palabra nº', note: 'el lío de siempre', desc: 'El código es la palabra a la que apunta cada pista, en el orden en que se dijeron: si el código es 4-2-1, la 1.ª pista habla de la palabra nº 4, la 2.ª de la nº 2 y la 3.ª de la nº 1.' },
    { emoji: '🔐', name: 'El encriptador', note: 'rota cada ronda', desc: 'Recibe un código de 3 cifras (1-4) y da UNA pista por cifra, en ese orden. Después calla. La pista no puede ser la palabra clave ni un derivado suyo.' },
    { emoji: '🔓', name: 'Descifrar (tu equipo)', desc: 'Con las pistas, tu equipo (sin el encriptador) registra el orden del código. Fallar = ficha de ERROR ❌.' },
    { emoji: '🕵️', name: 'Interceptar (el rival)', note: 'desde la 2.ª transmisión', desc: 'El rival intenta adivinar tu código con las pistas de hoy y las anteriores. Acertar = ficha de INTERCEPCIÓN.' },
    { emoji: '📻', name: 'Hoja de pistas', desc: 'Todo lo dicho queda ordenado por número de palabra: dos pistas del mismo campo en la misma fila delatan la palabra.' },
    { emoji: '🏆', name: 'Fichas', desc: `${TOKENS_TO_WIN} intercepciones GANAN la partida · ${TOKENS_TO_WIN} errores propios la PIERDEN.` },
    { emoji: '⏳', name: 'Límite', desc: `Como mucho ${MAX_ROUNDS} rondas. Si nadie llega a ${TOKENS_TO_WIN} fichas, gana quien más interceptó; si todo empata, tablas.` },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tus palabras clave</h3>
  {#if team}
    <div class="rolecard"><span class="remoji">🔑</span>
      <span class="rname">Equipo {TEAM_LABEL[team]}</span>
      <div class="rdesc" style="margin-top:8px">
        <div class="mwords">
          {#each game.words[team] as w, i (i)}
            <div class="mword"><span class="mnum">{i + 1}</span><span>{w}</span></div>
          {/each}
        </div>
        <p class="small-note" style="margin:8px 0 0">Se transmite el NÚMERO, nunca la palabra. Pantalla hacia los tuyos: el rival está enfrente.</p>
      </div></div>
  {:else}
    <p class="small-note">👀 Miras de espectador: sin palabras propias.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>

<style>
  .mwords { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .mword { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border, #333); background: color-mix(in srgb, var(--bg-1, #12141f) 75%, transparent); font-weight: 700; color: var(--text, #eceaf6); text-align: left; }
  .mnum { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; background: var(--accent, #c8a24a); color: #000; font-size: 0.8rem; font-weight: 800; }
</style>
