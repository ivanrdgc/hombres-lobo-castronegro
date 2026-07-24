// Tutorial de Secret Hitler: una legislatura de ejemplo continua, con quién
// actúa en cada momento y qué ve cada pantalla.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'secret_hitler',
  name: 'Secret Hitler',
  emoji: '🐷',
  steps: [
    {
      icon: '🎯',
      title: 'La partida de ejemplo',
      text: [
        'Jugáis cinco: TÚ, Bea, Carlos, David y Eva. Tres sois LIBERALES; dos, FASCISTAS en secreto — y uno de esos dos es HITLER, que finge ser un liberal ejemplar.',
        'Cada ronda, un gobierno (Presidente y Canciller) promulga un decreto en secreto. Liberales: 5 decretos liberales o ejecutar a Hitler. Fascistas: 6 fascistas… o colar a Hitler de Canciller con 3 o más fascistas en la mesa.',
      ],
      visual: { kind: 'board', rows: [{ label: '🕊️ Decretos liberales', value: '0/5' }, { label: '🐷 Decretos fascistas', value: '0/6' }, { label: '😳 Caos (gobiernos caídos)', value: '0/3' }] },
    },
    {
      icon: '🎴',
      title: 'El reparto: quién conoce a quién',
      who: { actor: 'TODOS miráis vuestra carta a la vez y confirmáis', others: 'los fascistas se reconocen entre sí; los liberales no saben nada de nadie.' },
      text: [
        'A ti te toca 🕊️ LIBERAL: vas a ciegas. Bea (fascista) sí sabe que David es Hitler. (Con 7 o más jugadores, Hitler jugaría a ciegas también.)',
        'Tu carta no se pierde: el botón 🎴 de abajo a la derecha la abre en CUALQUIER momento, con la chuleta de bandos, poderes y decretos. Consúltala siempre que dudes, sin miedo a olvidarte de quién eres.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'TÚ (liberal)', lines: ['🕊️ Eres LIBERAL', 'No conoces el bando de nadie.', 'Deducid por los votos y los decretos.'] },
          { title: 'Bea (fascista, tú no lo ves)', lines: ['🐷 Fascista', 'Conoce a su compinche: 💀 David es Hitler.'] },
        ],
      },
    },
    {
      icon: '🤝',
      title: 'Fase 1 · Nominar y votar',
      who: { actor: 'Carlos (Presidente de turno) nomina Canciller en su móvil; luego TODOS votáis Ja o Nein en secreto', others: 'cuando ha votado el último, la app destapa los votos CON NOMBRES: quién votó qué queda en el tablero y en la crónica.' },
      text: [
        'La presidencia rota por la mesa. Carlos nomina a Bea (la app ya filtra a los no elegibles por límites de mandato). Todos votáis: sale 3 Ja contra 2 Nein, así que gobiernan Carlos y Bea.',
        'Tu voto es secreto solo hasta el recuento: después aparece tu nombre bajo 👍 Ja o 👎 Nein. Ahí vive la deducción: quién apoyó al gobierno que promulgó tres decretos fascistas seguidos es la mejor pista que tiene un liberal.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carlos (Presidente)', lines: ['Elige Canciller entre los elegibles:'], buttons: [{ label: '🤝 Nominar a Bea', kind: 'primary' }] },
          { title: 'TÚ (votas)', lines: ['«Carlos propone a Bea como Canciller.»'], buttons: [{ label: '👍 Ja', kind: 'primary' }, { label: '👎 Nein', kind: 'danger' }] },
          { title: 'TODOS (destape)', lines: ['👍 Ja (3): Tú, Carlos, Bea', '👎 Nein (2): David, Eva', '✅ Gobierno APROBADO'] },
        ],
      },
    },
    {
      icon: '📜',
      title: 'Fase 2 · Legislar en secreto',
      who: { actor: 'Carlos (Presidente) ve 3 decretos y descarta 1; Bea (Canciller) ve los 2 restantes y promulga 1', others: 'los demás SOLO veis el decreto promulgado; los descartes son secretos para siempre.' },
      text: [
        'Se promulga un decreto 🐷 fascista. ¿Le llegaron dos fascistas a Bea? ¿O descartó ella el liberal? Nadie puede demostrarlo: ahí vive la mentira.',
      ],
      visual: {
        kind: 'screens',
        panes: [
          { title: 'Carlos (Presidente)', lines: ['Ve: 🕊️ 🐷 🐷 → descarta 🕊️…', '(¿o era 🐷 🐷 🐷? Solo él lo sabe.)'] },
          { title: 'Bea (Canciller)', lines: ['Ve: 🐷 🐷 → promulga 🐷.'] },
          { title: 'TÚ', lines: ['«🐷 Se promulga un decreto FASCISTA (🕊️ 0 · 🐷 1).»', 'Toca deducir: ¿mazo cruel o gobierno sucio?'] },
        ],
      },
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      who: { actor: 'Imagina que el Canciller eres TÚ (liberal)', others: 'el Presidente te acaba de pasar dos decretos.' },
      text: ['Te llegan DOS decretos fascistas. No hay veto todavía (se desbloquea con 5 decretos fascistas 🐷).'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: 'Promulgo uno y lo canto: «¡me llegaron dos fascistas!»', good: true, reply: 'No te quedaba otra: legislar es obligatorio. Decláralo en voz alta: o el Presidente descartó el liberal o el mazo venía cargado. Que la mesa deduzca a quién creer.' },
          { label: 'Me niego a promulgar', reply: 'No existe negarse: la app te hará elegir uno de los dos. Solo con 5 decretos fascistas aparece el VETO (y aun así el Presidente debe aceptarlo; si lo rechaza, promulgas sí o sí).' },
          { label: 'Enseño mi pantalla como prueba', reply: 'Prohibidísimo: manos y descartes son secretos SIEMPRE. El juego vive de que nadie pueda demostrar lo que le llegó.' },
        ],
      },
    },
    {
      icon: '🔥',
      title: 'Cuando nadie se pone de acuerdo: el caos y el veto',
      who: { actor: 'No lo dispara nadie: son las dos válvulas de la partida y la app las lleva sola', others: 'todos veis subir el contador de gobiernos caídos y cuándo se desbloquea el veto.' },
      text: [
        'CAOS: si caen TRES gobiernos seguidos (por Nein o por vetos aceptados), el país se hunde. La app promulga a ciegas el decreto de arriba del mazo, SIN activar su poder, y borra los límites de mandato: el próximo gobierno puede repetir Presidente y Canciller. Bloquear por sistema es jugar a la ruleta, porque el mazo lleva 11 decretos fascistas y solo 6 liberales.',
        'VETO: a partir de 5 decretos fascistas, el Canciller puede proponer tirar la agenda entera. Si el Presidente acepta, no se promulga nada y cuenta como gobierno caído hacia el caos; si la rechaza, el Canciller está OBLIGADO a promulgar y ya no puede volver a vetar en esa sesión.',
      ],
      visual: {
        kind: 'log',
        lines: [
          '🗳️ Gobierno RECHAZADO — 👍 Ja (2): Bea, David · 👎 Nein (3): Tú, Carlos, Eva.',
          '😳 Van 3/3 gobiernos caídos.',
          '🔥 ¡Caos! Se promulga a ciegas un decreto FASCISTA 🐷 (sin poder presidencial) y se borran los límites de mandato.',
        ],
      },
    },
    {
      icon: '⚡',
      title: 'Los poderes presidenciales',
      who: { actor: 'Al promulgarse ciertos decretos FASCISTAS, el Presidente de turno usa un poder en su móvil', others: 'todos veis QUÉ poder usa y sobre quién; el resultado de investigar solo lo ve él.' },
      text: [
        'Según cuántos juguéis: 🔮 mirar los 3 próximos decretos, 🔎 investigar la lealtad de alguien (Hitler sale como «fascista»), 🗳️ elegir a dedo al próximo Presidente o 💀 ejecutar.',
        'Con 5 o 6 jugadores, el tercer decreto fascista permite mirar el mazo, y el cuarto y el quinto, ejecutar; con más gente los poderes empiezan antes. La app aplica la tabla sola y el tablero lleva la leyenda de qué poder da cada casilla.',
        'Si el ejecutado era Hitler, los liberales ganan al instante. El ejecutado queda fuera, no vota ni gobierna, y su móvil se lo dice bien claro.',
      ],
    },
    {
      icon: '💀',
      title: 'La trampa final',
      who: { actor: 'Con 3 o más decretos fascistas, elegir a Hitler de CANCILLER da la victoria fascista al momento', others: 'a partir de ahí, cada «Ja» tuyo es jugarse la República.' },
      text: [
        'Unas rondas después, con 3 decretos fascistas ya en la mesa, Eva nomina Canciller a David («¡es de fiar!»)… y David era Hitler: victoria fascista instantánea.',
        'Moraleja liberal: gobiernos de confianza, memoria de votos y ni un Ja gratis. Moraleja fascista: siembra caos y protege a tu Hitler. 🐷',
      ],
      visual: { kind: 'log', lines: ['🤝 Eva nomina Canciller a David. ¡A votar!', '🗳️ Gobierno APROBADO — 👍 Ja (3): Eva, Bea, David · 👎 Nein (2): Tú, Carlos.', '💀 ¡David era Hitler y ha sido elegido Canciller con tres decretos fascistas! Ganan los fascistas.'] },
    },
  ],
};
