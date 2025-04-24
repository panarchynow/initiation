"use client";

import { useState, useEffect } from "react";
import { UploadCloud, X, File, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadFieldProps {
  onUpload: (file: File) => Promise<string | null>;
  fileInfo?: {
    name: string;
    size: number;
  } | null;
}

export default function FileUploadField({ onUpload, fileInfo }: FileUploadFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // If external fileInfo is provided, use it to display even without local file
  const hasFileInfo = !!fileInfo || !!file;
  
  // Start upload automatically when file is selected
  useEffect(() => {
    if (file) {
      handleUpload();
    }
  }, [file]);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  // Validate file before setting
  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage("");
    
    // Check file size (max 1 MiB)
    if (selectedFile.size > 1048576) {
      setErrorMessage("File size must be less than 1 MiB");
      return;
    }
    
    setFile(selectedFile);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setErrorMessage("");
    
    try {
      await onUpload(file);
    } catch (error) {
      setErrorMessage("Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setFile(null);
    setErrorMessage("");
  };
  
  // Handle keyboard events for accessibility
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      document.getElementById("file-upload")?.click();
    }
  };

  // Determine what file info to display
  const displayedFile = file || fileInfo ? {
    name: file?.name || fileInfo?.name || "",
    size: file?.size || fileInfo?.size || 0,
  } : null;

  return (
    <div className="space-y-4">
      {!hasFileInfo ? (
        <button
          type="button"
          className={`border-2 border-dashed rounded-lg p-8 text-center w-full
            ${isDragging ? "border-primary bg-primary/5" : "border-border"}
            hover:border-primary/50 hover:bg-secondary/50 transition-colors`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
          aria-label="Click to select a file"
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drag & drop file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max file size: 1 MiB
              </p>
            </div>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="*/*" // Accept any file type
          />
        </button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                <File className="h-5 w-5 text-foreground" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{displayedFile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(displayedFile?.size ? (displayedFile.size / 1024).toFixed(1) : "0")} KB
                </p>
              </div>
            </div>
            {file && ( // Only show remove button if we have a local file
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mr-2" />
          {errorMessage}
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-center text-sm text-primary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading to IPFS...
        </div>
      )}
    </div>
  );
}