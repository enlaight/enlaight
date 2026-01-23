import { useContext, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import GridLayout from 'react-grid-layout';
import { Button } from "@/components/ui/button";
import { AddChartModal } from "@/components/AddChartModal";
import { EditChartModal } from "@/components/EditChartModal";
import { BoardsService } from "@/services/BoardsService";
import { AuthContext } from "@/contexts/AuthContext";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { SupersetChart } from '@/components/SupersetChart';
import { LayoutDashboard, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const displayFlex = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
}

const cardId = () => {
  // Creates a 13 char random id
  return (Math.random().toString(16) + Math.random().toString(16)).slice(2, 15);
}

const Index = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteChart, setDeleteChart] = useState(false);

  const [selectedChart, setSelected] = useState({});

  const [modalId, setModalId] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalDashId, setModalDashId] = useState('');
  const [modalN8n, setModalN8n] = useState('');
  const [modalHTML, setModalHTML] = useState('');

  const [layout, setLayout] = useState<object[]>([]);

  // Checking for admin role
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "ADMINISTRATOR";

  useEffect(() => {
    setLoading(true);
    const getLayout = async () => {
      try {
        const response = await BoardsService.get();
        const layoutData = JSON.parse(response[0].data);
        setLayout(layoutData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    getLayout();
  }, []);

  const getNextPosition = (layout, cols = 5, defaultW = 2, defaultH = 1) => {
    const gridMap = {};

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

  const addCard = ({ title, subtitle, dashId, n8n, html }) => {
    const position = getNextPosition(layout);
    setLayout(prevLayout => [
      ...prevLayout,
      { i: cardId(), ...position, title, subtitle, dashId, n8n, html }
    ]);
  }

  const updateCard = ({ i, title, subtitle, dashId, n8n, html }) => {
    const updatedLayout = layout.map(item =>
      item['i'] === i ? { ...item, title, subtitle, dashId, n8n, html } : item
    );
    saveLayout(updatedLayout);
  }

  const removeCard = (i) => {
    const updatedLayout = layout.filter(item => item['i'] !== i);
    setLayout(updatedLayout);
  }

  const saveLayout = async (newLayout) => {
    // Creates an easy map to get an item by the id
    const currentLayout = new Map(layout.map(item => [item['i'], item]));

    // Parse through the updated positions array
    const formattedLayout = newLayout.map(newObj => {
      const { i, w, h, x, y } = newObj;
      let { title, subtitle, dashId, n8n, html } = newObj;
      if (!title) {
        const currentObj = currentLayout.get(i);
        if (!currentObj) return { i, w, h, x, y };
        // In case these are not in newObj, we get them from currentObj
        title = currentObj['title'];
        subtitle = currentObj['subtitle'];
        dashId = currentObj['dashId'];
        n8n = currentObj['n8n'];
        html = currentObj['html'];
      }
      // Return a new object with the id, position keys and info
      return { i, w, h, x, y, title, subtitle, dashId, n8n, html };
    });
    setLayout(formattedLayout);

    try {
      await BoardsService.update(JSON.stringify(formattedLayout));
    } catch (err) {
      console.error(err);
    }
  }

  const N8nRender = (props) => {
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

      // If we have a n8n link, we fetch the content
      if (item['n8n']) {
        fetchN8n();
      }
    }, [item]);

    if (!n8nContent) return null;
    return (
      <div
        className="flex w-full" style={{ padding: "3px 5px", background: '#202020', borderRadius: 5 }}
        dangerouslySetInnerHTML={{ __html: n8nContent }}
      />
    )
  }

  return (
    <>
      <main className="container mt-5 pt-20">
        <div className="d-sm-flex" style={displayFlex}>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('dashboard.title')}</h1>
          {isAdmin && (<Button onClick={() => setAddOpen(true)}>{t('dashboard.addNewBoard')}</Button>)}
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              <p className="text-muted-foreground">{t('dashboard.loadingMessage')}...</p>
            </div>
          </div>
        ) : (
          /* Empty Page */
          layout.length === 0 && (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                  <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {t('dashboard.emptyBoard')}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {isAdmin ? t('dashboard.emptyBoardAdmin') : t('dashboard.emptyBoardNoAdmin')}
                  </p>
                </div>
                {isAdmin && (
                  <Button onClick={() => setAddOpen(true)} size="default">
                    <Plus className="mr-2 h-5 w-5" />
                    {t('dashboard.addFirstBoard')}
                  </Button>
                )}
              </div>
            </Card>
          )
        )
        }
        <GridLayout
          className="layout"
          layout={layout}
          cols={5}
          rowHeight={400}
          width={1300}
          draggableHandle='.allow-drag'
          draggableCancel='.stop-drag'
          isDraggable={true}
          isResizable={isAdmin}
          onLayoutChange={(ItemCallback) => saveLayout(ItemCallback)}
        >
          {layout.map(item => {
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
                        setModalTitle(item['title']);
                        setModalSubtitle(item['subtitle']);
                        setModalDashId(item['dashId']);
                        setModalN8n(item['n8n']);
                        setModalHTML(item['html']);
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
                <div className="flex w-full h-full" style={{ marginBottom: 10 }}>
                  <SupersetChart dashboardId={item['dashId']} />
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
      <EditChartModal
        isOpen={editOpen}
        chartId={modalId}
        prevTitle={modalTitle}
        prevSubtitle={modalSubtitle}
        prevDashId={modalDashId}
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

export default Index;
