// Tutorial de Una Noche en Castronegro: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'una_noche',
  name: 'Una Noche',
  emoji: '🌘',
  steps: [
    {
      icon: '🎯',
      title: 'Una sola noche, un solo día',
      text: [
        'De noche, los roles se despiertan POR TURNOS y, a oscuras, miran, roban o intercambian cartas. Nadie muere de noche… pero al amanecer puede que ya no seas quien empezaste, y quizá ni lo sepas.',
        'De día se debate UNA vez y el pueblo condena a alguien (o perdona). Gana el Pueblo si cae al menos un lobo; ganan los Lobos si ninguno cae; el Curtidor gana si lo linchan a él.',
      ],
    },
    {
      icon: '🎴',
      title: 'Tu carta… por ahora',
      text: [
        'La app reparte una carta a cada uno y deja TRES en el centro, boca abajo. Mira la tuya a solas y confirma.',
        'Memorízala bien: lo que decide la partida es la carta FINAL de cada uno, no la inicial. Alguien puede cambiártela esta noche sin que te enteres.',
      ],
      visual: { kind: 'card', emoji: '🦹', title: 'Eres el Ladrón', lines: ['Esta noche podrás cambiar tu carta por la de otro jugador… y mirar tu carta nueva.', '(Ojo: esta es tu carta INICIAL; puede cambiar durante la noche.)'] },
    },
    {
      icon: '🌙',
      title: 'La noche, paso a paso',
      text: [
        'Todos cerráis los ojos con el móvil delante. La voz llama a cada rol en su orden: solo el llamado abre los ojos, actúa en su pantalla con disimulo y los vuelve a cerrar.',
        'Los roles que quedaron en el centro TAMBIÉN se llaman (nadie abre los ojos): así el tiempo no delata qué cartas están fuera.',
      ],
    },
    {
      icon: '🤔',
      title: 'La regla de oro',
      text: ['Eres la Vidente, pero sospechas que el Ladrón te ha robado la carta antes de tu turno.'],
      ask: {
        prompt: 'La voz llama a la Vidente. ¿Actúas?',
        choices: [
          { label: 'Sí: actúo con mi carta ORIGINAL, pase lo que pase', good: true, reply: 'Regla de oro de Una Noche: cada uno actúa según la carta que le TOCÓ al principio, aunque se la hayan llevado. Quien tenga ahora tu carta NO actúa por ti.' },
          { label: 'No: si me la robaron, ya no soy vidente', reply: 'Al revés: tu acción nocturna va con tu carta inicial. Si no actuaras, además, delatarías con el silencio que algo te ha pasado.' },
          { label: 'Pregunto en voz alta qué hago', reply: '¡De noche ni una palabra! Todo se hace en la pantalla, con los ojos del resto cerrados.' },
        ],
      },
    },
    {
      icon: '☀️',
      title: 'El día y el único voto',
      text: [
        'Amanece, se abren los ojos y se debate: cada uno cuenta (o se inventa) lo que vio. Cuando el pueblo decide, UNA persona registra el resultado en la app: condena, «🕊️ El pueblo perdona»… o varios a la vez si hubo empate (en One Night, en el empate caen TODOS los empatados).',
        'Si el condenado resulta ser el Cazador (por carta final), su flecha se lleva a alguien más.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '⚖️ Condenar a Bea', kind: 'danger' }, { label: '🕊️ El pueblo perdona (nadie muere)', kind: 'ghost' }], caption: 'Lo registra una sola persona, como en Los Hombres Lobo.' },
    },
    {
      icon: '🏆',
      title: 'Quién gana (por carta FINAL)',
      text: [
        'La app destapa todas las cartas finales y dictamina: Pueblo si cayó un lobo; Lobos si había lobos y ninguno cayó; Curtidor si lo lincharon (gana él solo). Sin lobos en juego y sin muertos, el pueblo acertó y gana.',
        'Toca cada ficha del mazo en el lobby para el detalle de su rol (Doble incluido). Y recuerda: puede ganar más de uno a la vez.',
      ],
      visual: { kind: 'log', lines: ['⚖️ Ana registra la condena del pueblo: Carlos.', '💀 Cae: Carlos.', '🏡 ¡Gana el Pueblo! Ha caído al menos un hombre lobo.'] },
    },
  ],
};
