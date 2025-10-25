/**
 * PANGEIA - Teste de Caso: Cobrança Automática de Tarefa Atrasada
 *
 * Este arquivo demonstra como o Pangeia funciona de forma autônoma,
 * detectando tarefas atrasadas e notificando responsáveis e líderes.
 */

import { PrismaClient } from '@prisma/client';
import { createPangeiaSystem } from '../index';

// Mock do cliente WhatsApp para testes
class MockWhatsAppClient {
  public sentMessages: Array<{ jid: string; message: string }> = [];

  async sendMessage(jid: string, content: any) {
    this.sentMessages.push({
      jid,
      message: content.text,
    });
    console.log(`\n📤 [WhatsApp Mock] Mensagem enviada para ${jid}:`);
    console.log(content.text);
    console.log('---\n');
  }

  getMessagesSentTo(jid: string) {
    return this.sentMessages.filter((m) => m.jid === jid);
  }

  clearMessages() {
    this.sentMessages = [];
  }
}

async function runTestCase() {
  console.log('🧪 TESTE DE CASO: Cobrança Automática de Tarefa Atrasada\n');
  console.log('=' .repeat(60));

  const prisma = new PrismaClient();
  const mockWhatsApp = new MockWhatsAppClient();

  try {
    // 1. Inicializar sistema Pangeia
    console.log('\n1️⃣ Inicializando sistema Pangeia...\n');
    const pangeia = createPangeiaSystem(prisma, {
      schedulerCheckInterval: 1, // 1 minuto para testes
      schedulerReminderHoursBefore: 24,
      schedulerDailyReportTime: '09:00',
      schedulerWeeklyReportDay: 1,
    });

    pangeia.setWhatsAppClient(mockWhatsApp as any);
    await pangeia.start();

    // 2. Criar equipe de teste
    console.log('\n2️⃣ Criando equipe de teste...\n');
    const team = await pangeia.teamService.createTeam({
      name: 'Equipe Dev - Teste',
      description: 'Equipe para teste de cobrança automática',
    });
    console.log(`✅ Equipe criada: ${team.name} (ID: ${team.id})`);

    // 3. Adicionar líder
    console.log('\n3️⃣ Adicionando líder da equipe...\n');
    const leader = await pangeia.teamService.addMember(team.id, {
      whatsappJid: '5511999998888@s.whatsapp.net',
      name: 'Carlos Silva (Líder)',
      role: 'LEADER',
    });
    console.log(`✅ Líder adicionado: ${leader.name}`);

    // 4. Adicionar membro responsável
    console.log('\n4️⃣ Adicionando membro responsável...\n');
    const member = await pangeia.teamService.addMember(team.id, {
      whatsappJid: '5511999997777@s.whatsapp.net',
      name: 'João Santos',
      role: 'ASSIGNED',
    });
    console.log(`✅ Membro adicionado: ${member.name}`);

    // 5. Criar tarefa ATRASADA (prazo no passado)
    console.log('\n5️⃣ Criando tarefa com prazo vencido...\n');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Ontem

    const task = await pangeia.taskService.createTask(team.id, member.id, {
      title: 'Revisar código do módulo de pagamento',
      description: 'Revisar PR #123 e aprovar se estiver tudo OK',
      priority: 'HIGH',
      dueDate: yesterday.toISOString(),
      assignedMemberIds: [member.id],
    });
    console.log(`✅ Tarefa criada: #${task.id} - ${task.title}`);
    console.log(`   Prazo: ${yesterday.toLocaleDateString('pt-BR')} (VENCIDO)`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Prioridade: ${task.priority}`);

    // 6. Aguardar processamento do scheduler (simular execução)
    console.log('\n6️⃣ Executando verificação de tarefas atrasadas...\n');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Aguardar 2s

    // Forçar execução do verificador de tarefas atrasadas
    await (pangeia.schedulerService as any).checkOverdueTasks();

    // 7. Processar notificações pendentes
    console.log('\n7️⃣ Processando notificações agendadas...\n');
    await (pangeia.schedulerService as any).processPendingNotifications();

    // 8. Verificar mensagens enviadas
    console.log('\n8️⃣ Verificando mensagens enviadas...\n');

    const memberMessages = mockWhatsApp.getMessagesSentTo(member.whatsappJid);
    const leaderMessages = mockWhatsApp.getMessagesSentTo(leader.whatsappJid);

    console.log(`📊 Total de mensagens enviadas: ${mockWhatsApp.sentMessages.length}`);
    console.log(`   - Para ${member.name}: ${memberMessages.length} mensagem(ns)`);
    console.log(`   - Para ${leader.name}: ${leaderMessages.length} mensagem(ns)`);

    // 9. Validar conteúdo das mensagens
    console.log('\n9️⃣ Validando conteúdo das mensagens...\n');

    let allTestsPassed = true;

    // Verificar mensagem para o responsável
    if (memberMessages.length > 0) {
      const memberMsg = memberMessages[0].message;
      const hasOverdueAlert = memberMsg.includes('ATRASADA');
      const hasTaskTitle = memberMsg.includes(task.title);
      const hasDeadline = memberMsg.includes(yesterday.toLocaleDateString('pt-BR'));

      console.log(`✅ Mensagem para responsável enviada:`);
      console.log(`   - Contém alerta de atraso: ${hasOverdueAlert ? '✅' : '❌'}`);
      console.log(`   - Contém título da tarefa: ${hasTaskTitle ? '✅' : '❌'}`);
      console.log(`   - Contém prazo: ${hasDeadline ? '✅' : '❌'}`);

      if (!hasOverdueAlert || !hasTaskTitle || !hasDeadline) {
        allTestsPassed = false;
      }
    } else {
      console.log(`❌ Nenhuma mensagem enviada para o responsável!`);
      allTestsPassed = false;
    }

    // Verificar mensagem para o líder
    if (leaderMessages.length > 0) {
      const leaderMsg = leaderMessages[0].message;
      const hasLeaderTag = leaderMsg.includes('[LÍDER]');
      const hasTaskTitle = leaderMsg.includes(task.title);
      const hasResponsibleName = leaderMsg.includes(member.name);

      console.log(`\n✅ Mensagem para líder enviada:`);
      console.log(`   - Contém tag de líder: ${hasLeaderTag ? '✅' : '❌'}`);
      console.log(`   - Contém título da tarefa: ${hasTaskTitle ? '✅' : '❌'}`);
      console.log(`   - Contém nome do responsável: ${hasResponsibleName ? '✅' : '❌'}`);

      if (!hasLeaderTag || !hasTaskTitle || !hasResponsibleName) {
        allTestsPassed = false;
      }
    } else {
      console.log(`\n❌ Nenhuma mensagem enviada para o líder!`);
      allTestsPassed = false;
    }

    // 10. Resultado final
    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
      console.log('✅ TESTE PASSOU! Todas as verificações foram bem-sucedidas.');
      console.log('\nO Pangeia funcionou corretamente:');
      console.log('  - Detectou a tarefa atrasada');
      console.log('  - Notificou o responsável automaticamente');
      console.log('  - Notificou o líder da equipe');
      console.log('  - Mensagens continham todas as informações necessárias');
    } else {
      console.log('❌ TESTE FALHOU! Algumas verificações não passaram.');
    }
    console.log('='.repeat(60) + '\n');

    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...\n');
    await pangeia.taskService.updateTask(task.id, { title: `[TESTE] ${task.title}` });
    await pangeia.teamService.updateTeam(team.id, { active: false });

    // Parar sistema
    await pangeia.stop();

    process.exit(allTestsPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar teste se for chamado diretamente
if (require.main === module) {
  runTestCase();
}

export { runTestCase };
