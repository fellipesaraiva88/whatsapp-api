/**
 * PANGEIA - Controller
 * REST API para gerenciamento de equipes e tarefas
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TeamService } from '../services/team.service';
import { TaskService } from '../services/task.service';
import { InsightsService } from '../services/insights.service';
import { IntegrationService } from '../services/integration.service';
import { MemoryService } from '../services/memory.service';

export class PangeiaController {
  private prisma: PrismaClient;
  private teamService: TeamService;
  private taskService: TaskService;
  private insightsService: InsightsService;
  private integrationService: IntegrationService;
  private memoryService: MemoryService;

  constructor(
    teamService: TeamService,
    taskService: TaskService,
    insightsService: InsightsService,
    integrationService: IntegrationService,
    memoryService: MemoryService,
  ) {
    this.teamService = teamService;
    this.taskService = taskService;
    this.insightsService = insightsService;
    this.integrationService = integrationService;
    this.memoryService = memoryService;
  }

  // ============= TEAMS =============

  async createTeam(req: Request, res: Response) {
    try {
      const team = await this.teamService.createTeam(req.body);
      res.status(201).json({ success: true, data: team });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async listTeams(req: Request, res: Response) {
    try {
      const teams = await this.teamService.listTeams();
      res.json({ success: true, data: teams });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTeam(req: Request, res: Response) {
    try {
      const team = await this.teamService.getTeamById(parseInt(req.params.teamId));
      if (!team) {
        return res.status(404).json({ success: false, message: 'Equipe não encontrada' });
      }
      res.json({ success: true, data: team });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateTeam(req: Request, res: Response) {
    try {
      const team = await this.teamService.updateTeam(parseInt(req.params.teamId), req.body);
      res.json({ success: true, data: team });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteTeam(req: Request, res: Response) {
    try {
      await this.teamService.deleteTeam(parseInt(req.params.teamId));
      res.json({ success: true, message: 'Equipe removida com sucesso' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ============= MEMBERS =============

  async addMember(req: Request, res: Response) {
    try {
      const member = await this.teamService.addMember(parseInt(req.params.teamId), req.body);
      res.status(201).json({ success: true, data: member });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async listMembers(req: Request, res: Response) {
    try {
      const members = await this.teamService.listMembers(parseInt(req.params.teamId));
      res.json({ success: true, data: members });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateMember(req: Request, res: Response) {
    try {
      const member = await this.teamService.updateMember(parseInt(req.params.memberId), req.body);
      res.json({ success: true, data: member });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteMember(req: Request, res: Response) {
    try {
      await this.teamService.deleteMember(parseInt(req.params.memberId));
      res.json({ success: true, message: 'Membro removido com sucesso' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ============= TASKS =============

  async createTask(req: Request, res: Response) {
    try {
      const { creatorId, ...taskData } = req.body;
      const task = await this.taskService.createTask(
        parseInt(req.params.teamId),
        creatorId,
        taskData,
      );
      res.status(201).json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async listTasks(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status as any,
        priority: req.query.priority as any,
        assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined,
        overdue: req.query.overdue === 'true',
      };

      const tasks = await this.taskService.listTasks(parseInt(req.params.teamId), filters);
      res.json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTask(req: Request, res: Response) {
    try {
      const task = await this.taskService.getTaskById(parseInt(req.params.taskId));
      if (!task) {
        return res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
      }
      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const task = await this.taskService.updateTask(parseInt(req.params.taskId), req.body);
      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateTaskStatus(req: Request, res: Response) {
    try {
      const { memberId, ...statusData } = req.body;
      const task = await this.taskService.updateTaskStatus(
        parseInt(req.params.taskId),
        memberId,
        statusData,
      );
      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async assignTask(req: Request, res: Response) {
    try {
      await this.taskService.assignMembers(parseInt(req.params.taskId), req.body.memberIds);
      res.json({ success: true, message: 'Tarefa atribuída com sucesso' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async addComment(req: Request, res: Response) {
    try {
      const { authorId, ...commentData } = req.body;
      const comment = await this.taskService.addComment(
        parseInt(req.params.taskId),
        authorId,
        commentData,
      );
      res.status(201).json({ success: true, data: comment });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ============= STATISTICS =============

  async getTeamStatistics(req: Request, res: Response) {
    try {
      const stats = await this.taskService.getTeamStatistics(parseInt(req.params.teamId));
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMemberStatistics(req: Request, res: Response) {
    try {
      const stats = await this.taskService.getMemberStatistics(parseInt(req.params.memberId));
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getOverdueTasks(req: Request, res: Response) {
    try {
      const tasks = await this.taskService.getOverdueTasks(parseInt(req.params.teamId));
      res.json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ============= INSIGHTS =============

  async runAnalysis(req: Request, res: Response) {
    try {
      const insights = await this.insightsService.runFullAnalysis(parseInt(req.params.teamId));
      res.json({ success: true, data: insights });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getInsights(req: Request, res: Response) {
    try {
      const insights = await this.insightsService.getActiveInsights(parseInt(req.params.teamId));
      res.json({ success: true, data: insights });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async resolveInsight(req: Request, res: Response) {
    try {
      const insight = await this.insightsService.resolveInsight(parseInt(req.params.insightId));
      res.json({ success: true, data: insight });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ============= INTEGRATIONS =============

  async getIntegrations(req: Request, res: Response) {
    try {
      const integrations = await this.integrationService.getIntegrationsStatus();
      res.json({ success: true, data: integrations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
