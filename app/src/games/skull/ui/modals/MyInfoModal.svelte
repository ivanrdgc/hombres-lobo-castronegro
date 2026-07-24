<script lang="ts">
  // LAS REGLAS de Skull, y solo eso (B34): en un juego de postura 🃏 mano la
  // pastilla flotante no enseña tu carta —tus discos y tu pila ya están en la
  // pantalla de partida, destapados— sino la referencia del juego. Por eso aquí
  // no se repite nada de lo tuyo, y por eso ya no hay un segundo desplegable de
  // reglas al pie de la partida: esta es la única puerta.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { skullGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import type { Phase } from '../../types';

  const g = $derived(viewGroup());
  const game = $derived(g ? skullGame(g) : null);
  const phase = $derived((game?.phase ?? 'setup') as Phase);

  // Lo primero que se lee: las reglas de la fase EN CURSO (antes vivían en un
  // desplegable propio dentro de la partida, con las mismas palabras).
  const NOW: Record<Phase, { title: string; lines: string[] }> = {
    setup: {
      title: 'la colocación de salida',
      lines: [
        'Todos colocáis a la vez UN disco boca abajo. Nadie ve cuál es, ni lo dice la voz.',
        'Después se juega por turnos: en el tuyo pones otro disco sobre tu pila o abres la apuesta.',
      ],
    },
    play: {
      title: 'los turnos',
      lines: [
        'Poner un disco pasa el turno y sube el tope: nadie puede apostar más discos de los que hay en la mesa.',
        'Abrir la apuesta cierra tu colocación: ya no pondrás más discos en esta ronda. Si te quedas sin discos en la mano, apostar es tu única jugada.',
      ],
    },
    bid: {
      title: 'la subasta',
      lines: [
        'Por turnos: subes a un número mayor o pasas. Pasar es definitivo hasta el final de la ronda.',
        'Cuando todos menos uno han pasado —o alguien apuesta el total de la mesa— ese se la juega.',
      ],
    },
    reveal: {
      title: 'el revelado',
      lines: [
        'Primero la pila propia entera, de arriba abajo; después, el disco de ARRIBA de las pilas ajenas, una cada vez.',
        'Quien apostó se juega lo suyo antes que lo ajeno: por eso esconderte la calavera también te penaliza.',
      ],
    },
    roundEnd: {
      title: 'el fin de ronda',
      lines: [
        'Cada uno recoge TODA su pila: lo único que se pierde es el disco descartado al fallar.',
        'Empieza la ronda quien ganó el reto o, si falló, quien perdió el disco. Sin discos te quedas fuera.',
      ],
    },
    end: {
      title: 'la partida terminada',
      lines: ['Podéis jugar otra con la misma gente desde el botón de abajo, o volver al lobby.'],
    },
  };
  const now = $derived(NOW[phase] || NOW.setup);

  const rows = [
    { emoji: '🌸', name: 'Flor', note: '3 por jugador', desc: 'Segura: cada flor levantada suma para la apuesta.' },
    { emoji: '💀', name: 'Calavera', note: '1 por jugador', desc: 'Quien la destapa falla el reto y pierde un disco AL AZAR. Sembrarla en tu propia pila es arma de doble filo: tú levantas primero.' },
    { emoji: '🗣️', name: 'Apostar', note: 'cierra tu colocación', desc: '«Levantaré tantas flores seguidas sin topar calavera», como mucho los discos que haya en la mesa. Quien abre la apuesta ya no coloca más discos.' },
    { emoji: '📈', name: 'Subir o pasar', desc: 'Por turnos, los demás suben a un número mayor o pasan; pasar es definitivo. El último que queda es quien se la juega.' },
    { emoji: '🎲', name: 'Revelar', desc: 'Tu pila entera primero, de arriba abajo; luego el disco de arriba de las ajenas que elijas.' },
    { emoji: '⭐', name: 'Ganar un reto', note: '2 ganan la partida', desc: 'Levantar las flores prometidas da un reto. Fallar cuesta un disco al azar; quien se queda sin discos, fuera (y el último en pie también gana).' },
    { emoji: '🔄', name: 'Ronda siguiente', desc: 'Cada uno recoge TODA su pila y vuelve a tener sus discos: solo falta el que se descartó al fallar.' },
  ];
</script>

<h3 data-a="sk-rules" style="margin:0 0 6px">📖 Las reglas de Skull</h3>
<p class="sklead">Tres flores 🌸 y una calavera 💀 cada uno, y una pila boca abajo que solo ves tú. Gana quien se lleve <b>dos retos ⭐</b>… o quede como el único con discos.</p>

<div class="sknow" data-a="sk-rules-now">
  <b>Ahora mismo · {now.title}</b>
  {#each now.lines as l, i (i)}<p>{l}</p>{/each}
</div>

<RefRows title="💠 Los discos y las jugadas" {rows} />

<p class="sklead">Los iconos de la partida: ⭐ retos ganados · 💠 discos que posee · ✋ discos que le quedan en la mano · 🎴 disco tapado (de las pilas ajenas solo se ve la altura, y se levantan siempre por arriba).</p>

<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>

<style>
  /* Nada esencial por debajo de 0,8 rem (B26·9): esto se lee en mitad de una
     puja, con prisa. */
  .sklead { font-size: 0.86rem; color: var(--muted, #999); line-height: 1.45; margin: 8px 0; }
  .sknow { margin: 10px 0 2px; padding: 9px 11px; border-radius: var(--r-1, 8px); border: 1px solid var(--accent, #c8a24a); background: color-mix(in srgb, var(--accent, #c8a24a) 10%, transparent); }
  .sknow b { color: var(--moon, #ffd98a); font-size: 0.88rem; }
  .sknow p { margin: 6px 0 0; font-size: 0.85rem; line-height: 1.4; }
</style>
