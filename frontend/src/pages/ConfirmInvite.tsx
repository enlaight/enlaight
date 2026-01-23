import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { confirmInvite } from "@/services/InviteService";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ConfirmInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const email = searchParams.get("email");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!email || !token) {
      toast({
        title: "Invalid Link",
        description: "The confirmation link is invalid or missing parameters.",
        variant: "destructive",
      });
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    // Check for template variables that weren't replaced
    if (email.includes('{{') || email.includes('{%') || token.includes('{{') || token.includes('{%')) {
      toast({
        title: "Invalid Invitation Link",
        description: "The invitation email was not properly configured. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }
  }, [email, token, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!email || !token) {
      toast({
        title: "Error",
        description: "Missing required parameters",
        variant: "destructive",
      });
      return;
    }

    // Check for unprocessed template variables
    if (email.includes('{{') || email.includes('{%') || token.includes('{{') || token.includes('{%')) {
      toast({
        title: "Configuration Error",
        description: "The invitation system is not properly configured. Please contact your administrator to fix the email template.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await confirmInvite(email, token, password);
      setIsSuccess(true);
      toast({
        title: "Success!",
        description: "Your account has been activated successfully.",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to confirm invitation. The link may be expired.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !token) {
    return null;
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Account Activated!</CardTitle>
            <CardDescription>
              Your account has been successfully activated. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Confirm Your Invitation</CardTitle>
          <CardDescription>
            Set your password to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any);
              }}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
