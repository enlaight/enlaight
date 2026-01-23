import type { TFunction } from 'i18next';
import { Settings } from 'lucide-react';
import { EnlaightBot, FavoriteChat, Logout, SearchChat, StartChat } from '@/assets/svgs';

export const getMenuItems = (activeItem: string, t: TFunction) => {
  return [
    {
      id: "home",
      label: t('nav.newChat'),
      isActive: activeItem === "home",
      icon: (
        <StartChat size={20} className={`group-hover:text-brand-yellow ${activeItem === "home" ? "text-brand-yellow" : "text-white"}`} fill="currentColor" />
      )
    },
    {
      id: "agents",
      label: t('navigation.agents'),
      isActive: activeItem === "agents",
      icon: (
        <EnlaightBot size={20} className={`group-hover:text-brand-yellow ${activeItem === "agents" ? "text-brand-yellow" : "text-white"}`} fill="currentColor" />
      ),
      hasSubmenu: true,
    },
    {
      id: "search-chat",
      label: t('navigation.searchChat'),
      isActive: activeItem === "search-chat",
      disabled: false,
      icon: (
        <SearchChat size={20} className={`group-hover:text-brand-yellow ${activeItem === "search-chat" ? "text-brand-yellow" : "text-white"}`} fill="currentColor" />
      )
    },
    {
      id: "favorites",
      label: t('navigation.favorites'),
      isActive: activeItem === "favorites",
      disabled: false,
      icon: (
        <FavoriteChat size={20} className={`group-hover:text-brand-yellow ${activeItem === "favorites" ? "text-brand-yellow" : "text-white"}`} fill="currentColor" />
      )
    },
    {
      id: "users",
      label: t('navigation.users'),
      isActive: activeItem === "users",
      adminOnly: true,
      hasSubmenu: true,
      icon: (
        <Settings size={18} className={`group-hover:text-brand-yellow ${activeItem === "users" ? "text-brand-yellow" : "text-white"}`} />
      ),
      submenu: [
        { id: "knowledgebases", label: t('navigation.knowledgeBases'), to: "/knowledgebases" },
        { id: "users-projects", label: t('navigation.projects') },
        { id: "agents-management", label: t('navigation.agentManagement'), to: "/assistantmanagement" },
        { id: "client-management", label: t('navigation.clientManagement'), to: "/clientmanagement" },
        // { id: "users-management", label: t('nav.userManagement'), to: "/usermanagement" },
        { id: "users-list", label: t('navigation.usersList'), to: "/userlist" },
        { id: "invite", label: t('navigation.invite') },
      ]
    },
  ];
};

export const secondaryMenuItems = [
  {
    id: "logout",
    label: "Log out",
    icon: (
      <Logout size={20} className="transition-colors group-hover:fill-brand-yellow-hover group-focus:fill-brand-yellow-hover" fill="white" />
    )
  }
];

// Create a functional component that uses translations for secondary menu
export const getSecondaryMenuItems = (t: TFunction) => {
  return [
    {
      id: "logout",
      label: t('navigation.logout'),
      icon: (
        <Logout size={20} className="transition-colors group-hover:fill-brand-yellow-hover group-focus:fill-brand-yellow-hover" fill="white" />
      )
    }
  ];
};
