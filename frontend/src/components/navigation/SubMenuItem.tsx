import React from "react";
import { NavLink } from "react-router-dom";

export type SubEntry = { id: string; label: string; to?: string };

type SubMenuItemProps = {
  isCollapsed: boolean;
  submenuOpen: boolean;
  items: SubEntry[];
  onMenuClick?: (itemId: string) => void;
};

export const SubMenuItem: React.FC<SubMenuItemProps> = ({
  isCollapsed,
  submenuOpen,
  items,
  onMenuClick,
}) => {
  if (isCollapsed || !submenuOpen) return null;
  const uniqueid = Math.random().toString(36).slice(2, 14);
  return (
    <ul className="ml-6 mt-2 space-y-1">
      {items.map((s, index) => (
        <li key={uniqueid + index}>
          {s.to ? (
            <NavLink
              to={s.to}
              end
              className={({ isActive }) =>
                `flex w-full items-center px-2 py-1.5 rounded-lg transition-colors group hover:bg-sidebar-accent ${isActive ? "bg-sidebar-accent text-white" : "text-white"}`
              }
            >
              <span className="text-sm font-medium group-hover:text-sidebar-primary transition-colors">
                {s.label}
              </span>
            </NavLink>
          ) : (
            <button
              onClick={() => onMenuClick?.(s.id, s)}
              className="flex w-full items-center px-2 py-1.5 rounded-lg transition-colors group hover:bg-sidebar-accent text-white"
            >
              <span className="text-sm font-medium group-hover:text-sidebar-primary transition-colors">
                {s.label}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};
