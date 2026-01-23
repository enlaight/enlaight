import { Button } from './ui/button';
import { UserDropdown } from './navigation/UserDropdown';
import { LanguageDropdown } from './navigation/LanguageDropdown';
import { useAgentsChat } from '../contexts/AgentsChatContext';
import { useNavigate } from 'react-router-dom';
// import { NotificationDropdown } from './navigation/NotificationDropdown';

export const UserControls: React.FC = () => {
  const { resetHomepage } = useAgentsChat();
  const navigate = useNavigate();

  return <div className="flex items-center gap-4 relative p-0 max-md:gap-3 max-sm:gap-2">
    <Button onClick={() => { resetHomepage(); navigate('/'); }} variant="ghost" size="icon" className="p-1 rounded-full hover:bg-hover-bg transition-colors chat-navbar-button" aria-label="AI Agent">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.2412 6C16.0462 5.99999 16.7108 5.99973 17.252 6.04395C17.814 6.08987 18.3311 6.18827 18.8164 6.43555C19.5689 6.81902 20.181 7.43109 20.5645 8.18359C20.8117 8.6689 20.9101 9.18599 20.9561 9.74805C21.0003 10.2892 21 10.9538 21 11.7588V16.2412C21 17.0462 21.0003 17.7108 20.9561 18.252C20.9101 18.814 20.8117 19.3311 20.5645 19.8164C20.181 20.5689 19.5689 21.181 18.8164 21.5645C18.3311 21.8117 17.814 21.9101 17.252 21.9561C16.7108 22.0003 16.0462 22 15.2412 22H8.75879C7.95381 22 7.28925 22.0003 6.74805 21.9561C6.18599 21.9101 5.6689 21.8117 5.18359 21.5645C4.43109 21.181 3.81901 20.5689 3.43555 19.8164C3.18827 19.3311 3.08987 18.814 3.04395 18.252C2.99973 17.7108 2.99999 17.0462 3 16.2412V11.7588C2.99999 10.9538 2.99973 10.2892 3.04395 9.74805C3.08987 9.18599 3.18827 8.6689 3.43555 8.18359C3.81902 7.43109 4.43109 6.81902 5.18359 6.43555C5.6689 6.18827 6.18599 6.08987 6.74805 6.04395C7.28924 5.99973 7.95382 5.99999 8.75879 6H15.2412ZM14.4004 15.2002C13.5944 15.8047 12.8099 15.9996 11.999 16C11.1883 16.0004 10.4061 15.8051 9.59961 15.2002L8.40039 16.7998C9.59371 17.6947 10.8102 18.0006 12.001 18C13.1882 17.9993 14.4058 17.6951 15.5996 16.7998L14.4004 15.2002ZM8.5 10C7.67157 10 7 10.6716 7 11.5C7 12.3284 7.67157 13 8.5 13C9.32843 13 10 12.3284 10 11.5C10 10.6716 9.32843 10 8.5 10ZM15.5 10C14.6716 10 14 10.6716 14 11.5C14 12.3284 14.6716 13 15.5 13C16.3284 13 17 12.3284 17 11.5C17 10.6716 16.3284 10 15.5 10Z" />
        <path d="M10 3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3C14 4.10457 13.1046 5 12 5C10.8954 5 10 4.10457 10 3Z" />
        <rect x="11" y="4" width="2" height="3" />
        <path d="M1 11C1 10.4477 1.44772 10 2 10H4V16H2C1.44772 16 1 15.5523 1 15V11Z" />
        <path d="M23 15C23 15.5523 22.5523 16 22 16L20 16L20 10L22 10C22.5523 10 23 10.4477 23 11L23 15Z" />
      </svg>

    </Button>

    {/* <NotificationDropdown /> */}

    <LanguageDropdown />

    <UserDropdown />

  </div>;
};
