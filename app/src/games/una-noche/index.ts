// «Una Noche en Castronegro» (One Night Ultimate Werewolf) como juego
// enchufable de la mesa. Una sola noche de intercambio de cartas y un único
// voto simultáneo; el narrador llama a cada rol en su orden.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const unaNoche: GameDefinition = {
  id: 'una_noche',
  emoji: '🌘',
  name: 'Una Noche en Castronegro',
  desc: 'One Night: una sola noche de roles que se roban y barajan cartas a oscuras, y un único juicio a plena luz. Nadie muere de noche… pero al amanecer casi nadie es quien era. Partidas de 10 minutos.',
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'una-help': HelpModal,
    'una-leave': LeaveModal,
    'una-end': EndConfirmModal,
  },
};
