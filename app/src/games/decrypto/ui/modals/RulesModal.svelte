<script lang="ts">
  // Una sola puerta a tus palabras (B34). Decrypto es un juego 👥 de EQUIPO: las
  // 4 palabras clave, las fichas y la hoja de pistas viven EN LA PANTALLA, así
  // que la pastilla flotante es solo «📖 Reglas» y aquí no se repite nada de
  // eso. Solo lo que no cabe en el momento de decidir: el orden pista→palabra,
  // qué hace cada uno, cómo termina y cómo se rescata la partida.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { decryptoGame, teamOf } from '../../actions';
  import { MAX_ROUNDS, TOKENS_TO_WIN } from '../../engine';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? decryptoGame(g) : null);
  const my = $derived(me());
  const team = $derived(game && my ? teamOf(game, my.id) : null);

  const FLOW = [
    { emoji: '🔐', name: 'Encriptar', note: 'rota cada ronda', desc: 'La app te da un código de 3 cifras distintas (del 1 al 4) que no ve NADIE más, ni los tuyos. Escribes una pista por cifra, en ese orden, y las dices en voz alta. Después callas: ni aclarar, ni señalar, ni corregir.' },
    { emoji: '🔢', name: 'El orden manda', note: 'el lío de siempre', desc: 'Las pistas van en el orden del CÓDIGO, no del 1 al 4: si el código es 4-2-1, la 1.ª pista habla de vuestra palabra nº 4, la 2.ª de la nº 2 y la 3.ª de la nº 1.' },
    { emoji: '🚫', name: 'Pistas que no valen', desc: 'Ni la palabra clave ni un derivado suyo (para «Mar» no valen «mar» ni «marino»), ni decir dónde está escrita, ni gestos ni rectificaciones. La app avisa cuando la pista se parece demasiado, pero no bloquea: lo juzga la mesa.' },
    { emoji: '🕵️', name: 'Interceptar', note: 'el rival, desde la 2.ª transmisión de cada equipo', desc: 'El rival coloca las pistas que acaba de oír, ayudándose de las de rondas anteriores. Si clava el código entero se lleva una ficha de intercepción; si falla, no le cuesta nada.' },
    { emoji: '🔓', name: 'Descifrar', note: 'tu equipo, sin el encriptador', desc: 'Vosotros colocáis esas mismas pistas sobre vuestras palabras. Acertar no da nada; fallar os cuesta una ficha de error.' },
  ];
  const REST = [
    { emoji: '📻', name: 'Dónde se gana de verdad', desc: 'Todo lo dicho se acumula en la hoja de pistas, una fila por palabra. Si para su nº 4 dijeron «gaviota» y luego «marea», su 4 va de mar y a la próxima se intercepta. Por eso, al encriptar, cambia de campo cada ronda.' },
    { emoji: '🏁', name: 'Cómo termina', desc: `En cuanto un equipo junta ${TOKENS_TO_WIN} fichas, o al agotarse las ${MAX_ROUNDS} rondas: entonces gana quien más interceptó; si empatan, quien menos errores cometió; y si todo empata, tablas.` },
    { emoji: '🔄', name: 'Si a alguien se le apaga el móvil', desc: 'Si es el encriptador, cualquiera de su equipo pulsa «que encripte otro»: se reparte un código nuevo y la partida sigue. Salir o sacar a alguien de la partida, en cambio, la cierra para todos (los equipos ya no cuadran).' },
    { emoji: '⋯', name: 'El menú de la cabecera', desc: '«🔁 Repetir» vuelve a decir en voz alta la última línea · «⏸️ Pausar» congela la partida · «🪑 La mesa» dice quién sigue conectado · «🏳️ Terminar» la cierra para todos.' },
  ];
</script>

<h3 style="margin:0 0 4px">📖 Reglas de Decrypto</h3>
{#if game && my}
  <p class="small-note" style="margin:0">
    {#if game.phase === 'end'}Se acabó: las 8 palabras están destapadas en la pantalla. Esto son solo las reglas.
    {:else if team}Tus 4 palabras clave no están aquí: las tienes SIEMPRE en tu pantalla, en «🔑 Vuestras 4 palabras», y las fichas y la hoja de pistas también. Esto son solo las reglas.
    {:else}👀 Miras de espectador: las palabras de cada equipo son suyas. Esto son solo las reglas.{/if}
  </p>
{/if}
<RefRows title="🔁 Una transmisión, paso a paso" rows={FLOW} />
<RefRows title="🧠 Estrategia y final" rows={REST} />

<!-- Empezada la partida, la URL ya no vuelve al lobby: sin esto, «Cómo se
     juega» quedaba inalcanzable justo cuando la mesa discute una regla. -->
<button class="ghost block" style="margin-top:14px" data-a="de-open-help" onclick={() => (app.ui.modal = { type: 'de-help' })}>🎲 Cómo se juega, con ejemplos</button>
<button class="primary block" style="margin-top:8px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
