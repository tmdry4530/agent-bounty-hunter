/**
 * Demo Scenarios Index
 * 
 * Export all available scenarios for easy import
 */

export { securityAuditScenario } from './security-audit.js';
export { frontendTaskScenario } from './frontend-task.js';
export { dataAnalysisScenario } from './data-analysis.js';

export const scenarios = {
  securityAudit: () => import('./security-audit.js').then(m => m.securityAuditScenario),
  frontendTask: () => import('./frontend-task.js').then(m => m.frontendTaskScenario),
  dataAnalysis: () => import('./data-analysis.js').then(m => m.dataAnalysisScenario)
};

export type ScenarioType = keyof typeof scenarios;
