import React, { createContext, useCallback, useEffect, useState } from "react";
import type { RegisterPayload, User } from "@/types/auth";
import { tokenStore } from "@/services/api";
import { AuthService } from "@/services/AuthService";
import { listClients } from "@/services/ClientService";
import { listProjects } from "@/services/ProjectService";
import { useStore } from "@/store/useStore";

export type AuthContextType = {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const getAccess = () => tokenStore.access;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccess());

    // Token refresh is centrally handled by the API client interceptors.
    // Requests should use the centralized API client from src/services/api.ts

    const me = useCallback(async (): Promise<boolean> => {
        try {
            const data = await AuthService.me();
            setUser(data);
            return true;
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const ok = await me();
                if (mounted) setIsAuthenticated(ok);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [me]);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const data = await AuthService.login(email, password);
            setIsAuthenticated(!!data?.access);
            if (data?.user) setUser(data.user as User);
            else await me().catch(() => { });

            // Fetch clients and projects after successful login
            try {
                const [clientsData, projectsData] = await Promise.all([
                    listClients(),
                    listProjects(1, 100)
                ]);
                useStore.getState().update("clients", clientsData);
                useStore.getState().update("projects", projectsData.results || []);
            } catch (error) {
                console.error("Failed to fetch clients/projects:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const register = async (payload: RegisterPayload) => {
        setLoading(true);
        try {
            await AuthService.register(payload);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await AuthService.logout();
            tokenStore.clear();
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, isAuthenticated, isLoading, login, register, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}
