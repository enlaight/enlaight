import React from 'react';
import { Button } from '@/components/ui/button';

interface UsersFlyoutProps {
  isVisible: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const UsersFlyout: React.FC<UsersFlyoutProps> = ({
  isVisible,
  onClose,
  onMouseEnter,
  onMouseLeave
}) => {
  const handleItemClick = (item: string) => {
    // console.log(`Clicked: ${item}`);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Flyout Menu */}
      <div
        className="fixed left-16 top-48 z-50 w-48 bg-sidebar border border-sidebar-border rounded-lg shadow-lg p-2"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => handleItemClick('Users')}
          >
            Users
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => handleItemClick('Projects')}
          >
            Projects
          </Button>
        </div>
      </div>
    </>
  );
};
