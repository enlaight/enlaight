import { Button } from './ui/button';
import { UserDropdown } from './navigation/UserDropdown';
import { LanguageDropdown } from './navigation/LanguageDropdown';
import { useAgentsChat } from '../contexts/AgentsChatContext';
import { useNavigate } from 'react-router-dom';
import { EnlaightBotFilled } from '@/assets/svgs';
// import { NotificationDropdown } from './navigation/NotificationDropdown';

export const UserControls: React.FC = () => {
  const { resetHomepage } = useAgentsChat();
  const navigate = useNavigate();

  return <div className="flex items-center gap-4 relative p-0 max-md:gap-3 max-sm:gap-2">
    <Button onClick={() => { resetHomepage(); navigate('/'); }} variant="ghost" size="icon" className="p-1 rounded-full hover:bg-hover-bg transition-colors chat-navbar-button" aria-label="AI Agent">
      <EnlaightBotFilled size={24} fill="black" />
    </Button>

    {/* <NotificationDropdown /> */}

    <LanguageDropdown />

    <UserDropdown />

  </div>;
};
