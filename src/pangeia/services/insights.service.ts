/**
 * PANGEIA - Insights Service
 * Análise automática de produtividade e identificação de gargalos
 */

import { PrismaClient, Insight, InsightType, TaskStatus } from '@prisma/client';
import { TaskService } from './task.service';
import { TeamService } from './team.service';
import { InsightData } from '../types';

export class InsightsService {
  private prisma: PrismaClient;
  private taskService: TaskService;
  private teamService: TeamService;

  constructor(prisma: PrismaClient, taskService: TaskService, teamService: TeamService) {
    this.prisma = prisma;
    this.taskService = taskService;
    this.teamService = teamService;
  }

  /**
   * Cria um novo insight
   */
  async createInsight(teamId: number, data: InsightData): Promise<Insight> {
    return this.prisma.insight.create({
      data: {
        teamId,
        type: data.type,
        severity: data.severity,
        title: this.generateInsightTitle(data),
        description: this.generateInsightDescription(data),
        data: data as any,
      },
    });
  }

  /**
   * Lista insights não resolvidos de uma equipe
   */
  async getActiveInsights(teamId: number): Promise<Insight[]> {
    return this.prisma.insight.findMany({
      where: {
        teamId,
        resolved: false,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /**
   * Marca insight como resolvido
   */
  async resolveInsight(id: number): Promise<Insight> {
    return this.prisma.insight.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Analisa sobrecarga de membros
   * Identifica membros com muitas tarefas ativas
   */
  async analyzeOverload(teamId: number): Promise<InsightData[]> {
    const members = await this.teamService.listMembers(teamId);
    const insights: InsightData[] = [];

    for (const member of members) {
      const stats = await this.taskService.getMemberStatistics(member.id);
      const activeTasks = stats.pending + stats.inProgress;

      // Limite configurável: mais de 5 tarefas ativas = sobrecarga
      if (activeTasks > 5) {
        insights.push({
          type: 'OVERLOAD',
          severity: activeTasks > 10 ? 'CRITICAL' : activeTasks > 7 ? 'HIGH' : 'MEDIUM',
          affectedMembers: [member.id],
          metrics: {
            activeTasks,
            pending: stats.pending,
            inProgress: stats.inProgress,
          },
          suggestions: [
            `Redistribuir ${activeTasks - 5} tarefas de ${member.name}`,
            'Revisar prioridades das tarefas',
            'Considerar adicionar mais recursos à equipe',
          ],
        });
      }
    }

    return insights;
  }

  /**
   * Identifica gargalos (tarefas travadas por muito tempo)
   */
  async analyzeBottlenecks(teamId: number): Promise<InsightData[]> {
    const tasks = await this.taskService.listTasks(teamId, { status: TaskStatus.IN_PROGRESS });
    const insights: InsightData[] = [];
    const now = new Date();

    // Tarefas em progresso há mais de 7 dias sem atualização
    const stuckTasks = tasks.filter((task) => {
      const daysSinceUpdate = (now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });

    if (stuckTasks.length > 0) {
      insights.push({
        type: 'BOTTLENECK',
        severity: stuckTasks.length > 5 ? 'HIGH' : 'MEDIUM',
        affectedTasks: stuckTasks.map((t) => t.id),
        metrics: {
          stuckTasksCount: stuckTasks.length,
        },
        suggestions: [
          'Verificar impedimentos nas tarefas travadas',
          'Realizar reunião de desbloqueio',
          'Redistribuir tarefas se necessário',
        ],
      });
    }

    return insights;
  }

  /**
   * Analisa queda de produtividade
   */
  async analyzeProductivityDrop(teamId: number): Promise<InsightData[]> {
    const insights: InsightData[] = [];

    // Comparar últimos 7 dias com 7 dias anteriores
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentCompleted = await this.prisma.task.count({
      where: {
        teamId,
        status: TaskStatus.COMPLETED,
        completedAt: { gte: last7Days },
      },
    });

    const previousCompleted = await this.prisma.task.count({
      where: {
        teamId,
        status: TaskStatus.COMPLETED,
        completedAt: {
          gte: previous7Days,
          lt: last7Days,
        },
      },
    });

    // Queda de mais de 30% na conclusão de tarefas
    if (previousCompleted > 0) {
      const dropPercentage = ((previousCompleted - recentCompleted) / previousCompleted) * 100;

      if (dropPercentage > 30) {
        insights.push({
          type: 'PRODUCTIVITY_DROP',
          severity: dropPercentage > 50 ? 'HIGH' : 'MEDIUM',
          metrics: {
            recentCompleted,
            previousCompleted,
            dropPercentage: Math.round(dropPercentage),
          },
          suggestions: [
            'Investigar causas da queda de produtividade',
            'Verificar se há tarefas bloqueadas',
            'Realizar retrospectiva com a equipe',
          ],
        });
      }
    }

    return insights;
  }

  /**
   * Analisa riscos de prazo
   */
  async analyzeDeadlineRisks(teamId: number): Promise<InsightData[]> {
    const insights: InsightData[] = [];
    const now = new Date();
    const next3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Tarefas com prazo nos próximos 3 dias ainda não iniciadas
    const urgentTasks = await this.prisma.task.findMany({
      where: {
        teamId,
        status: TaskStatus.PENDING,
        dueDate: {
          lte: next3Days,
          gte: now,
        },
      },
    });

    if (urgentTasks.length > 0) {
      insights.push({
        type: 'DEADLINE_RISK',
        severity: urgentTasks.length > 3 ? 'HIGH' : 'MEDIUM',
        affectedTasks: urgentTasks.map((t) => t.id),
        metrics: {
          urgentTasksCount: urgentTasks.length,
        },
        suggestions: [
          'Priorizar tarefas com prazos próximos',
          'Atribuir recursos para tarefas urgentes',
          'Considerar negociar prazos se necessário',
        ],
      });
    }

    return insights;
  }

  /**
   * Análise completa de performance da equipe
   */
  async analyzeTeamPerformance(teamId: number): Promise<InsightData[]> {
    const stats = await this.taskService.getTeamStatistics(teamId);
    const insights: InsightData[] = [];

    // Taxa de conclusão baixa
    const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    if (completionRate < 30 && stats.total > 10) {
      insights.push({
        type: 'TEAM_PERFORMANCE',
        severity: 'MEDIUM',
        metrics: {
          completionRate: Math.round(completionRate),
          total: stats.total,
          completed: stats.completed,
        },
        suggestions: [
          'Revisar processos de trabalho',
          'Verificar se tarefas estão bem definidas',
          'Considerar reduzir escopo ou aumentar equipe',
        ],
      });
    }

    // Muitas tarefas atrasadas
    if (stats.overdue > 5) {
      insights.push({
        type: 'TEAM_PERFORMANCE',
        severity: stats.overdue > 10 ? 'HIGH' : 'MEDIUM',
        metrics: {
          overdue: stats.overdue,
          overduePercentage: Math.round((stats.overdue / stats.total) * 100),
        },
        suggestions: [
          'Reorganizar prioridades',
          'Cancelar tarefas obsoletas',
          'Aumentar capacidade da equipe',
        ],
      });
    }

    return insights;
  }

  /**
   * Executa todas as análises e cria insights
   */
  async runFullAnalysis(teamId: number): Promise<Insight[]> {
    const allInsights: InsightData[] = [];

    // Executar todas as análises
    allInsights.push(...(await this.analyzeOverload(teamId)));
    allInsights.push(...(await this.analyzeBottlenecks(teamId)));
    allInsights.push(...(await this.analyzeProductivityDrop(teamId)));
    allInsights.push(...(await this.analyzeDeadlineRisks(teamId)));
    allInsights.push(...(await this.analyzeTeamPerformance(teamId)));

    // Criar insights no banco
    const createdInsights: Insight[] = [];
    for (const insightData of allInsights) {
      const insight = await this.createInsight(teamId, insightData);
      createdInsights.push(insight);
    }

    return createdInsights;
  }

  /**
   * Gera título para insight
   */
  private generateInsightTitle(data: InsightData): string {
    switch (data.type) {
      case 'OVERLOAD':
        return `Sobrecarga detectada em ${data.affectedMembers?.length || 0} membro(s)`;
      case 'BOTTLENECK':
        return `${data.affectedTasks?.length || 0} tarefa(s) travada(s) identificada(s)`;
      case 'PRODUCTIVITY_DROP':
        return `Queda de ${data.metrics?.dropPercentage || 0}% na produtividade`;
      case 'DEADLINE_RISK':
        return `${data.affectedTasks?.length || 0} tarefa(s) em risco de atraso`;
      case 'TEAM_PERFORMANCE':
        return 'Alerta de performance da equipe';
      default:
        return 'Insight detectado';
    }
  }

  /**
   * Gera descrição para insight
   */
  private generateInsightDescription(data: InsightData): string {
    const suggestions = data.suggestions?.join('\n- ') || 'Sem sugestões';
    const metrics = JSON.stringify(data.metrics || {}, null, 2);

    return `**Sugestões:**\n- ${suggestions}\n\n**Métricas:**\n${metrics}`;
  }
}
