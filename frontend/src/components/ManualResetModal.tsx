import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Member';
  status: 'active' | 'inactive';
  avatarUrl?: string;
  requirePasswordChange?: boolean;
  createdAt: string;
  updatedAt: string;
};

interface ManualResetModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onPasswordReset: (userId: string, requireChange: boolean) => void;
}

const ManualResetModal = ({ open, onClose, user, onPasswordReset }: ManualResetModalProps) => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [requireChange, setRequireChange] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 4) return { strength: 0, label: 'Very Weak', color: 'bg-red-500' };
    if (password.length < 6) return { strength: 1, label: 'Weak', color: 'bg-orange-500' };
    if (password.length < 8) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };

    let score = 2;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score >= 4) return { strength: 4, label: 'Strong', color: 'bg-green-500' };
    return { strength: 3, label: 'Good', color: 'bg-blue-500' };
  };

  const isFormValid = () => {
    return newPassword.length >= 8 &&
      newPassword === confirmPassword &&
      acknowledged;
  };

  const handleReset = () => {
    if (!isFormValid()) return;
    setShowConfirmation(true);
  };

  const handleConfirmReset = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onPasswordReset(user.id, requireChange);

      toast({
        title: "Password reset successfully",
        description: `Password reset for ${user.name}.`,
      });

      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      setAcknowledged(false);
      setRequireChange(true);
      setShowConfirmation(false);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setAcknowledged(false);
      setRequireChange(true);
      onClose();
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {showConfirmation ? "Confirm Password Reset" : "Manually Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? `Are you sure you want to reset the password for ${user.name}?`
              : "Create a new password for this user account."
            }
          </DialogDescription>
        </DialogHeader>

        {showConfirmation ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will immediately change the user's password and they will need to use the new password to log in.
              </AlertDescription>
            </Alert>

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
          </div>
        ) : (
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

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {/* Password Strength */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength</span>
                    <span className={`font-medium ${passwordStrength.strength < 2 ? 'text-red-600' :
                        passwordStrength.strength < 4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength + 1) * 20}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require-change"
                  checked={requireChange}
                  onCheckedChange={(checked) => setRequireChange(checked === true)}
                />
                <Label htmlFor="require-change" className="text-sm">
                  Require password change at next login
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                />
                <Label htmlFor="acknowledge" className="text-sm leading-relaxed">
                  I understand this immediately changes the user's password
                </Label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {showConfirmation ? "Back" : "Cancel"}
          </Button>
          <Button
            onClick={showConfirmation ? handleConfirmReset : handleReset}
            disabled={showConfirmation ? isLoading : !isFormValid()}
            variant={showConfirmation ? "destructive" : "default"}
            className="min-w-[120px]"
          >
            {isLoading ? "Resetting..." : showConfirmation ? "Confirm Reset" : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualResetModal;
