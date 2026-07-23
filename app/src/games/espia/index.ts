// El Espía (Spyfall) como juego enchufable de la mesa.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import LugaresModal from './ui/modals/LugaresModal.svelte';
import GuessModal from './ui/modals/GuessModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const espia: GameDefinition = {
  id: 'espia',
  emoji: '🕵️',
  name: 'El Espía',
  desc: 'Spyfall: todos conocéis el lugar… menos uno. Preguntas capciosas, respuestas con doble fondo y ocho minutos para desenmascarar al espía antes de que adivine dónde estáis.',
  minPlayers: 3,
  maxPlayers: 8,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'espia-help': HelpModal,
    'espia-lugares': LugaresModal,
    'espia-guess': GuessModal,
    'espia-leave': LeaveModal,
    'espia-end': EndConfirmModal,
  },
};
