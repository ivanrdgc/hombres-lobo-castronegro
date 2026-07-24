// «El Camaleón» (The Chameleon) como juego enchufable de la mesa. La app reparte
// la palabra secreta a todos menos al Camaleón y cuenta el voto en secreto.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';

export const chameleon: GameDefinition = {
  id: 'chameleon',
  emoji: '🦎',
  name: 'El Camaleón',
  desc: 'Todos veis la misma rejilla de 16 palabras y sabéis cuál es la secreta… menos el Camaleón, que ha de fingir. Una pista por cabeza, un voto y, si lo pillan, una última oportunidad de adivinar. Rondas cortas y muy tramposas.',
  minPlayers: 3,
  maxPlayers: 10,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'ch-demo': DemoModal,
    'ch-help': HelpModal,
    'ch-leave': LeaveModal,
    'ch-end': EndConfirmModal,
  },
};
