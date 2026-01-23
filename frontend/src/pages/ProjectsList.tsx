import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FolderKanban, Plus } from "lucide-react";
import { Project } from "@/types/project";
import { listProjects, ProjectService } from "@/services/ProjectService";
import { ProjectDisplayItem } from "@/components/ProjectDisplayItem";
import { useBatchTranslation } from "@/hooks/use-batch-translation";
import { AddProjectModal } from "@/components/AddProjectModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { useToast } from "@/hooks/use-toast";
import LoadingAnimation from "@/components/LoadingAnimation";

const PAGE_SIZE = 10;

const ProjectsList = () => {
	const { t } = useTranslation();
	const { toast } = useToast();

	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [page, setPage] = useState(1);

	const [count, setCount] = useState(0);
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [addModalOpen, setAddModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);

	useEffect(() => {
		const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
		return () => clearTimeout(id);
	}, [searchTerm]);

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch]);

	const getProjects = () => {
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError(null);
				const data = await listProjects(page, PAGE_SIZE, debouncedSearch || undefined);

				let results = data.results ?? [];
				let total = data.count ?? results.length;

				if (debouncedSearch && results.length && !results.some((r: any) => r?._matched)) {
					const term = debouncedSearch.toLowerCase();
					results = results.filter((p) => {
						const nameHit = p.name?.toLowerCase().includes(term);
						const clientName =
							typeof p.client === "string" ? p.client : p.client?.name ?? "";
						const clientHit = clientName.toLowerCase().includes(term);
						const descHit = (p.description ?? "").toLowerCase().includes(term);
						return nameHit || clientHit || descHit;
					});
					total = results.length;
				}

				if (!cancelled) {
					setProjects(results);
					setCount(total);
				}
			} catch (e) {
				if (!cancelled)
					setError(
						(e?.message || String(e)).includes("Invalid URL")
							? "Configuração da API ausente ou inválida. Verifique VITE_API_BASE_URL."
							: e?.message || "Erro ao carregar projetos"
					);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}

	useEffect(() => {
		getProjects();
	}, [page, debouncedSearch]);

	const projectsForUI = useMemo(
		() =>
			projects.map((p) => {
				const clientName = typeof p.client === "string" ? p.client : p.client?.name ?? "—";
				return {
					id: p.id,
					name: p.name,
					clientName,
					createdAt: p.created_at ? new Date(p.created_at) : null,
					description: p.description ?? null,
				};
			}),
		[projects]
	);

	// Collect all texts that need translation
	const textsToTranslate = useMemo(() => {
		const texts: string[] = [];
		projectsForUI.forEach(project => {
			if (project.name) texts.push(project.name);
			if (project.clientName && project.clientName !== "—") texts.push(project.clientName);
			if (project.description) texts.push(project.description);
		});
		return texts;
	}, [projectsForUI]);

	// Get translations for all texts in one batch
	const { getTranslation, loading: translationLoading } = useBatchTranslation(textsToTranslate, "projects");

	const handleEdit = (project) => {
		setSelectedProject(project);
		setEditModalOpen(true);
	};

	const handleDelete = async (projectId: string) => {
		if (!confirm(t('projects.deleteConfirm'))) return;

		try {
			await ProjectService.delete(projectId);
			toast({
				title: t('common.success'),
				description: t('projects.deleteSuccess'),
			});
			// Refresh the list
			setPage(1);
		} catch (error) {
			toast({
				title: t('common.error'),
				description: error.response?.data?.detail || t('projects.deleteFailed'),
				variant: "destructive",
			});
		}
	};

	const handleProjectCreated = () => {
		setAddModalOpen(false);
		setPage(1);
	};

	const handleProjectUpdated = () => {
		setEditModalOpen(false);
		setSelectedProject(null);
		setPage(1);
	};

	return (
		<>
			<main className="container mt-5">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
							<FolderKanban className="h-6 w-6 text-primary" />
							{t('projects.directory')}
						</h1>
						<p className="text-muted-foreground text-sm">
							{t('projects.description')}
						</p>
					</div>
					<Button
						onClick={() => setAddModalOpen(true)}
						size="default"
						className="shrink-0"
					>
						<Plus className="mr-2 h-5 w-5" />
						{t('projects.addProject')}
					</Button>
				</div>

				<div className="w-full mt-5">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={t('projects.searchPlaceholder')}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
							style={{ marginBottom: 20 }}
						/>
					</div>

					{/* Status */}
					{loading && (
						<div className="flex justify-center items-center py-12 pt-[8rem]">
							<LoadingAnimation
								text={t('projects.loading')}
								icon={
									<FolderKanban className="h-[100px] w-[100px] text-primary" />
								}
							/>
						</div>
					)}
					{error && <div className="text-sm text-red-600">{t('common.error')}: {error}</div>}

					{/* Lista */}
					{!loading && !error && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									{t('projects.projectsFound', { count })}
								</p>
							</div>

							<div className="flex flex-col gap-3 max-h-[calc(100vh-320px)] h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg">
								{projectsForUI.map((project) => (
									<ProjectDisplayItem
										key={project.id}
										project={project}
										onEdit={() => handleEdit(projects.find(p => p.id === project.id))}
										onDelete={() => handleDelete(project.id)}
										getTranslation={getTranslation}
									/>
								))}

								{projectsForUI.length === 0 && (
									<div className="text-sm text-muted-foreground px-1 py-2">
										{t('projects.noProjectsFound')}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</main>

			<AddProjectModal
				open={addModalOpen}
				onOpenChange={setAddModalOpen}
				onSuccess={handleProjectCreated}
			/>

			<EditProjectModal
				open={editModalOpen}
				onOpenChange={setEditModalOpen}
				project={selectedProject}
				onSuccess={handleProjectUpdated}
			/>
		</>
	);
};

export default ProjectsList;
