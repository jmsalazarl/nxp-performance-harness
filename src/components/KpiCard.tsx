import { Kpi } from '../models/report';
import styles from '../assets/styles/dashboard.module.css';

interface KpiCardProps {
  kpi: Kpi;
}

export function KpiCard({ kpi }: KpiCardProps) {
  const statusClass = kpi.value === 'N/A' ? styles.neutral : styles[kpi.status];

  return (
    <article className={`${styles.kpiCard} ${statusClass}`}>
      <span className={styles.kpiLabel}>{kpi.label}</span>
      <strong className={styles.kpiValue}>{kpi.value}</strong>
      <span className={styles.kpiUnit}>{kpi.unit}</span>
    </article>
  );
}
