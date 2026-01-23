import api from "@/services/api";

export interface KnowledgeBase {
  id?: number;
  name: string;
  description?: string | null;
  avatar?: string | null;
  hash_id?: string;
  external_id?: string;
  created_at?: string;
}

export interface KBFile {
  name: string;
  file?: string;
  size?: number;
  uploaded_at?: string;
}

export const KnowledgeBaseService = {
  // List all KBs for a specific project
  async listAll(projectId: string) {
    const params: any = { project_id: projectId };

    const response = await api.get("/kb/list-all/", { params });
    return response.data;
  },

  // Create a new KB
  async create(data: { name: string; description?: string; project_id: string }) {
    const response = await api.post("/kb/create/", data);
    return response.data;
  },

  // Edit an existing KB
  async edit(data: { hash_id: string; name: string; description?: string }) {
    const response = await api.patch("/kb/edit/", data);
    return response.data;
  },

  // Delete a KB
  async delete(hashId: string) {
    const response = await api.delete("/kb/delete/", {
      data: { hash_id: hashId }
    });
    return response.data;
  },

  // List files in a KB
  async listFiles(hashId: string) {
    const response = await api.get(`/kb/files/list/?hash_id=${hashId}`);
    return response.data;
  },

  // Add a file to a KB
  async addFile(hashId: string, projectId: string, file: File) {
    const formData = new FormData();
    formData.append("hash_id", hashId);
    formData.append("project_id", projectId);
    formData.append("file", file);

    const response = await api.post("/kb/file/add/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Delete a file from a KB
  async deleteFile(hashId: string, fileName: string) {
    const response = await api.delete("/kb/file/delete/", {
      data: { hash_id: hashId, file: fileName },
    });
    return response.data;
  },

  // Update (replace) a file in a KB
  async updateFile(hashId: string, projectId: string, newFile: File, oldFileName?: string) {
    const formData = new FormData();
    formData.append("hash_id", hashId);
    formData.append("project_id", projectId);
    formData.append("file", newFile);
    if (oldFileName) {
      formData.append("old_file", oldFileName);
    }

    const response = await api.patch("/kb/file/update/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
