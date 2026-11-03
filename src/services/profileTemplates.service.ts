import { ProfileType } from '../models/ProfileDraft';
import { StageDraft } from '../models/StageDraft';
import { ThresholdDraft } from '../models/ThresholdDraft';

export interface ProfileTemplate {
  id: string;
  profileType: ProfileType;
  name: string;
  stages: StageDraft[];
  thresholds: ThresholdDraft[];
}

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    id: 'backup-loadtest',
    profileType: 'loadtest',
    name: 'Load test baseline',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '2m', target: 10 },
      { duration: '30s', target: 0 },
    ],
    thresholds: [
      { metric: 'http_req_duration', expressions: ['p(95) < 2000'] },
      { metric: 'http_req_failed', expressions: ['rate < 0.01'] },
      { metric: 'waiting_time', expressions: ['avg < 1600'] },
      { metric: 'Errors', expressions: ['count < 5'] },
      { metric: 'iterations', expressions: ['count > 500'] },
      { metric: 'http_req_waiting', expressions: ['p(95) < 700'] },
      { metric: 'http_req_blocked', expressions: ['p(95) < 300'] },
      { metric: 'active_vus', expressions: ['avg > 5'] },
      { metric: 'http_req_connecting', expressions: ['p(95) < 200'] },
      { metric: 'transactions_per_second', expressions: ['avg >= 2'] },
    ],
  },
  {
    id: 'backup-stresstest',
    profileType: 'stresstest',
    name: 'Stress test baseline',
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 10 },
      { duration: '1m', target: 15 },
      { duration: '30s', target: 0 },
    ],
    thresholds: [
      { metric: 'http_req_duration', expressions: ['p(95) < 5000'] },
      { metric: 'waiting_time', expressions: ['avg < 3500'] },
      { metric: 'Errors', expressions: ['count < 20'] },
      { metric: 'http_req_failed', expressions: ['rate < 0.01'] },
      { metric: 'http_req_connecting', expressions: ['p(95) < 1000'] },
      { metric: 'http_req_blocked', expressions: ['p(95) < 500'] },
      { metric: 'iterations', expressions: ['count > 1000'] },
      { metric: 'vus_max', expressions: ['value >= 0'] },
      { metric: 'http_req_waiting', expressions: ['p(99) < 10000'] },
      { metric: 'retries', expressions: ['count < 10'] },
    ],
  },
  {
    id: 'backup-capacitytest',
    profileType: 'capacitytest',
    name: 'Capacity test baseline',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 20 },
      { duration: '1m', target: 15 },
      { duration: '30s', target: 0 },
    ],
    thresholds: [
      { metric: 'http_req_duration', expressions: ['p(95) < 3000'] },
      { metric: 'waiting_time', expressions: ['avg < 1200'] },
      { metric: 'Errors', expressions: ['count < 2'] },
      { metric: 'http_req_failed', expressions: ['rate < 0.05'] },
    ],
  },
  {
    id: 'backup-stabilitytest',
    profileType: 'stabilitytest',
    name: 'Stability test baseline',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '2m', target: 10 },
      { duration: '30s', target: 0 },
    ],
    thresholds: [
      { metric: 'http_req_duration', expressions: ['avg < 2000', 'p(95) < 2500'] },
      { metric: 'waiting_time', expressions: ['avg < 1500'] },
      { metric: 'Errors', expressions: ['count < 2'] },
      { metric: 'http_req_failed', expressions: ['rate < 0.01'] },
    ],
  },
];

export const getTemplatesForProfile = (profileType: ProfileType): ProfileTemplate[] =>
  PROFILE_TEMPLATES.filter((template) => template.profileType === profileType);

export const getTemplateById = (templateId: string): ProfileTemplate | undefined =>
  PROFILE_TEMPLATES.find((template) => template.id === templateId);
