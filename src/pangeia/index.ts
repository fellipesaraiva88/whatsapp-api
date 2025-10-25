/**
 * PANGEIA - Assistente Autônomo de Gestão de Equipe
 * Ponto de entrada e inicialização
 */

import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

// Services
import { TeamService } from './services/team.service';
import { TaskService } from './services/task.service';
import { MemoryService } from './services/memory.service';
import { InsightsService } from './services/insights.service';
import { SchedulerService } from './services/scheduler.service';
import { IntegrationService } from './services/integration.service';
import { AgentService } from './services/agent.service';
import { MessageHandlerService } from './services/message-handler.service';

// Controllers e Routers
import { PangeiaController } from './controllers/pangeia.controller';
import { createPangeiaRouter } from './routers/pangeia.router';

export interface PangeiaConfig {
  schedulerCheckInterval?: number; // minutos
  schedulerReminderHoursBefore?: number;
  schedulerDailyReportTime?: string;
  schedulerWeeklyReportDay?: number;
}

export class PangeiaSystem {
  private prisma: PrismaClient;

  // Services
  public teamService: TeamService;
  public taskService: TaskService;
  public memoryService: MemoryService;
  public insightsService: InsightsService;
  public schedulerService: SchedulerService;
  public integrationService: IntegrationService;
  public agentService: AgentService;
  public messageHandler: MessageHandlerService;

  // Controller
  public controller: PangeiaController;

  // Router
  public router: Router;

  constructor(prisma: PrismaClient, config?: PangeiaConfig) {
    this.prisma = prisma;

    // Inicializar services
    this.teamService = new TeamService(prisma);
    this.taskService = new TaskService(prisma);
    this.memoryService = new MemoryService(prisma);
    this.integrationService = new IntegrationService(prisma);

    // InsightsService (depende de TeamService e TaskService)
    this.insightsService = new InsightsService(prisma, this.taskService, this.teamService);

    // SchedulerService (depende de TaskService, TeamService e InsightsService)
    this.schedulerService = new SchedulerService(
      prisma,
      this.taskService,
      this.teamService,
      this.insightsService,
      {
        checkInterval: config?.schedulerCheckInterval,
        reminderHoursBefore: config?.schedulerReminderHoursBefore,
        dailyReportTime: config?.schedulerDailyReportTime,
        weeklyReportDay: config?.schedulerWeeklyReportDay,
      },
    );

    // AgentService (depende de todos os outros)
    this.agentService = new AgentService(
      prisma,
      this.teamService,
      this.taskService,
      this.memoryService,
      this.insightsService,
      this.schedulerService,
      this.integrationService,
    );

    // MessageHandler (depende do AgentService)
    this.messageHandler = new MessageHandlerService(prisma, this.agentService);

    // Conectar callback de notificações do scheduler ao messageHandler
    this.schedulerService.setNotificationCallback(async (notification) => {
      await this.messageHandler.handleScheduledNotification(notification);
    });

    // Controller
    this.controller = new PangeiaController(
      this.teamService,
      this.taskService,
      this.insightsService,
      this.integrationService,
      this.memoryService,
    );

    // Router
    this.router = createPangeiaRouter(this.controller);
  }

  /**
   * Inicia o sistema Pangeia
   */
  async start(): Promise<void> {
    console.log('🤖 [Pangeia] Iniciando Assistente Autônomo de Gestão de Equipe...');

    // Iniciar scheduler
    this.schedulerService.start();

    console.log('✅ [Pangeia] Sistema iniciado com sucesso!');
    console.log('   - Modo proativo: ATIVO');
    console.log('   - IA conversacional: ATIVA');
    console.log('   - Análise de insights: ATIVA');
    console.log('   - Notificações automáticas: ATIVAS');
  }

  /**
   * Para o sistema Pangeia
   */
  async stop(): Promise<void> {
    console.log('🛑 [Pangeia] Parando sistema...');
    this.schedulerService.stop();
    console.log('✅ [Pangeia] Sistema parado');
  }

  /**
   * Define cliente WhatsApp para envio de mensagens
   */
  setWhatsAppClient(client: any): void {
    this.messageHandler.setWhatsAppClient(client);
  }

  /**
   * Processa mensagem recebida do WhatsApp
   */
  async handleWhatsAppMessage(instanceName: string, message: any): Promise<void> {
    await this.messageHandler.handleIncomingMessage(instanceName, message);
  }
}

/**
 * Factory function para criar instância do Pangeia
 */
export function createPangeiaSystem(prisma: PrismaClient, config?: PangeiaConfig): PangeiaSystem {
  return new PangeiaSystem(prisma, config);
}

export default PangeiaSystem;
