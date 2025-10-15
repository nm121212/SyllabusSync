import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UploadState {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'parsing' | 'completed' | 'error';
  result?: any;
  error?: string;
  startTime: number;
}

interface UploadContextType {
  uploads: UploadState[];
  startUpload: (fileName: string) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  updateUploadStatus: (id: string, status: UploadState['status'], result?: any, error?: string) => void;
  clearUpload: (id: string) => void;
  clearAllUploads: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const startUpload = useCallback((fileName: string): string => {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUpload: UploadState = {
      id,
      fileName,
      progress: 0,
      status: 'uploading',
      startTime: Date.now(),
    };
    
    setUploads(prev => [...prev, newUpload]);
    return id;
  }, []);

  const updateUploadProgress = useCallback((id: string, progress: number) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, progress } : upload
    ));
  }, []);

  const updateUploadStatus = useCallback((id: string, status: UploadState['status'], result?: any, error?: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status, result, error } : upload
    ));
  }, []);

  const clearUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const clearAllUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const value: UploadContextType = {
    uploads,
    startUpload,
    updateUploadProgress,
    updateUploadStatus,
    clearUpload,
    clearAllUploads,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};
