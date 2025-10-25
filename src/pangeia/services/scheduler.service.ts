/**
 * PANGEIA - Scheduler Service
 * Agendamento de notificações e ações proativas
 *
 * Nota: Usa schedule simples via setInterval. Para produção, considere usar node-cron.
 */

import { PrismaClient, Notification, TaskStatus } from '@prisma/client';
import { TaskService } from './task.service';
import { TeamService } from './team.service';
import { InsightsService } from './insights.service';

export type NotificationType =
  | 'REMINDER'
  | 'OVERDUE'
  | 'DAILY_REPORT'
  | 'WEEKLY_REPORT'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'INSIGHT_ALERT';

export interface SchedulerConfig {
  checkInterval: number; // em minutos
  reminderHoursBefore: number;
  dailyReportTime: string; // formato: "HH:MM"
  weeklyReportDay: number; // 0-6 (domingo-sábado)
}

export class SchedulerService {
  private prisma: PrismaClient;
  private taskService: TaskService;
  private teamService: TeamService;
  private insightsService: InsightsService;
  private config: SchedulerConfig;
  private intervalId?: NodeJS.Timeout;
  private onNotification?: (notification: Notification) => Promise<void>;

  constructor(
    prisma: PrismaClient,
    taskService: TaskService,
    teamService: TeamService,
    insightsService: InsightsService,
    config?: Partial<SchedulerConfig>,
  ) {
    this.prisma = prisma;
    this.taskService = taskService;
    this.teamService = teamService;
    this.insightsService = insightsService;

    this.config = {
      checkInterval: config?.checkInterval || 15, // 15 minutos
      reminderHoursBefore: config?.reminderHoursBefore || 24, // 24h antes
      dailyReportTime: config?.dailyReportTime || '09:00',
      weeklyReportDay: config?.weeklyReportDay || 1, // Segunda-feira
    };
  }

  /**
   * Define callback para quando uma notificação deve ser enviada
   */
  setNotificationCallback(callback: (notification: Notification) => Promise<void>): void {
    this.onNotification = callback;
  }

  /**
   * Inicia o scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log('[Pangeia Scheduler] Já está rodando');
      return;
    }

    console.log(`[Pangeia Scheduler] Iniciando (intervalo: ${this.config.checkInterval}min)`);

    // Executar imediatamente
    this.runScheduledTasks();

    // Agendar execuções periódicas
    this.intervalId = setInterval(
      () => this.runScheduledTasks(),
      this.config.checkInterval * 60 * 1000,
    );
  }

  /**
   * Para o scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('[Pangeia Scheduler] Parado');
    }
  }

  /**
   * Executa todas as tarefas agendadas
   */
  private async runScheduledTasks(): Promise<void> {
    console.log('[Pangeia Scheduler] Executando tarefas agendadas...');

    try {
      await Promise.all([
        this.checkOverdueTasks(),
        this.checkTaskReminders(),
        this.checkDailyReports(),
        this.checkWeeklyReports(),
        this.checkInsights(),
        this.processPendingNotifications(),
      ]);
    } catch (error) {
      console.error('[Pangeia Scheduler] Erro ao executar tarefas:', error);
    }
  }

  /**
   * Verifica tarefas atrasadas e notifica responsáveis
   */
  private async checkOverdueTasks(): Promise<void> {
    const teams = await this.teamService.listTeams();

    for (const team of teams) {
      const overdueTasks = await this.taskService.getOverdueTasks(team.id);

      for (const task of overdueTasks) {
        // Notificar membros atribuídos
        for (const assignment of task.assignments || []) {
          await this.scheduleNotification({
            memberId: assignment.memberId,
            taskId: task.id,
            type: 'OVERDUE',
            message: `⚠️ TAREFA ATRASADA\n\n*${task.title}*\n\nPrazo: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'N/A'}\nStatus: ${task.status}\n\nPor favor, atualize o status ou ajuste o prazo.`,
          });
        }

        // Notificar líderes
        const leaders = await this.teamService.getTeamLeaders(team.id);
        for (const leader of leaders) {
          await this.scheduleNotification({
            memberId: leader.id,
            taskId: task.id,
            type: 'OVERDUE',
            message: `⚠️ [LÍDER] Tarefa atrasada na equipe\n\n*${task.title}*\nResponsáveis: ${task.assignments?.map((a) => a.member.name).join(', ') || 'Nenhum'}\nPrazo: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'N/A'}`,
          });
        }
      }
    }
  }

  /**
   * Envia lembretes de tarefas próximas do prazo
   */
  private async checkTaskReminders(): Promise<void> {
    const teams = await this.teamService.listTeams();
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + this.config.reminderHoursBefore);

    for (const team of teams) {
      const tasks = await this.taskService.listTasks(team.id, {
        status: TaskStatus.PENDING,
      });

      for (const task of tasks) {
        if (task.dueDate && task.dueDate <= reminderTime && task.dueDate > new Date()) {
          for (const assignment of task.assignments || []) {
            await this.scheduleNotification({
              memberId: assignment.memberId,
              taskId: task.id,
              type: 'REMINDER',
              message: `🔔 LEMBRETE DE TAREFA\n\n*${task.title}*\n\nPrazo: ${new Date(task.dueDate).toLocaleDateString('pt-BR')} às ${new Date(task.dueDate).toLocaleTimeString('pt-BR')}\nPrioridade: ${task.priority}\n\nNão esqueça de trabalhar nesta tarefa!`,
            });
          }
        }
      }
    }
  }

  /**
   * Gera relatórios diários
   */
  private async checkDailyReports(): Promise<void> {
    const now = new Date();
    const [hour, minute] = this.config.dailyReportTime.split(':');
    const reportTime = new Date();
    reportTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // Verificar se está no horário (com margem de erro do intervalo)
    const timeDiff = Math.abs(now.getTime() - reportTime.getTime()) / 60000; // em minutos
    if (timeDiff > this.config.checkInterval) return;

    const teams = await this.teamService.listTeams();

    for (const team of teams) {
      const stats = await this.taskService.getTeamStatistics(team.id);
      const leaders = await this.teamService.getTeamLeaders(team.id);

      const report = `📊 RELATÓRIO DIÁRIO - ${team.name}\n\n` +
        `📌 Total de tarefas: ${stats.total}\n` +
        `⏳ Pendentes: ${stats.pending}\n` +
        `🔄 Em progresso: ${stats.inProgress}\n` +
        `✅ Concluídas: ${stats.completed}\n` +
        `⚠️ Atrasadas: ${stats.overdue}\n\n` +
        `Tenha um ótimo dia de trabalho! 💪`;

      for (const leader of leaders) {
        await this.scheduleNotification({
          memberId: leader.id,
          type: 'DAILY_REPORT',
          message: report,
        });
      }
    }
  }

  /**
   * Gera relatórios semanais
   */
  private async checkWeeklyReports(): Promise<void> {
    const now = new Date();
    if (now.getDay() !== this.config.weeklyReportDay) return;

    const [hour, minute] = this.config.dailyReportTime.split(':');
    const reportTime = new Date();
    reportTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

    const timeDiff = Math.abs(now.getTime() - reportTime.getTime()) / 60000;
    if (timeDiff > this.config.checkInterval) return;

    const teams = await this.teamService.listTeams();

    for (const team of teams) {
      const stats = await this.taskService.getTeamStatistics(team.id);
      const members = await this.teamService.listMembers(team.id);
      const leaders = await this.teamService.getTeamLeaders(team.id);

      const report = `📈 RELATÓRIO SEMANAL - ${team.name}\n\n` +
        `👥 Membros ativos: ${members.length}\n` +
        `📌 Total de tarefas: ${stats.total}\n` +
        `✅ Taxa de conclusão: ${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%\n` +
        `⚠️ Tarefas atrasadas: ${stats.overdue}\n\n` +
        `Continue com o excelente trabalho! 🚀`;

      for (const leader of leaders) {
        await this.scheduleNotification({
          memberId: leader.id,
          type: 'WEEKLY_REPORT',
          message: report,
        });
      }
    }
  }

  /**
   * Verifica e notifica sobre insights
   */
  private async checkInsights(): Promise<void> {
    const teams = await this.teamService.listTeams();

    for (const team of teams) {
      const insights = await this.insightsService.runFullAnalysis(team.id);

      if (insights.length > 0) {
        const leaders = await this.teamService.getTeamLeaders(team.id);

        for (const insight of insights) {
          const message = `🔍 INSIGHT DETECTADO\n\n` +
            `Tipo: ${insight.type}\n` +
            `Severidade: ${insight.severity}\n\n` +
            `${insight.title}\n\n` +
            `${insight.description}`;

          for (const leader of leaders) {
            await this.scheduleNotification({
              memberId: leader.id,
              type: 'INSIGHT_ALERT',
              message,
            });
          }
        }
      }
    }
  }

  /**
   * Processa notificações pendentes
   */
  private async processPendingNotifications(): Promise<void> {
    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        sent: false,
        scheduledFor: { lte: new Date() },
      },
      include: {
        member: true,
        task: true,
      },
    });

    for (const notification of pendingNotifications) {
      try {
        if (this.onNotification) {
          await this.onNotification(notification);
        }

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            sent: true,
            sentAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`[Pangeia Scheduler] Erro ao enviar notificação ${notification.id}:`, error);
      }
    }
  }

  /**
   * Agenda uma nova notificação
   */
  async scheduleNotification(data: {
    memberId: number;
    taskId?: number;
    type: string;
    message: string;
    scheduledFor?: Date;
  }): Promise<Notification> {
    // Verificar se já existe notificação similar recente (para evitar spam)
    const recentNotification = await this.prisma.notification.findFirst({
      where: {
        memberId: data.memberId,
        taskId: data.taskId,
        type: data.type,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // última hora
        },
      },
    });

    if (recentNotification) {
      return recentNotification; // Não duplicar
    }

    return this.prisma.notification.create({
      data: {
        memberId: data.memberId,
        taskId: data.taskId,
        type: data.type,
        message: data.message,
        scheduledFor: data.scheduledFor || new Date(),
      },
    });
  }
}
