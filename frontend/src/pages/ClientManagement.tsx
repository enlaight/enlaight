import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Handshake, Edit, Trash2 } from "lucide-react";
import { listClients, deleteClient } from "@/services/ClientService";
import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import AddClientModal from "@/components/AddClientModal";
import EditClientModal from "@/components/EditClientModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from '@/store/useStore';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LoadingAnimation from "@/components/LoadingAnimation";

const ClientManagement = () => {
  const { t } = useTranslation();
  const { clients: storeClients, update } = useStore() as any;
  const [searchTerm, setSearchTerm] = useState("");

  const [count, setCount] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    if (storeClients?.length > 0) {
      setClients(storeClients);
      setCount(storeClients.length);
    }
    try {
      setLoading(true);
      setError(null);

      const results = await listClients();
      setClients(results);
      setCount(results.length);
      update("clients", results);
    } catch (e) {
      setError(e.message ?? "Error fetching clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async () => {
    if (!deletingClient) return;

    try {
      await deleteClient(deletingClient.id);
      toast.success(t('clientManagement.deleteSuccess'));
      update("clients", []);
      fetchClients();
    } catch (e) {
      toast.error(t('clientManagement.deleteError'));
    } finally {
      setDeletingClient(null);
    }
  };

  return (
    <>
      <main className="container mt-5" role="main" aria-label={t('clientManagement.title')}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Handshake size={24} className="text-primary" />
                {t('clientManagement.title')}
              </h1>
              <p className="text-gray-600 text-sm">{t('clientManagement.titleDesc')}</p>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              {t('clientManagement.addClient')}
            </Button>
          </div>
        </div>

        <div className="space-y-6 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('clientManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status */}
          {loading && (
            <div className="flex justify-center items-center py-12 pt-[8rem]">
              <LoadingAnimation
                text={t('clientManagement.loading')}
                icon={
                  <Handshake className="h-[100px] w-[100px] text-primary" />
                }
              />
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600">Error: {error}</div>
          )}

          {/* List */}
          {!loading && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('clientManagement.clientsFound', { count })}
                </p>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent rounded-lg">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {client.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-base font-semibold text-foreground">
                          {client.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">ID: {client.id}</p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingClient(client)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingClient(client)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {clients.length === 0 && (
                <div className="text-center py-8">
                  <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('clientManagement.noClientsFound')}
                  </h3>
                  <p className="text-muted-foreground">{t('clientManagement.tryAdjusting')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchClients();
        }}
      />

      {editingClient && (
        <EditClientModal
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          client={editingClient}
          onSuccess={() => {
            setEditingClient(null);
            update("clients", []);
            fetchClients();
          }}
        />
      )}

      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clientManagement.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clientManagement.deleteDescription', { name: deletingClient?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('clientManagement.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('clientManagement.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientManagement;
