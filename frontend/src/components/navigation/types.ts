export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  hasSubmenu?: boolean;
  submenuOpen?: boolean;
  disabled?: boolean;
  customColor?: string;
}

export interface NavigationMenuProps {
  isCollapsed?: boolean;
}

export interface MenuItemProps {
  item: MenuItem;
  isCollapsed: boolean;
  onMenuClick: (itemId: string) => void;
  submenuOpen: boolean;
  hideSubMenu?: boolean;
}

export interface SubMenuItemProps {
  isCollapsed: boolean;
  submenuOpen: boolean;
  items: Array<{ id: string; label: string; to?: string }>;
  onMenuClick?: (itemId: string) => void;
}

export interface SecondaryMenuItemProps {
  item: Omit<MenuItem, 'hasSubmenu' | 'submenuOpen'>;
  isCollapsed: boolean;
  onMenuClick: (itemId: string) => void;
}
