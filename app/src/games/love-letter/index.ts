// «Love Letter» (Carta de Amor) como juego enchufable de la mesa. La app baraja,
// reparte, custodia las manos (solo su dueño las ve) y resuelve los efectos.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';
import DropModal from './ui/modals/DropModal.svelte';

export const loveLetter: GameDefinition = {
  id: 'love_letter',
  emoji: '💌',
  name: 'Love Letter',
  desc: 'Intriga de palacio con una sola carta en la mano. En tu turno robas otra y juegas una: adivina con el Guardia, espía con el Sacerdote, bate en duelo con el Barón, protégete con la Doncella… y no descartes la Princesa. Gana quien reúna más favores. La app custodia el mazo y las manos.',
  minPlayers: 2,
  maxPlayers: 6,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'll-mycard': MyInfoModal,
    'll-help': HelpModal,
    'll-demo': DemoModal,
    'll-leave': LeaveModal,
    'll-drop': DropModal,
    'll-end': EndConfirmModal,
  },
};
