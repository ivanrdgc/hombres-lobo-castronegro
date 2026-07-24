// «Codenames» (Nombres en Clave) como juego enchufable de la mesa. La app hace
// de tablero secreto: custodia el mapa (solo lo ven los Jefes), reparte los
// equipos y resuelve pistas y toques.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const codenames: GameDefinition = {
  id: 'codenames',
  emoji: '🕵️',
  name: 'Codenames',
  desc: 'Dos equipos y 25 palabras. Cada Jefe de espías ve un mapa secreto (solo en su móvil) y guía a los suyos con pistas de una palabra y un número. El primero en descubrir todas sus palabras gana… pero quien toque al asesino, pierde. La app hace de tablero secreto.',
  minPlayers: 4,
  maxPlayers: 16,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'cn-help': HelpModal,
    'cn-demo': DemoModal,
    'cn-leave': LeaveModal,
    'cn-end': EndConfirmModal,
  },
};
