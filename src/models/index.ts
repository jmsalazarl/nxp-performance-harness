/**
 * Barrel export for model types
 * 
 * This file re-exports all model interfaces for convenient importing:
 * import { AppState, EndpointDraft, ReportModel, ... } from '@/models';
 */

// Config Builder UI models
export * from './AppState';
export * from './EndpointDraft';
export * from './ProfileDraft';
export * from './StageDraft';
export * from './ThresholdDraft';
export * from './ValidationResult';
export * from './analysis.types';
export * from './workload.types';
export * from './testPlan.types';
export * from './workloadContract.types';

// Performance Dashboard models
export * from './report';
export * from './errors';
export * from './metrics';

// Re-export existing config contract types separately to avoid naming conflicts
// Use named imports from config.types when needed:
// import { Config, Endpoint, Stage, TestProfile } from '@/models/config.types';
