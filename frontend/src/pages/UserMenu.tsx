import { useMemo } from "react";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/lib/constants";

// UserMenu.tsx
const API_BASE = API_BASE_URL;

const ORIGIN = new URL(API_BASE).origin;

function resolveMedia(url?: string | null) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    // se vier "/media/avatars/..." => usa o ORIGIN (sem /api)
    return `${ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function UserMenu() {
    const { user, logout, isLoading } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate("/login", { replace: true });
        }
    };
    const fullName = useMemo(() => {
        const fn = (user?.first_name || "").trim();
        const ln = (user?.last_name || "").trim();
        return (fn && ln ? `${fn} ${ln}` : fn || ln) || user?.username || user?.email || "";
    }, [user]);

    function toInitials(name?: string) {
        if (!name) return "U";
        const parts = name.trim().split(/\s+/);
        const i1 = parts[0]?.[0] ?? "";
        const i2 = parts[1]?.[0] ?? "";
        return (i1 + i2 || i1 || "U").toUpperCase();
    }


    const avatarUrl = resolveMedia(user?.avatar);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="gap-2 px-2 h-10"
                    aria-label={fullName ? `Open menu for ${fullName}` : "Open user menu"}
                >
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={avatarUrl}
                                alt={fullName || "User avatar"}
                                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "")}
                            />
                            <AvatarFallback className="uppercase text-sm">
                                {toInitials(fullName)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                            {isLoading ? (
                                <>
                                    <span className="h-3 w-24 rounded bg-muted-foreground/20 animate-pulse mb-1" />
                                    <span className="h-2.5 w-32 rounded bg-muted-foreground/15 animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-medium truncate max-w-[160px]">
                                            {fullName || "User"}
                                        </span>
                                        {!!user?.role && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide shrink-0">
                                                {user.role}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {user?.email ?? ""}
                                    </span>
                                </>
                            )}
                        </div>

                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                </Button>
            </DropdownMenuTrigger>



            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl} alt={fullName} />
                        <AvatarFallback>{toInitials(fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{fullName}</span>
                        <span className="text-xs text-muted-foreground">{user?.role}</span>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {/* navegar p/ /settings ou /profile */ }}>
                    <UserIcon className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* navegar p/ /settings */ }}>
                    <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
