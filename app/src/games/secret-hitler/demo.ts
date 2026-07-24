// Tutorial de Secret Hitler: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'secret_hitler',
  name: 'Secret Hitler',
  emoji: '🐷',
  steps: [
    {
      icon: '🎯',
      title: 'Salvar (o hundir) la República',
      text: [
        'Sois mayoría LIBERALES, pero entre vosotros hay FASCISTAS que se conocen entre sí… y un HITLER oculto que finge ser uno más.',
        'Cada gobierno promulga un decreto en secreto. Ganan los liberales con 5 decretos liberales o ejecutando a Hitler; los fascistas, con 6 fascistas o colando a Hitler de Canciller cuando ya hay 3 decretos fascistas.',
      ],
      visual: { kind: 'board', rows: [{ label: '🕊️ Decretos liberales', value: '3/5' }, { label: '🐷 Decretos fascistas', value: '4/6' }, { label: '😳 Caos (gobiernos caídos)', value: '1/3' }] },
    },
    {
      icon: '🎴',
      title: 'Tu carta',
      text: [
        'Mira tu carta a solas y confirma. Los fascistas ven quiénes son sus compinches y quién es Hitler. Hitler, con 7 o más jugadores, juega A CIEGAS (no sabe quiénes son los suyos). Los liberales no saben nada de nadie.',
      ],
      visual: { kind: 'card', emoji: '🕊️', title: 'Eres LIBERAL', lines: ['No conoces el bando de nadie.', 'Sois mayoría: deducid por los votos y los decretos.'] },
    },
    {
      icon: '🤝',
      title: 'Fase 1 · Gobierno',
      text: [
        'El PRESIDENTE (rota por la mesa) nomina en su móvil a un CANCILLER; la app aplica los límites de mandato (no repiten los últimos electos).',
        'Toda la mesa vota en secreto «👍 Ja» o «👎 Nein» y la app lo destapa a la vez. Mayoría de Ja → gobiernan. Si no, la presidencia pasa… y al TERCER gobierno caído, caos: se promulga a ciegas el decreto de arriba del mazo.',
      ],
      visual: { kind: 'buttons', buttons: [{ label: '👍 Ja', kind: 'primary' }, { label: '👎 Nein', kind: 'danger' }], caption: 'El voto es secreto hasta que vota el último.' },
    },
    {
      icon: '📜',
      title: 'Fase 2 · Legislar en secreto',
      text: [
        'La app da al Presidente TRES decretos que solo ve él: descarta uno y pasa dos al Canciller. El Canciller ve esos dos y promulga uno.',
        'Solo el decreto promulgado es público: los descartes son secretos PARA SIEMPRE. Ahí vive la mentira: «a mí solo me llegaron fascistas»… ¿seguro?',
      ],
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres Canciller LIBERAL y el Presidente te pasa dos decretos… los dos fascistas.'],
      ask: {
        prompt: '¿Qué haces?',
        choices: [
          { label: 'Promulgo uno y aviso a la mesa: «me llegaron dos fascistas»', good: true, reply: 'No te quedaba otra (salvo veto, que se desbloquea con 5 fascistas). Decláralo en voz alta: o el Presidente descartó el liberal… o el mazo venía cargado. Que la mesa deduzca.' },
          { label: 'Me niego a promulgar', reply: 'No existe negarse: legislar es obligatorio. Solo con 5 decretos fascistas aparece el VETO, y aun así el Presidente debe aceptarlo (y si lo rechaza, promulgas sí o sí).' },
          { label: 'Enseño mis dos cartas como prueba', reply: 'Prohibidísimo: los descartes y las manos son secretos. El juego vive justamente de no poder demostrar lo que te llegó.' },
        ],
      },
    },
    {
      icon: '⚡',
      title: 'Poderes presidenciales',
      text: [
        'Algunos decretos FASCISTAS activan un poder para el Presidente (según cuántos jugadores seáis): 🔮 mirar los tres próximos decretos, 🔎 investigar la lealtad de alguien (Hitler aparece como «fascista»), 🗳️ elegir a dedo al próximo Presidente o 💀 ejecutar.',
        'Si el ejecutado era Hitler, los liberales ganan en el acto. El ejecutado queda fuera y no vota.',
      ],
    },
    {
      icon: '💀',
      title: 'La trampa final',
      text: [
        'Con 3 o más decretos fascistas en la mesa, elegir a Hitler como CANCILLER da la victoria inmediata a los fascistas. A partir de ahí, cada «Ja» es jugarse la República.',
        'Resumen liberal: gobiernos de confianza, memoria de votos y ni un Ja gratis. Resumen fascista: caos, sombra… y paciencia. 🐷',
      ],
      visual: { kind: 'log', lines: ['🗳️ Gobierno APROBADO (4 Ja, 3 Nein).', '💀 ¡Carlos era Hitler y ha sido elegido Canciller con tres decretos fascistas! Ganan los fascistas.'] },
    },
  ],
};
