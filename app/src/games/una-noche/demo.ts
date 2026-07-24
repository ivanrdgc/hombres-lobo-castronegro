// Tutorial de Una Noche en Castronegro: una partida de ejemplo continua, con
// quién actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'una_noche',
  name: 'Una Noche',
  emoji: '🌘',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis TÚ, Bea y Carlos. Una SOLA noche y un SOLO día: de noche los roles se despiertan por turnos y miran, roban o INTERCAMBIAN cartas; de día hay un único voto.',
        'Nadie muere de noche… pero al amanecer puede que tu carta ya no sea la que viste. Lo que decide todo es la carta FINAL de cada silla, no la inicial.',
      ],
      visual: { kind: 'board', rows: [{ label: '🎴 Cartas repartidas', value: '3 (una por jugador)' }, { label: '🃏 En el centro', value: '3 boca abajo' }, { label: '🏆 Decide', value: 'la carta FINAL' }] },
    },
    {
      icon: '🎴',
      title: 'El reparto: mira y memoriza',
      who: {
        actor: 'TODOS miráis vuestra carta a la vez, a solas, y confirmáis en vuestro móvil',
        others: 'UN SOLO móvil narra en voz alta para la mesa (el que puso la voz): se deja en el centro, sonando. Los demás, boca abajo. Las tres cartas del centro no las ve nadie.',
      },
      text: [
        'A ti te toca la 🔮 Vidente. Memorízala bien: durante la noche alguien puede cambiártela sin que te enteres.',
        'Cuando los tres habéis confirmado, cualquiera pulsa «🌙 Comenzar la noche» y la voz se pone a llamar rol por rol. Si se te va la carta de la cabeza, el botón flotante 🎴 (abajo a la derecha, en cualquier fase) te enseña la tuya y el mazo entero.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🔮 Eres la Vidente (carta INICIAL)', '«Ojo: pudo cambiar durante la noche.»'], buttons: [{ label: '✅ Ya la he memorizado', kind: 'primary' }] },
          { title: 'Bea (tú no lo ves)', lines: ['🃏 Es el Ladrón', 'Esta noche podrá cambiar su carta por la de otro.'] },
        ],
      },
    },
    {
      icon: '🌙',
      title: 'La noche: la voz llama rol a rol',
      who: {
        actor: 'Solo quien es llamado abre los ojos y actúa en su pantalla, en silencio',
        others: 'el resto, ojos cerrados y el móvil boca abajo, escuchando al que narra; los roles del centro TAMBIÉN se llaman (nadie abre: turno fantasma).',
      },
      text: [
        '«Vidente, abre los ojos…»: miras la carta de Carlos (o dos del centro) en tu pantalla y confirmas. Más tarde: «Ladrón…»: Bea te roba la carta — ahora ELLA tiene tu Vidente y tú su Ladrón. Tú ni te enteras.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (tu turno)', lines: ['🔮 Miras a Carlos: «🐺 ¡Hombre Lobo!»'], buttons: [{ label: '✅ Visto (cierro los ojos)', kind: 'primary' }] },
          { title: 'Bea (su turno, después)', lines: ['🃏 Roba tu carta y mira la nueva:', '«Ahora tienes: 🔮 Vidente.»'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'La regla de oro',
      who: { actor: 'Cada uno actúa según su carta INICIAL, pase lo que pase', others: 'quien reciba tu carta robada NO actúa por ti.' },
      text: [
        'Imagina ahora una mesa con 👯 Doble en el mazo. El Doble despierta el PRIMERO: copia al Ladrón y, ahí mismo, te roba la carta a TI. Cuando la voz llama a la Vidente, tu carta ya está en otras manos… y tú ni te has enterado.',
        'El mazo es PÚBLICO: la tira «🎴 Cartas en juego» enseña siempre TODOS los roles de la partida, y de ahí sale la deducción. Lo que nadie ve son las TRES cartas del centro: la Vidente puede espiar dos y el Borracho se lleva una a ciegas.',
      ],
      ask: {
        prompt: 'La voz llama a la Vidente. ¿Actúas?',
        choices: [
          { label: 'Sí: actúo con mi carta ORIGINAL, me la hayan robado o no', good: true, reply: 'Regla de oro de Una Noche: tu acción nocturna es la de la carta que te TOCÓ al principio, aunque ya esté en otras manos. Y quien la tenga ahora no actúa por ti.' },
          { label: 'No: si me la robaron ya no soy vidente', reply: 'Al revés: actúas igual. Y no actuar delataría con el silencio que algo raro pasó. La carta final solo cuenta al repartir la victoria.' },
          { label: 'Pregunto en voz alta qué hago', reply: '¡De noche ni una palabra! Todo se resuelve en tu pantalla con los ojos de los demás cerrados.' },
        ],
      },
    },
    {
      icon: '☀️',
      title: 'El día: un debate y UN voto',
      who: { actor: 'TODOS debatís de viva voz: cada uno cuenta (o se inventa) lo que vio', others: 'al acabar el tiempo se cuenta hasta tres, todos señalan A LA VEZ y UNA persona registra el resultado en la app.' },
      text: [
        'Tú cantas tu visión: «Carlos era lobo cuando lo miré». Bea, con tu Vidente en la mano, juega a confundir… El debate tiene reloj (cinco minutos en pantalla); cuando se agota, señaláis todos a la vez y alguien toca al condenado y confirma: «⚖️ Condenar a Carlos». También se puede perdonar —si nadie sacó más de un voto, no muere nadie— o registrar un empate: en Una Noche, en un empate caen TODOS los empatados.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '⚖️ Condenar a Carlos', kind: 'danger' }, { label: '🕊️ El pueblo perdona (nadie muere)', kind: 'ghost' }], caption: 'Lo registra una sola persona, tras decidirlo en voz alta.' },
    },
    {
      icon: '🏆',
      title: 'Se destapa todo',
      who: { actor: 'La app revela las cartas FINALES de todos y dictamina', others: 'si el condenado era el Cazador (por carta final), la app le pide señalar a quién se lleva por delante antes de cerrar.' },
      text: [
        'Carlos seguía siendo lobo: ¡gana el Pueblo! (Si no hubiera caído ningún lobo, ganarían los Lobos… salvo que el condenado fuera el Curtidor: ese gana en solitario si consigue que lo linchen A ÉL.)',
        'Pueden ganar dos a la vez (Curtidor y Pueblo, si además cae un lobo) y puede no ganar nadie: si no había ningún lobo en la mesa y el pueblo condena a un inocente. Toca las fichas del mazo en el lobby para el detalle de cada rol, Doble incluido. 🌘',
      ],
      visual: { kind: 'log', lines: ['⚖️ Bea registra la condena del pueblo: Carlos.', '💀 Cae: Carlos.', '🏡 ¡Gana el Pueblo! Ha caído al menos un hombre lobo.'] },
    },
  ],
};
