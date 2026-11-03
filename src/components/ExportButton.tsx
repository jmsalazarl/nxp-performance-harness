import { ReportModel } from '../models/report';
import { useBlobDownload } from '../hooks/useBlobDownload';
import { exportHtml } from '../services/exportHtml';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

interface ExportButtonProps {
  report: ReportModel | null;
}

function toReportFileName(fileName: string): string {
  const base = fileName.replace(/\.json$/i, '') || 'k6-report';
  return `${base}.html`;
}

export function ExportButton({ report }: ExportButtonProps) {
  const download = useBlobDownload();
  const { language, t } = useLanguage();

  const handleExport = () => {
    if (!report) {
      return;
    }

    download(exportHtml(report, language), toReportFileName(report.fileName), 'text/html;charset=utf-8');
  };

  return (
    <button className={styles.primaryButton} type="button" onClick={handleExport} disabled={!report}>
      {t('dashboard.exportHtml')}
    </button>
  );
}
