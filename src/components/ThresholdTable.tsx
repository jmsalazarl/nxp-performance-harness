import { ThresholdResult } from '../models/report';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

interface ThresholdTableProps {
  thresholds: ThresholdResult[];
}

export function ThresholdTable({ thresholds }: ThresholdTableProps) {
  const { t } = useLanguage();

  return (
    <section className={styles.section} aria-labelledby="threshold-heading">
      <h2 id="threshold-heading">{t('dashboard.thresholds')}</h2>
      {thresholds.length === 0 ? (
        <p className={styles.emptyState}>{t('dashboard.noThresholds')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.thresholdTable}>
            <thead>
              <tr>
                <th>{t('dashboard.metric')}</th>
                <th>{t('dashboard.expression')}</th>
                <th>{t('dashboard.status')}</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((threshold) => (
                <tr key={`${threshold.metric}-${threshold.expression}`}>
                  <td>{threshold.metric}</td>
                  <td>{threshold.expression}</td>
                  <td>
                    <span className={threshold.passed ? styles.passBadge : styles.failBadge}>
                      {threshold.passed ? t('dashboard.pass') : t('dashboard.fail')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
