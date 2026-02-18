import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Mail } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Member';
  status: 'active' | 'inactive';
  avatarUrl?: string;
  lastResetEmailAt?: string | Date;
  requirePasswordChange?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

interface SendResetEmailModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onEmailSent: (userId: string) => void;
}

const SendResetEmailModal = ({ open, onClose, user, onEmailSent }: SendResetEmailModalProps) => {
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const canSendEmail = () => {
    if (!user?.email) return false;

    // Check cooldown - if email was sent in last 5 minutes
    if (user.lastResetEmailAt) {
      const lastSent = new Date(user.lastResetEmailAt);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return lastSent < fiveMinutesAgo;
    }

    return true;
  };

  const getTimeUntilCanSend = () => {
    if (!user?.lastResetEmailAt) return 0;

    const lastSent = new Date(user.lastResetEmailAt);
    const fiveMinutesLater = new Date(lastSent.getTime() + 5 * 60 * 1000);
    const now = new Date();

    return Math.max(0, Math.ceil((fiveMinutesLater.getTime() - now.getTime()) / 60000));
  };

  const handleSendEmail = async () => {
    if (!user || !canSendEmail()) return;

    setIsLoading(true);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock reference code
      const referenceCode = `RST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      onEmailSent(user.id);

      toast({
        title: "Reset email sent",
        description: `Reset email sent to ${user.email}. Reference: ${referenceCode}`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const minutesUntilCanSend = getTimeUntilCanSend();

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Password Reset Email
          </DialogTitle>
          <DialogDescription>
            We'll email a secure link for setting a new password. The link expires in 60 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">ID: {user.id}</p>
            </div>
          </div>

          {/* Email validation error */}
          {!user.email && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">User has no valid email address</span>
            </div>
          )}

          {/* Cooldown warning */}
          {minutesUntilCanSend > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Email was recently sent. Try again in {minutesUntilCanSend} minute{minutesUntilCanSend !== 1 ? 's' : ''}.
              </span>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">Custom message (optional)</Label>
            <Textarea
              id="custom-message"
              placeholder="Add a personal note to include with the reset email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!canSendEmail() || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendResetEmailModal;
