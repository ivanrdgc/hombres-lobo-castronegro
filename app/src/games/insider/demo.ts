// Tutorial de Insider: una ronda de ejemplo continua, con quién actúa en cada
// momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'insider',
  name: 'Insider',
  emoji: '🤫',
  steps: [
    {
      icon: '🎯',
      title: 'La ronda de ejemplo',
      text: [
        'Jugáis TÚ, Bea, Carlos y David. Es cooperativo… con un topo: el equipo debe adivinar una palabra secreta con preguntas de SÍ o NO, contrarreloj.',
        'Bea es la MAESTRA (público, rota cada ronda): conoce la palabra y responde. Y uno de vosotros es el INSIDER: también la conoce y os empuja hacia ella… sin que se le note. Si el tiempo se agota sin palabra, PERDÉIS TODOS.',
      ],
      visual: { kind: 'chips', chips: [{ name: 'Bea', emoji: '🎓', badge: 'Maestra', hl: true }, { name: 'TÚ', badge: '¿común?' }, { name: 'Carlos', badge: '¿común?' }, { name: 'David', badge: '¿insider?' }], caption: 'La Maestra es pública; el Insider, secreto.' },
    },
    {
      icon: '🎴',
      title: 'El reparto: quién sabe la palabra',
      who: { actor: 'TODOS miráis vuestra carta a la vez y confirmáis', others: 'nadie enseña la pantalla: ser (o no) el Insider es secreto hasta el final.' },
      text: [
        'Tú eres común: sabes que NO sabes. Bea (Maestra) y David (Insider, aunque nadie lo sabe) ven la palabra: «brújula».',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (común)', lines: ['👤 Eres del equipo', 'No conoces la palabra: pregunta y deduce.'] },
          { title: 'David (tú no lo ves)', lines: ['🕵️ Es el INSIDER', 'La palabra es: «brújula»', 'Debe guiaros hacia ella… con disimulo.'] },
        ],
      },
    },
    {
      icon: '⏱️',
      title: 'El interrogatorio contrarreloj',
      who: { actor: 'Bea (Maestra) pulsa el reloj y responde; TODOS preguntáis en voz alta, sin turnos', others: 'el temporizador corre en todas las pantallas.' },
      text: [
        'Bea pone en marcha el reloj (3, 5 u 8 min, elegido al empezar). Empieza preguntando quien indique la app y luego pregunta cualquiera: «¿es un objeto?» — «Sí». «¿Se come?» — «No».',
        'La Maestra solo puede responder «sí», «no» o «no lo sé»: ni pistas ni medias palabras.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Bea (Maestra)', lines: ['Ve la palabra: «brújula»', 'Responde en voz alta a cada pregunta.'], buttons: [{ label: '✅ ¡Palabra adivinada!', kind: 'primary' }] },
          { title: 'TÚ (equipo)', lines: ['⏱️ 3:41', 'Preguntas en voz alta; el móvil solo muestra el reloj.'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba (si fueras el Insider)',
      who: { actor: 'David (Insider) pregunta como uno más… sabiendo la respuesta', others: 'nadie sospecha aún: sus preguntas parecen normales.' },
      text: ['Queda un minuto y el equipo anda perdido preguntando por animales (la palabra es «brújula»).'],
      ask: {
        prompt: 'Eres el Insider. ¿Qué haces?',
        choices: [
          { label: 'Pregunto «¿sirve para orientarse?»', good: true, reply: 'Reencaminas sin cantar: parece una pregunta más, pero corta el bosque entero. El arte del Insider es ESTA pregunta.' },
          { label: 'Pregunto «¿tiene una aguja que apunta al norte?»', reply: 'Demasiado quirúrgica: cuando luego pregunten «¿y tú cómo lo sabías?», no tendrás respuesta. Te acaban de fichar.' },
          { label: 'Me callo el resto de la ronda', reply: 'Si el tiempo se agota, pierdes TÚ también (el Insider necesita que la palabra se adivine). Y un jugador mudo es tan sospechoso como uno certero.' },
        ],
      },
    },
    {
      icon: '✅',
      title: '¡Adivinada! Y ahora, la caza',
      who: { actor: 'Carlos grita «¡brújula!» y Bea pulsa «✅ ¡Palabra adivinada!»', others: 'el reloj se para; se abre un breve debate: ¿quién preguntó con demasiada puntería?' },
      text: [
        'Primera parte superada. Ahora TODOS votáis a la vez, en secreto — también la Maestra. No puedes votarte a ti mismo ni a la Maestra (es pública, no puede ser el Insider).',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (votando)', lines: ['¿Quién guiaba demasiado bien?', 'Tocas a David.'], buttons: [{ label: '👉 Señalar a David', kind: 'danger' }] },
          { title: 'David (Insider, votando)', lines: ['Vota a otro para despistar.', 'Han votado 3/4…'] },
        ],
      },
    },
    {
      icon: '🏆',
      title: 'El desenlace y los puntos',
      who: { actor: 'La app destapa el recuento y revela al Insider', others: 'cualquiera pulsa «🔁 Otra ronda»: la Maestra rota y la palabra cambia.' },
      text: [
        'El más señalado es David: ¡cazado! +1 para la Maestra y cada común. Si hubierais señalado a un inocente (o empatado), David escapaba con +2. Y con el tiempo agotado, nadie puntúa.',
        'La doble lealtad del Insider: necesita que ACERTÉIS la palabra… pero que falléis al señalarlo. 🤫',
      ],
      visual: { kind: 'log', lines: ['✅ ¡Palabra adivinada! Ahora, en secreto, señalad a quien creáis el Insider.', '🗳️ La mesa señala a David.', '👥 El Insider era David. ¡Cazado! El equipo se lleva la ronda (+1).'] },
    },
  ],
};
