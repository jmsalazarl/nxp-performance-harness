import { ReportModel } from '../models/report';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

interface TestContextBannerProps {
  report: ReportModel;
}

export function TestContextBanner({ report }: TestContextBannerProps) {
  const { t } = useLanguage();

  return (
    <section className={styles.contextBanner} aria-label={t('dashboard.testContext')}>
      <div>
        <span className={styles.eyebrow}>{t('dashboard.sourceFile')}</span>
        <strong>{report.fileName}</strong>
      </div>
      <span className={styles.testBadge}>{report.testType}</span>
    </section>
  );
}
