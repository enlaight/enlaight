import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Upload, X } from "lucide-react";
import { AddExpertiseModal } from "./AddExpertiseModal";
import { ExpertiseService } from "@/services/ExpertiseService";
import { BotService } from "@/services/BotService";
import { Checkbox } from "./ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useTranslation } from "react-i18next";

type ProjectOption = { id: string; name: string };
type ExpertiseOpt = { id: string; name: string };

interface AddBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (botId: string) => void;
  projectOptions: ProjectOption[];
}

export const AddBotModal: React.FC<AddBotModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  projectOptions,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url_n8n: "",
    expertiseId: undefined as string | undefined,
    avatar: "", //"/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png",
    initialProjects: [] as string[],
    active: true,
  });

  const [expertiseOptions, setExpertiseOptions] = useState<ExpertiseOpt[]>([]);
  const [isAddExpertiseOpen, setIsAddExpertiseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openProjPicker, setOpenProjPicker] = useState(false);

  const canSave = useMemo(
    () => !!(formData.name.trim() && formData.url_n8n.trim()),
    [formData.name, formData.url_n8n]
  );

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const data = await ExpertiseService.list();
        setExpertiseOptions(data.results.map((e) => ({ id: e.id, name: e.name })));
      } catch {
        setExpertiseOptions([]);
      }
    })();
  }, [isOpen]);

  const reset = () =>
    setFormData({
      name: "",
      description: "",
      url_n8n: "",
      expertiseId: "",
      avatar: "",
      initialProjects: [],
      active: true,
    });

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleAddNewExpertise = async (exp: { name: string; description?: string }) => {
    try {
      const created = await ExpertiseService.create(exp);
      setExpertiseOptions((opts) => [...opts, { id: created.id, name: created.name }]);
      setFormData((s) => ({ ...s, expertiseId: created.id }));
    } finally {
      setIsAddExpertiseOpen(false);
    }
  };

  const toggleProject = (id: string) => {
    setFormData((s) => {
      const set = new Set(s.initialProjects);
      if (set.has(id)) {
        set.delete(id)
      } else {
        set.add(id);
      }
      return { ...s, initialProjects: Array.from(set) };
    });
  };

  const handleSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    try {
      const created = await BotService.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        url_n8n: formData.url_n8n.trim(),
        active: formData.active,
      });

      if (formData.expertiseId) {
        await BotService.setExpertise(created.id, formData.expertiseId);
      }
      if (formData.initialProjects.length) {
        await BotService.updateProjects(created.id, formData.initialProjects);
      }

      onCreated?.(created.id);
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border border-border" hideClose>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground">{t('botModal.addNewAssistant')}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar} alt={t('botModal.assistantAvatar')} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {formData.name
                    ? formData.name.split(" ").map((n) => n[0]).join("").substring(0, 2)
                    : "BA"}
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
            <Label>{t('botModal.assistantNameRequired')}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('botModal.enterAssistantName')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('botModal.description')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('botModal.describeAssistant')}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('botModal.webhookUrlRequired')}</Label>
            <Input
              value={formData.url_n8n}
              onChange={(e) => setFormData({ ...formData, url_n8n: e.target.value })}
              placeholder="https://n8n.../webhook/..."
            />
          </div>

          {/* Expertise */}
          <div className="space-y-2">
            <Label>{t('botModal.expertiseArea')}</Label>
            <Select
              value={formData.expertiseId ?? undefined}
              onValueChange={(val) => {
                if (val === "__other__") {
                  setIsAddExpertiseOpen(true);
                } else if (val === "__none__") {
                  setFormData((s) => ({ ...s, expertiseId: undefined })); // limpa
                } else {
                  setFormData((s) => ({ ...s, expertiseId: val }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('botModal.selectExpertiseArea')} />
              </SelectTrigger>
              <SelectContent>
                {expertiseOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
                <SelectItem value="__none__">{t('botModal.none')}</SelectItem>
                <SelectItem value="__other__" className="font-medium text-primary">
                  {t('botModal.addNewExpertiseArea')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Multi-select Projects */}
          <div className="space-y-1">
            <Label>{t('botModal.initialProjects')}</Label>
            <Popover modal open={openProjPicker} onOpenChange={setOpenProjPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {t('botModal.projectsSelected', { count: formData.initialProjects.length })}
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
                        checked={formData.initialProjects.includes(p.id)}
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
                    onClick={() => setFormData((s) => ({ ...s, initialProjects: [] }))}
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
          <Button variant="outline" onClick={handleCancel}>
            {t('botModal.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || submitting}>
            {submitting ? t('botModal.saving') : t('botModal.saveAssistant')}
          </Button>
        </div>
      </DialogContent>

      <AddExpertiseModal
        isOpen={isAddExpertiseOpen}
        onClose={() => setIsAddExpertiseOpen(false)}
        onSave={handleAddNewExpertise}
      />
    </Dialog>
  );
};
