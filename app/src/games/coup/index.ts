// «Coup» (Golpe de Estado) como juego enchufable de la mesa. La app hace de
// máster oculto: baraja y custodia la corte, resuelve los desafíos y bloqueos
// (con su anidamiento), mueve las monedas y detecta al superviviente.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const coup: GameDefinition = {
  id: 'coup',
  emoji: '🃏',
  name: 'Coup',
  desc: 'Intriga de farol en la corte: escondes dos influencias y en tu turno dices ser un personaje para cobrar, robar o asesinar… mientas o no. Cualquiera puede desafiar tu farol o bloquearlo, y quien se queda sin cartas cae. El último en pie gana. Partidas cortas y muy tramposas.',
  minPlayers: 2,
  maxPlayers: 6,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'coup-help': HelpModal,
    'coup-leave': LeaveModal,
    'coup-end': EndConfirmModal,
  },
};
