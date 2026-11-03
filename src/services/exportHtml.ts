import { ReportModel } from '../models/report';
import { Language } from '../i18n';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeScriptJson(model: ReportModel): string {
  return JSON.stringify(model)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function exportHtml(model: ReportModel, language: Language = 'es'): string {
  const text = {
    es: {
      title: 'Reporte de rendimiento K6',
      thresholds: 'Umbrales',
      metric: 'Métrica',
      expression: 'Expresión',
      status: 'Estado',
      pass: 'Correcto',
      fail: 'Falló',
      noThresholds: 'No hay datos de umbrales disponibles.',
    },
    en: {
      title: 'K6 Performance Report',
      thresholds: 'Thresholds',
      metric: 'Metric',
      expression: 'Expression',
      status: 'Status',
      pass: 'Pass',
      fail: 'Fail',
      noThresholds: 'No threshold data available.',
    },
  }[language];

  const title = `${text.title} - ${model.fileName}`;
  const embeddedData = escapeScriptJson(model);
  const embeddedText = JSON.stringify(text)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color: #172026; background: #f5f7fa; font-family: Arial, sans-serif; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .meta { color: #5f6b76; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .card, .panel { background: #ffffff; border: 1px solid #d9e0e7; border-radius: 8px; padding: 16px; }
    .label { color: #5f6b76; font-size: 13px; }
    .value { font-size: 24px; font-weight: 700; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; background: #ffffff; }
    th, td { border-bottom: 1px solid #d9e0e7; padding: 10px; text-align: left; }
    th { color: #5f6b76; font-size: 13px; }
    .pass { color: #137333; font-weight: 700; }
    .fail { color: #b3261e; font-weight: 700; }
    .bar { height: 12px; background: #1f7a8c; border-radius: 999px; min-width: 2px; }
    .chart-row { display: grid; grid-template-columns: minmax(120px, 220px) 1fr auto; gap: 12px; align-items: center; margin: 10px 0; }
  </style>
</head>
<body>
  <main id="report-root"></main>
  <script id="report-data" type="application/json">${embeddedData}</script>
  <script>
    const text = ${embeddedText};
    const model = JSON.parse(document.getElementById('report-data').textContent);
    const root = document.getElementById('report-root');
    const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const kpis = model.kpis.map((kpi) => '<article class="card"><div class="label">' + esc(kpi.label) + '</div><div class="value">' + esc(kpi.value) + '</div><div class="label">' + esc(kpi.unit) + '</div></article>').join('');
    const thresholds = model.thresholds.length
      ? '<table><thead><tr><th>' + esc(text.metric) + '</th><th>' + esc(text.expression) + '</th><th>' + esc(text.status) + '</th></tr></thead><tbody>' + model.thresholds.map((item) => '<tr><td>' + esc(item.metric) + '</td><td>' + esc(item.expression) + '</td><td class="' + (item.passed ? 'pass' : 'fail') + '">' + (item.passed ? esc(text.pass) : esc(text.fail)) + '</td></tr>').join('') + '</tbody></table>'
      : '<p class="meta">' + esc(text.noThresholds) + '</p>';
    const charts = model.charts.map((series) => {
      const max = Math.max(...series.values, 1);
      const rows = series.values.map((value, index) => '<div class="chart-row"><span>' + esc(series.label) + ' #' + (index + 1) + '</span><span class="bar" style="width:' + Math.max((value / max) * 100, 1) + '%"></span><strong>' + esc(value.toFixed(2)) + '</strong></div>').join('');
      return '<section class="panel"><h2>' + esc(series.label) + '</h2>' + rows + '</section>';
    }).join('');
    root.innerHTML = '<h1>' + esc(text.title) + '</h1><p class="meta">' + esc(model.fileName) + ' · ' + esc(model.testType) + '</p><section class="grid">' + kpis + '</section><section class="panel"><h2>' + esc(text.thresholds) + '</h2>' + thresholds + '</section>' + charts;
  </script>
</body>
</html>`;
}
