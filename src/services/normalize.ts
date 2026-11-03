import { RawSummary } from '../models/metrics';
import { ReportModel } from '../models/report';
import { buildCharts } from './buildCharts';
import { classifyTestType } from './classifyTestType';
import { extractKpis } from './extractKpis';
import { extractThresholds } from './extractThresholds';

export function normalize(raw: RawSummary, fileName: string): ReportModel {
  return {
    fileName,
    testType: classifyTestType(fileName),
    kpis: extractKpis(raw.metrics),
    thresholds: extractThresholds(raw.metrics),
    charts: buildCharts(raw.metrics),
    rawSummary: raw,
  };
}
