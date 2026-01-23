import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, Link, Unlink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import type { Bot } from "@/types/bots";

interface BotDisplayItemProps {
  bot: Bot;
  onAttachProjects: (botId: string) => void;
  detachTarget: { botId: string; projectId: string };
  onSetDetachTarget: (target: { botId: string; projectId: string }) => void;
  onDetach: () => void;
  onEdit: (bot: Bot) => void;
  onDelete: (bot: Bot) => void;
  getTranslation: (text: string) => string;
  disabled?: boolean;
}

export function BotDisplayItem({
  bot,
  onAttachProjects,
  detachTarget,
  onSetDetachTarget,
  onDetach,
  onEdit,
  onDelete,
  getTranslation,
  disabled = false,
}: BotDisplayItemProps) {
  const { t } = useTranslation();
  const translatedDescription = bot.description ? getTranslation(bot.description) : '';
  const translatedExpertiseName = bot.expertise_area?.name ? getTranslation(bot.expertise_area.name) : '';

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={bot.image}
            alt={bot.name}
          />
          <AvatarFallback className="bg-primary/10 text-primary">
            {bot.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          {/* Name*/}
          <h4 className="text-base font-semibold text-foreground">
            {bot.name}
          </h4>

          {/* Description */}
          {bot.description && (
            <p className="text-sm text-muted-foreground">
              {translatedDescription}
            </p>
          )}

          {/* Status + expertise */}
          <div>
            {bot.expertise_area && (
              <Badge variant="secondary" className="mt-1">
                {translatedExpertiseName}
              </Badge>
            )}
          </div>

          {/* Projects */}
          <div className="flex flex-wrap gap-1">
            {Array.isArray((bot as any).projects) && (bot as any).projects.length > 0 ? (
              ((bot as any).projects as { id: string; name: string }[]).map((p) => (
                <ProjectBadge key={p.id} project={p} getTranslation={getTranslation} />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('agentManagement.noProjectsAssigned')}
              </span>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-popover border border-border">
          {/* Attach to N Projects */}
          <DropdownMenuItem onClick={() => onAttachProjects(bot.id)} disabled={disabled}>
            <Link className="h-4 w-4 mr-2" />
            {t('agentManagement.attachToProjects')}
          </DropdownMenuItem>

          {/* Detach */}
          <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground border-t border-border">
            {t('agentManagement.detachFromProject')}
          </div>
          <div className="px-2 pb-2">
            <Select
              value={detachTarget.botId === bot.id ? detachTarget.projectId : ""}
              onValueChange={(projectId) => onSetDetachTarget({ botId: bot.id, projectId })}
              disabled={disabled}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder={t('agentManagement.chooseProject')} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray((bot as any).projects) &&
                  ((bot as any).projects as { id: string; name: string }[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <ProjectName project={p} getTranslation={getTranslation} />
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={disabled || detachTarget.botId !== bot.id || !detachTarget.projectId}
              onClick={onDetach}
              className="mt-2 w-full h-8"
            >
              <Unlink className="h-4 w-4 mr-2" />
              {t('agentManagement.detach')}
            </Button>
          </div>

          <DropdownMenuItem onClick={() => onEdit(bot)} disabled={disabled}>
            <Edit className="h-4 w-4 mr-2" />
            {t('agentManagement.editBot')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(bot)}
            className="text-destructive focus:text-destructive"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('agentManagement.deleteBot')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ProjectBadge({ project, getTranslation }: { project: { id: string; name: string }; getTranslation: (text: string) => string }) {
  const translatedName = getTranslation(project.name);
  return (
    <Badge variant="outline" className="text-xs">
      {translatedName}
    </Badge>
  );
}

function ProjectName({ project, getTranslation }: { project: { id: string; name: string }; getTranslation: (text: string) => string }) {
  const translatedName = getTranslation(project.name);
  return <span>{translatedName}</span>;
}
