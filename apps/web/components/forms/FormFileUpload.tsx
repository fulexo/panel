import { forwardRef, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, File } from 'lucide-react';

interface FormFileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  onFilesChange?: (files: File[]) => void;
}

export const FormFileUpload = forwardRef<HTMLInputElement, FormFileUploadProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    accept, 
    multiple = false, 
    maxFiles = 5, 
    maxSize = 10,
    onFilesChange,
    className, 
    ...props 
  }, ref) => {
    const [files, setFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        if (file.size > maxSize * 1024 * 1024) {
          errors.push(`${file.name} is too large (max ${maxSize}MB)`);
        } else if (validFiles.length < maxFiles) {
          validFiles.push(file);
        } else {
          errors.push(`Maximum ${maxFiles} files allowed`);
        }
      });

      if (errors.length > 0) {
        console.warn('File upload errors:', errors);
      }

      const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files);
      }
    };

    const removeFile = (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index);
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    };

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <div className="space-y-3">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-foreground ml-1">*</span>}
          </label>
        )}
        
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            dragActive 
              ? 'border-border bg-accent/5' 
              : 'border-border hover:border-border',
            error && 'border-border',
            className
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={ref || fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            {...props}
          />
          
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-foreground mb-1">
              {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">
              {accept ? `Accepted formats: ${accept}` : 'Any file type'} • Max {maxSize}MB • Max {maxFiles} files
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Selected files:</p>
            <div className="space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-foreground hover:text-muted-foreground p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-foreground">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FormFileUpload.displayName = 'FormFileUpload';
