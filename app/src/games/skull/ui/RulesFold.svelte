<script lang="ts">
  // La referencia, plegada y en el sitio de siempre: una sola línea al pie que
  // se abre con las reglas de LA FASE en la que estás. Antes había un desplegable
  // distinto en cada panel (y cuatro textos que decían casi lo mismo).
  import type { Phase } from '../types';

  const { phase }: { phase: Phase } = $props();

  const REF: Record<string, { title: string; lines: string[] }> = {
    setup: {
      title: 'la colocación',
      lines: [
        'Todos colocáis a la vez UN disco boca abajo. Nadie ve cuál es, ni lo dice la voz.',
        'Después se juega por turnos: en el tuyo pones otro disco sobre tu pila o abres la apuesta.',
        'Al cerrar la ronda cada uno RECOGE toda su pila: solo se pierde el disco de quien falla un reto.',
      ],
    },
    play: {
      title: 'turnos y apuesta',
      lines: [
        'Poner un disco pasa el turno y sube el tope: la apuesta nunca puede pasar de los discos que hay en la mesa.',
        'Quien abre la apuesta ya no coloca más discos en la ronda: empieza la subasta.',
        'Si te quedas sin discos en la mano, en tu turno solo puedes apostar.',
      ],
    },
    bid: {
      title: 'la subasta',
      lines: [
        'Por turnos: subes a un número mayor o pasas. Pasar es definitivo en esta ronda.',
        'Cuando todos menos uno han pasado —o alguien apuesta el total de la mesa— ese se la juega.',
        'Quien gana la puja levanta primero SU pila entera y luego el disco de arriba de las ajenas que elija.',
      ],
    },
    reveal: {
      title: 'el revelado',
      lines: [
        'Primero la pila propia entera, de arriba abajo; después, el disco de ARRIBA de las pilas ajenas, uno cada vez.',
        'Quien apuesta se juega lo suyo antes que lo ajeno: por eso esconderte la calavera también te penaliza.',
        'Con las flores prometidas ganas un reto ⭐ (dos ganan la partida). Con una calavera fallas y pierdes un disco al azar.',
      ],
    },
    roundEnd: {
      title: 'fin de ronda',
      lines: [
        'Cada uno recoge TODA su pila: lo único que se pierde es el disco descartado al fallar.',
        'Empieza la ronda quien ganó el reto o, si falló, quien perdió el disco.',
        'Quien se queda sin discos queda fuera; si solo queda uno en pie, gana la partida.',
      ],
    },
  };
  const ref = $derived(REF[phase] || REF.setup);
</script>

<details class="skref">
  <summary data-a="sk-ref">📖 Reglas · {ref.title}</summary>
  {#each ref.lines as l, i (i)}<p class="small-note">{l}</p>{/each}
  <p class="small-note">🎴 De las pilas ajenas solo se ve la altura; se levanta siempre por arriba (a la derecha). ⭐ retos ganados · 💠 discos que posee · ✋ discos en mano.</p>
</details>

<style>
  .skref { margin: 6px 0 4px; }
  .skref summary { font-size: 0.82rem; color: var(--muted, #999); cursor: pointer; min-height: 30px; display: flex; align-items: center; }
  .skref p { margin: 6px 0; }
</style>
