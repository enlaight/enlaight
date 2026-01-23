import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ProjectService } from "@/services/ProjectService";
import { listClients } from "@/services/ClientService";
import type { Client } from "@/types/client";
import type { Project } from "@/types/project";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  client_id: z.string().min(1, "Client is required"),
});

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess: () => void;
}

export const EditProjectModal = ({
  open,
  onOpenChange,
  project,
  onSuccess,
}: EditProjectModalProps) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      client_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  useEffect(() => {
    if (project) {
      const clientId = typeof project.client === "string"
        ? project.client
        : project.client?.id || project.client_id || "";

      form.reset({
        name: project.name,
        description: project.description || "",
        client_id: clientId,
      });
    }
  }, [project, form]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const data = await listClients();
      setClients(data);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('projects.loadClientsFailed'),
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!project) return;

    try {
      setLoading(true);

      await ProjectService.edit(project.id, {
        name: values.name,
        description: values.description,
        client_id: values.client_id,
      });

      toast({
        title: t('common.success'),
        description: t('projects.updateSuccess'),
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || t('projects.updateFailed');
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const clientName = project?.client || t('projects.selectClient');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('projects.editProject')}</DialogTitle>
          <DialogDescription>
            {t('projects.editProjectDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.projectName')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('projects.enterProjectName')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.projectDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('projects.enterDescription')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.client')} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingClients}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value || t('projects.selectClient')}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                {t('projects.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('projects.updating') : t('projects.update')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
