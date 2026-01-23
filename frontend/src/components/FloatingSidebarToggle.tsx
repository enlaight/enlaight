import React from 'react';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { useSidebar } from '../contexts/SidebarContext';
import { useAgentsChat } from '../contexts/AgentsChatContext';
import { useLocation } from 'react-router-dom';

export const FloatingSidebarToggle: React.FC = () => {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const { isModalOpen } = useAgentsChat();
  const location = useLocation();

  // Hide on login page
  if (location.pathname === '/login') {
    return null;
  }

  // Only show on mobile devices and when agents chat is not open
  if (!isMobile || isModalOpen) {
    return null;
  }

  return (
    <Button
      onClick={toggleSidebar}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
      size="lg"
      aria-label="Toggle sidebar"
    >
      <Menu className="h-6 w-6 text-primary-foreground" />
    </Button>
  );
};
