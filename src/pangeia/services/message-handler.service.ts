/**
 * PANGEIA - Message Handler Service
 * Integração com WhatsApp e processamento de mensagens
 */

import { PrismaClient, Notification } from '@prisma/client';
import { AgentService } from './agent.service';
import { MessageContext } from '../types';

export interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  message?: any;
  pushName?: string;
  messageTimestamp?: number;
}

export interface WhatsAppClient {
  sendMessage: (jid: string, content: any) => Promise<any>;
}

export class MessageHandlerService {
  private prisma: PrismaClient;
  private agentService: AgentService;
  private whatsappClient?: WhatsAppClient;

  constructor(prisma: PrismaClient, agentService: AgentService) {
    this.prisma = prisma;
    this.agentService = agentService;
  }

  /**
   * Define o cliente WhatsApp
   */
  setWhatsAppClient(client: WhatsAppClient): void {
    this.whatsappClient = client;
  }

  /**
   * Processa mensagem recebida do WhatsApp
   */
  async handleIncomingMessage(instanceName: string, message: WhatsAppMessage): Promise<void> {
    try {
      // Ignorar mensagens enviadas por nós
      if (message.key.fromMe) return;

      // Extrair texto da mensagem
      const text = this.extractMessageText(message);
      if (!text) return;

      // Preparar contexto
      const context: MessageContext = {
        instanceName,
        remoteJid: message.key.remoteJid,
        senderJid: message.key.participant || message.key.remoteJid,
        senderName: message.pushName || 'Usuário',
        text: text.trim(),
        isGroup: message.key.remoteJid.endsWith('@g.us'),
        messageTimestamp: message.messageTimestamp,
      };

      // Verificar se deve processar (conversação natural - sem prefixo necessário)
      // Mas só processar se:
      // 1. For mensagem direta (não grupo), OU
      // 2. Mencionar "pangeia" ou "@pangeia"
      const shouldProcess = !context.isGroup || this.shouldProcessGroupMessage(text);

      if (!shouldProcess) return;

      console.log(`[Pangeia] Processando mensagem de ${context.senderName}: ${text}`);

      // Processar com o agente
      const response = await this.agentService.processMessage(context);

      // Enviar resposta
      await this.sendWhatsAppMessage(context.remoteJid, response.message);
    } catch (error) {
      console.error('[Pangeia MessageHandler] Erro ao processar mensagem:', error);
    }
  }

  /**
   * Verifica se deve processar mensagem de grupo
   */
  private shouldProcessGroupMessage(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes('pangeia') ||
      lowerText.includes('@pangeia') ||
      lowerText.startsWith('pangeia') ||
      lowerText.startsWith('@pangeia')
    );
  }

  /**
   * Extrai texto da mensagem
   */
  private extractMessageText(message: WhatsAppMessage): string | null {
    if (!message.message) return null;

    const msg = message.message;

    // Mensagem de conversa normal
    if (msg.conversation) return msg.conversation;

    // Mensagem de texto estendida
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;

    // Imagem com legenda
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;

    // Vídeo com legenda
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;

    // Documento com legenda
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;

    return null;
  }

  /**
   * Envia mensagem via WhatsApp
   */
  private async sendWhatsAppMessage(jid: string, text: string): Promise<void> {
    if (!this.whatsappClient) {
      console.error('[Pangeia] WhatsApp client não configurado');
      return;
    }

    try {
      await this.whatsappClient.sendMessage(jid, { text });
      console.log(`[Pangeia] Mensagem enviada para ${jid}`);
    } catch (error) {
      console.error('[Pangeia] Erro ao enviar mensagem:', error);
    }
  }

  /**
   * Processa notificação agendada (callback do Scheduler)
   */
  async handleScheduledNotification(notification: Notification): Promise<void> {
    try {
      const member = await this.prisma.teamMember.findUnique({
        where: { id: notification.memberId },
      });

      if (!member) {
        console.error(`[Pangeia] Membro ${notification.memberId} não encontrado`);
        return;
      }

      // Enviar notificação via WhatsApp
      await this.sendWhatsAppMessage(member.whatsappJid, notification.message);

      console.log(`[Pangeia] Notificação enviada para ${member.name} (${member.whatsappJid})`);
    } catch (error) {
      console.error('[Pangeia] Erro ao processar notificação agendada:', error);
      throw error;
    }
  }

  /**
   * Envia mensagem proativa para um membro
   */
  async sendProactiveMessage(memberJid: string, message: string): Promise<void> {
    await this.sendWhatsAppMessage(memberJid, message);
  }

  /**
   * Envia mensagem para todos os líderes de uma equipe
   */
  async notifyTeamLeaders(teamId: number, message: string): Promise<void> {
    const leaders = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        role: 'LEADER',
        active: true,
      },
    });

    for (const leader of leaders) {
      await this.sendWhatsAppMessage(leader.whatsappJid, message);
    }
  }

  /**
   * Broadcast para toda a equipe
   */
  async broadcastToTeam(teamId: number, message: string): Promise<void> {
    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        active: true,
      },
    });

    for (const member of members) {
      await this.sendWhatsAppMessage(member.whatsappJid, message);
    }
  }
}
