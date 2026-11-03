import { useCallback, useState } from 'react';

export function useFileReader() {
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const readFile = useCallback((file: File): Promise<string> => {
    setIsReading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        setIsReading(false);
        resolve(String(reader.result ?? ''));
      };

      reader.onerror = () => {
        const nextError = reader.error ?? new Error('Unable to read file');
        setIsReading(false);
        setError(nextError);
        reject(nextError);
      };

      reader.readAsText(file);
    });
  }, []);

  return { readFile, isReading, error };
}
