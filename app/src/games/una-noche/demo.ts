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
      who: { actor: 'TODOS miráis vuestra carta a la vez, a solas, y confirmáis', others: 'las tres cartas del centro se quedan boca abajo: nadie las ve.' },
      text: [
        'A ti te toca la 🔮 Vidente. Memorízala bien: durante la noche alguien puede cambiártela sin que te enteres.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ', lines: ['🔮 Eres la Vidente (carta INICIAL)', '«Ojo: pudo cambiar durante la noche.»'], buttons: [{ label: '✅ Lo tengo', kind: 'primary' }] },
          { title: 'Bea (tú no lo ves)', lines: ['🦹 Es el Ladrón', 'Esta noche podrá cambiar su carta por la de otro.'] },
        ],
      },
    },
    {
      icon: '🌙',
      title: 'La noche: la voz llama rol a rol',
      who: { actor: 'Solo quien es llamado abre los ojos y actúa en su pantalla', others: 'el resto, ojos cerrados; los roles del centro TAMBIÉN se llaman (nadie abre: turno fantasma).' },
      text: [
        '«Vidente, abre los ojos…»: miras la carta de Carlos (o dos del centro) en tu pantalla y confirmas. Más tarde: «Ladrón…»: Bea te roba la carta — ahora ELLA tiene tu Vidente y tú su Ladrón. Tú ni te enteras.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (tu turno)', lines: ['🔮 Miras a Carlos: «🐺 ¡Hombre Lobo!»'], buttons: [{ label: '✅ Visto (cierro los ojos)', kind: 'primary' }] },
          { title: 'Bea (su turno, después)', lines: ['🦹 Roba tu carta y mira la nueva:', '«Ahora tienes: 🔮 Vidente.»'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'La regla de oro',
      who: { actor: 'Cada uno actúa según su carta INICIAL, pase lo que pase', others: 'quien reciba tu carta robada NO actúa por ti.' },
      text: ['Imagina que sospechas que el Ladrón te robó ANTES de tu turno de Vidente.'],
      ask: {
        prompt: 'La voz llama a la Vidente. ¿Actúas?',
        choices: [
          { label: 'Sí: actúo con mi carta ORIGINAL, me la hayan robado o no', good: true, reply: 'Regla de oro de Una Noche: tu acción nocturna va con la carta que te TOCÓ al principio. (Además, en esta partida el Ladrón actúa después de la Vidente: el orden fijo lo lleva la voz.)' },
          { label: 'No: si me la robaron ya no soy vidente', reply: 'Al revés: actúas igual. Y no actuar delataría con el silencio que algo raro pasó. La carta final solo importa al contar el voto.' },
          { label: 'Pregunto en voz alta qué hago', reply: '¡De noche ni una palabra! Todo se resuelve en tu pantalla con los ojos de los demás cerrados.' },
        ],
      },
    },
    {
      icon: '☀️',
      title: 'El día: un debate y UN voto',
      who: { actor: 'TODOS debatís de viva voz: cada uno cuenta (o se inventa) lo que vio', others: 'UNA persona registra la decisión final en la app, y es definitiva.' },
      text: [
        'Tú cantas tu visión: «Carlos era lobo cuando lo miré». Bea, con tu Vidente en la mano, juega a confundir… Cuando el pueblo decide, alguien toca al condenado y confirma: «⚖️ Condenar a Carlos». También se puede perdonar, o registrar un empate (en One Night, en un empate caen TODOS los empatados).',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '⚖️ Condenar a Carlos', kind: 'danger' }, { label: '🕊️ El pueblo perdona (nadie muere)', kind: 'ghost' }], caption: 'Lo registra una sola persona, tras decidirlo en voz alta.' },
    },
    {
      icon: '🏆',
      title: 'Se destapa todo',
      who: { actor: 'La app revela las cartas FINALES de todos y dictamina', others: 'si el condenado era el Cazador (por carta final), su flecha se lleva a alguien antes de cerrar.' },
      text: [
        'Carlos seguía siendo lobo: ¡gana el Pueblo! (Si no hubiera caído ningún lobo, ganarían los Lobos; y el Curtidor gana en solitario si consigue que lo linchen A ÉL.)',
        'Puede ganar más de uno a la vez. Toca las fichas del mazo en el lobby para el detalle de cada rol, Doble incluido. 🌘',
      ],
      visual: { kind: 'log', lines: ['⚖️ Bea registra la condena del pueblo: Carlos.', '💀 Cae: Carlos.', '🏡 ¡Gana el Pueblo! Ha caído al menos un hombre lobo.'] },
    },
  ],
};
