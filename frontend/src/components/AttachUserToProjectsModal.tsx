import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";

export type ProjectOption = { id: string; name: string; client_id?: string | null };

type RawProject = { id: string; name: string; client?: string | { id: string }; client_id?: string | null };

export function AttachUserToProjectsModal({
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
    const { t } = useTranslation();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [filteredProjects, setFilteredProjects] = useState<ProjectOption[]>([]);
    const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            setSelected(new Set());
            setFilteredProjects([]);
            setAllProjects([]);
        }
    }, [open]);


    useEffect(() => {
        if (!open || allProjects.length === 0) return;
        const clientIds = Array.from(new Set(allProjects.map(p => p.client_id).filter(Boolean)));
    }, [open, allProjects]);

    const fetchAndFilterProjects = useCallback(async () => {
        try {
            setLoading(true);
            const userResponse = await api.get(`/users/?search=${encodeURIComponent(userEmail)}`);
            const userData = userResponse.data?.results?.[0];
            const targetClientId: string | undefined = userData?.client_id ? String(userData.client_id) : undefined;

            const pageSize = 1000;
            const { data } = await api.get("/projects/", { params: { page: 1, page_size: pageSize } });
            const raw: RawProject[] = data?.results ?? [];

            const normalized: ProjectOption[] = raw.map(p => {
                const resolvedClientId = p.client_id ?? (typeof p.client === 'string' ? p.client : p.client?.id) ?? null;
                return { id: p.id, name: p.name, client_id: resolvedClientId ? String(resolvedClientId) : null };
            });
            setAllProjects(normalized);

            const filtered = targetClientId
                ? normalized.filter(p => p.client_id === targetClientId)
                : [];
            setFilteredProjects(filtered);

        } catch (error) {
            setFilteredProjects([]);
            setAllProjects([]);
        } finally {
            setLoading(false);
        }
    }, [userEmail]);

    useEffect(() => {
        if (open) {
            fetchAndFilterProjects();
        }
    }, [open, fetchAndFilterProjects]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const confirm = async () => {
        await onConfirm(Array.from(selected));
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('attachUserToProjects.title')}</DialogTitle>
                </DialogHeader>

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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('attachUserToProjects.cancel')}
                    </Button>
                    <Button disabled={selected.size === 0 || loading} onClick={confirm}>
                        <Link className="h-4 w-4 mr-2" />
                        {t('attachUserToProjects.attach')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
