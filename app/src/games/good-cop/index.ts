// «Good Cop Bad Cop» como juego enchufable de la mesa. La app custodia las
// cartas de integridad (cada uno ve las suyas y lo que investigue) y resuelve
// disparos y victoria.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const goodCop: GameDefinition = {
  id: 'good_cop',
  emoji: '🚔',
  name: 'Good Cop Bad Cop',
  desc: 'Comisaría podrida: 3 cartas de integridad cada uno (tu bando es su mayoría), con un Agente y un Jefe ocultos como líderes. Investiga cartas en secreto, ármate, apunta… y dispara al líder rival: si cae un líder, su bando pierde en el acto. Faroleo y alianzas.',
  minPlayers: 4,
  maxPlayers: 8,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'gc-mycard': MyInfoModal,
    'gc-help': HelpModal,
    'gc-demo': DemoModal,
    'gc-leave': LeaveModal,
    'gc-end': EndConfirmModal,
  },
};
