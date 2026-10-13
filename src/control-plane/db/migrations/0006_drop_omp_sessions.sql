DROP TABLE IF EXISTS `omp_sessions`;
DELETE FROM `tool_configs` WHERE `tool_name` IN (
  'omp_run', 'omp_collab', 'omp_status', 'omp_result',
  'omp_resume', 'omp_interrupt', 'omp_dispose', 'omp_list'
);
