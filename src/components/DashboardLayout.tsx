import { FileUploader } from './FileUploader';
import { ExportButton } from './ExportButton';
import { KpiGrid } from './KpiGrid';
import { ThresholdTable } from './ThresholdTable';
import { ChartPanel } from './ChartPanel';
import { TestContextBanner } from './TestContextBanner';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useReportContext } from '../context/ReportContext';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

export function DashboardLayout() {
  const { report, error, loadFile, reset } = useReportContext();
  const { t } = useLanguage();

  return (
    <main className={styles.dashboardShell}>
      <header className={styles.toolbar}>
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <div className={styles.toolbarActions}>
          <LanguageSwitcher />
          <FileUploader onFileLoaded={loadFile} />
          <ExportButton report={report} />
          <button className={styles.secondaryButton} type="button" onClick={reset} disabled={!report && !error}>
            {t('dashboard.reset')}
          </button>
        </div>
      </header>

      {error ? (
        <section className={styles.errorPanel} role="alert">
          <strong>{error.type}</strong>
          <p>{error.message}</p>
        </section>
      ) : null}

      {report ? (
        <>
          <TestContextBanner report={report} />
          <KpiGrid kpis={report.kpis} />
          <ThresholdTable thresholds={report.thresholds} />
          <ChartPanel charts={report.charts} />
        </>
      ) : (
        <section className={styles.emptyHero}>
          <h2>{t('dashboard.emptyTitle')}</h2>
          <p>{t('dashboard.emptyText')}</p>
        </section>
      )}
    </main>
  );
}
