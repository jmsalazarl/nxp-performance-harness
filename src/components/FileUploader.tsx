import { ChangeEvent } from 'react';
import { useFileReader } from '../hooks/useFileReader';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

interface FileUploaderProps {
  onFileLoaded: (text: string, fileName: string) => void;
}

export function FileUploader({ onFileLoaded }: FileUploaderProps) {
  const { readFile, isReading, error } = useFileReader();
  const { t } = useLanguage();

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await readFile(file);
    onFileLoaded(text, file.name);
    event.target.value = '';
  };

  return (
    <label className={styles.fileUploader}>
      <span>{isReading ? t('dashboard.reading') : t('dashboard.loadJson')}</span>
      <input type="file" accept=".json,application/json" onChange={handleChange} disabled={isReading} />
      {error ? <small className={styles.errorText}>{error.message}</small> : null}
    </label>
  );
}
