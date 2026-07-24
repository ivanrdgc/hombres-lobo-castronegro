// «Decrypto» como juego enchufable de la mesa. La app custodia las palabras de
// cada equipo (solo su equipo las ve) y los códigos secretos, y resuelve las
// intercepciones y errores.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const decrypto: GameDefinition = {
  id: 'decrypto',
  emoji: '🔐',
  name: 'Decrypto',
  desc: 'Comunicación cifrada entre dos equipos: cada uno tiene 4 palabras clave secretas y transmite códigos de 3 cifras con pistas… mientras el rival escucha e intenta interceptar. Dos intercepciones ganan; dos errores propios hacen perder. Pura estrategia de comunicación.',
  minPlayers: 4,
  maxPlayers: 8,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'de-mycard': MyInfoModal,
    'de-help': HelpModal,
    'de-demo': DemoModal,
    'de-leave': LeaveModal,
    'de-end': EndConfirmModal,
  },
};
