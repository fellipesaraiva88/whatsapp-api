# PANGEIA - Assistente Autônomo de Gestão de Equipe

> **Versão 2.0 - Modo Autônomo com IA Reativa**

Pangeia é um assistente inteligente de gestão de equipe que funciona via WhatsApp. Evoluído de um simples processador de mensagens para um coordenador autônomo com capacidade de raciocínio, análise proativa e ações inteligentes.

---

## 🚀 Características Principais

### 1. IA Conversacional Natural
- **Sem prefixos obrigatórios** - Converse naturalmente, sem precisar usar "/pangeia"
- **Reconhecimento de intenção** - Entende o contexto e extrai informações automaticamente
- **Raciocínio adaptativo** - Tenta interpretar mensagens desconhecidas
- **Memória de contexto** - Lembra da última conversação e preferências da equipe

### 2. Modo Proativo
O Pangeia não espera você perguntar. Ele:
- **Lembra tarefas atrasadas** automaticamente
- **Cobra responsáveis** quando deadlines se aproximam
- **Avisa líderes** sobre gargalos e problemas
- **Envia relatórios automáticos** (diários e semanais)
- **Sugere ações** baseado em análise da equipe

### 3. Análise Inteligente (Insights)
Identifica automaticamente:
- **Sobrecarga** - Membros com muitas tarefas ativas
- **Gargalos** - Tarefas travadas há muito tempo
- **Queda de produtividade** - Comparação de períodos
- **Riscos de prazo** - Tarefas urgentes não iniciadas
- **Performance da equipe** - Taxa de conclusão e eficiência

### 4. Integrações Externas
- **Google Calendar** - Sincroniza tarefas com agenda
- **Notion** - Cria páginas automaticamente
- **Supabase** - Sincroniza dados em tempo real

### 5. Dashboards e Métricas
- Total de tarefas (pendentes, em progresso, concluídas, atrasadas)
- Estatísticas por membro
- Taxa de conclusão
- Análise de produtividade

---

## 📋 Arquitetura

```
src/pangeia/
├── services/
│   ├── agent.service.ts           # Cérebro do sistema (IA + NLP)
│   ├── message-handler.service.ts # Integração com WhatsApp
│   ├── scheduler.service.ts       # Notificações automáticas
│   ├── insights.service.ts        # Análise de produtividade
│   ├── integration.service.ts     # Integrações externas
│   ├── memory.service.ts          # Contexto expandido
│   ├── team.service.ts            # Gerenciamento de equipes
│   └── task.service.ts            # Gerenciamento de tarefas
├── controllers/
│   └── pangeia.controller.ts      # REST API
├── routers/
│   └── pangeia.router.ts          # Rotas HTTP
├── dto/
│   ├── team.dto.ts                # Validação de equipes
│   └── task.dto.ts                # Validação de tarefas
├── types/
│   └── index.ts                   # Tipos e interfaces
└── index.ts                       # Inicialização
```

---

## 🗄️ Banco de Dados

### Novos Modelos

#### TeamMemory
Armazena contexto expandido da equipe:
- Objetivos (goals)
- Últimos relatórios
- Preferências
- Contexto de conversação (expira em 1h)

#### Insight
Insights gerados automaticamente:
- Tipo: OVERLOAD, BOTTLENECK, PRODUCTIVITY_DROP, DEADLINE_RISK, TEAM_PERFORMANCE
- Severidade: LOW, MEDIUM, HIGH, CRITICAL
- Sugestões de ação
- Métricas detalhadas

#### Notification
Notificações agendadas:
- Lembretes de tarefas
- Alertas de atraso
- Relatórios diários/semanais
- Insights críticos

#### Integration
Configuração de integrações externas:
- Google Calendar
- Notion
- Supabase

---

## 💬 Conversação Natural

### Exemplos de Uso

**Criar tarefas:**
```
Usuário: "Criar tarefa revisar código do módulo de pagamento"
Pangeia: ✅ Tarefa #15 criada com sucesso!

Usuário: "Preciso fazer uma apresentação amanhã"
Pangeia: ✅ Tarefa #16 criada com sucesso!
```

**Listar e consultar:**
```
Usuário: "Minhas tarefas"
Pangeia: 📋 Suas Tarefas (3 total)
         #15 - Revisar código...
         #16 - Apresentação...
         #17 - Documentação...

Usuário: "Relatório"
Pangeia: 📊 Relatório - Equipe Pangeia
         📌 Total: 25
         ✅ Concluídas: 15 (60%)
         ⚠️ Atrasadas: 2
```

**Atualizar status:**
```
Usuário: "Iniciar tarefa #15"
Pangeia: 🔄 Tarefa #15 iniciada! Bom trabalho!

Usuário: "Concluir tarefa #15"
Pangeia: ✅ Parabéns! Tarefa #15 concluída! 🎉
```

**Atribuição:**
```
Usuário: "Atribuir tarefa #16 para Maria"
Pangeia: ✅ Tarefa atribuída com sucesso!
         *Apresentação*
         Atribuída para: Maria
```

**Análise:**
```
Usuário: "Insights"
Pangeia: 🔍 Insights Detectados (2)
         - Sobrecarga detectada em 1 membro
         - 3 tarefas travadas identificadas

Usuário: "Redistribuir tarefas"
Pangeia: 🤖 Análise de Redistribuição
         - Redistribuir 3 tarefas de João
         - Maria está sobrecarregada...
```

---

## 🤖 Modo Proativo

### Notificações Automáticas

#### 1. Tarefas Atrasadas (verificação a cada 15min)
```
⚠️ TAREFA ATRASADA

*Revisar código do módulo de pagamento*

Prazo: 24/10/2025
Status: IN_PROGRESS

Por favor, atualize o status ou ajuste o prazo.
```

#### 2. Lembretes (24h antes do prazo)
```
🔔 LEMBRETE DE TAREFA

*Apresentação para diretoria*

Prazo: 25/10/2025 às 14:00
Prioridade: URGENT

Não esqueça de trabalhar nesta tarefa!
```

#### 3. Relatórios Diários (09:00)
```
📊 RELATÓRIO DIÁRIO - Equipe Pangeia

📌 Total de tarefas: 25
⏳ Pendentes: 8
🔄 Em progresso: 5
✅ Concluídas: 10
⚠️ Atrasadas: 2

Tenha um ótimo dia de trabalho! 💪
```

#### 4. Relatórios Semanais (Segunda 09:00)
```
📈 RELATÓRIO SEMANAL - Equipe Pangeia

👥 Membros ativos: 5
📌 Total de tarefas: 25
✅ Taxa de conclusão: 60%
⚠️ Tarefas atrasadas: 2

Continue com o excelente trabalho! 🚀
```

#### 5. Alertas de Insights (quando detectados)
```
🔍 INSIGHT DETECTADO

Tipo: OVERLOAD
Severidade: HIGH

Sobrecarga detectada em 1 membro(s)

**Sugestões:**
- Redistribuir 5 tarefas de João
- Revisar prioridades das tarefas
- Considerar adicionar mais recursos
```

---

## 📊 API REST

### Base URL
```
/pangeia
```

### Endpoints Principais

#### Equipes
```
POST   /teams              # Criar equipe
GET    /teams              # Listar equipes
GET    /teams/:teamId      # Detalhes da equipe
PUT    /teams/:teamId      # Atualizar equipe
DELETE /teams/:teamId      # Remover equipe
```

#### Membros
```
POST   /teams/:teamId/members  # Adicionar membro
GET    /teams/:teamId/members  # Listar membros
PUT    /members/:memberId      # Atualizar membro
DELETE /members/:memberId      # Remover membro
```

#### Tarefas
```
POST   /teams/:teamId/tasks       # Criar tarefa
GET    /teams/:teamId/tasks       # Listar tarefas (com filtros)
GET    /tasks/:taskId             # Detalhes da tarefa
PUT    /tasks/:taskId             # Atualizar tarefa
PATCH  /tasks/:taskId/status      # Atualizar status
POST   /tasks/:taskId/assign      # Atribuir membros
POST   /tasks/:taskId/comments    # Adicionar comentário
```

#### Estatísticas
```
GET /teams/:teamId/statistics     # Estatísticas da equipe
GET /members/:memberId/statistics # Estatísticas do membro
GET /teams/:teamId/overdue        # Tarefas atrasadas
```

#### Insights
```
POST  /teams/:teamId/analysis      # Executar análise completa
GET   /teams/:teamId/insights      # Listar insights ativos
PATCH /insights/:insightId/resolve # Resolver insight
```

#### Integrações
```
GET /integrations  # Status das integrações
```

---

## ⚙️ Configuração e Instalação

### 1. Dependências (opcional para recursos avançados)
```bash
npm install node-cron googleapis @notionhq/client
```

### 2. Migração do Banco de Dados
```bash
npx prisma migrate dev --name add_pangeia_autonomous_system
npx prisma generate
```

### 3. Inicialização

```typescript
import { PrismaClient } from '@prisma/client';
import { createPangeiaSystem } from './pangeia';

const prisma = new PrismaClient();

const pangeia = createPangeiaSystem(prisma, {
  schedulerCheckInterval: 15,        // 15 minutos
  schedulerReminderHoursBefore: 24,  // 24h antes
  schedulerDailyReportTime: '09:00', // 09:00
  schedulerWeeklyReportDay: 1,       // Segunda-feira
});

// Iniciar sistema
await pangeia.start();

// Configurar cliente WhatsApp
pangeia.setWhatsAppClient(whatsappClient);

// Processar mensagens recebidas
whatsappEventEmitter.on('messages.upsert', async (msg) => {
  await pangeia.handleWhatsAppMessage('instance-name', msg);
});

// Registrar rotas na API
app.use('/pangeia', pangeia.router);
```

---

## 🧪 Teste de Caso: Cobrança Automática

### Cenário
1. Tarefa criada com prazo para 25/10/2025
2. 24/10/2025 09:00 - Pangeia envia lembrete
3. 25/10/2025 15:00 - Prazo passou, tarefa não concluída
4. Pangeia envia notificação ao responsável
5. Pangeia notifica o líder da equipe

### Resultado Esperado

**Para o responsável:**
```
⚠️ TAREFA ATRASADA

*Revisar código do módulo de pagamento*

Prazo: 25/10/2025
Status: IN_PROGRESS

Por favor, atualize o status ou ajuste o prazo.
```

**Para o líder:**
```
⚠️ [LÍDER] Tarefa atrasada na equipe

*Revisar código do módulo de pagamento*
Responsáveis: João Silva
Prazo: 25/10/2025
```

---

## 🎯 Recursos Avançados

### 1. Memória Expandida
```typescript
// Armazenar objetivos da equipe
await memoryService.setTeamGoals(teamId, [
  'Entregar MVP até fim do mês',
  'Reduzir bugs em 50%',
  'Melhorar tempo de resposta'
]);

// Recuperar preferências
const prefs = await memoryService.getTeamPreferences(teamId);
```

### 2. Insights Personalizados
```typescript
// Executar análise completa
const insights = await insightsService.runFullAnalysis(teamId);

// Análises específicas
const overloadInsights = await insightsService.analyzeOverload(teamId);
const bottlenecks = await insightsService.analyzeBottlenecks(teamId);
const productivityDrop = await insightsService.analyzeProductivityDrop(teamId);
```

### 3. Integrações
```typescript
// Google Calendar
await integrationService.saveIntegration('GOOGLE_CALENDAR', {
  clientId: 'xxx',
  clientSecret: 'yyy',
  refreshToken: 'zzz'
});

await integrationService.syncTaskToGoogleCalendar(task);

// Notion
await integrationService.saveIntegration('NOTION', {
  token: 'secret_xxx'
}, {
  databaseId: 'xxx-yyy-zzz'
});

await integrationService.createNotionPage(task);
```

---

## 🔧 Configuração do Scheduler

### Horários Padrão
- **Verificação:** A cada 15 minutos
- **Lembretes:** 24h antes do prazo
- **Relatório Diário:** 09:00
- **Relatório Semanal:** Segunda-feira 09:00

### Customização
```typescript
const pangeia = createPangeiaSystem(prisma, {
  schedulerCheckInterval: 30,        // Verificar a cada 30min
  schedulerReminderHoursBefore: 48,  // Avisar 48h antes
  schedulerDailyReportTime: '08:00', // Relatório às 08:00
  schedulerWeeklyReportDay: 5,       // Sexta-feira
});
```

---

## 📝 Estrutura de Dados

### Task
```typescript
{
  id: number
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  completedAt?: Date
  assignments: TeamMember[]
  comments: TaskComment[]
  statusHistory: TaskStatusHistory[]
}
```

### Insight
```typescript
{
  id: number
  type: 'OVERLOAD' | 'BOTTLENECK' | 'PRODUCTIVITY_DROP' | 'DEADLINE_RISK' | 'TEAM_PERFORMANCE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  data: {
    affectedMembers?: number[]
    affectedTasks?: number[]
    metrics?: Record<string, number>
    suggestions?: string[]
  }
  resolved: boolean
}
```

---

## 🚦 Status do Sistema

Ao iniciar, o Pangeia exibe:

```
🤖 [Pangeia] Iniciando Assistente Autônomo de Gestão de Equipe...
✅ [Pangeia] Sistema iniciado com sucesso!
   - Modo proativo: ATIVO
   - IA conversacional: ATIVA
   - Análise de insights: ATIVA
   - Notificações automáticas: ATIVAS
```

---

## 🛠️ Troubleshooting

### Notificações não estão sendo enviadas
1. Verifique se o scheduler está rodando: `schedulerService.start()`
2. Confirme que o callback foi configurado
3. Verifique o intervalo de verificação

### Mensagens não são processadas
1. Confirme que o WhatsApp client foi configurado
2. Verifique se é mensagem de grupo (precisa mencionar "pangeia")
3. Olhe os logs do console

### Insights não são gerados
1. Verifique se há dados suficientes (tarefas, membros)
2. Execute análise manual: `insightsService.runFullAnalysis(teamId)`

---

## 📈 Roadmap Futuro

- [ ] Integração com IA externa (OpenAI/Anthropic) para raciocínio avançado
- [ ] Geração automática de relatórios em PDF
- [ ] Dashboard web interativo
- [ ] Suporte a múltiplas equipes simultâneas
- [ ] Gamificação (pontos, badges, rankings)
- [ ] Webhooks para integrações customizadas
- [ ] Comandos de voz via WhatsApp
- [ ] Análise de sentimento nas conversas

---

## 📄 Licença

Este projeto está sob a licença Apache 2.0

---

## 👨‍💻 Contribuindo

Pangeia é um projeto em evolução. Contribuições são bem-vindas!

---

**Desenvolvido com ❤️ para equipes que querem ser mais produtivas**
