import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthService } from '@/services/AuthService';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { ProfileModal } from '@/components/ProfileModal';
import { useTranslation } from 'react-i18next';

export const UserDropdown: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await AuthService.me();
        setUserData(response);
      } catch (error) { }
    };
    getUserData();
  }, []); // Empty dependency array to run once on component mount

  const handleMenuClick = async (action: string) => {
    if (action === 'profile') {
      setIsProfileModalOpen(true);
    } else if (action === 'logout') {
      try {
        await logout();
      } finally {
        navigate("/login", { replace: true });
      }
    }
  };

  return (
    <>
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={userData?.avatar || ""}
                  alt="User avatar"
                />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {userData?.username?.[0]?.toUpperCase() || userData?.email?.[0]?.toUpperCase() || ''}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 bg-popover border-none"
          align="end"
          forceMount
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium text-sm">{userData?.full_name || userData?.username || ''}</p>
              <p className="text-xs text-muted-foreground">
                {userData?.email || ''}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => handleMenuClick('profile')}
          >
            {t('userDropdown.yourProfile')}
          </DropdownMenuItem>
          {/* <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleMenuClick('settings')}
        >
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleMenuClick('license')}
        >
          License
        </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => handleMenuClick('logout')}
          >
            {t('userDropdown.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
