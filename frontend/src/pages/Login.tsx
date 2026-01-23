import { useState } from "react";
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18-utils';
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: t('login.loginSuccessTitle'), description: t('login.loginSuccessDesc'), variant: "success" });

      // Redirect to the original page they were trying to access, or home if none
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      toast({
        title: t('login.loginFailedTitle'),
        description: err?.message || t('login.invalidCredentials'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-[#f4f4f5] px-6 sm:px-12 lg:px-20">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold text-gray-900">{t('login.welcome')}</h1>
            <p className="text-gray-500">{t('login.pleaseLogin')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#fbbd23] hover:bg-[#f8b400] text-black font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.login')
              )}
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-700 hover:underline"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div
        className="hidden md:flex w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: "url('/login-image.jpg')",
        }}
      >
        <div className="absolute top-6 right-6">
          <div className="relative group">
            <div className="relative">
              <button className="flex items-center gap-2 bg-[#fbbd23] text-black font-semibold rounded-lg px-3 py-1 text-sm">
                {i18n.language?.toUpperCase()}
                <span className="text-lg">🌐</span>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <ul className="text-sm">
                  {[
                    { code: 'en', label: 'English 🇺🇸' },
                    { code: 'es', label: 'Español 🇪🇸' },
                    { code: 'pt', label: 'Português 🇧🇷' },
                    { code: 'kk', label: "қазақ тілі 🇰🇿" },
                    { code: 'ru', label: 'Русский 🇷🇺' },
                    { code: 'uz', label: "O'zbek 🇺🇿" },
                  ].map((lang) => (
                    <li
                      key={lang.code}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => i18n.changeLanguage(lang.code)}
                    >
                      {lang.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-10">
          <img
            src="/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png"
            alt="ENLAIGHT"
            className="h-10 w-auto"
          />
        </div>
      </div>
    </div>
  );
};
export default Login;
