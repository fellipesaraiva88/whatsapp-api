/**
 * PANGEIA - Router
 * Definição de rotas da API REST
 */

import { Router } from 'express';
import { PangeiaController } from '../controllers/pangeia.controller';

export function createPangeiaRouter(controller: PangeiaController): Router {
  const router = Router();

  // ============= TEAMS =============
  router.post('/teams', (req, res) => controller.createTeam(req, res));
  router.get('/teams', (req, res) => controller.listTeams(req, res));
  router.get('/teams/:teamId', (req, res) => controller.getTeam(req, res));
  router.put('/teams/:teamId', (req, res) => controller.updateTeam(req, res));
  router.delete('/teams/:teamId', (req, res) => controller.deleteTeam(req, res));

  // ============= MEMBERS =============
  router.post('/teams/:teamId/members', (req, res) => controller.addMember(req, res));
  router.get('/teams/:teamId/members', (req, res) => controller.listMembers(req, res));
  router.put('/members/:memberId', (req, res) => controller.updateMember(req, res));
  router.delete('/members/:memberId', (req, res) => controller.deleteMember(req, res));

  // ============= TASKS =============
  router.post('/teams/:teamId/tasks', (req, res) => controller.createTask(req, res));
  router.get('/teams/:teamId/tasks', (req, res) => controller.listTasks(req, res));
  router.get('/tasks/:taskId', (req, res) => controller.getTask(req, res));
  router.put('/tasks/:taskId', (req, res) => controller.updateTask(req, res));
  router.patch('/tasks/:taskId/status', (req, res) => controller.updateTaskStatus(req, res));
  router.post('/tasks/:taskId/assign', (req, res) => controller.assignTask(req, res));
  router.post('/tasks/:taskId/comments', (req, res) => controller.addComment(req, res));

  // ============= STATISTICS =============
  router.get('/teams/:teamId/statistics', (req, res) => controller.getTeamStatistics(req, res));
  router.get('/members/:memberId/statistics', (req, res) =>
    controller.getMemberStatistics(req, res),
  );
  router.get('/teams/:teamId/overdue', (req, res) => controller.getOverdueTasks(req, res));

  // ============= INSIGHTS =============
  router.post('/teams/:teamId/analysis', (req, res) => controller.runAnalysis(req, res));
  router.get('/teams/:teamId/insights', (req, res) => controller.getInsights(req, res));
  router.patch('/insights/:insightId/resolve', (req, res) => controller.resolveInsight(req, res));

  // ============= INTEGRATIONS =============
  router.get('/integrations', (req, res) => controller.getIntegrations(req, res));

  return router;
}
