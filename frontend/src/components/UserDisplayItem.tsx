import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, LinkIcon, Unlink, KeyRoundIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface UserDisplayItemProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    status: string;
    department: string;
    joinDate: string | null;
    projects: { id: string; name: string }[];
  };
  onLoginAs: (userId: string) => void;
  onAttachProjects: (userId: string) => void;
  detachTarget: { userId: string; projectId: string };
  onSetDetachTarget: (target: { userId: string; projectId: string }) => void;
  onDetach: () => void;
  getInitials: (name: string) => string;
  getStatusColor: (status: string) => string;
  getTranslation: (text: string) => string;
}

function addExpirationTime(user_joined) {
  const date = new Date(user_joined);
  date.setDate(date.getDate() + 10);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

function checkExpiration(user) {
  if (user.email.includes('+EXPIRED')) return true;

  if (user.status === 'inactive') {
    const expirationDate = new Date(user.joinDate);
    expirationDate.setDate(expirationDate.getDate() + 10);

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return todayDate > expirationDate;
  }

  return false;
}

export function UserDisplayItem({
  user,
  onLoginAs,
  onAttachProjects,
  detachTarget,
  onSetDetachTarget,
  onDetach,
  getInitials,
  getStatusColor,
  getTranslation,
}: UserDisplayItemProps) {
  const translatedRole = getTranslation(user.role);
  const translatedDepartment = getTranslation(user.department);

  const expiredUser = checkExpiration(user);

  return (
    <Card className={`transition-all duration-200 border-border ${expiredUser ? 'bg-border/30' : 'hover:shadow-md hover:border-primary/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className={`${expiredUser ? 'bg-border' : 'bg-primary'} text-primary-foreground font-semibold`}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{user.name}</h3>
                <Badge variant="secondary" className={getStatusColor(user.status)}>
                  {expiredUser ? 'expired' : user.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {translatedRole && !expiredUser && (
                  <>
                    <span>{translatedRole}</span>
                    <span>•</span>
                  </>

                )}
                {translatedDepartment && !expiredUser && (
                  <>
                    <span>{translatedDepartment}</span>
                    <span>•</span>
                  </>
                )}
                {user.joinDate && !expiredUser && (
                  <>
                    <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
                  </>
                )}
              </div>
              {expiredUser && (
                <p className="text-sm text-muted-foreground text-medium"><b>Expired on:</b> {addExpirationTime(user.joinDate)}</p>
              )}

              {!expiredUser && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {user.projects?.length ? (
                    user.projects.map((p) => (
                      <ProjectBadge key={p.id} project={p} getTranslation={getTranslation} />
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No projects</span>
                  )}
                </div>
              )}

            </div>
          </div>
          {!expiredUser && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-popover border border-border">
                  <DropdownMenuItem onClick={() => onLoginAs(user.id)}>
                    <KeyRoundIcon className="h-4 w-4 mr-2" />
                    Login As
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onAttachProjects(user.id)}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Attach to Projects…
                  </DropdownMenuItem>

                  <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground border-t border-border">
                    Detach from Project
                  </div>
                  <div className="px-2 pb-2">
                    <Select
                      value={detachTarget.userId === user.id ? detachTarget.projectId : ""}
                      onValueChange={(projectId) => onSetDetachTarget({ userId: user.id, projectId })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Choose project" />
                      </SelectTrigger>
                      <SelectContent>
                        {(user.projects ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <ProjectName project={p} getTranslation={getTranslation} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      disabled={detachTarget.userId !== user.id || !detachTarget.projectId}
                      onClick={onDetach}
                      className="mt-2 w-full h-8"
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Detach
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
