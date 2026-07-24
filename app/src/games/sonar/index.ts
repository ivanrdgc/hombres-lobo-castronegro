// «Captain Sonar» como juego enchufable de la mesa. La app custodia posiciones
// y estelas (cada tripulación ve solo su submarino), anuncia rumbos en voz alta
// y resuelve torpedos, dron, silencio y emersiones. Voz multi-altavoz.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const sonar: GameDefinition = {
  id: 'sonar',
  emoji: '📡',
  name: 'Captain Sonar',
  desc: 'Dos submarinos se cazan a ciegas en el mismo mapa: cada rumbo se anuncia en voz alta y el rival lo apunta para triangularte. Navega para cargar energía y gasta en torpedos, dron, silencio o emerger. Por equipos, con un altavoz por tripulación si os sentáis separados.',
  minPlayers: 2,
  maxPlayers: 10,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'sn-mycard': MyInfoModal,
    'sn-help': HelpModal,
    'sn-demo': DemoModal,
    'sn-leave': LeaveModal,
    'sn-end': EndConfirmModal,
  },
};
