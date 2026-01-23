import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Edit,
  Trash2,
  FolderOpen,
  Plus,
  Search,
  FileText,
  Building2,
  AlertCircle,
  BookOpenText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AddEditKBModal } from "@/components/AddEditKBModal";
import { ManageFilesModal } from "@/components/ManageFilesModal";
import { KnowledgeBaseService } from "@/services/KnowledgeBaseService";
import { listProjects } from "@/services/ProjectService";
import { Project } from "@/types/project";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingAnimation from "@/components/LoadingAnimation";

interface KnowledgeBase {
  id: number;
  name: string;
  description?: string | null;
  avatar?: string | null;
  hash_id: string;
  created_at: string; // ISO
}

const KnowledgeBases = () => {
  const { t } = useTranslation();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const { toast } = useToast();

  // ------- Utils -------
  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  // ------- Data -------
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await listProjects(1, 200);
      setProjects(response.results || []);

      // Auto-select first project if available
      if (response.results && response.results.length > 0) {
        setSelectedProjectId(response.results[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchKnowledgeBases = async (projectId: string) => {
    if (!projectId) {
      setKnowledgeBases([]);
      return;
    }

    try {
      setLoading(true);
      setPermissionError(false);
      const data = await KnowledgeBaseService.listAll(projectId);

      if (data?.kbs && Array.isArray(data.kbs)) {
        const sorted = [...data.kbs].sort(
          (a: KnowledgeBase, b: KnowledgeBase) =>
            new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
        );
        setKnowledgeBases(sorted);
      } else {
        setKnowledgeBases([]);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionError(true);
        setKnowledgeBases([]);
        toast({
          title: "Access Denied",
          description: "You don't have access to this project. Please contact an administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch knowledge bases",
          variant: "destructive",
        });
        setKnowledgeBases([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchKnowledgeBases(selectedProjectId);
    }
  }, [selectedProjectId]);

  // ------- Actions -------
  const handleDelete = async (hashId: string) => {
    try {
      await KnowledgeBaseService.delete(hashId);
      setKnowledgeBases((prev) => prev.filter((kb) => kb.hash_id !== hashId));
      toast({ title: "Success", description: "Knowledge base deleted successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete knowledge base",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    setEditModalOpen(true);
  };

  const handleManageFiles = (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    setFilesModalOpen(true);
  };

  const handleKBCreated = () => {
    setAddModalOpen(false);
    if (selectedProjectId) {
      fetchKnowledgeBases(selectedProjectId);
    }
  };

  const handleKBUpdated = () => {
    setEditModalOpen(false);
    setSelectedKB(null);
    if (selectedProjectId) {
      fetchKnowledgeBases(selectedProjectId);
    }
  };

  // ------- Filtering -------
  const filteredKnowledgeBases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return knowledgeBases;
    return knowledgeBases.filter((kb) => {
      const name = kb.name?.toLowerCase() ?? "";
      const desc = kb.description?.toLowerCase() ?? "";
      const hash = kb.hash_id?.toLowerCase() ?? "";
      return name.includes(term) || desc.includes(term) || hash.includes(term);
    });
  }, [knowledgeBases, searchTerm]);

  return (
    <>
      <main className="container mt-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpenText className="h-6 w-6 text-primary" />
              {t('knowledgeBase.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('knowledgeBase.manageRepositories')}
            </p>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            size="default"
            className="shrink-0"
            disabled={!selectedProjectId || loadingProjects}
          >
            <Plus className="mr-2 h-5 w-5" />
            {t('knowledgeBase.createKnowledgeBase')}
          </Button>
        </div>

        {/* Project Selector & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mt-6 mb-5">
          <div className="w-full sm:w-64">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Select Project
            </label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('knowledgeBase.searchNameDescriptionHash')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>

          <Card className="px-4 py-2 flex items-center gap-2">
            <div className="text-base font-semibold">{knowledgeBases.length}</div>
            <div className="text-sm text-muted-foreground">{t('knowledgeBase.totalKBs')}</div>
          </Card>
        </div>

        {/* Permission Error Alert */}
        {permissionError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have access to this project. Please contact an administrator to request access.
            </AlertDescription>
          </Alert>
        )}

        {/* No Projects Message */}
        {!loadingProjects && projects.length === 0 && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No projects available. Please contact an administrator to be added to a project.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12 pt-[8rem]">
            <LoadingAnimation
              text={t('knowledgeBase.loadingKnowledgeBases')}
              icon={
                <BookOpenText className="h-[100px] w-[100px] text-primary" />
              }
            />
          </div>
        ) : filteredKnowledgeBases.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <BookOpenText className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {searchTerm ? t('knowledgeBase.noMatchesFound') : t('knowledgeBase.noKnowledgeBasesYet')}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchTerm
                    ? t('knowledgeBase.noMatchesDescription', { searchTerm })
                    : t('knowledgeBase.noKnowledgeBasesDescription')}
                </p>
              </div>
              {!searchTerm && (
                <Button onClick={() => setAddModalOpen(true)} size="default">
                  <Plus className="mr-2 h-5 w-5" />
                  {t('knowledgeBase.createFirstKnowledgeBase')}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">{t('knowledgeBase.knowledgeBaseColumn')}</TableHead>
                    <TableHead className="w-[35%]">{t('common.description')}</TableHead>
                    <TableHead className="w-[15%]">{t('knowledgeBase.created')}</TableHead>
                    <TableHead className="w-[20%] text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKnowledgeBases.map((kb) => (
                    < TableRow key={kb.hash_id} className="hover:bg-muted/40" >
                      <TableCell className="w-[30%]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getInitials(kb.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{kb.name}</div>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs">
                                <FileText className="mr-1 h-3 w-3" />
                                {t('knowledgeBase.knowledgeBaseType')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="w-[35%]">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {kb.description?.trim() ? kb.description : t('knowledgeBase.noDescriptionProvided')}
                        </p>
                      </TableCell>

                      <TableCell className="w-[15%]">{formatDate(kb.created_at)}</TableCell>

                      <TableCell className="w-[20%] text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageFiles(kb)}
                          >
                            <FolderOpen className="mr-2 h-4 w-4" />
                            {t('knowledgeBase.manageFiles')}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(kb)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(kb.hash_id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main >
      {/* Modals */}
      <AddEditKBModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        projectId={selectedProjectId}
        onSuccess={handleKBCreated}
      />

      <AddEditKBModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        projectId={selectedProjectId}
        knowledgeBase={selectedKB}
        onSuccess={handleKBUpdated}
      />

      <ManageFilesModal
        open={filesModalOpen}
        onOpenChange={setFilesModalOpen}
        knowledgeBase={selectedKB}
        projectId={selectedProjectId}
      />
    </>
  );
};

export default KnowledgeBases;
