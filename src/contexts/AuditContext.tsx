
'use client';

import type { ResultRow } from '@/types/audit';
import type { Dispatch, SetStateAction, ReactNode, FC } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';

export type { ResultRow } from '@/types/audit';

interface AuditContextProps {
  results: ResultRow[];
  setResults: Dispatch<SetStateAction<ResultRow[]>>;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  processedUrlsCount: number;
  setProcessedUrlsCount: Dispatch<SetStateAction<number>>;
  googleSheetUrl: string;
  setGoogleSheetUrl: Dispatch<SetStateAction<string>>;
  currentFile: File | null;
  setCurrentFile: Dispatch<SetStateAction<File | null>>;
  totalUrlsToProcess: number;
  setTotalUrlsToProcess: Dispatch<SetStateAction<number>>;
  stopSignal: boolean; // New: Flag to signal audit stop
  setStopSignal: Dispatch<SetStateAction<boolean>>; // New: Setter for stopSignal
}

const AuditContext = createContext<AuditContextProps | undefined>(undefined);

export const AuditProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrlsCount, setProcessedUrlsCount] = useState(0);
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [totalUrlsToProcess, setTotalUrlsToProcess] = useState(0);
  const [stopSignal, setStopSignal] = useState(false); // New state

  const contextValue = useMemo(() => ({
    results, setResults,
    isProcessing, setIsProcessing,
    processedUrlsCount, setProcessedUrlsCount,
    googleSheetUrl, setGoogleSheetUrl,
    currentFile, setCurrentFile,
    totalUrlsToProcess, setTotalUrlsToProcess,
    stopSignal, setStopSignal, // Provide new state and setter
  }), [
    results, isProcessing, processedUrlsCount, googleSheetUrl, currentFile, totalUrlsToProcess, stopSignal
  ]);

  return (
    <AuditContext.Provider value={contextValue}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAuditContext = (): AuditContextProps => {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAuditContext must be used within an AuditProvider');
  }
  return context;
};
