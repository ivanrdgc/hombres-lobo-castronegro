// «Skull» (Cráneos) como juego enchufable de la mesa. La app custodia las pilas
// boca abajo (solo su dueño las ve), lleva las apuestas y resuelve los
// revelados.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const skull: GameDefinition = {
  id: 'skull',
  emoji: '💀',
  name: 'Skull',
  desc: 'Farol puro con discos: tres flores y una calavera cada uno. Colocáis discos boca abajo y apostáis cuántas flores levantaréis sin toparos una calavera; los demás suben o pasan. Quien puja más alto se la juega. Dos retos ganados y la partida es tuya. La app custodia las pilas.',
  minPlayers: 3,
  maxPlayers: 6,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'sk-mycard': MyInfoModal,
    'sk-help': HelpModal,
    'sk-demo': DemoModal,
    'sk-leave': LeaveModal,
    'sk-end': EndConfirmModal,
  },
};
