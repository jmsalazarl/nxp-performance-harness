import { ChartSeries } from '../models/report';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

interface ChartPanelProps {
  charts: ChartSeries[];
}

export function ChartPanel({ charts }: ChartPanelProps) {
  const { language, t } = useLanguage();
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  return (
    <section className={styles.section} aria-labelledby="chart-heading">
      <h2 id="chart-heading">{t('dashboard.charts')}</h2>
      {charts.length === 0 ? (
        <p className={styles.emptyState}>{t('dashboard.noCharts')}</p>
      ) : (
        <div className={styles.chartGrid}>
          {charts.map((series) => {
            const max = Math.max(...series.values, 1);

            return (
              <article key={series.key} className={styles.chartCard}>
                <h3>{series.label}</h3>
                <div className={styles.chartBars}>
                  {series.values.map((value, index) => (
                    <div className={styles.chartRow} key={`${series.key}-${index}`}>
                      <span>#{index + 1}</span>
                      <div className={styles.barTrack}>
                        <span className={styles.barFill} style={{ width: `${Math.max((value / max) * 100, 2)}%` }} />
                      </div>
                      <strong>{value.toLocaleString(locale, { maximumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
