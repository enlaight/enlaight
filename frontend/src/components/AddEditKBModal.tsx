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
import { useToast } from "@/hooks/use-toast";
import { KnowledgeBaseService } from "@/services/KnowledgeBaseService";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

interface KnowledgeBase {
  hash_id: string;
  name: string;
  description?: string;
}

interface AddEditKBModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  knowledgeBase?: KnowledgeBase | null;
  onSuccess: (kb: KnowledgeBase) => void;
}

export const AddEditKBModal = ({
  open,
  onOpenChange,
  projectId,
  knowledgeBase,
  onSuccess,
}: AddEditKBModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEdit = !!knowledgeBase;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (knowledgeBase) {
      form.reset({
        name: knowledgeBase.name,
        description: knowledgeBase.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [knowledgeBase, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (isEdit && knowledgeBase) {
        await KnowledgeBaseService.edit({
          hash_id: knowledgeBase.hash_id!,
          name: values.name,
          description: values.description,
        });

        onSuccess({
          hash_id: knowledgeBase.hash_id,
          name: values.name,
          description: values.description,
        });

        toast({
          title: "Success",
          description: "Knowledge base updated successfully",
        });
      } else {
        const response = await KnowledgeBaseService.create({
          name: values.name,
          description: values.description,
          project_id: projectId,
        });

        onSuccess({
          hash_id: response.hash_id,
          name: values.name,
          description: values.description,
        });

        toast({
          title: "Success",
          description: "Knowledge base created successfully",
        });
      }

      form.reset();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || `Failed to ${isEdit ? "update" : "create"} knowledge base`;
      toast({
        title: "Error",
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Knowledge Base" : "Add Knowledge Base"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the knowledge base information."
              : "Create a new knowledge base to organize your content."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter knowledge base name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description (optional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
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
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
