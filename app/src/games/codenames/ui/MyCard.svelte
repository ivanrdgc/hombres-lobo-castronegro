<script lang="ts">
  // Quién eres, en una banda de una línea y media que encabeza la partida.
  //
  // Codenames es de EQUIPO (B28) y aquí manda la regla de la puerta única
  // (B34): tu papel VIVE en la pantalla, así que el botón flotante no lo
  // repite —allí solo están las reglas—. Esta banda es el único sitio donde se
  // dice quién eres, y por eso lleva también qué haces: nada de un segundo
  // «ver mi carta» escondido en un modal.
  //
  // La postura del móvil no se repite aquí para el Jefe: la lleva su mapa,
  // pegada a lo que hay que proteger.
  import { teamOf, isSpymaster, TEAM_LABEL } from '../engine';
  import type { CodenamesState } from '../types';

  const { game, pid }: { game: CodenamesState; pid: string } = $props();
  const team = $derived(teamOf(game, pid));
  const spy = $derived(isSpymaster(game, pid));
  const label = $derived(team ? TEAM_LABEL[team] : '');
</script>

<div class="cnband {team === 'red' ? 'red' : 'blue'}" data-a="cn-band">
  <span class="cb-emoji">{spy ? '🕵️' : '🔎'}</span>
  <div class="cb-txt">
    <div class="cb-role">{spy ? 'Jefe de espías' : 'Agente'} · {label}</div>
    <div class="cb-post">{spy
      ? 'Solo tú das pistas: UNA palabra y un número, y a callar.'
      : 'Tú tocas las palabras. Tu móvil es público: dejadlo a la vista.'}</div>
  </div>
</div>

<style>
  /* Ocupa una línea y media para que el tablero (lo que de verdad se mira)
     empiece cuanto antes en la pantalla. */
  .cnband {
    display: flex; align-items: center; gap: 10px;
    border: 1px solid var(--border, #2c3047); border-left-width: 5px;
    border-radius: 10px; padding: 8px 12px; margin: 10px 0;
    background: var(--card, #191c2b);
  }
  .cnband.red { border-left-color: #a03a52; }
  .cnband.blue { border-left-color: #3a5aa0; }
  .cb-emoji { font-size: 1.5rem; line-height: 1; }
  .cb-txt { min-width: 0; }
  .cb-role { font-weight: 700; font-size: 0.95rem; }
  .cb-post { color: var(--muted, #a9a6c0); font-size: 0.78rem; line-height: 1.3; }
</style>
