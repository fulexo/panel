'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Check, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (file: {
    id: string;
    filename: string;
    url: string;
    size: number;
  }) => void;
  onUploadError?: (error: string) => void;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  result?: {
    id: string;
    filename: string;
    url: string;
    size: number;
  };
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', 'text/csv'],
  className = '',
}: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeBytes) {
      return `Dosya boyutu ${formatFileSize(maxSizeBytes)} limitini aşıyor`;
    }

    if (acceptedTypes.length > 0) {
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return `Dosya türü desteklenmiyor. İzin verilen türler: ${acceptedTypes.join(', ')}`;
      }
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<void> => {
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError?.(validationError);
      return;
    }

    const upload: UploadProgress = {
      file,
      progress: 0,
      status: 'uploading',
    };

    setUploads(prev => [...prev, upload]);

    try {
      // Step 1: Generate presigned URL
      const response = await fetch('/api/file-upload/generate-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          maxSizeBytes,
        }),
      });

      if (!response.ok) {
        throw new Error('Presigned URL oluşturulamadı');
      }

      const { uploadUrl, key } = await response.json();

      // Step 2: Upload file to S3/MinIO
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Dosya yüklenemedi');
      }

      // Step 3: Confirm upload
      const confirmResponse = await fetch('/api/file-upload/confirm-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          key,
          actualSize: file.size,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Dosya onaylanamadı');
      }

      const result = await confirmResponse.json();

      // Update upload status
      setUploads(prev =>
        prev.map(u =>
          u.file === file
            ? {
                ...u,
                progress: 100,
                status: 'completed',
                result,
              }
            : u
        )
      );

      onUploadComplete?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      setUploads(prev =>
        prev.map(u =>
          u.file === file
            ? {
                ...u,
                progress: 0,
                status: 'error',
                error: errorMessage,
              }
            : u
        )
      );

      onUploadError?.(errorMessage);
    }
  };

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(uploadFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            Dosyaları buraya sürükleyin
          </p>
          <p className="text-sm text-gray-500">
            veya{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              dosya seçin
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Maksimum dosya boyutu: {formatFileSize(maxSizeBytes)}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.file.name}
                  </p>
                  <div className="flex items-center space-x-2">
                    {upload.status === 'uploading' && (
                      <span className="text-xs text-gray-500">
                        {upload.progress}%
                      </span>
                    )}
                    {upload.status === 'completed' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(upload.file)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="mt-2" />
                )}
                
                {upload.status === 'error' && upload.error && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{upload.error}</AlertDescription>
                  </Alert>
                )}
                
                {upload.status === 'completed' && (
                  <p className="text-xs text-green-600 mt-1">
                    Yükleme tamamlandı
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}