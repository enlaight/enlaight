import { useContext, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import GridLayout from 'react-grid-layout';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddChartModal } from "@/components/AddChartModal";
import { AddBoardModal } from "@/components/AddBoardModal";
import { EditChartModal } from "@/components/EditChartModal";
import { BoardsService } from "@/services/BoardsService";
import { AuthContext } from "@/contexts/AuthContext";
import { useStore } from "@/store/useStore";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import QuickChartGraph from '@/components/QuickChartGraph';
import { LayoutDashboard, Plus, SquareX } from "lucide-react";
import { useTranslation } from "react-i18next";
import LoadingAnimation from "@/components/LoadingAnimation";

type LayoutItem = { i: string; w: number; h: number; x: number; y: number; title?: string; subtitle?: string; n8n?: string; html?: string };
type Board = { id: string; project_id: string; client_id: string; config: string };

const cardId = () => {
  // Creates a 13 char random id
  return (Math.random().toString(16) + Math.random().toString(16)).slice(2, 15);
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addBoardOpen, setAddBoardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteChart, setDeleteChart] = useState(false);

  const [selectedChart, setSelected] = useState<any>(null);

  const [modalId, setModalId] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalN8n, setModalN8n] = useState('');
  const [modalHTML, setModalHTML] = useState('');

  const [boards, setBoards] = useState<Board[]>([]);
  const [layouts, setLayouts] = useState<LayoutItem[][]>([]);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);

  // Checking for admin role
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "ADMINISTRATOR";

  const projects = useStore((s) => s.projects);

  const activeLayout: LayoutItem[] = layouts[activeBoardIndex] ?? [];
  const activeBoardId = boards[activeBoardIndex]?.id ?? '';

  const projectName = (projectId: string) => {
    const proj = projects.find((p: any) => p.id === projectId);
    return proj?.name ?? projectId;
  };

  const setActiveLayout = (newLayout: LayoutItem[]) => {
    setLayouts((prev) => prev.map((l, i) => (i === activeBoardIndex ? newLayout : l)));
  };

  const availableProjects = isAdmin
    ? projects
    : projects.filter((p: any) => !boards.some((b) => b.project_id === p.id));

  const createBoard = async (projectId: string) => {
    try {
      const newBoard = await BoardsService.create(projectId);
      setBoards((prev) => [...prev, newBoard as Board]);
      setLayouts((prev) => [...prev, []]);
      setActiveBoardIndex(boards.length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    const getLayout = async () => {
      try {
        const response = await BoardsService.get();
        const fetched: Board[] = Array.isArray(response) ? response : [];
        const parsedLayouts: LayoutItem[][] = fetched.map((b) => {
          if (!b.config) return [];
          try {
            const data = JSON.parse(b.config);
            return Array.isArray(data) ? data : [];
          } catch {
            return [];
          }
        });
        setBoards(fetched);
        setLayouts(parsedLayouts);
        setActiveBoardIndex(0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    getLayout();
  }, []);

  const getNextPosition = (layout: any[], cols = 5, defaultW = 2, defaultH = 1) => {
    const gridMap: Record<string, boolean> = {};

    // Creating gridmap
    layout.forEach(({ x, y, w, h }) => {
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          const key = `${x + dx},${y + dy}`;
          gridMap[key] = true;
        }
      }
    });

    // Localize first empty space that fits new item
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= cols - defaultW; x++) {
        let fits = true;
        for (let dx = 0; dx < defaultW; dx++) {
          for (let dy = 0; dy < defaultH; dy++) {
            if (gridMap[`${x + dx},${y + dy}`]) {
              fits = false;
              break;
            }
          }
          if (!fits) break;
        }
        if (fits) {
          return { x, y, w: defaultW, h: defaultH };
        }
      }
    }
    // Returns first position, if no other available
    return { x: 0, y: 0, w: defaultW, h: defaultH };
  }

  const addCard = ({ title, subtitle, n8n, html }: { title?: string; subtitle?: string; n8n?: string; html?: string }) => {
    
    const position = getNextPosition(activeLayout);
    setActiveLayout([
      ...activeLayout,
      { i: cardId(), ...position, title, subtitle, n8n, html },
    ]);
  }

  const updateCard = ({ i, title, subtitle, n8n, html }: { i: string; title?: string; subtitle?: string; n8n?: string; html?: string }) => {
    const updatedLayout = activeLayout.map((item) =>
      item['i'] === i ? { ...item, title, subtitle, n8n, html } : item
    );
    saveLayout(updatedLayout);
  }

  const removeCard = (i: string) => {
    const updatedLayout = activeLayout.filter((item) => item['i'] !== i);
    setActiveLayout(updatedLayout);
  }

  const saveLayout = async (newLayout: any[]) => {
    if (!activeBoardId) return;
    const currentLayout = new Map(activeLayout.map((item) => [item['i'], item]));

    const formattedLayout = newLayout.map((newObj: any) => {
      const { i, w, h, x, y } = newObj;
      let { title, subtitle, n8n, html } = newObj;
      if (!title) {
        const currentObj = currentLayout.get(i);
        if (!currentObj) return { i, w, h, x, y };
        title = currentObj.title;
        subtitle = currentObj.subtitle;
        n8n = currentObj.n8n;
        html = currentObj.html;
      }
      return { i, w, h, x, y, title, subtitle, n8n, html };
    });
    setActiveLayout(formattedLayout);

    try {
      await BoardsService.update(JSON.stringify(formattedLayout), activeBoardId);
    } catch (err) {
      console.error(err);
    }
  }

  const N8nRender = (props: any) => {
    const { item } = props;
    const [n8nContent, setN8nContent] = useState('');

    useEffect(() => {
      const fetchN8n = async () => {
        try {
          const response = await fetch(item['n8n']);
          const data = await response.json();
          if (data.status === "success") {
            setN8nContent(data.content);
          }
        } catch (err) {
          console.error(`Error at fetching n8n webhook for item "${item['title']}" (${item['i']}): ${err}`)
        }
      }

      // If we have a n8n webhook, we fetch the content
      // to display as a graph
      if (item['n8n']) {
        fetchN8n();
      }
    }, [item]);

    if (!n8nContent) return null;
    return (
      <QuickChartGraph data={n8nContent} />
    );

  }

  return (
    <>
      <main className="container pt-5 bg-[#F4F4F5] flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('dashboard.description')}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setAddBoardOpen(true)} size="default">
              <Plus className="mr-2 h-5 w-5" />
              {t('dashboard.addNewBoard')}
            </Button>
          )}
        </div>
        {boards.length > 1 && (
          <Tabs
            value={String(activeBoardIndex)}
            onValueChange={(val) => setActiveBoardIndex(Number(val))}
            className="mt-4"
          >
            <TabsList className="flex flex-wrap h-auto justify-start">
              {boards.map((b, i) => (
                <TabsTrigger key={b.id} value={String(i)}>
                  {projectName(b.project_id)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        {isLoading ? (
          <div className="h-full flex justify-center items-start pt-[8rem] pb-[3rem] relative">
            <LoadingAnimation
              icon={<LayoutDashboard className="h-[100px] w-[100px] text-primary" />}
              text={<span>{t('dashboard.loadingMessage')}</span>}
            />
          </div>
        ) : (
          /* Empty Page */
          activeLayout.length === 0 && (
            <div className="flex align-center justify-center mb-5 w-full h-[80%]">
              <div className="flex flex-col align-center justify-center items-center gap-5 text-center space-y-4">
                <div className="mx-auto w-24 h-24 bg-[#EAEAEA] rounded-full flex items-center justify-center">
                  <SquareX className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {t('dashboard.emptyBoard')}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {isAdmin ? t('dashboard.emptyBoardAdmin') : t('dashboard.emptyBoardNoAdmin')}
                  </p>
                </div>
                {isAdmin && availableProjects.length > 0 && (
                  <Button onClick={() => setAddBoardOpen(true)} size="default">
                    <Plus className="mr-2 h-5 w-5" />
                    {t('dashboard.addFirstBoard')}
                  </Button>
                )}
              </div>
            </div>
          )
        )}
        <GridLayout
          key={activeBoardId || 'empty'}
          className="layout"
          layout={activeLayout}
          cols={5}
          rowHeight={400}
          width={1300}
          draggableHandle='.allow-drag'
          draggableCancel='.stop-drag'
          isDraggable={true}
          isResizable={isAdmin}
          onLayoutChange={(ItemCallback: any) => saveLayout(ItemCallback)}
        >
          {activeLayout.map((item) => {
            return (
              <div
                key={item['i']}
                className="flex justify-center items-center p-2 relative rounded border border-dark"
                style={{ backgroundColor: '#f9f9f9', flexDirection: 'column', gap: 10 }}
              >
                {isAdmin && (
                  <div className="flex absolute"
                    style={{ top: 5, right: 5 }}
                  >
                    <div className="me-1 mt-1 material-symbols-outlined stop-drag"
                      style={{ color: '#9e9e9e', fontSize: 18, cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => {
                        setSelected(item);
                        setDeleteChart(true);
                      }}
                    >
                      delete
                    </div>
                    <div className="me-1 mt-1 material-symbols-outlined stop-drag"
                      style={{ color: '#9e9e9e', fontSize: 18, cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => {
                        setModalId(item['i']);
                        setModalTitle(item['title'] ?? '');
                        setModalSubtitle(item['subtitle'] ?? '');
                        setModalN8n(item['n8n'] ?? '');
                        setModalHTML(item['html'] ?? '');
                        setEditOpen(true);
                      }}
                    >
                      edit_square
                    </div>
                    <div className="me-1 mt-1 material-symbols-outlined allow-drag"
                      style={{ color: '#9e9e9e', fontSize: 18, cursor: 'grab', userSelect: 'none' }}
                    >
                      drag_indicator
                    </div>
                  </div>
                )}
                <div className="flex items-start" style={{ flexDirection: 'column', width: '100%', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{item['title']}</div>
                  <div style={{ fontSize: 13, lineHeight: 1 }}>{item['subtitle']}</div>
                </div>
                <N8nRender item={item} />
                {item['html'] && (
                  <div
                    className="flex w-full"
                    dangerouslySetInnerHTML={{ __html: item['html'] }}
                  />
                )}
              </div>
            )
          })}
        </GridLayout>
      </main>
      <AddChartModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => addCard(data)}
      />
      <AddBoardModal
        isOpen={addBoardOpen}
        onClose={() => setAddBoardOpen(false)}
        onSave={(projectId) => createBoard(projectId)}
        availableProjects={availableProjects}
      />
      <EditChartModal
        isOpen={editOpen}
        chartId={modalId}
        prevTitle={modalTitle}
        prevSubtitle={modalSubtitle}
        prevN8n={modalN8n}
        prevHTML={modalHTML}
        onClose={() => setEditOpen(false)}
        onSave={(data) => updateCard(data)}
      />
      {selectedChart && (
        <Dialog open={deleteChart} onOpenChange={() => setDeleteChart(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] bg-background border border-border">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
              <DialogTitle className="text-xl font-semibold text-foreground">{t('dashboard.deleteTitle', { chartTitle: selectedChart['title'] })}</DialogTitle>
            </DialogHeader>
            <div>{t('dashboard.deleteMessage')}</div>
            <div className="flex items-center" style={{ justifyContent: 'flex-end', gap: 15 }}>
              <Button variant='secondary' onClick={() => setDeleteChart(false)}>{t('dashboard.cancel')}</Button>
              <Button onClick={() => { removeCard(selectedChart['i']); setDeleteChart(false); }}>{t('dashboard.deleteChart')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DashboardPage;
