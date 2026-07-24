// «Captain Sonar» como juego enchufable de la mesa. La app custodia posiciones
// y estelas (cada tripulación ve solo su submarino), anuncia rumbos en voz alta
// y resuelve torpedos, dron, silencio y emersiones. Voz multi-altavoz.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import RulesModal from './ui/modals/RulesModal.svelte';

export const sonar: GameDefinition = {
  id: 'sonar',
  emoji: '⚓',
  name: 'Captain Sonar',
  desc: 'Dos submarinos se cazan a ciegas en el mismo mapa: cada rumbo se anuncia en voz alta y el rival lo apunta para triangularte. Navega para cargar energía y gasta en torpedos, dron, silencio o emerger. Por equipos y mejor de 4 a 6, con un altavoz por tripulación si os sentáis separados.',
  minPlayers: 2,
  maxPlayers: 10,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    // La pastilla flotante de un juego de EQUIPO abre las REGLAS, no una carta:
    // el submarino, la posición y el cuaderno ya están en la consola (B34).
    'sn-rules': RulesModal,
    'sn-help': HelpModal,
    'sn-demo': DemoModal,
    // Sin «sn-leave»: irse de una partida por equipos es terminarla, y tener dos
    // puertas con dos nombres para la misma acción era el botón de más.
    'sn-end': EndConfirmModal,
  },
};
