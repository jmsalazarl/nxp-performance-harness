import { useCallback, useState } from 'react';
import { ParseError } from '../models/errors';
import { ReportModel } from '../models/report';
import { normalize } from '../services/normalize';
import { parseAndValidate } from '../services/parseAndValidate';

export function useReportLoader() {
  const [report, setReport] = useState<ReportModel | null>(null);
  const [error, setError] = useState<ParseError | null>(null);

  const loadFile = useCallback((text: string, fileName: string) => {
    const parsed = parseAndValidate(text);

    if (!parsed.ok) {
      setReport(null);
      setError(parsed.error);
      return parsed;
    }

    const nextReport = normalize(parsed.data, fileName);
    setReport(nextReport);
    setError(null);
    return { ok: true as const, data: nextReport };
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return { loadFile, report, error, reset };
}
