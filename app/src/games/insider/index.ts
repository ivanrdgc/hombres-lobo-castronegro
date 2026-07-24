// «Insider» como juego enchufable de la mesa. La app hace de máster oculto:
// elige la palabra, designa al Insider en secreto, cronometra el interrogatorio
// y cuenta la caza del Insider.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const insider: GameDefinition = {
  id: 'insider',
  emoji: '🤫',
  name: 'Insider',
  desc: 'Cooperativo con traidor: el equipo adivina una palabra secreta a preguntas de SÍ o NO contrarreloj mientras un infiltrado, que también la conoce, os guía sin cantarse. Adivinada la palabra, hay que cazarlo. Si no la adivináis a tiempo, perdéis todos. Partidas de pocos minutos.',
  minPlayers: 4,
  maxPlayers: 12,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'ins-mycard': MyInfoModal,
    'ins-demo': DemoModal,
    'ins-help': HelpModal,
    'ins-leave': LeaveModal,
    'ins-end': EndConfirmModal,
  },
};
