// «Secret Hitler» (Secret Hitler) como juego enchufable de la mesa. La app
// hace de máster OCULTO: baraja y custodia el mazo de decretos, muestra a cada
// gobierno solo lo que ve, aplica los poderes presidenciales y detecta victorias.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import RoleDetailModal from './ui/modals/RoleDetailModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const secretHitler: GameDefinition = {
  id: 'secret_hitler',
  emoji: '🏛️',
  name: 'Secret Hitler',
  desc: 'Liberales contra fascistas en una República que se hunde. La app custodia en secreto el mazo de decretos y los poderes presidenciales —investigar, elección especial, ejecutar—: promulgad decretos, desenmascarad a Hitler… o coladlo de Canciller.',
  minPlayers: 5,
  maxPlayers: 10,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'sh-help': HelpModal,
    'sh-role-detail': RoleDetailModal,
    'sh-leave': LeaveModal,
    'sh-end': EndConfirmModal,
  },
};
