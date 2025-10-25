/**
 * PANGEIA - Agent Service (IA Autônoma)
 * Coordenador inteligente com raciocínio e ações proativas
 */

import { PrismaClient, TaskStatus, TaskPriority, MemberRole } from '@prisma/client';
import { TeamService } from './team.service';
import { TaskService } from './task.service';
import { MemoryService } from './memory.service';
import { InsightsService } from './insights.service';
import { SchedulerService } from './scheduler.service';
import { IntegrationService } from './integration.service';
import {
  MessageContext,
  AgentResponse,
  AgentAction,
  ConversationIntent,
  AIReasoning,
  TeamContext,
} from '../types';

export class AgentService {
  private prisma: PrismaClient;
  private teamService: TeamService;
  private taskService: TaskService;
  private memoryService: MemoryService;
  private insightsService: InsightsService;
  private schedulerService: SchedulerService;
  private integrationService: IntegrationService;

  constructor(
    prisma: PrismaClient,
    teamService: TeamService,
    taskService: TaskService,
    memoryService: MemoryService,
    insightsService: InsightsService,
    schedulerService: SchedulerService,
    integrationService: IntegrationService,
  ) {
    this.prisma = prisma;
    this.teamService = teamService;
    this.taskService = taskService;
    this.memoryService = memoryService;
    this.insightsService = insightsService;
    this.schedulerService = schedulerService;
    this.integrationService = integrationService;
  }

  /**
   * Processa mensagem com IA (entrada principal)
   */
  async processMessage(context: MessageContext): Promise<AgentResponse> {
    try {
      // 1. Buscar ou criar equipe padrão
      const team = await this.getOrCreateDefaultTeam();

      // 2. Buscar ou criar membro
      const member = await this.teamService.findOrCreateMember(
        team.id,
        context.senderJid,
        context.senderName,
      );

      // 3. Atualizar contexto de conversação
      await this.memoryService.setConversationContext(team.id, {
        lastMessage: context.text,
        lastSender: member.id,
        timestamp: new Date(),
      });

      // 4. Identificar intenção (NLP básico)
      const intent = this.identifyIntent(context.text);

      // 5. Executar ação baseada na intenção
      return await this.executeIntent(intent, team.id, member.id, context);
    } catch (error) {
      console.error('[Pangeia Agent] Erro ao processar mensagem:', error);
      return {
        success: false,
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      };
    }
  }

  /**
   * Identifica intenção da mensagem (NLP básico)
   */
  private identifyIntent(text: string): ConversationIntent {
    const lowerText = text.toLowerCase().trim();

    // Padrões de reconhecimento
    const patterns = [
      // Criação de tarefas
      {
        regex: /^(criar|nova|adicionar|adiciona) (tarefa|task)/i,
        intent: 'create_task',
        confidence: 0.9,
      },
      {
        regex: /(preciso|quero|vou) (fazer|criar|realizar)/i,
        intent: 'create_task',
        confidence: 0.7,
      },

      // Listagem
      {
        regex: /^(listar|lista|mostrar|mostre|ver|veja) (tarefas?|tasks?)/i,
        intent: 'list_tasks',
        confidence: 0.9,
      },
      { regex: /^(minhas|meus) (tarefas?|tasks?)/i, intent: 'my_tasks', confidence: 0.9 },

      // Status de tarefas
      {
        regex: /(iniciar|começar|começe|start) (tarefa|task) #?(\d+)/i,
        intent: 'start_task',
        confidence: 0.9,
      },
      {
        regex: /(concluir|finalizar|completar|finish) (tarefa|task) #?(\d+)/i,
        intent: 'complete_task',
        confidence: 0.9,
      },

      // Atribuição
      {
        regex: /(atribuir|atribua|assign) (tarefa|task) #?(\d+)/i,
        intent: 'assign_task',
        confidence: 0.9,
      },

      // Relatórios
      { regex: /^(relatório|relatorio|report|status)/i, intent: 'team_report', confidence: 0.9 },
      {
        regex: /^(atrasad[ao]s?|overdue|em atraso)/i,
        intent: 'overdue_tasks',
        confidence: 0.9,
      },

      // Insights
      {
        regex: /^(análise|analise|insights?|gargalos?)/i,
        intent: 'show_insights',
        confidence: 0.9,
      },

      // Ajuda
      { regex: /^(ajuda|help|comandos?|o que|como)/i, intent: 'help', confidence: 0.9 },

      // Saudações
      {
        regex: /^(oi|olá|ola|hey|hi|hello|bom dia|boa tarde|boa noite)/i,
        intent: 'greeting',
        confidence: 0.9,
      },

      // Redistribuição (IA proativa)
      {
        regex: /(redistribui|redistribuir|balancear|rebalancear)/i,
        intent: 'redistribute_tasks',
        confidence: 0.8,
      },
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern.regex);
      if (match) {
        return {
          intent: pattern.intent,
          confidence: pattern.confidence,
          entities: this.extractEntities(text, match),
        };
      }
    }

    // Fallback: tentar raciocinar sobre a intenção
    return this.reasonAboutIntent(text);
  }

  /**
   * Raciocina sobre a intenção quando não há padrão claro (IA)
   */
  private reasonAboutIntent(text: string): ConversationIntent {
    const lowerText = text.toLowerCase();

    // Palavras-chave para criar tarefa
    const taskKeywords = ['fazer', 'entregar', 'desenvolver', 'criar', 'implementar', 'revisar'];
    const hasTaskKeyword = taskKeywords.some((kw) => lowerText.includes(kw));

    if (hasTaskKeyword) {
      return {
        intent: 'create_task',
        confidence: 0.6,
        entities: { title: text },
      };
    }

    // Palavras de pergunta
    const questionKeywords = ['como', 'quando', 'quem', 'onde', 'o que', 'quantas'];
    const hasQuestion = questionKeywords.some((kw) => lowerText.includes(kw));

    if (hasQuestion) {
      return {
        intent: 'help',
        confidence: 0.5,
        entities: {},
      };
    }

    // Fallback
    return {
      intent: 'unknown',
      confidence: 0.3,
      entities: {},
    };
  }

  /**
   * Extrai entidades da mensagem
   */
  private extractEntities(text: string, match: RegExpMatchArray): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extrair número da tarefa (#123)
    const taskIdMatch = text.match(/#?(\d+)/);
    if (taskIdMatch) {
      entities.taskId = parseInt(taskIdMatch[1]);
    }

    // Extrair título (após "criar tarefa")
    const titleMatch = text.match(/(?:criar|nova|adicionar)\s+tarefa\s+(.+)/i);
    if (titleMatch) {
      entities.title = titleMatch[1].trim();
    }

    // Extrair nome de pessoa (para atribuição)
    const nameMatch = text.match(/(?:para|pro|pra)\s+([A-Za-zÀ-ÿ\s]+)/i);
    if (nameMatch) {
      entities.assignee = nameMatch[1].trim();
    }

    // Extrair prioridade
    if (/urgente|crítico/i.test(text)) entities.priority = TaskPriority.URGENT;
    else if (/alta?/i.test(text)) entities.priority = TaskPriority.HIGH;
    else if (/média?|normal/i.test(text)) entities.priority = TaskPriority.MEDIUM;
    else if (/baixa?/i.test(text)) entities.priority = TaskPriority.LOW;

    // Extrair data (simplificado)
    const dateMatch = text.match(/(amanhã|hoje|segunda|terça|quarta|quinta|sexta)/i);
    if (dateMatch) {
      entities.when = dateMatch[1].toLowerCase();
    }

    return entities;
  }

  /**
   * Executa ação baseada na intenção identificada
   */
  private async executeIntent(
    intent: ConversationIntent,
    teamId: number,
    memberId: number,
    context: MessageContext,
  ): Promise<AgentResponse> {
    switch (intent.intent) {
      case 'create_task':
        return this.handleCreateTask(teamId, memberId, intent.entities);

      case 'list_tasks':
        return this.handleListTasks(teamId, intent.entities);

      case 'my_tasks':
        return this.handleMyTasks(memberId);

      case 'start_task':
        return this.handleStartTask(memberId, intent.entities);

      case 'complete_task':
        return this.handleCompleteTask(memberId, intent.entities);

      case 'assign_task':
        return this.handleAssignTask(teamId, intent.entities);

      case 'team_report':
        return this.handleTeamReport(teamId);

      case 'overdue_tasks':
        return this.handleOverdueTasks(teamId);

      case 'show_insights':
        return this.handleShowInsights(teamId);

      case 'redistribute_tasks':
        return this.handleRedistributeTasks(teamId);

      case 'greeting':
        return this.handleGreeting(memberId);

      case 'help':
        return this.handleHelp();

      default:
        return this.handleUnknown(context.text, teamId, memberId);
    }
  }

  /**
   * Handler: Criar tarefa
   */
  private async handleCreateTask(
    teamId: number,
    creatorId: number,
    entities: any,
  ): Promise<AgentResponse> {
    if (!entities.title) {
      return {
        success: false,
        message: 'Por favor, forneça um título para a tarefa. Exemplo: "Criar tarefa revisar código"',
      };
    }

    const task = await this.taskService.createTask(teamId, creatorId, {
      title: entities.title,
      priority: entities.priority || TaskPriority.MEDIUM,
    });

    return {
      success: true,
      message: `✅ Tarefa #${task.id} criada com sucesso!\n\n*${task.title}*\nPrioridade: ${task.priority}\nStatus: ${task.status}`,
      data: { taskId: task.id },
    };
  }

  /**
   * Handler: Listar tarefas
   */
  private async handleListTasks(teamId: number, entities: any): Promise<AgentResponse> {
    const tasks = await this.taskService.listTasks(teamId);

    if (tasks.length === 0) {
      return {
        success: true,
        message: '📋 Não há tarefas cadastradas ainda.',
      };
    }

    const taskList = tasks
      .slice(0, 10)
      .map(
        (t) =>
          `#${t.id} - ${t.title}\n   Status: ${t.status} | Prioridade: ${t.priority}` +
          (t.dueDate ? `\n   Prazo: ${new Date(t.dueDate).toLocaleDateString('pt-BR')}` : ''),
      )
      .join('\n\n');

    return {
      success: true,
      message: `📋 *Tarefas da Equipe* (${tasks.length} total)\n\n${taskList}`,
      data: { tasks },
    };
  }

  /**
   * Handler: Minhas tarefas
   */
  private async handleMyTasks(memberId: number): Promise<AgentResponse> {
    const assignments = await this.prisma.taskAssignment.findMany({
      where: { memberId },
      include: { task: true },
    });

    const tasks = assignments.map((a) => a.task);

    if (tasks.length === 0) {
      return {
        success: true,
        message: '📋 Você não tem tarefas atribuídas no momento.',
      };
    }

    const taskList = tasks
      .map(
        (t) =>
          `#${t.id} - ${t.title}\n   Status: ${t.status} | Prioridade: ${t.priority}` +
          (t.dueDate ? `\n   Prazo: ${new Date(t.dueDate).toLocaleDateString('pt-BR')}` : ''),
      )
      .join('\n\n');

    return {
      success: true,
      message: `📋 *Suas Tarefas* (${tasks.length} total)\n\n${taskList}`,
      data: { tasks },
    };
  }

  /**
   * Handler: Iniciar tarefa
   */
  private async handleStartTask(memberId: number, entities: any): Promise<AgentResponse> {
    if (!entities.taskId) {
      return {
        success: false,
        message: 'Por favor, informe o número da tarefa. Exemplo: "iniciar tarefa #5"',
      };
    }

    const task = await this.taskService.updateTaskStatus(memberId, memberId, {
      status: TaskStatus.IN_PROGRESS,
      comment: 'Tarefa iniciada',
    });

    return {
      success: true,
      message: `🔄 Tarefa #${entities.taskId} iniciada!\n\n*${task.title}*\nBom trabalho!`,
    };
  }

  /**
   * Handler: Concluir tarefa
   */
  private async handleCompleteTask(memberId: number, entities: any): Promise<AgentResponse> {
    if (!entities.taskId) {
      return {
        success: false,
        message: 'Por favor, informe o número da tarefa. Exemplo: "concluir tarefa #5"',
      };
    }

    const task = await this.taskService.updateTaskStatus(entities.taskId, memberId, {
      status: TaskStatus.COMPLETED,
      comment: 'Tarefa concluída',
    });

    return {
      success: true,
      message: `✅ Parabéns! Tarefa #${entities.taskId} concluída!\n\n*${task.title}*\n\nÓtimo trabalho! 🎉`,
    };
  }

  /**
   * Handler: Atribuir tarefa
   */
  private async handleAssignTask(teamId: number, entities: any): Promise<AgentResponse> {
    if (!entities.taskId || !entities.assignee) {
      return {
        success: false,
        message: 'Por favor, informe a tarefa e a pessoa. Exemplo: "atribuir tarefa #5 para João"',
      };
    }

    // Buscar membro por nome
    const members = await this.teamService.listMembers(teamId);
    const member = members.find((m) => m.name.toLowerCase().includes(entities.assignee.toLowerCase()));

    if (!member) {
      return {
        success: false,
        message: `Não encontrei ninguém com o nome "${entities.assignee}" na equipe.`,
      };
    }

    await this.taskService.assignMembers(entities.taskId, [member.id]);

    const task = await this.taskService.getTaskById(entities.taskId);

    return {
      success: true,
      message: `✅ Tarefa atribuída com sucesso!\n\n*${task?.title}*\nAtribuída para: ${member.name}`,
    };
  }

  /**
   * Handler: Relatório da equipe
   */
  private async handleTeamReport(teamId: number): Promise<AgentResponse> {
    const stats = await this.taskService.getTeamStatistics(teamId);
    const team = await this.teamService.getTeamById(teamId);

    const report =
      `📊 *Relatório - ${team?.name}*\n\n` +
      `📌 Total de tarefas: ${stats.total}\n` +
      `⏳ Pendentes: ${stats.pending}\n` +
      `🔄 Em progresso: ${stats.inProgress}\n` +
      `✅ Concluídas: ${stats.completed}\n` +
      `⚠️ Atrasadas: ${stats.overdue}\n\n` +
      `Taxa de conclusão: ${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`;

    return {
      success: true,
      message: report,
      data: stats,
    };
  }

  /**
   * Handler: Tarefas atrasadas
   */
  private async handleOverdueTasks(teamId: number): Promise<AgentResponse> {
    const tasks = await this.taskService.getOverdueTasks(teamId);

    if (tasks.length === 0) {
      return {
        success: true,
        message: '✅ Ótimo! Não há tarefas atrasadas.',
      };
    }

    const taskList = tasks
      .map(
        (t) =>
          `#${t.id} - ${t.title}\n` +
          `   Prazo: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : 'N/A'}\n` +
          `   Responsáveis: ${t.assignments?.map((a) => a.member.name).join(', ') || 'Nenhum'}`,
      )
      .join('\n\n');

    return {
      success: true,
      message: `⚠️ *Tarefas Atrasadas* (${tasks.length})\n\n${taskList}`,
      data: { tasks },
    };
  }

  /**
   * Handler: Mostrar insights
   */
  private async handleShowInsights(teamId: number): Promise<AgentResponse> {
    const insights = await this.insightsService.getActiveInsights(teamId);

    if (insights.length === 0) {
      return {
        success: true,
        message: '✅ Tudo certo! Não há insights ou alertas no momento.',
      };
    }

    const insightList = insights
      .map((i) => `🔍 *${i.title}*\n   Severidade: ${i.severity}\n   ${i.description}`)
      .join('\n\n');

    return {
      success: true,
      message: `🔍 *Insights Detectados* (${insights.length})\n\n${insightList}`,
      data: { insights },
    };
  }

  /**
   * Handler: Redistribuir tarefas (IA Proativa)
   */
  private async handleRedistributeTasks(teamId: number): Promise<AgentResponse> {
    // Analisar sobrecarga
    const overloadInsights = await this.insightsService.analyzeOverload(teamId);

    if (overloadInsights.length === 0) {
      return {
        success: true,
        message: '✅ A carga de trabalho está balanceada. Não há necessidade de redistribuição.',
      };
    }

    // Sugerir redistribuição
    const suggestions = overloadInsights
      .map((insight) => {
        const memberIds = insight.affectedMembers || [];
        return `- Redistribuir tarefas dos membros sobrecarregados\n  Sugestões:\n  ${insight.suggestions?.map((s) => `  • ${s}`).join('\n')}`;
      })
      .join('\n\n');

    return {
      success: true,
      message: `🤖 *Análise de Redistribuição*\n\n${suggestions}\n\nDeseja que eu execute automaticamente? (Responda "sim" para confirmar)`,
      data: { insights: overloadInsights },
    };
  }

  /**
   * Handler: Saudação
   */
  private async handleGreeting(memberId: number): Promise<AgentResponse> {
    const member = await this.teamService.getMemberById(memberId);
    const stats = await this.taskService.getMemberStatistics(memberId);

    return {
      success: true,
      message:
        `Olá, ${member?.name}! 👋\n\n` +
        `Sou o Pangeia, seu assistente de gestão de equipe.\n\n` +
        `Você tem:\n` +
        `• ${stats.pending + stats.inProgress} tarefas ativas\n` +
        `• ${stats.overdue} tarefas atrasadas\n\n` +
        `Como posso ajudar hoje?`,
    };
  }

  /**
   * Handler: Ajuda
   */
  private async handleHelp(): Promise<AgentResponse> {
    const helpText =
      `🤖 *Pangeia - Assistente Autônomo*\n\n` +
      `Converse naturalmente comigo! Alguns exemplos:\n\n` +
      `📝 *Tarefas:*\n` +
      `• "Criar tarefa revisar código"\n` +
      `• "Listar tarefas"\n` +
      `• "Minhas tarefas"\n` +
      `• "Iniciar tarefa #5"\n` +
      `• "Concluir tarefa #5"\n\n` +
      `👥 *Equipe:*\n` +
      `• "Atribuir tarefa #5 para João"\n` +
      `• "Relatório"\n` +
      `• "Tarefas atrasadas"\n\n` +
      `🔍 *Análise:*\n` +
      `• "Insights"\n` +
      `• "Redistribuir tarefas"\n\n` +
      `Modo proativo ativo! Recebo alertas automáticos. 🚀`;

    return {
      success: true,
      message: helpText,
    };
  }

  /**
   * Handler: Mensagem desconhecida (tentar raciocinar)
   */
  private async handleUnknown(text: string, teamId: number, memberId: number): Promise<AgentResponse> {
    // Tentar criar uma tarefa com o texto fornecido
    return {
      success: true,
      message:
        `Hmm, não entendi exatamente o que você quer.\n\n` +
        `Você quis dizer:\n` +
        `1️⃣ Criar uma tarefa "${text}"?\n` +
        `2️⃣ Ver ajuda?\n\n` +
        `Responda com o número ou reformule sua mensagem.`,
    };
  }

  /**
   * Busca ou cria equipe padrão "Pangeia"
   */
  private async getOrCreateDefaultTeam() {
    let team = await this.teamService.getTeamByName('Pangeia');

    if (!team) {
      team = await this.teamService.createTeam({
        name: 'Pangeia',
        description: 'Equipe padrão gerenciada pelo assistente Pangeia',
      });
    }

    return team;
  }
}
