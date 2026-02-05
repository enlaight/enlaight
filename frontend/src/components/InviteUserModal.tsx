import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listClients } from "@/services/ClientService";
import { listProjects } from "@/services/ProjectService";
import { sendInvite, type InvitePayload, type InviteErrorResponse } from "@/services/InviteService";
import { AuthService } from "@/services/AuthService";
import type { Client } from "@/types/client";
import type { Project } from "@/types/project";
import type { User, UserRole } from "@/types/user";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

type FieldError = {
  email?: string;
  role?: string;
  client_id?: string;
  project_id?: string;
};

export const InviteUserModal = ({ open, onOpenChange, onInviteSent }: InviteUserModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Current user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("USER");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  // Data state
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  // UI state
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [generalError, setGeneralError] = useState("");

  // Available roles based on inviter role
  const availableRoles: { value: UserRole; label: string }[] = isAdmin
    ? [
      { value: "ADMINISTRATOR", label: "Administrator" },
      { value: "MANAGER", label: "Manager" },
      { value: "USER", label: "User" },
    ]
    : [
      { value: "MANAGER", label: "Manager" },
      { value: "USER", label: "User" },
    ];

  // Initialize: Load user data and determine role
  useEffect(() => {
    if (open) {
      loadUserAndData();
    } else {
      resetForm();
    }
  }, [open]);

  // Auto-select client when project is selected (Admin only)
  useEffect(() => {
    if (isAdmin && selectedProject && clients.length > 0 && projects.length > 0) {
      const project = projects.find((p) => p.id === selectedProject);
      if (project) {
        // Find client by name match (API returns client name as string)
        const clientName = typeof project.client === "string"
          ? project.client
          : project.client?.name;

        if (clientName) {
          const matchingClient = clients.find((c) => c.name === clientName);
          if (matchingClient && matchingClient.id !== selectedClient) {
            setSelectedClient(matchingClient.id);
          }
        }
      }
    }
  }, [selectedProject, projects, clients, isAdmin, selectedClient]);

  const loadUserAndData = async () => {
    setIsLoadingUser(true);
    setGeneralError("");

    try {
      // Step 1: Get current user info
      const user = await AuthService.me();
      setCurrentUser(user);

      const admin = user.role === "ADMINISTRATOR";
      const manager = user.role === "MANAGER";

      setIsAdmin(admin);
      setIsManager(manager);

      if (admin) {
        await loadAdminData();
      } else if (manager) {
        await loadManagerData(user);
      } else {
        setGeneralError("You don't have permission to invite users.");
      }
    } catch (error: any) {
      console.error("Error loading user data:", error);
      setGeneralError("Failed to load user information. Please try again.");
    } finally {
      setIsLoadingUser(false);
    }
  };

  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      const [clientsData, projectsData] = await Promise.all([
        listClients(),
        listProjects(1, 1000),
      ]);

      setClients(clientsData || []);
      setProjects(projectsData.results || []);
    } catch (error: any) {
      console.error("Error loading admin data:", error);
      setGeneralError("Failed to load clients and projects.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadManagerData = async (user: User) => {
    setIsLoadingData(true);
    try {
      // Pre-fill client from user's client_id
      if (user.client_id) {
        setSelectedClient(user.client_id);
      }

      // Load projects
      const projectsData = await listProjects(1, 1000);
      let managerProjects = projectsData.results || [];

      // Filter to only projects the manager belongs to (if available)
      if (user.projects && user.projects.length > 0) {
        managerProjects = managerProjects.filter((p) => user.projects?.includes(p.id));
      }

      setProjects(managerProjects);
    } catch (error: any) {
      console.error("Error loading manager data:", error);
      setGeneralError("Failed to load projects.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setSelectedRole("USER");
    setSelectedClient("");
    setSelectedProject("");
    setFieldErrors({});
    setGeneralError("");
  };

  const validateForm = (): boolean => {
    const errors: FieldError = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!selectedRole) {
      errors.role = "Role is required";
    }

    if (isAdmin && !selectedClient) {
      errors.client_id = "Client is required";
    }

    if (!selectedProject) {
      errors.project_id = "Project is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: InvitePayload = {
        email: email.trim(),
        role: selectedRole,
        project_id: selectedProject,
      };

      // Include client_id for Admin
      if (isAdmin && selectedClient) {
        payload.client_id = selectedClient;
      }

      await sendInvite(payload);

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email}`,
      });

      onInviteSent?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error sending invite:", error);

      // Handle field-level errors
      if (error.response?.status === 400 || error.response?.status === 422) {
        const errorData: InviteErrorResponse = error.response.data;

        if (errorData.field && errorData.error) {
          // Field-specific error
          setFieldErrors({
            [errorData.field]: errorData.error,
          });
        } else if (errorData.message) {
          // Generic message
          setGeneralError(errorData.message);
        } else {
          setGeneralError("Invalid request. Please check your inputs.");
        }
      } else if (error.response?.status >= 500) {
        // Server error
        toast({
          title: "Server error",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        });
      } else {
        // Network or unknown error
        toast({
          title: "Error",
          description: error.message || "Failed to send invitation. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingUser || isLoadingData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="invite-user-desc">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        <DialogDescription id="invite-user-desc" className="sr-only">
          Modal to invite a user to the system.
        </DialogDescription>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : generalError && !currentUser ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                disabled={isSubmitting}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value: UserRole) => {
                  setSelectedRole(value);
                  setFieldErrors((prev) => ({ ...prev, role: undefined }));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.role && (
                <p className="text-sm text-destructive">{fieldErrors.role}</p>
              )}
            </div>

            <div className="space-y-2" id='invite-user-modal'>
              <Label htmlFor="project">
                Project <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedProject}
                onValueChange={(value) => {
                  setSelectedProject(value);
                  setFieldErrors((prev) => ({ ...prev, project_id: undefined }));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.project_id && (
                <p className="text-sm text-destructive">{fieldErrors.project_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">
                Client {isAdmin && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={selectedClient}
                onValueChange={(value) => {
                  setSelectedClient(value);
                  setFieldErrors((prev) => ({ ...prev, client_id: undefined }));
                }}
                disabled={isManager || isSubmitting || (isAdmin && !!selectedProject)}
              >
                <SelectTrigger id="client">
                  <SelectValue
                    placeholder={
                      isManager
                        ? "Assigned from your account"
                        : selectedProject
                          ? "Auto-selected from project"
                          : "Select client"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.client_id && (
                <p className="text-sm text-destructive">{fieldErrors.client_id}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
