import { useEffect, useState } from 'react';
import { NavigationMenuProps } from './types';
import { getMenuItems, getSecondaryMenuItems } from './menuData';
import { MenuItem } from './MenuItem';
import { SubMenuItem } from './SubMenuItem';
import { SecondaryMenuItem } from './SecondaryMenuItem';
import { UsersFlyout } from './UsersFlyout';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InviteUserModal } from '@/components/InviteUserModal';
import { useAgents } from '@/hooks/use-agents';
import { useAgentsChat } from '@/contexts/AgentsChatContext';
import { ChatSessionService } from '@/services/ChatSessionService';
import SessionHistoryItem from '../SessionHistoryItem';
import { useSearch } from '@/contexts/SearchContext';
import { MessagesSquare } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ isCollapsed = false }) => {
  const [activeItem, setActiveItem] = useState("home");
  const [submenuAgents, setSubmenuAgents] = useState(false);
  const [submenuUsers, setSubmenuUsers] = useState(false);
  const [usersFlyoutVisible, setUsersFlyoutVisible] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [openHistory, setOpenHistory] = useState(false);

  const { openModal: openAgentChat, resetHomepage } = useAgentsChat();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { triggerSearchFocus } = useSearch();
  const { update } = useStore() as any;
  const { agents, deleteSessionFromAgent } = useAgents();
  const hasMoreAgents = agents.length > 3;
  const agentsSubMenu = [
    ...agents.map(obj => obj?.id && obj?.name ? { id: "assistant", agent: obj, label: obj.name } : null).filter(Boolean).slice(0, 3),
    ...(hasMoreAgents ? [{ id: "view-all-assistants", label: t('navigation.viewAllAssistants'), to: "/assistantlist" }] : [])
  ];

  const hasPermissions = ["ADMINISTRATOR"].includes(user?.role);

  useEffect(() => {
    if (chatHistory.length > 0) return;
    const fetchChatHistory = async () => {
      try {
        const res = await ChatSessionService.get();
        const agentMap = new Map(agents.map(agent => [agent.id, agent.name]));
        const namedChatHistory = res.map(item => {
          const agentName = agentMap.get(item.agent) || null;
          if (!item.agent) return;
          return {
            ...item,
            agent_name: agentName
          };
        });
        setChatHistory(namedChatHistory);
      } catch (err) {
        console.error(err)
      }
    }
    fetchChatHistory();
  }, [agents]);

  const handleMenuClick = async (itemId, obj) => {
    if (itemId === "logout") {
      try {
        await logout();
      } finally {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (itemId === "home") {
      navigate("/");
      resetHomepage();
    }

    if (itemId === "search-chat") {
      navigate("/search");
      update("searchResults", []);
      update("query", "");
      triggerSearchFocus();
    }

    if (itemId === "favorites") {
      navigate("/favorites");
    }

    if (itemId === "settings") {
      navigate("/settings");
    }

    if (itemId === "knowledgebases") {
      navigate("/knowledgebases");
    }

    if (itemId === "invite") {
      setInviteModalOpen(true);
      return;
    }

    if (itemId === "assistant" && obj?.agent) {
      openAgentChat(obj.agent.id);
      navigate("/");
      return;
    }

    setActiveItem(itemId);
    if (itemId === "users") {
      if (!isCollapsed) {
        setSubmenuUsers(!submenuUsers);
      }
    } else if (itemId === "agents") {
      if (!isCollapsed) {
        setSubmenuAgents(!submenuAgents);
      }
    } else if (itemId === "users-projects") {
      navigate("/projectslist");
    } else if (itemId === "users-list") {
      navigate("/userlist");
    }
  };

  const handleUsersHover = () => {
    if (isCollapsed) {
      setUsersFlyoutVisible(true);
    }
  };

  const handleUsersLeave = () => {
    if (isCollapsed) {
      setUsersFlyoutVisible(false);
    }
  };

  const menuItems = getMenuItems(activeItem, t);
  const secondaryMenuItems = getSecondaryMenuItems(t);

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'ADMINISTRATOR';
    }
    return true;
  });

  const handleSession = (agentId, sessionKey) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      openAgentChat(agent.id, sessionKey);
      navigate("/");
    }
  }

  const handleEditSession = (e) => {
    e.preventDefault();
    e.stopPropagation();
  }

  const deleteSession = async (e, session) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session.session_key) return;
    try {
      await ChatSessionService.delete(session.session_key, session.agent);
      deleteSessionFromAgent(session.agent, session.session_key);
      setChatHistory(chatHistory.filter(s => s.session_key !== session.session_key));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <nav className={`flex ${isCollapsed ? 'w-16' : 'w-[249px]'
        } flex-col items-start gap-3 relative pt-4 pb-4 ${isCollapsed ? 'px-2' : 'px-3'
        } max-md:w-[199px] max-md:pt-4 max-md:pb-4 max-md:px-2 transition-all duration-300 h-full justify-between`} role="navigation" aria-label="Main navigation">
        <div className={`flex ${isCollapsed ? 'w-12' : 'w-[225px]'
          } flex-col items-start gap-3 relative max-md:w-[175px] transition-all duration-300 max-h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-600 scrollbar-track-transparent rounded-lg`}>
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className="w-full"
              onMouseEnter={item.id === "users" ? handleUsersHover : undefined}
              onMouseLeave={item.id === "users" ? handleUsersLeave : undefined}
            >
              <MenuItem
                item={item}
                disabled={item.disabled}
                isCollapsed={isCollapsed}
                onMenuClick={handleMenuClick}
                submenuOpen={(item.id === "agents" && submenuAgents) || (item.id === "users" && submenuUsers)}
                hideSubMenu={(item.id === "agents" && agentsSubMenu.length === 0)}
              />
              {/* Submenu for Agents */}
              {item.id === "agents" && agentsSubMenu.length > 0 && (
                <SubMenuItem
                  isCollapsed={isCollapsed}
                  submenuOpen={submenuAgents}
                  items={agentsSubMenu}
                  onMenuClick={handleMenuClick}
                />
              )}
              {/* Submenu for Users */}
              {item.id === "users" && (
                <SubMenuItem
                  isCollapsed={isCollapsed}
                  submenuOpen={submenuUsers}
                  items={item.submenu ?? []}
                  onMenuClick={handleMenuClick}
                />
              )}

              {/* Separator to Admin & Manager Options */}
              {hasPermissions && item.id === 'favorites' && (
                <div className="w-[100%] h-px relative bg-sidebar-border max-md:w-[200px] mt-3" role="separator" />
              )}

            </div>
          ))}
          {chatHistory.length > 0 && !isCollapsed && (
            <>
              <div className="w-[100%] h-px relative bg-sidebar-border max-md:w-[200px]" role="separator" />
              <MenuItem
                item={{
                  id: "chat-history",
                  label: t('navigation.chatHistory'),
                  disabled: false,
                  isActive: false,
                  hasSubmenu: true,
                  icon: (
                    <MessagesSquare size={20} className="group-hover:text-stone-200 text-white" fill="currentColor" />
                  ),
                  submenu: chatHistory,
                  customColor: 'text-stone-200'
                }}
                isCollapsed={false}
                onMenuClick={() => setOpenHistory(!openHistory)}
                hasSubmenu={true}
                submenuOpen={openHistory}
              />
              {openHistory && chatHistory.map((session, index) => (
                <SessionHistoryItem
                  key={index}
                  session={session}
                  handleSession={() => handleSession(session.agent, session.session_key)}
                  handleEditSession={handleEditSession}
                  deleteSession={(e) => deleteSession(e, session)}
                  darkmode={true}
                />
              ))}
            </>
          )}
        </div>

        <div className={`flex ${isCollapsed ? 'w-12' : 'w-[225px]'} flex-col items-start gap-4 relative max-md:w-[175px]`}>
          {secondaryMenuItems.map((item) => (
            <SecondaryMenuItem
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              onMenuClick={handleMenuClick}
            />
          ))}
        </div>

        {/* Users Flyout Menu for Collapsed State */}
        <UsersFlyout
          isVisible={usersFlyoutVisible && isCollapsed}
          onClose={() => setUsersFlyoutVisible(false)}
          onMouseEnter={handleUsersHover}
          onMouseLeave={handleUsersLeave}
        />
      </nav>

      <InviteUserModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </>
  );
};
