import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
// import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import UserDetail from "./pages/UserDetail";
// import UserManagement from "./pages/UserManagement";
import AddUsers from "./pages/AddUsers";
import BotManagement from "./pages/BotManagement";
import KnowledgeBases from "./pages/KnowledgeBases";
import ConfirmInvite from "./pages/ConfirmInvite";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { SearchProvider } from "./contexts/SearchContext";
import { FloatingSidebarToggle } from "./components/FloatingSidebarToggle";
import { Sidebar } from "./components/Sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import { useIsMobile } from "./hooks/use-mobile";
import { AgentsChatProvider, useAgentsChat } from "./contexts/AgentsChatContext";
import { RequireAuth, RedirectIfAuth } from "./routes/guards";
import MainLayout from "./pages/MainLayout";
import UserList from "./pages/UserList";
import AssistantList from "./pages/AssistantList";
import ProjectsList from "./pages/ProjectsList";
import ClientManagement from "./pages/ClientManagement";
import SearchPage from "./pages/SearchPage";
import Favorites from "./pages/Favorites";

function MobileGlobalSidebar() {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const agentsUseObj = useAgentsChat();

  // Hide sidebar on mobile when agents chat modal is open
  if (
    !isMobile || agentsUseObj.isModalOpen
  ) return null;

  return (
    <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} isCollapsed={false} onToggleCollapse={() => { }} />
  );
}

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AgentsChatProvider>
            <SearchProvider>
              <SidebarProvider>
                <BrowserRouter>
                  <Routes>

                    {/* Public - redirect if auth */}
                    <Route
                      path="/login"
                      element={
                        <RedirectIfAuth>
                          <Login />
                        </RedirectIfAuth>
                      }
                    />
                    <Route
                      path="/signup"
                      element={
                        <RedirectIfAuth>
                          <SignUp />
                        </RedirectIfAuth>
                      }
                    />
                    <Route
                      path="/forgot-password"
                      element={
                        <RedirectIfAuth>
                          <ForgotPassword />
                        </RedirectIfAuth>
                      }
                    />
                    <Route
                      path="/reset-password"
                      element={
                        <RedirectIfAuth>
                          <ResetPassword />
                        </RedirectIfAuth>
                      }
                    />
                    <Route
                      path="/confirm-invite"
                      element={<ConfirmInvite />}
                    />

                    {/* Routes wrapped in Header and Sidebar */}
                    <Route element={
                      <MainLayout />
                    }>
                      <Route
                        path="/"
                        element={
                          <RequireAuth>
                            <Index />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/search"
                        element={
                          <RequireAuth>
                            <SearchPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/favorites"
                        element={
                          <RequireAuth>
                            <Favorites />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/assistantmanagement"
                        element={
                          <RequireAuth>
                            <BotManagement />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/knowledgebases"
                        element={
                          <RequireAuth>
                            <KnowledgeBases />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/user/:id"
                        element={
                          <RequireAuth>
                            <UserDetail />
                          </RequireAuth>
                        }
                      />
                      {/* <Route
                        path="/usermanagement"
                        element={
                          <RequireAuth>
                            <UserManagement />
                          </RequireAuth>
                        }
                      /> */}
                      <Route
                        path="/userlist"
                        element={
                          <RequireAuth>
                            <UserList />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/assistantlist"
                        element={
                          <RequireAuth>
                            <AssistantList />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/projectslist"
                        element={
                          <RequireAuth>
                            <ProjectsList />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/clientmanagement"
                        element={
                          <RequireAuth>
                            <ClientManagement />
                          </RequireAuth>
                        }
                      />
                      <Route path="/addusers" element={
                        <RequireAuth>
                          <AddUsers />
                        </RequireAuth>
                      }
                      />
                    </Route>
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                  <MobileGlobalSidebar />
                  <FloatingSidebarToggle />
                </BrowserRouter>
              </SidebarProvider>
            </SearchProvider>
          </AgentsChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider >
  )
};
export default App;
