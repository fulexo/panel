import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// File upload hooks
export const useFileUpload = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      // Generate presigned URL
      const urlResponse = await fetch('/api/file-upload/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          maxSizeBytes: 10 * 1024 * 1024, // 10MB
        }),
      });

      if (!urlResponse.ok) {
        throw new Error('Presigned URL oluşturulamadı');
      }

      const { uploadUrl, key } = await urlResponse.json();

      // Upload file to S3/MinIO
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      // Confirm upload
      const confirmResponse = await fetch('/api/file-upload/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, actualSize: file.size }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Dosya onaylanamadı');
      }

      return confirmResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useFiles = (params: { page?: number; limit?: number; search?: string } = {}) => {
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => apiClient.getFiles(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useFile = (id: string) => {
  return useQuery({
    queryKey: ['files', id],
    queryFn: () => apiClient.getFile(id),
    enabled: !!id,
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useFileDownloadUrl = (id: string, expiresIn: number = 3600) => {
  return useQuery({
    queryKey: ['files', id, 'download-url', expiresIn],
    queryFn: () => apiClient.getFileDownloadUrl(id, expiresIn),
    enabled: !!id,
    staleTime: expiresIn * 1000 - 60000, // Refresh 1 minute before expiry
  });
};