// Tutorial de Two Rooms and a Boom: el flujo real de la app, paso a paso.
import type { DemoScript } from '../../shell/demo/types';

export const DEMO: DemoScript = {
  id: 'two_rooms',
  name: 'Two Rooms and a Boom',
  emoji: '💣',
  steps: [
    {
      icon: '🎯',
      title: 'Dos salas, dos bandos y una bomba',
      text: [
        'Os dividís en dos SALAS físicas y en dos bandos secretos. Entre los azules hay un PRESIDENTE; entre los rojos, un BOMBARDERO.',
        'Al final, si el Bombardero acaba en la misma sala que el Presidente: ¡BOOM!, gana el rojo. En salas distintas, gana el azul. Todo el bando gana o pierde junto.',
      ],
      visual: {
        kind: 'chips',
        chips: [
          { name: 'Ana', badge: 'Sala 1' }, { name: 'Bea', badge: 'Sala 1' }, { name: 'Carlos', badge: 'Sala 1' },
          { name: 'David', badge: 'Sala 2' }, { name: 'Eva', badge: 'Sala 2' }, { name: 'Fran', badge: 'Sala 2' },
        ],
        caption: 'Quién está en cada sala es público; tu bando y tu rol, no.',
      },
    },
    {
      icon: '🎴',
      title: 'Tu carta y tu sala',
      text: [
        'Toca «👁 Ver mi carta y mi sala» y mírala a solas: bando, rol y sala. Pulsa «✅ Lo tengo».',
        'Cuando todos confirman, os separáis físicamente en las dos salas y cualquiera pulsa «▶️ Empezar la ronda 1».',
      ],
      visual: {
        kind: 'card',
        emoji: '🔴',
        title: 'Equipo ROJO — 💣 BOMBARDERO',
        lines: ['Tu sala inicial: Sala 2', 'Objetivo: acabar la partida en la sala del Presidente.'],
      },
    },
    {
      icon: '🗣️',
      title: 'Rondas contrarreloj',
      text: [
        'Tres rondas de 3, 2 y 1 minuto. El temporizador corre en la pantalla de todos los móviles; la voz suena según el modo elegido al empezar (un narrador, uno por sala o todos).',
        'Dentro de tu sala hablas con quien quieras y puedes ENSEÑAR tu carta cara a cara, en privado. Eso es cosa vuestra: la app no lo controla, solo custodia quién es quién.',
      ],
    },
    {
      icon: '🤔',
      title: 'Ponte a prueba',
      text: ['Eres el PRESIDENTE y en tu sala alguien te pide ver tu carta.'],
      ask: {
        prompt: '¿Se la enseñas?',
        choices: [
          { label: 'Solo a quien ya me haya demostrado ser azul', good: true, reply: 'Eso es: confirma primero (que te enseñen carta azul) y gana escoltas de confianza. El Presidente necesita azules que lo protejan… sin que los rojos lo localicen.' },
          { label: 'A toda la sala, para que me protejan', reply: 'Si hay un rojo delante, ya sabe a quién debe acercar al Bombardero. Enseñar la carta de Presidente a la ligera suele costar la partida.' },
          { label: 'A nadie, jamás', reply: 'Legítimo… pero si ningún azul confía en ti, no podrán mantenerte lejos del Bombardero. El silencio total también tiene precio.' },
        ],
      },
    },
    {
      icon: '🔄',
      title: 'El voto de rehén',
      text: [
        'Al agotarse el reloj, cada sala vota a quién manda de rehén: tocas a alguien de TU sala (puedes ofrecerte tú) y pulsas «🗳️ Votar». En pantalla solo se ve cuántos han votado.',
        'El más votado de cada sala cruza a la otra (empate → decide el orden de la mesa). Tras el intercambio empieza la siguiente ronda.',
      ],
      visual: {
        kind: 'buttons',
        buttons: [{ label: '🗳️ Votar a Carlos', kind: 'primary' }, { label: 'Sala 1: 2/3 votos', kind: 'ghost' }],
        caption: 'El voto es secreto; el elegido se anuncia cuando vota toda la sala.',
      },
    },
    {
      icon: '💥',
      title: 'El desenlace',
      text: [
        'Tras el intercambio de la ronda 3, la app destapa las cartas y dictamina: misma sala → gana el ROJO; salas distintas → gana el AZUL. El marcador se guarda entre partidas.',
        'Y si alguien se marcha a mitad, la partida sigue (sus votos caen); pero si abandona el Presidente o el Bombardero, su bando se rinde. Sin dramas: ¡a jugar!',
      ],
      visual: {
        kind: 'log',
        lines: [
          '🔔 ¡Fin de la ronda! Cada sala vota a quién manda de rehén.',
          '🔄 Intercambio: Ana pasa a la Sala 2 y Eva a la Sala 1.',
          '🏁 El Presidente era Carlos y el Bombardero Eva. Acabaron en la misma sala: ¡BOOM! Gana el ROJO.',
        ],
      },
    },
  ],
};
