import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

type Props = { children: ReactNode };

export function RequireAuth({ children }: Props) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return null;
    return isAuthenticated ? (
        <>{children}</>
    ) : (
        <Navigate to="/login" replace state={{ from: location }} />
    );
}

export function RedirectIfAuth({ children }: Props) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return null;
    if (isAuthenticated) {
        const from = (location.state)?.from?.pathname || "/";
        return <Navigate to={from} replace />;
    }
    return <>{children}</>;
}
