// «Ávalon» (The Resistance: Avalon) como juego enchufable de la mesa. La app
// hace de máster OCULTO: reparte lealtades, calcula el conocimiento cruzado y
// cuenta en secreto los votos de equipo y las cartas de misión.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import HelpModal from './ui/modals/HelpModal.svelte';
import RoleDetailModal from './ui/modals/RoleDetailModal.svelte';
import LeaveModal from './ui/modals/LeaveModal.svelte';
import EndConfirmModal from './ui/modals/EndConfirmModal.svelte';

export const avalon: GameDefinition = {
  id: 'avalon',
  emoji: '🏰',
  name: 'Ávalon',
  desc: 'The Resistance: Avalon. Leales y esbirros de Mordred se disputan cinco misiones. La app reparte lealtades y lleva las misiones en secreto: Merlín lo ve casi todo, Percival duda entre dos, y el Asesino guarda una última bala para desenmascarar a Merlín.',
  minPlayers: 5,
  maxPlayers: 10,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'av-help': HelpModal,
    'av-role-detail': RoleDetailModal,
    'av-leave': LeaveModal,
    'av-end': EndConfirmModal,
  },
};
