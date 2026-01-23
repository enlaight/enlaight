import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Link as LinkIcon, UserSearch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { listUsers } from "@/services/UserService";
import { listProjects } from "@/services/ProjectService";
import { ProjectService } from "@/services/ProjectService";
import type { User } from "@/types/user";
import type { Project } from "@/types/project";
import { UserDisplayItem } from "@/components/UserDisplayItem";
import { useBatchTranslation } from "@/hooks/use-batch-translation";
import api from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import { t } from "i18next";
import LoadingAnimation from "@/components/LoadingAnimation";

const PAGE_SIZE = 10;

const handleLoginAs = async (userId: string, navigate: ReturnType<typeof useNavigate>) => {
  try {
    const response = await api.get(`/login-as/${userId}/`);

    if (!response.data || !response.data.access || !response.data.refresh) {
      throw new Error("Invalid response from server");
    }

    localStorage.setItem("accessToken", response.data.access);
    localStorage.setItem("refreshToken", response.data.refresh);
    localStorage.setItem("enlaight_access_token", response.data.access);
    localStorage.setItem("enlaight_refresh_token", response.data.refresh);

    api.defaults.headers["Authorization"] = `Bearer ${response.data.access}`;

    window.location.reload();
  } catch (error) {
    alert("Error during 'Login As'");
  } finally {
    navigate("/", { replace: true });
  }
};


type ProjectOption = { id: string; name: string; client_id?: string | null };

function AttachUserToProjectsModal({
  open,
  onOpenChange,
  projects,
  onConfirm,
  userId,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: ProjectOption[];
  onConfirm: (projectIds: string[]) => Promise<void> | void;
  userId: string;
  userEmail: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filteredProjects, setFilteredProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setFilteredProjects([]);
    } else {
      fetchAndFilterProjects();
    }
  }, [open, projects, userId, userEmail]);

  const fetchAndFilterProjects = async () => {
    try {
      setLoading(true);
      // Get target user's client_id using search
      const userResponse = await api.get(`/users/?search=${encodeURIComponent(userEmail)}`);
      const userData = userResponse.data?.results?.[0];
      const targetClientId = userData?.client_id;

      // Filter projects: only show if project's client_id matches target user's client_id
      const filtered = projects.filter((project) => {
        return project.client_id === targetClientId;
      });

      setFilteredProjects(filtered);
    } catch (error) {
      console.error("Error filtering projects:", error);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id);
      }
      return next;
    });

  const confirm = async () => {
    await onConfirm(Array.from(selected));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('attachUserToProjects.title')}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('attachUserToProjects.loading')}</div>
          ) : (
            <>
              {filteredProjects.map((p) => (
                <label key={p.id} className="flex items-center gap-3 py-1">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
              {filteredProjects.length === 0 && (
                <div className="text-sm text-muted-foreground">{t('attachUserToProjects.noProjects')}</div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('attachUserToProjects.cancel')}</Button>
          <Button disabled={selected.size === 0 || loading} onClick={confirm}>
            <LinkIcon className="h-4 w-4 mr-2" />{t('attachUserToProjects.attach')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const UserList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [count, setCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // attach/detach state
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [attachPicker, setAttachPicker] = useState<{ open: boolean; userId: string }>({ open: false, userId: "" });
  const [detachTarget, setDetachTarget] = useState<{ userId: string; projectId: string }>({ userId: "", projectId: "" });

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => setPage(1), [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch users first so the modal always shows results even if projects fail (e.g., 401)
        const userPage = await listUsers(page, PAGE_SIZE, debouncedSearch || undefined);

        if (!cancelled) {
          const results = Array.isArray(userPage?.results) ? userPage.results : [];
          const total = Number.isFinite(userPage?.count) ? userPage.count : results.length;
          setCount(total);
          setUsers(results);
        }

        // Fetch projects in a best-effort way; ignore errors so they don't block users
        try {
          const projPage = await listProjects(1, 200);
          if (!cancelled) {
            const projectOpts: ProjectOption[] = (projPage?.results ?? []).map((p: Project) => ({
              id: p.id,
              name: p.name,
              client_id: p.client_id,
            }));
            setProjectOptions(projectOpts);
          }
        } catch {
          if (!cancelled) setProjectOptions([]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Error fetching users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const usersForUI = useMemo(
    () =>
      (users ?? []).map((u) => {
        const name =
          `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
          u.username ||
          "—";
        // se o back já retorna projects no usuário, usamos
        const projects = Array.isArray(u.projects) ? u.projects : [];
        return {
          raw: u,
          id: String(u.id ?? ""),
          name,
          email: u.email ?? "—",
          role: u.job_title ?? u.role ?? "—",
          avatar: u.avatar ?? null,
          status: u.is_active ? "active" : "inactive",
          department: u.department ?? "—",
          joinDate: u.date_joined ?? null,
          projects,
        };
      }),
    [users]
  );

  // Collect all texts that need translation
  const textsToTranslate = useMemo(() => {
    const texts: string[] = [];
    usersForUI.forEach(user => {
      if (user.role && user.role !== "—") texts.push(user.role);
      if (user.department && user.department !== "—") texts.push(user.department);
      user.projects.forEach(project => {
        // @ts-expect-error: in project type
        if (project.name) texts.push(project.name);
      });
    });
    return texts;
  }, [usersForUI]);

  // Get translations for all texts in one batch
  const { getTranslation, loading: translationLoading } = useBatchTranslation(textsToTranslate, "users");

  const getInitials = (name: string) =>
    name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const getStatusColor = (status: string) =>
    status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";

  // helpers de attach/detach
  const reloadUsers = async () => {
    const data = await listUsers(page, PAGE_SIZE, debouncedSearch || undefined);
    setUsers(Array.isArray(data?.results) ? data.results : []);
    setCount(Number.isFinite(data?.count) ? data.count : (data?.results ?? []).length);
  };

  const attachUserToMany = async (userId: string, projectIds: string[]) => {
    await Promise.all(projectIds.map((pid) => ProjectService.attachUsers(pid, [userId])));
    await reloadUsers();
  };

  const doDetach = async () => {
    if (!detachTarget.userId || !detachTarget.projectId) return;
    await ProjectService.detachUsers(detachTarget.projectId, [detachTarget.userId]);
    await reloadUsers();
    setDetachTarget({ userId: "", projectId: "" });
  };

  return (
    <>
      <main className="container mt-5"
        role="main"
        aria-label="User Directory"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserSearch className="h-6 w-6 text-primary" />
                {t('listUsers.title')}
              </h1>
              <p className="text-gray-600 text-sm">{t('listUsers.titleDesc')}</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('listUsers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status */}
          {loading && (
            <div className="flex justify-center items-center py-12 pt-[8rem]">
              <LoadingAnimation
                text={t('listUsers.loading')}
                icon={
                  <UserSearch className="h-[100px] w-[100px] text-primary" />
                }
              />
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600">Error: {error}</div>
          )}

          {/* Lista */}
          {!loading && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {count} user{count !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="grid gap-3 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg">
                {usersForUI.map((user) => (
                  <UserDisplayItem
                    key={user.id}
                    // @ts-expect-error: in user type
                    user={user}
                    onLoginAs={(userId) => handleLoginAs(userId, navigate)}
                    onAttachProjects={(userId) => setAttachPicker({ open: true, userId })}
                    detachTarget={detachTarget}
                    onSetDetachTarget={setDetachTarget}
                    onDetach={doDetach}
                    getInitials={getInitials}
                    getStatusColor={getStatusColor}
                    getTranslation={getTranslation}
                  />
                ))}
              </div>

              {usersForUI.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground">Try adjusting your search criteria to find users.</p>
                </div>
              )}
            </div>
          )}

          {/* Paginação */}
          {!loading && !error && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {t('listUsers.pageOf', { current: page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('listUsers.previous')}</Button>
                <Button variant="default" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t('listUsers.next')}</Button>
              </div>
            </div>
          )}
        </div>
        {/* Modal de attach */}
        <AttachUserToProjectsModal
          open={attachPicker.open}
          onOpenChange={(v) => setAttachPicker((s) => ({ ...s, open: v }))}
          projects={projectOptions}
          onConfirm={(projectIds) => attachUserToMany(attachPicker.userId, projectIds)}
          userId={attachPicker.userId}
          userEmail={users.find(u => u.id === attachPicker.userId)?.email || ""}
        />
      </main>
    </>
  );
};

export default UserList;
