import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgentsChat } from "@/contexts/AgentsChatContext";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Link, Bot as BotIcon } from "lucide-react";
import { AddBotModal } from "@/components/AddBotModal";
import { EditBotModal } from "@/components/EditBotModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { Bot } from "@/types/bots";
import { BotService } from "@/services/BotService";
import { listProjects, ProjectService } from "@/services/ProjectService";
import { BotDisplayItem } from "@/components/BotDisplayItem";
import { useBatchTranslation } from "@/hooks/use-batch-translation";
import LoadingAnimation from "@/components/LoadingAnimation";

type ProjectOption = { id: string; name: string };

function AttachProjectsModal({
  open,
  onOpenChange,
  projects,
  onConfirm,
  getTranslation,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: ProjectOption[];
  onConfirm: (projectIds: string[]) => Promise<void> | void;
  getTranslation: (text: string) => string;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) setSelected(new Set());
  }, [open]);

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
          <DialogTitle>{t('agentManagement.attachToProjects')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-3 py-1">
              <Checkbox
                checked={selected.has(p.id)}
                onCheckedChange={() => toggle(p.id)}
              />
              <span className="text-sm">{getTranslation(p.name)}</span>
            </label>
          ))}
          {projects.length === 0 && (
            <div className="text-sm text-muted-foreground">{t('agentManagement.noProjectsAvailable')}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={selected.size === 0} onClick={confirm}>
            <Link className="h-4 w-4 mr-2" />
            {t('agentManagement.attach')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BotManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isUserRole = user?.role === "USER";
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddBotOpen, setIsAddBotOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [deletingBot, setDeletingBot] = useState<Bot | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [attachPicker, setAttachPicker] = useState<{ open: boolean; botId: string }>({ open: false, botId: "" });

  const [detachTarget, setDetachTarget] = useState<{ botId: string; projectId: string }>({
    botId: "",
    projectId: "",
  });
  const [search, setSearch] = useState("");

  const filteredBots = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return bots;
    return bots.filter((b) => b.name.toLowerCase().includes(s) || b.description?.toLowerCase().includes(s));
  }, [bots, search]);

  // Collect all texts that need translation
  const textsToTranslate = useMemo(() => {
    const texts: string[] = [];
    filteredBots.forEach(bot => {
      if (bot.description) texts.push(bot.description);
      if (bot.expertise_area?.name) texts.push(bot.expertise_area.name);
      // Add project names
      const projects = (bot as any).projects;
      if (Array.isArray(projects)) {
        projects.forEach((project: { name: string }) => {
          if (project.name) texts.push(project.name);
        });
      }
    });
    // Add project option names
    projectOptions.forEach(project => {
      if (project.name) texts.push(project.name);
    });
    return texts;
  }, [filteredBots, projectOptions]);

  // Get translations for all texts in one batch
  const { getTranslation, loading: translationLoading } = useBatchTranslation(textsToTranslate, "bots");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ results: projects }, botPage] = await Promise.all([listProjects(1, 100), BotService.list({ page_size: 100 })]);
        setProjectOptions(projects.map((p) => ({ id: p.id, name: p.name })));
        setBots(botPage.results);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadBots = async () => {
    const data = await BotService.list({ page_size: 100 });
    setBots(data.results);
  };

  // CREATE
  const handleAddBot = async (form: {
    name: string; description: string; url_n8n: string;
    expertiseId?: string; initialProjects?: string[];
  }) => {
    const created = await BotService.create({
      name: form.name,
      description: form.description,
      url_n8n: form.url_n8n,
    });

    if (form.expertiseId) await BotService.setExpertise(created.id, form.expertiseId);
    if (form.initialProjects?.length) await BotService.updateProjects(created.id, form.initialProjects);

    const hydrated = await BotService.get(created.id); // já vem com projects + expertise
    setBots((prev) => [hydrated, ...prev]);            // <- aparece na hora
    setIsAddBotOpen(false);

    // await reloadBots();
  };

  const handleBotCreated = async (id: string) => {
    const hydrated = await BotService.get(id);

    setBots(prev => {
      const i = prev.findIndex(b => b.id === hydrated.id);
      if (i >= 0) return prev.map(b => (b.id === hydrated.id ? hydrated : b));
      return [hydrated, ...prev];
    });

    setIsAddBotOpen(false);
  };



  // UPDATE (partial)
  const handleEditBot = async (payload: {
    id: string;
    name?: string;
    description?: string;
    url_n8n?: string;
    projects?: string[];
    expertise_area?: string | null;
  }) => {
    const { id, ...data } = payload;
    const updated = await BotService.patch(id, data);
    setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setEditingBot(null);
  };



  // DELETE
  const handleDeleteBot = async () => {
    if (!deletingBot) return;
    const id = deletingBot.id;
    setBots((prev) => prev.filter((b) => b.id !== id));
    setDeletingBot(null);
    try {
      await BotService.remove(id);
    } catch {
      reloadBots();
    }
  };

  // attach N projects
  const attachBotToMany = async (botId: string, projectIds: string[]) => {
    await Promise.all(projectIds.map((pid) => ProjectService.attachBots(pid, [botId])));
    await reloadBots();
  };

  // detach
  const doDetach = async () => {
    if (!detachTarget.botId || !detachTarget.projectId) return;
    await ProjectService.detachBots(detachTarget.projectId, [detachTarget.botId]);
    await reloadBots();
    setDetachTarget({ botId: "", projectId: "" });
  };

  return (
    <>
      <main className="container mt-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BotIcon className="h-6 w-6 text-primary" />
              {t('agentManagement.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('agentManagement.description')}
            </p>
          </div>
          <Button
            onClick={() => setIsAddBotOpen(true)}
            disabled={isUserRole}
            className="bg-primary hover:bg-primary/90 text-primary-foreground pointer-events-auto z-[6]"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('agentManagement.addNewBot')}
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-3 w-full">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('agentManagement.searchPlaceholder')}
            className="w-full bg-background border-input"
          />
        </div>

        <div className="mt-6 flex flex-col space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12 pt-[8rem]">
              <LoadingAnimation
                text={t('home.loadingAgents')}
                icon={
                  <BotIcon className="h-[100px] w-[100px] text-primary" />
                }
              />
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('agentManagement.noBotsFound')}</div>
          ) : (
            <div className="grid gap-4 max-h-[calc(100vh-290px)] overflow-y-auto">
              {filteredBots.map((bot) => (
                <BotDisplayItem
                  key={bot.id}
                  bot={bot}
                  onAttachProjects={(botId) => setAttachPicker({ open: true, botId })}
                  detachTarget={detachTarget}
                  onSetDetachTarget={setDetachTarget}
                  onDetach={doDetach}
                  onEdit={setEditingBot}
                  onDelete={setDeletingBot}
                  getTranslation={getTranslation}
                  disabled={isUserRole}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modais CRUD */}
      <AddBotModal
        isOpen={isAddBotOpen}
        onClose={() => setIsAddBotOpen(false)}
        onCreated={handleBotCreated}
        projectOptions={projectOptions}
      />

      {editingBot && (
        <EditBotModal
          isOpen={!!editingBot}
          onClose={() => setEditingBot(null)}
          onSave={handleEditBot}
          bot={editingBot}
          projectOptions={projectOptions}
        />
      )}

      <AlertDialog open={!!deletingBot} onOpenChange={() => setDeletingBot(null)}>
        <AlertDialogContent className="bg-background border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('agentManagement.deleteBot')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('agentManagement.deleteConfirm', { name: deletingBot?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttachProjectsModal
        open={attachPicker.open}
        onOpenChange={(v) => setAttachPicker((s) => ({ ...s, open: v }))}
        projects={projectOptions}
        onConfirm={(projectIds) => attachBotToMany(attachPicker.botId, projectIds)}
        getTranslation={getTranslation}
      />
    </>
  );
}
