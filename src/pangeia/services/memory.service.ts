/**
 * PANGEIA - MemoryStore Service
 * Serviço de memória expandida para contexto de equipe
 */

import { PrismaClient } from '@prisma/client';
import { MemoryData } from '../types';

export class MemoryService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Armazena ou atualiza um contexto de memória da equipe
   */
  async setMemory(teamId: number, context: string, data: any, expiresAt?: Date): Promise<void> {
    await this.prisma.teamMemory.upsert({
      where: {
        teamId_context: {
          teamId,
          context,
        },
      },
      update: {
        data,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        teamId,
        context,
        data,
        expiresAt,
      },
    });
  }

  /**
   * Recupera um contexto específico de memória
   */
  async getMemory(teamId: number, context: string): Promise<MemoryData | null> {
    const memory = await this.prisma.teamMemory.findUnique({
      where: {
        teamId_context: {
          teamId,
          context,
        },
      },
    });

    if (!memory) return null;

    // Verifica se a memória expirou
    if (memory.expiresAt && memory.expiresAt < new Date()) {
      await this.deleteMemory(teamId, context);
      return null;
    }

    return {
      context: memory.context,
      data: memory.data as any,
      expiresAt: memory.expiresAt || undefined,
    };
  }

  /**
   * Recupera todas as memórias de uma equipe
   */
  async getTeamMemories(teamId: number): Promise<MemoryData[]> {
    const memories = await this.prisma.teamMemory.findMany({
      where: {
        teamId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    return memories.map((m) => ({
      context: m.context,
      data: m.data as any,
      expiresAt: m.expiresAt || undefined,
    }));
  }

  /**
   * Remove uma memória específica
   */
  async deleteMemory(teamId: number, context: string): Promise<void> {
    await this.prisma.teamMemory.deleteMany({
      where: {
        teamId,
        context,
      },
    });
  }

  /**
   * Limpa memórias expiradas
   */
  async cleanExpiredMemories(): Promise<number> {
    const result = await this.prisma.teamMemory.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Armazena objetivos da equipe
   */
  async setTeamGoals(teamId: number, goals: string[]): Promise<void> {
    await this.setMemory(teamId, 'team_goals', { goals });
  }

  /**
   * Recupera objetivos da equipe
   */
  async getTeamGoals(teamId: number): Promise<string[]> {
    const memory = await this.getMemory(teamId, 'team_goals');
    return memory?.data?.goals || [];
  }

  /**
   * Armazena último relatório
   */
  async setLastReport(teamId: number, report: any): Promise<void> {
    await this.setMemory(teamId, 'last_report', report);
  }

  /**
   * Recupera último relatório
   */
  async getLastReport(teamId: number): Promise<any> {
    const memory = await this.getMemory(teamId, 'last_report');
    return memory?.data || null;
  }

  /**
   * Armazena preferências da equipe
   */
  async setTeamPreferences(teamId: number, preferences: any): Promise<void> {
    await this.setMemory(teamId, 'team_preferences', preferences);
  }

  /**
   * Recupera preferências da equipe
   */
  async getTeamPreferences(teamId: number): Promise<any> {
    const memory = await this.getMemory(teamId, 'team_preferences');
    return memory?.data || {};
  }

  /**
   * Armazena contexto de conversação
   */
  async setConversationContext(teamId: number, context: any, expiresInMinutes: number = 60): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    await this.setMemory(teamId, 'conversation_context', context, expiresAt);
  }

  /**
   * Recupera contexto de conversação
   */
  async getConversationContext(teamId: number): Promise<any> {
    const memory = await this.getMemory(teamId, 'conversation_context');
    return memory?.data || null;
  }
}
