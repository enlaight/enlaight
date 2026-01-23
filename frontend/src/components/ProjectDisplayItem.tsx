import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ProjectDisplayItemProps {
  project: {
    id: string;
    name: string;
    project: object;
    clientName?: string;
    description?: string | null;
    createdAt?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
  getTranslation: (text: string) => string;
}

export function ProjectDisplayItem({ project, onEdit, onDelete, getTranslation }: ProjectDisplayItemProps) {
  const translatedName = getTranslation(project.name);
  const translatedDescription = project.description ? getTranslation(project.description) : '';
  const translatedClientName = project.clientName ? getTranslation(project.clientName) : '';

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-border hover:border-primary/50 max-h-[110px]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">{translatedName}</h3>

            {project.clientName && (
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-medium">Client:</span> {translatedClientName}
              </p>
            )}

            {project.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {translatedDescription}
              </p>
            )}

            {project.createdAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="hover:bg-muted"
            >
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
