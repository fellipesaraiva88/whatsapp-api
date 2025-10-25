/**
 * PANGEIA - Task Service
 * Gerenciamento de tarefas
 */

import { PrismaClient, Task, TaskStatus, TaskPriority, TaskComment } from '@prisma/client';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, CreateCommentDto } from '../dto/task.dto';

export class TaskService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Cria uma nova tarefa
   */
  async createTask(teamId: number, creatorId: number, data: CreateTaskDto): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        teamId,
        creatorId,
        title: data.title,
        description: data.description,
        priority: data.priority || TaskPriority.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignments: {
          include: {
            member: true,
          },
        },
      },
    });

    // Atribuir membros se especificado
    if (data.assignedMemberIds && data.assignedMemberIds.length > 0) {
      await this.assignMembers(task.id, data.assignedMemberIds);
    }

    // Criar histórico inicial
    await this.prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        newStatus: TaskStatus.PENDING,
        changedById: creatorId,
      },
    });

    return task;
  }

  /**
   * Lista tarefas da equipe com filtros
   */
  async listTasks(
    teamId: number,
    filters?: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedTo?: number;
      overdue?: boolean;
    },
  ): Promise<Task[]> {
    const where: any = { teamId };

    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assignedTo) {
      where.assignments = {
        some: { memberId: filters.assignedTo },
      };
    }
    if (filters?.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] };
    }

    return this.prisma.task.findMany({
      where,
      include: {
        creator: true,
        assignments: {
          include: {
            member: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  /**
   * Busca tarefa por ID
   */
  async getTaskById(id: number): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        creator: true,
        team: true,
        assignments: {
          include: {
            member: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: {
            changedBy: true,
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Atualiza dados da tarefa
   */
  async updateTask(id: number, data: UpdateTaskDto): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority && { priority: data.priority }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
    });
  }

  /**
   * Atualiza status da tarefa
   */
  async updateTaskStatus(id: number, memberId: number, data: UpdateTaskStatusDto): Promise<Task> {
    const task = await this.getTaskById(id);
    if (!task) throw new Error('Tarefa não encontrada');

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.status === TaskStatus.COMPLETED && { completedAt: new Date() }),
      },
    });

    // Registrar no histórico
    await this.prisma.taskStatusHistory.create({
      data: {
        taskId: id,
        previousStatus: task.status,
        newStatus: data.status,
        changedById: memberId,
        comment: data.comment,
      },
    });

    return updatedTask;
  }

  /**
   * Atribui membros a uma tarefa
   */
  async assignMembers(taskId: number, memberIds: number[]): Promise<void> {
    await this.prisma.taskAssignment.createMany({
      data: memberIds.map((memberId) => ({
        taskId,
        memberId,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Remove atribuição de membro
   */
  async unassignMember(taskId: number, memberId: number): Promise<void> {
    await this.prisma.taskAssignment.deleteMany({
      where: {
        taskId,
        memberId,
      },
    });
  }

  /**
   * Adiciona comentário à tarefa
   */
  async addComment(taskId: number, authorId: number, data: CreateCommentDto): Promise<TaskComment> {
    return this.prisma.taskComment.create({
      data: {
        taskId,
        authorId,
        content: data.content,
      },
    });
  }

  /**
   * Lista tarefas atrasadas
   */
  async getOverdueTasks(teamId: number): Promise<Task[]> {
    return this.listTasks(teamId, { overdue: true });
  }

  /**
   * Estatísticas da equipe
   */
  async getTeamStatistics(teamId: number) {
    const total = await this.prisma.task.count({ where: { teamId } });
    const pending = await this.prisma.task.count({
      where: { teamId, status: TaskStatus.PENDING },
    });
    const inProgress = await this.prisma.task.count({
      where: { teamId, status: TaskStatus.IN_PROGRESS },
    });
    const completed = await this.prisma.task.count({
      where: { teamId, status: TaskStatus.COMPLETED },
    });
    const overdue = await this.prisma.task.count({
      where: {
        teamId,
        dueDate: { lt: new Date() },
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      },
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }

  /**
   * Estatísticas de um membro
   */
  async getMemberStatistics(memberId: number) {
    const assignments = await this.prisma.taskAssignment.findMany({
      where: { memberId },
      include: { task: true },
    });

    const tasks = assignments.map((a) => a.task);
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const overdue = tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < new Date() &&
        ![TaskStatus.COMPLETED, TaskStatus.CANCELLED].includes(t.status),
    ).length;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }
}
