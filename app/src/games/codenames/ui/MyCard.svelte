<script lang="ts">
  // Tu papel, en dos formatos para dos sitios distintos:
  //  • `compact` — la banda de una línea que encabeza la partida. Dice qué eres
  //    y CÓMO se sostiene tu móvil (B28), que en este juego es media regla: el
  //    Jefe lo sujeta como una mano de cartas y los agentes lo dejan a la vista.
  //  • completo — el de «🎴 Mi carta», donde sí hay sitio para explicarlo.
  import { teamOf, isSpymaster, TEAM_LABEL } from '../engine';
  import type { CodenamesState } from '../types';

  const { game, pid, compact = false }: {
    game: CodenamesState; pid: string; compact?: boolean;
  } = $props();
  const team = $derived(teamOf(game, pid));
  const spy = $derived(isSpymaster(game, pid));
  const label = $derived(team ? TEAM_LABEL[team] : '');
</script>

{#if compact}
  <div class="cnband {team === 'red' ? 'red' : 'blue'}" data-a="cn-band">
    <span class="cb-emoji">{spy ? '🕵️' : '🔎'}</span>
    <div class="cb-txt">
      <div class="cb-role">{spy ? 'Jefe de espías' : 'Agente'} · {label}</div>
      <div class="cb-post">{spy
        ? 'Móvil en la mano y de cara a ti: nadie más puede ver tu mapa.'
        : 'Móvil a la vista de todos: tu tablero es público, decidid en voz alta.'}</div>
    </div>
  </div>
{:else}
  <div class="rolecard {team === 'red' ? 'red' : 'blue'}">
    <span class="remoji">{spy ? '🕵️' : '🔎'}</span>
    <span class="rname">{spy ? 'Jefe de espías' : 'Agente'} · equipo {label}</span>
    <div class="rdesc">
      {#if spy}Ves el mapa: da pistas de una palabra y un número para que tus agentes toquen VUESTRAS casillas… lejos del asesino. No hagas gestos.
      {:else}No ves el mapa: escucha la pista de tu Jefe y toca las palabras que creas de tu equipo.{/if}
    </div>
    <div class="rextra">
      {#if spy}🔒 Tu móvil es secreto y no lo ve nadie, <b>tampoco los de tu equipo</b>: sujétalo como una mano de cartas. Si lo sueltas, tápalo con «🙈 Taparlo».
      {:else}👥 Tu móvil es público: déjalo donde lo veáis todos, comentad las palabras en voz alta y tocad de común acuerdo.{/if}
    </div>
  </div>
{/if}

<style>
  .rolecard.red { border-color: #a03a52; box-shadow: 0 0 0 1px #a03a52 inset; }
  .rolecard.blue { border-color: #3a5aa0; box-shadow: 0 0 0 1px #3a5aa0 inset; }
  /* Banda compacta: ocupa una línea y media para que el tablero (lo que de
     verdad se mira) empiece cuanto antes en la pantalla. */
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
