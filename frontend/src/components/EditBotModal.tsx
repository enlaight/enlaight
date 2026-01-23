import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Upload, X } from "lucide-react";
import { ExpertiseService } from "@/services/ExpertiseService";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Bot } from "@/types/bots";
import { useTranslation } from "react-i18next";

type ProjectOption = { id: string; name: string };
type ExpertiseOpt = { id: string; name: string };

interface EditBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    id: string;
    name?: string;
    description?: string | null;
    url_n8n?: string;
    active?: boolean;
    projects?: string[];
    expertise_area?: string | null;
  }) => Promise<void> | void;
  bot: Bot;
  projectOptions?: ProjectOption[];
}

export const EditBotModal: React.FC<EditBotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  bot,
  projectOptions = [],
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: bot.name || "",
    description: bot.description || "",
    url_n8n: (bot as any).url_n8n || "",
    active: bot.active ?? true,
    projects: (bot.projects || []).map((p) => p.id),
    expertiseId: (bot as any)?.expertise_area?.id as string | undefined,
  });

  const [expertiseOpts, setExpertiseOpts] = useState<ExpertiseOpt[]>([]);
  const [openProjPicker, setOpenProjPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: bot.name || "",
      description: bot.description || "",
      url_n8n: (bot as any).url_n8n || "",
      active: bot.active ?? true,
      projects: (bot.projects || []).map((p) => p.id),
      expertiseId: (bot as any)?.expertise_area?.id || "",
    });
  }, [isOpen, bot]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const data = await ExpertiseService.list();
        setExpertiseOpts(data.results.map((e) => ({ id: e.id, name: e.name })));
      } catch {
        setExpertiseOpts([]);
      }
    })();
  }, [isOpen]);

  const toggleProject = (id: string) => {
    setForm((s) => {
      const set = new Set(s.projects);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...s, projects: Array.from(set) };
    });
  };

  const diffPayload = useMemo(() => {
    const payload: Record<string, any> = { id: bot.id };

    if (form.name.trim() !== (bot.name || "")) payload.name = form.name.trim();
    if ((form.description ?? "") !== (bot.description ?? "")) payload.description = form.description ?? "";
    if ((form.url_n8n ?? "") !== ((bot as any).url_n8n ?? "")) payload.url_n8n = form.url_n8n ?? "";
    if ((form.active ?? true) !== (bot.active ?? true)) payload.active = form.active;

    const originalProj = (bot.projects || []).map((p) => p.id).sort().join(",");
    const currentProj = [...form.projects].sort().join(",");
    if (originalProj !== currentProj) payload.projects = form.projects;

    const originalExp = (bot as any)?.expertise_area?.id || "";
    if ((form.expertiseId || "") !== originalExp) payload.expertise_area = form.expertiseId || null;

    return payload;
  }, [form, bot]);

  const canSave = useMemo(() => Object.keys(diffPayload).length > 1, [diffPayload]);

  const handleSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    try {
      await onSave(diffPayload as any);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-background border border-border" hideClose>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground">{t('botModal.editAssistant')}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-primary text-lg bg-primary/10">
                  {form.name
                    ? form.name.split(" ").map((n) => n[0]).join("").substring(0, 2)
                    : "B"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background"
                title="Upload avatar"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('botModal.assistantName')}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>{t('botModal.description')}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('botModal.webhookUrl')}</Label>
            <Input value={form.url_n8n} onChange={(e) => setForm({ ...form, url_n8n: e.target.value })} />
          </div>

          {/* Expertise */}
          <div className="space-y-2">
            <Label>{t('botModal.expertiseArea')}</Label>
            <Select
              value={form.expertiseId ?? undefined}
              onValueChange={(val) =>
                setForm((s) => ({
                  ...s,
                  expertiseId: val === "__none__" ? undefined : val,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('botModal.selectExpertiseArea')} />
              </SelectTrigger>
              <SelectContent>
                {expertiseOpts.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
                <SelectItem value="__none__">{t('botModal.none')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Projects (multi-select) */}
          <div className="space-y-1">
            <Label>{t('botModal.projects')}</Label>

            <Popover modal open={openProjPicker} onOpenChange={setOpenProjPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {t('botModal.projectsSelected', { count: form.projects.length })}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-2 bg-popover border border-border z-[1000]"
                side="bottom"
                align="start"
                sideOffset={6}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="max-h-60 overflow-auto space-y-1">
                  {projectOptions.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={form.projects.includes(p.id)}
                        onCheckedChange={() => toggleProject(p.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}

                  {projectOptions.length === 0 && (
                    <div className="text-sm text-muted-foreground px-2 py-1">
                      {t('botModal.noProjectsAvailable')}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((s) => ({ ...s, projects: [] }))}
                  >
                    {t('botModal.clear')}
                  </Button>
                  <Button size="sm" onClick={() => setOpenProjPicker(false)}>
                    {t('botModal.done')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>


        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('botModal.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || submitting}>
            {submitting ? t('botModal.saving') : t('botModal.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditBotModal;
