import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { MoreVertical, Plus, Trash2, Edit, Link, Unlink, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AddBotModal } from './AddBotModal';
import { EditBotModal } from './EditBotModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

interface Bot {
  id: string;
  name: string;
  description: string;
  expertise: string;
  avatar: string;
  projects: string[];
}

interface BotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockBots: Bot[] = [
  {
    id: '1',
    name: 'Support Assistant',
    description: 'Handles customer inquiries and provides technical support',
    expertise: 'Customer Support',
    avatar: '/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png',
    projects: ['Project Alpha', 'Project Beta']
  },
  {
    id: '2',
    name: 'Sales Agent',
    description: 'Assists with sales inquiries and lead qualification',
    expertise: 'Sales Assistant',
    avatar: '/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png',
    projects: ['Project Gamma']
  },
  {
    id: '3',
    name: 'Technical QA',
    description: 'Provides technical answers and troubleshooting guidance',
    expertise: 'Technical QA',
    avatar: '/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png',
    projects: []
  }
];

export const BotManagementModal: React.FC<BotManagementModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const preventSidebarClose = (e: MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const [bots, setBots] = useState<Bot[]>(mockBots);
  const [isAddBotOpen, setIsAddBotOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [deletingBot, setDeletingBot] = useState<Bot | null>(null);

  const handleAddBot = (newBot: Omit<Bot, 'id'>) => {
    const bot: Bot = {
      id: Date.now().toString(),
      ...newBot
    };
    setBots([...bots, bot]);
    setIsAddBotOpen(false);
  };

  const handleEditBot = (updatedBot: Bot) => {
    setBots(bots.map(bot => bot.id === updatedBot.id ? updatedBot : bot));
    setEditingBot(null);
  };

  const handleDeleteBot = () => {
    if (deletingBot) {
      setBots(bots.filter(bot => bot.id !== deletingBot.id));
      setDeletingBot(null);
    }
  };

  const handleAttachProject = (botId: string, projectName: string) => {
    setBots(bots.map(bot =>
      bot.id === botId
        ? { ...bot, projects: [...bot.projects, projectName] }
        : bot
    ));
  };

  const handleDetachProject = (botId: string, projectName: string) => {
    setBots(bots.map(bot =>
      bot.id === botId
        ? { ...bot, projects: bot.projects.filter(p => p !== projectName) }
        : bot
    ));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent ref={dialogRef} onClick={preventSidebarClose} className="max-w-4xl max-h-[80vh] bg-background border border-border">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-semibold text-foreground">Agent Management</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-foreground">Available Agents</h3>
              <Button
                onClick={() => setIsAddBotOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Agent
              </Button>
            </div>

            <div className="grid gap-4">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={bot.avatar} alt={bot.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {bot.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-foreground">{bot.name}</h4>
                        <p className="text-sm text-muted-foreground">{bot.description}</p>
                        <Badge variant="secondary" className="mt-1">
                          {bot.expertise}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {bot.projects.length > 0 ? (
                          bot.projects.map((project) => (
                            <Badge key={project} variant="outline" className="text-xs">
                              {project}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No projects assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover border border-border">
                      <DropdownMenuItem onClick={() => handleAttachProject(bot.id, 'New Project')}>
                        <Link className="h-4 w-4 mr-2" />
                        Attach to Project
                      </DropdownMenuItem>
                      {bot.projects.length > 0 && (
                        <DropdownMenuItem onClick={() => handleDetachProject(bot.id, bot.projects[0])}>
                          <Unlink className="h-4 w-4 mr-2" />
                          Detach from Project
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setEditingBot(bot)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingBot(bot)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddBotModal
        isOpen={isAddBotOpen}
        onClose={() => setIsAddBotOpen(false)}
        onSave={handleAddBot}
      />

      {editingBot && (
        <EditBotModal
          isOpen={!!editingBot}
          onClose={() => setEditingBot(null)}
          onSave={handleEditBot}
          bot={editingBot}
        />
      )}

      <AlertDialog open={!!deletingBot} onOpenChange={() => setDeletingBot(null)}>
        <AlertDialogContent className="bg-background border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Bot</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{deletingBot?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
