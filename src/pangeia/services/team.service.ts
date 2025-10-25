/**
 * PANGEIA - Team Service
 * Gerenciamento de equipes e membros
 */

import { PrismaClient, Team, TeamMember, MemberRole } from '@prisma/client';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, UpdateTeamMemberDto } from '../dto/team.dto';

export class TeamService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Cria uma nova equipe
   */
  async createTeam(data: CreateTeamDto): Promise<Team> {
    return this.prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Lista todas as equipes ativas
   */
  async listTeams(): Promise<Team[]> {
    return this.prisma.team.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    });
  }

  /**
   * Busca equipe por ID
   */
  async getTeamById(id: number): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        members: true,
        tasks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Busca equipe por nome
   */
  async getTeamByName(name: string): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { name },
    });
  }

  /**
   * Atualiza dados da equipe
   */
  async updateTeam(id: number, data: UpdateTeamDto): Promise<Team> {
    return this.prisma.team.update({
      where: { id },
      data,
    });
  }

  /**
   * Remove equipe (soft delete)
   */
  async deleteTeam(id: number): Promise<Team> {
    return this.prisma.team.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * Adiciona membro à equipe
   */
  async addMember(teamId: number, data: AddTeamMemberDto): Promise<TeamMember> {
    return this.prisma.teamMember.create({
      data: {
        teamId,
        whatsappJid: data.whatsappJid,
        name: data.name,
        role: data.role,
      },
    });
  }

  /**
   * Busca ou cria membro automaticamente (para integração WhatsApp)
   */
  async findOrCreateMember(teamId: number, whatsappJid: string, name: string): Promise<TeamMember> {
    let member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_whatsappJid: {
          teamId,
          whatsappJid,
        },
      },
    });

    if (!member) {
      member = await this.addMember(teamId, {
        whatsappJid,
        name,
        role: MemberRole.ASSIGNED,
      });
    }

    return member;
  }

  /**
   * Lista membros da equipe
   */
  async listMembers(teamId: number, role?: MemberRole): Promise<TeamMember[]> {
    return this.prisma.teamMember.findMany({
      where: {
        teamId,
        active: true,
        ...(role && { role }),
      },
    });
  }

  /**
   * Busca membro por ID
   */
  async getMemberById(id: number): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });
  }

  /**
   * Busca membro por WhatsApp JID
   */
  async getMemberByJid(teamId: number, whatsappJid: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({
      where: {
        teamId_whatsappJid: {
          teamId,
          whatsappJid,
        },
      },
    });
  }

  /**
   * Atualiza dados do membro
   */
  async updateMember(id: number, data: UpdateTeamMemberDto): Promise<TeamMember> {
    return this.prisma.teamMember.update({
      where: { id },
      data,
    });
  }

  /**
   * Remove membro (soft delete)
   */
  async deleteMember(id: number): Promise<TeamMember> {
    return this.prisma.teamMember.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * Lista líderes da equipe
   */
  async getTeamLeaders(teamId: number): Promise<TeamMember[]> {
    return this.listMembers(teamId, MemberRole.LEADER);
  }

  /**
   * Verifica se membro é líder
   */
  async isLeader(memberId: number): Promise<boolean> {
    const member = await this.getMemberById(memberId);
    return member?.role === MemberRole.LEADER;
  }
}
