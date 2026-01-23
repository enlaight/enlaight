import React from 'react';
import { SecondaryMenuItemProps } from './types';

export const SecondaryMenuItem: React.FC<SecondaryMenuItemProps> = ({
  item,
  isCollapsed,
  onMenuClick
}) => {
  return (
    <button
      onClick={() => onMenuClick(item.id)}
      className={`flex ${
        isCollapsed ? 'w-12 justify-center px-1' : 'w-[225px] px-2'
      } items-center relative py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors max-md:w-[175px] group`}
      title={isCollapsed ? item.label : undefined}
    >
      <div className={`flex items-start ${
        isCollapsed ? 'justify-center' : 'gap-3 flex-1 min-w-0'
      } relative px-0 py-0.5`}>
        <div className="flex-shrink-0">
          {item.icon}
        </div>
        {!isCollapsed && (
          <span className="text-white text-base font-medium leading-5 relative max-sm:text-sm transition-colors break-words hyphens-auto whitespace-normal text-left block min-w-0 group-hover:text-brand-yellow-hover group-focus:text-brand-yellow-hover">
            {item.label}
          </span>
        )}
      </div>
    </button>
  );
};
