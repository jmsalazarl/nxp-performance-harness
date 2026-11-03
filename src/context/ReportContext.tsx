import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { ParseError } from '../models/errors';
import { ReportModel } from '../models/report';
import { parseAndValidate } from '../services/parseAndValidate';
import { normalize } from '../services/normalize';

interface ReportContextValue {
  report: ReportModel | null;
  error: ParseError | null;
  loadFile: (text: string, fileName: string) => void;
  reset: () => void;
}

export const ReportContext = createContext<ReportContextValue | null>(null);

interface ReportProviderProps {
  children: ReactNode;
}

export function ReportProvider({ children }: ReportProviderProps) {
  const [report, setReport] = useState<ReportModel | null>(null);
  const [error, setError] = useState<ParseError | null>(null);

  const loadFile = (text: string, fileName: string) => {
    const parsed = parseAndValidate(text);

    if (!parsed.ok) {
      setReport(null);
      setError(parsed.error);
      return;
    }

    setReport(normalize(parsed.data, fileName));
    setError(null);
  };

  const reset = () => {
    setReport(null);
    setError(null);
  };

  const value = useMemo(
    () => ({ report, error, loadFile, reset }),
    [report, error],
  );

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReportContext(): ReportContextValue {
  const context = useContext(ReportContext);

  if (!context) {
    throw new Error('useReportContext must be used within ReportProvider');
  }

  return context;
}
