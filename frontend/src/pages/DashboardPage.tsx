import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgentsChat } from "@/contexts/AgentsChatContext";
import { AssistantPickerModal } from "@/components/AssistantPickerModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import GridLayout from 'react-grid-layout';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddChartModal } from "@/components/AddChartModal";
import { EditChartModal } from "@/components/EditChartModal";
import { BoardsService } from "@/services/BoardsService";
import { AuthContext } from "@/contexts/AuthContext";
import { useStore } from "@/store/useStore";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import QuickChartGraph from '@/components/QuickChartGraph';
import { CalendarIcon, LayoutDashboard, Plus, SquareX, ChartColumnBig, RefreshCw, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EnlaightBotFilled } from "@/assets/svgs";
import { Card } from "@/components/ui/card";

type LayoutItem = { i: string; w: number; h: number; x: number; y: number; title?: string; subtitle?: string; n8n?: string; html?: string };
type Board = { id: string; project_id: string; client_id: string; config: string };

const cardId = () => {
  // Creates a 13 char random id
  return (Math.random().toString(16) + Math.random().toString(16)).slice(2, 15);
}

const parseConfig = (config?: string): LayoutItem[] => {
  if (!config) return [];
  try {
    const data = JSON.parse(config);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const N8nRender = ({ item, startDate, endDate, onLoaded }: { item: any; startDate: Date; endDate: Date; onLoaded?: (itemId: string, content: any) => void }) => {
  const { t } = useTranslation();
  const [n8nContent, setN8nContent] = useState<any>('');
  const [message, setMessage] = useState<any>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchN8n = async () => {
      setLoading(true);
      setMessage('');
      try {
        const url = new URL(item['n8n']);
        url.searchParams.set('startDate', format(startDate, 'yyyy-MM-dd'));
        url.searchParams.set('endDate', format(endDate, 'yyyy-MM-dd'));
        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status === "success" && !data.message) {
          setN8nContent(data.content);
          onLoaded?.(item['i'], data.content);
        }

        if (data.message) {
          setMessage(data.message);
        }
      } finally {
        setLoading(false);
      }
    }

    if (item['n8n']) {
      fetchN8n();
    }
  }, [item['n8n'], startDate, endDate]);

  if (loading) return (
    <Card className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col gap-5 w-[50%] items-center justify-center text-center">
        <div className="flex items-center justify-center bg-secondary rounded-full p-5">
          <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
        </div>
        <div className="font-normal text-muted-foreground text-sm">{t('dashboard.loadingData')}</div>
      </div>
    </Card>
  );
  if (message) return (
    <Card className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col gap-5 w-[50%] items-center justify-center text-center">
        <div className="flex items-center justify-center bg-secondary rounded-full p-5">
        <ChartColumnBig className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="font-normal text-muted-foreground text-sm">{t('dashboard.noData')}</div>
      </div>
    </Card>
  );
  if (!n8nContent) return null;
  return (
    <QuickChartGraph content={n8nContent} />
  );
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteChart, setDeleteChart] = useState(false);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(startDate);
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(endDate);
  const { projects, boards, activeBoard, update } = useStore();

  const [selectedChart, setSelected] = useState<any>(null);

  const [modalId, setModalId] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalN8n, setModalN8n] = useState('');
  const [modalHTML, setModalHTML] = useState('');

  const [activeLayout, setActiveLayout] = useState<LayoutItem[]>([]);
  const creatingRef = useRef<Set<string>>(new Set());

  const [n8nContents, setN8nContents] = useState<Record<string, any>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerContent, setPickerContent] = useState<any>(null);

  const navigate = useNavigate();
  const { openModal: openAgentChat } = useAgentsChat();

  const handleN8nLoaded = useCallback((itemId: string, content: any) => {
    setN8nContents((prev: Record<string, any>) => (prev[itemId] === content ? prev : { ...prev, [itemId]: content }));
  }, []);

  const handlePickAssistant = (agentId: string) => {
    const prompt = `Please analyze the following data:\n\n${JSON.stringify(pickerContent, null, 2)}`;
    setPickerOpen(false);
    setPickerContent(null);
    openAgentChat(agentId, undefined, undefined, prompt);
    navigate('/');
  };

  // Checking for admin role
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "ADMINISTRATOR";

  const projectName = (projectId: string) => {
    const proj = projects.find((p: any) => p.id === projectId);
    return proj?.name ?? projectId;
  };

  const availableProjects = isAdmin
    ? projects
    : projects.filter((p: any) => !boards.some((b: Board) => b.project_id === p.id));

  useEffect(() => {
    if (boards.length === 0) {
      (async () => {
        try {
          const response = await BoardsService.get();
          const fetched: Board[] = Array.isArray(response) ? response : [];
          update("boards", fetched);
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (!activeBoard && projects.length > 0) {
      update("activeBoard", projects[0].id);
    }
  }, [activeBoard, projects]);

  const selectedBoard = boards.find((b: Board) => b.project_id === activeBoard);

  useEffect(() => {
    setActiveLayout(parseConfig(selectedBoard?.config));
  }, [activeBoard, selectedBoard?.config]);

  const getNextPosition = (layout: any[], cols = 5, defaultW = 2, defaultH = 1) => {
    const gridMap: Record<string, boolean> = {};

    layout.forEach(({ x, y, w, h }) => {
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          gridMap[`${x + dx},${y + dy}`] = true;
        }
      }
    });

    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= cols - defaultW; x++) {
        let fits = true;
        for (let dx = 0; dx < defaultW; dx++) {
          for (let dy = 0; dy < defaultH; dy++) {
            if (gridMap[`${x + dx},${y + dy}`]) { fits = false; break; }
          }
          if (!fits) break;
        }
        if (fits) return { x, y, w: defaultW, h: defaultH };
      }
    }
    return { x: 0, y: 0, w: defaultW, h: defaultH };
  }

  // Persist a known-good layout for the current board. All callers must pass the
  // fully-built layout so this function never reads stale closure state.
  const persist = async (layout: LayoutItem[]) => {
    if (!activeBoard) return;
    const config = JSON.stringify(layout);
    const currentBoards: Board[] = useStore.getState().boards;
    const existing = currentBoards.find((b: Board) => b.project_id === activeBoard);

    try {
      if (existing) {
        await BoardsService.update(config, activeBoard);
        const latest: Board[] = useStore.getState().boards;
        update("boards", latest.map((b: Board) =>
          b.project_id === activeBoard ? { ...b, config } : b
        ));
      } else {
        if (layout.length === 0) return;
        if (creatingRef.current.has(activeBoard)) return;
        creatingRef.current.add(activeBoard);
        try {
          const created = await BoardsService.create(activeBoard, config);
          const latest: Board[] = useStore.getState().boards;
          update("boards", [...latest, created]);
        } finally {
          creatingRef.current.delete(activeBoard);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  const addCard = ({ title, subtitle, n8n, html }: { title?: string; subtitle?: string; n8n?: string; html?: string }) => {
    const position = getNextPosition(activeLayout);
    const newLayout: LayoutItem[] = [
      ...activeLayout,
      { i: cardId(), ...position, title, subtitle, n8n, html },
    ];
    setActiveLayout(newLayout);
    persist(newLayout);
  }

  const updateCard = ({ i, title, subtitle, n8n, html }: { i: string; title?: string; subtitle?: string; n8n?: string; html?: string }) => {
    const newLayout = activeLayout.map((item: LayoutItem) =>
      item.i === i ? { ...item, title, subtitle, n8n, html } : item
    );
    setActiveLayout(newLayout);
    persist(newLayout);
  }

  const removeCard = (i: string) => {
    const newLayout = activeLayout.filter((item: LayoutItem) => item.i !== i);
    setActiveLayout(newLayout);
    persist(newLayout);
  }

  // Merge new positions from react-grid-layout into our items, preserving metadata.
  const mergePositions = (positions: any[], base: LayoutItem[]): LayoutItem[] =>
    base.map(item => {
      const pos = positions.find((p: any) => p.i === item.i);
      return pos ? { ...item, x: pos.x, y: pos.y, w: pos.w, h: pos.h } : item;
    });

  const changeTabs = (projectId?: string) => {
    update("activeBoard", projectId ?? "");
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
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className="w-40 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  month={startDate}
                  onSelect={(date: Date | undefined) => date && setStartDate(date)}
                  onMonthChange={(month: Date) => {
                    const next = new Date(month.getFullYear(), month.getMonth(), startDate.getDate());
                    setStartDate(next);
                    setAppliedStartDate(next);
                  }}
                  captionLayout="dropdown-buttons"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className="w-40 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  month={endDate}
                  onSelect={(date: Date | undefined) => date && setEndDate(date)}
                  onMonthChange={(month: Date) => {
                    const next = new Date(month.getFullYear(), month.getMonth(), endDate.getDate());
                    setEndDate(next);
                    setAppliedEndDate(next);
                  }}
                  captionLayout="dropdown-buttons"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              disabled={
                startDate.getTime() === appliedStartDate.getTime() &&
                endDate.getTime() === appliedEndDate.getTime()
              }
              onClick={() => {
                setAppliedStartDate(startDate);
                setAppliedEndDate(endDate);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button onClick={() => setAddOpen(true)} size="default">
                <Plus className="mr-2 h-5 w-5" />
                {t('dashboard.addNewBoard')}
              </Button>
            )}
          </div>
        </div>
        {isAdmin && projects.length > 0 && (
          <Tabs
            value={activeBoard}
            onValueChange={(val) => changeTabs(val)}
            className="mt-4"
          >
            <TabsList className="flex flex-wrap h-auto justify-start">
              {projects.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        {activeLayout.length === 0 && (
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
                <Button onClick={() => setAddOpen(true)} size="default">
                  <Plus className="mr-2 h-5 w-5" />
                  {t('dashboard.addFirstBoard')}
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg mt-4">
        <GridLayout
          key={activeBoard || 'empty'}
          className="layout"
          layout={activeLayout}
          cols={5}
          rowHeight={400}
          width={1300}
          draggableHandle='.allow-drag'
          draggableCancel='.stop-drag'
          isDraggable={true}
          isResizable={isAdmin}
          onLayoutChange={(positions: any[]) => {
            setActiveLayout((prev: LayoutItem[]) => mergePositions(positions, prev));
          }}
          onDragStop={(positions: any[]) => {
            const merged = mergePositions(positions, activeLayout);
            setActiveLayout(merged);
            persist(merged);
          }}
          onResizeStop={(positions: any[]) => {
            const merged = mergePositions(positions, activeLayout);
            setActiveLayout(merged);
            persist(merged);
          }}
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
                    {item['n8n'] && n8nContents[item['i']] && (
                      <div
                        className="stop-drag"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => {
                          setPickerContent(n8nContents[item['i']]);
                          setPickerOpen(true);
                        }}
                      >
                        <EnlaightBotFilled className="me-1 mt-[0.15rem]"
                          size={18}
                          fill="#9e9e9e"
                        />
                      </div>
                    )}
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
                <N8nRender item={item} startDate={appliedStartDate} endDate={appliedEndDate} onLoaded={handleN8nLoaded} />
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
        </div>
      </main>
      <AssistantPickerModal
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerContent(null); }}
        onSelect={handlePickAssistant}
      />
      <AddChartModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data) => addCard(data)}
        projectName={projectName(activeBoard)}
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
        projectName={projectName(activeBoard)}
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
