import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AuthService } from '@/services/AuthService';
import { User, Mail, Briefcase, Building, Calendar, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchUserData = async () => {
        setIsLoading(true);
        try {
          const data = await AuthService.me();
          setUserData(data);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isOpen]);

  const getInitials = () => {
    if (userData?.first_name && userData?.last_name) {
      return `${userData.first_name[0]}${userData.last_name[0]}`.toUpperCase();
    }
    if (userData?.username) {
      return userData.username.slice(0, 2).toUpperCase();
    }
    if (userData?.email) {
      return userData.email[0].toUpperCase();
    }
    return 'U';
  };

  const getFullName = () => {
    if (userData?.first_name || userData?.last_name) {
      return `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();
    }
    return userData?.username || 'User';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profileModal.title')}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">{t('profileModal.loading')}</div>
          </div>
        ) : userData ? (
          <div className="space-y-6">
            {/* Avatar and Name Section */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userData.avatar || ''} alt={getFullName()} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{getFullName()}</h3>
                {userData.username && (
                  <p className="text-sm text-muted-foreground">@{userData.username}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* User Details */}
            <div className="space-y-4">
              {userData.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('profileModal.email')}</p>
                    <p className="text-sm text-muted-foreground">{userData.email}</p>
                  </div>
                </div>
              )}

              {userData.role && (
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('profileModal.role')}</p>
                    <Badge variant="secondary" className="mt-1">
                      {userData.role}
                    </Badge>
                  </div>
                </div>
              )}

              {userData.job_title && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('profileModal.jobTitle')}</p>
                    <p className="text-sm text-muted-foreground">{userData.job_title}</p>
                  </div>
                </div>
              )}

              {userData.department && (
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('profileModal.department')}</p>
                    <p className="text-sm text-muted-foreground">{userData.department}</p>
                  </div>
                </div>
              )}

              {userData.date_joined && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('profileModal.memberSince')}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(userData.date_joined)}</p>
                  </div>
                </div>
              )}

              {userData.is_active !== undefined && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('profileModal.accountStatus')}</p>
                    <Badge variant={userData.is_active ? "default" : "destructive"} className="mt-1">
                      {userData.is_active ? t('profileModal.active') : t('profileModal.inactive')}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t('profileModal.failedToLoad')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
