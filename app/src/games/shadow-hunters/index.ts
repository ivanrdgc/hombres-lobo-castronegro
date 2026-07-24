// «Shadow Hunters» como juego enchufable de la mesa. La app custodia las
// identidades secretas (tres facciones), tira los dados y entrega las pistas.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const shadowHunters: GameDefinition = {
  id: 'shadow_hunters',
  emoji: '🌘',
  name: 'Shadow Hunters',
  desc: 'Tres bandos ocultos: Cazadores contra Sombras, con neutrales a la suya. En tu turno: pista secreta (que delata facciones), ataque con dados, descanso… o revélate una vez y usa el poder de tu personaje. Deducción, faroles y golpes en la noche.',
  minPlayers: 4,
  maxPlayers: 8,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'sh-mycard': MyInfoModal,
    'sh-help': HelpModal,
    'sh-demo': DemoModal,
    'sh-leave': LeaveModal,
    'sh-end': EndConfirmModal,
  },
};
