import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestPasswordReset } from '@/services/PasswordService';

const ForgotPassword = () => {
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors: { email?: string } = {};

    if (!validateEmail(email)) {
      formErrors.email = 'Please enter a valid email address';
    }
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setLoading(true);
      try {
        await requestPasswordReset(email);
        setEmailSent(true);
        toast({
          title: "Reset Email Sent",
          description: "If an account with this email exists, you'll receive a password reset link.",
        });
      } catch (err: any) {
        toast({
          title: "Error!",
          description: err,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-200">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2 py-0 pt-4">
              <img src="/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png" alt="ENLAIGHT" className="h-12 w-auto" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-foreground">
                {emailSent ? 'Check Your Email' : 'Forgot Password'}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {emailSent
                  ? 'We\'ve sent a password reset link to your email address'
                  : 'Enter your email address and we\'ll send you a link to reset your password'
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    'Send Reset Email'
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  If you don't see the email in your inbox, please check your spam folder.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                    setErrors({});
                  }}
                >
                  Try Different Email
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <Link
                to="/login"
                className="flex items-center justify-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
