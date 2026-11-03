import { Kpi } from '../models/report';
import { KpiCard } from './KpiCard';
import { useLanguage } from '../i18n';
import styles from '../assets/styles/dashboard.module.css';

interface KpiGridProps {
  kpis: Kpi[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  const { t } = useLanguage();

  return (
    <section className={styles.section} aria-labelledby="kpi-heading">
      <h2 id="kpi-heading">{t('dashboard.kpis')}</h2>
      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
