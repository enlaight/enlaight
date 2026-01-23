import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User, Image as ImageIcon, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const Signup = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { register, isLoading } = useAuth();

    const [form, setForm] = useState<{
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        password: string;
        avatar: File | null;
    }>({
        email: "",
        username: "",
        first_name: "",
        last_name: "",
        password: "",
        avatar: null,
    });

    const [preview, setPreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

    const onChangeFile = (file: File | null) => {
        setForm((f) => ({ ...f, avatar: file }));
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        } else {
            setPreview(null);
        }
    };

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
        if (!form.username) e.username = "Username is required";
        if (form.password.length < 8) e.password = "Min. 8 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    };


    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;

        try {
            await register(form);
            toast({ title: "Account created 🎉", description: "You can now sign in." });
            navigate("/login");
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                Object.values(err?.response?.data ?? {})?.[0]?.[0] ||
                "Could not create account";
            toast({ title: "Sign up failed", description: String(msg), variant: "destructive" });
        }
    };
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-200">
            <div className="w-full max-w-md">
                <Card className="border-border shadow-lg">
                    <CardHeader className="space-y-2 text-center">
                        <div className="flex justify-center mb-2 py-0 pt-4">
                            <img
                                src="/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png"
                                alt="ENLAIGHT"
                                className="h-12 w-auto"
                            />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-foreground">Create account</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Fill in your details to get started
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                        required
                                    />
                                </div>
                                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="username"
                                        placeholder="your_username"
                                        className={`pl-10 ${errors.username ? "border-destructive" : ""}`}
                                        value={form.username}
                                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                        required
                                    />
                                </div>
                                {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First name</Label>
                                    <Input
                                        id="first_name"
                                        placeholder="First name"
                                        className={errors.first_name ? "border-destructive" : ""}
                                        value={form.first_name}
                                        onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                                    />
                                    {errors.first_name && (
                                        <p className="text-sm text-destructive">{errors.first_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last name</Label>
                                    <Input
                                        id="last_name"
                                        placeholder="Last name"
                                        className={errors.last_name ? "border-destructive" : ""}
                                        value={form.last_name}
                                        onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                                    />
                                    {errors.last_name && (
                                        <p className="text-sm text-destructive">{errors.last_name}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="At least 8 characters"
                                        className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                                        value={form.password}
                                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                        required
                                    />
                                </div>
                                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="avatar">Avatar (optional)</Label>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Input
                                            id="avatar"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => onChangeFile(e.target.files?.[0] ?? null)}
                                        />
                                    </div>
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                {preview && (
                                    <img
                                        src={preview}
                                        alt="preview"
                                        className="mt-2 h-16 w-16 rounded-full object-cover border"
                                    />
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    "Create account"
                                )}
                            </Button>

                            <div className="mt-2 text-center text-sm">
                                <span className="text-muted-foreground">Already have an account? </span>
                                <Link to="/login" className="text-primary hover:underline font-medium">
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Signup;
