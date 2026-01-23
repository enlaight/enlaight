import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, Trash2, AlertCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KnowledgeBaseService, KBFile } from "@/services/KnowledgeBaseService";

interface KnowledgeBase {
  hash_id?: string;
  external_id?: string;
  name: string;
  description?: string;
}

interface ManageFilesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase: KnowledgeBase | null;
  projectId: string;
}

export const ManageFilesModal = ({
  open,
  onOpenChange,
  knowledgeBase,
  projectId,
}: ManageFilesModalProps) => {
  const [files, setFiles] = useState<(KBFile | string)[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getHashId = () => knowledgeBase?.hash_id || knowledgeBase?.external_id || "";

  const fetchFiles = async () => {
    const hashId = getHashId();
    if (!hashId) return;

    try {
      setLoading(true);
      const response = await KnowledgeBaseService.listFiles(hashId);

      // Handle different response formats
      let fileList: KBFile[] = [];
      if (response.files && Array.isArray(response.files)) {
        // If files is an array of strings, convert to objects
        fileList = response.files.map((file: any) => {
          if (typeof file === 'string') {
            return { name: file, file: file };
          }
          return file;
        });
      } else if (response.file) {
        fileList = [{ name: response.file, file: response.file }];
      } else if (Array.isArray(response)) {
        // If response is an array of strings, convert to objects
        fileList = response.map((file: any) => {
          if (typeof file === 'string') {
            return { name: file, file: file };
          }
          return file;
        });
      }
      setFiles(fileList);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to fetch files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && knowledgeBase) {
      fetchFiles();
    }
  }, [open, knowledgeBase]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    const hashId = getHashId();
    if (!selectedFiles || !hashId || !projectId) return;

    setUploading(true);

    // Upload files one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      try {
        await KnowledgeBaseService.addFile(hashId, projectId, file);

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
        });
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || `Failed to upload ${file.name}`;
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    fetchFiles();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdateFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    const hashId = getHashId();
    if (!selectedFiles || !selectedFiles[0] || !hashId || !projectId || !editingFile) return;

    const newFile = selectedFiles[0];

    try {
      setUploading(true);
      await KnowledgeBaseService.updateFile(hashId, projectId, newFile, editingFile);

      toast({
        title: "Success",
        description: "File updated successfully",
      });

      fetchFiles();
      setEditingFile(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Failed to update file";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    const hashId = getHashId();
    if (!hashId) return;

    try {
      const response = await KnowledgeBaseService.deleteFile(hashId, fileName);

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      // Add a small delay to ensure backend processing completes
      setTimeout(() => {
        fetchFiles();
      }, 500);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";

    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Files</DialogTitle>
          <DialogDescription>
            Upload and manage files for "{knowledgeBase?.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Upload Section */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <input
              ref={editFileInputRef}
              type="file"
              onChange={handleUpdateFile}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !projectId}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </>
              )}
            </Button>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : files.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No files found. Upload some files to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => {
                  // Normalize whether API returned strings or objects
                  const actualFileId =
                    typeof file === "string"
                      ? file
                      : file.file || file.name || `file-${index}`;
                  const displayName =
                    typeof file === "string"
                      ? file
                      : file.name || file.file || `file-${index}`;

                  return (
                    <Card key={`${actualFileId}-${index}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <File className="h-8 w-8 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{displayName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize((file as KBFile).size)} • {formatDate((file as KBFile).uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingFile(actualFileId);
                                editFileInputRef.current?.click();
                              }}
                              disabled={uploading}
                              title="Update file"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFile(actualFileId)}
                              className="text-destructive hover:text-destructive"
                              title="Delete file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
