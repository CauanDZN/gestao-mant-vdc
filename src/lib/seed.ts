import type {
  ChurchAsset,
  ChurchCommitment,
  ChurchDatabase,
  ChurchEvent,
  ChurchPerson,
  FinancialTransaction,
} from "./types";

function dayOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthDay(month: number, day: number): string {
  return `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const people: ChurchPerson[] = [
  { id: "p-001", name: "Ana Paula Costa", phone: "(31) 98812-4401", email: "ana.costa@email.com", birthday: monthDay(3, 18), stage: "membro", group: "Célula Esperança", firstVisit: dayOffset(-820), notes: "Líder do ministério infantil.", contactDates: [dayOffset(-8)] },
  { id: "p-002", name: "Marcos Vinícius Silva", phone: "(31) 99145-8820", email: "marcos.silva@email.com", birthday: monthDay(7, 2), stage: "membro", group: "Louvor", firstVisit: dayOffset(-700), notes: "", contactDates: [dayOffset(-15)] },
  { id: "p-003", name: "Beatriz Almeida", phone: "(31) 98477-1290", email: "bia.almeida@email.com", birthday: monthDay(11, 12), stage: "frequentador", group: "Célula Nova Vida", firstVisit: dayOffset(-120), notes: "Participa dos cultos de domingo.", contactDates: [dayOffset(-24)] },
  { id: "p-004", name: "Lucas Ferreira", phone: "(31) 99608-3311", email: "lucas.ferreira@email.com", birthday: monthDay(5, 30), stage: "visita", group: "", firstVisit: dayOffset(-4), notes: "Veio com a família no culto de domingo.", contactDates: [] },
  { id: "p-005", name: "Camila Rodrigues", phone: "(31) 98220-7745", email: "camila.rodrigues@email.com", birthday: monthDay(9, 7), stage: "contatado", group: "", firstVisit: dayOffset(-14), notes: "Demonstrou interesse em conhecer uma célula.", contactDates: [dayOffset(-11)] },
  { id: "p-006", name: "João Pedro Santos", phone: "(31) 99031-6620", email: "joao.santos@email.com", birthday: monthDay(1, 21), stage: "membro", group: "Célula Esperança", firstVisit: dayOffset(-1200), notes: "", contactDates: [dayOffset(-5)] },
  { id: "p-007", name: "Rafaela Oliveira", phone: "(31) 98716-4502", email: "rafa.oliveira@email.com", birthday: monthDay(4, 9), stage: "visita", group: "", firstVisit: dayOffset(-3), notes: "Primeira visita. Enviar mensagem de boas-vindas.", contactDates: [] },
  { id: "p-008", name: "Pedro Henrique Lima", phone: "(31) 98557-1664", email: "pedro.lima@email.com", birthday: monthDay(8, 24), stage: "frequentador", group: "Célula Caminho", firstVisit: dayOffset(-75), notes: "", contactDates: [dayOffset(-19)] },
  { id: "p-009", name: "Sônia Martins", phone: "(31) 98988-3017", email: "sonia.martins@email.com", birthday: monthDay(6, 14), stage: "membro", group: "Intercessão", firstVisit: dayOffset(-950), notes: "Disponível para equipe de recepção.", contactDates: [dayOffset(-4)] },
  { id: "p-010", name: "Gabriel Nascimento", phone: "(31) 99341-0882", email: "gabriel.n@email.com", birthday: monthDay(10, 3), stage: "contatado", group: "", firstVisit: dayOffset(-9), notes: "", contactDates: [dayOffset(-7)] },
  { id: "p-011", name: "Débora Carvalho", phone: "(31) 98224-3310", email: "debora.carvalho@email.com", birthday: monthDay(12, 16), stage: "membro", group: "Célula Nova Vida", firstVisit: dayOffset(-600), notes: "", contactDates: [dayOffset(-6)] },
  { id: "p-012", name: "André Luiz Ribeiro", phone: "(31) 98172-0934", email: "andre.ribeiro@email.com", birthday: monthDay(2, 8), stage: "visita", group: "", firstVisit: dayOffset(-2), notes: "Conheceu a igreja por um amigo.", contactDates: [] },
];

const transactions: FinancialTransaction[] = [
  { id: "t-001", date: dayOffset(-1), type: "entrada", category: "Dízimos e ofertas", description: "Culto de domingo", amount: 1840, method: "PIX" },
  { id: "t-002", date: dayOffset(-2), type: "saida", category: "Contas da igreja", description: "Conta de energia", amount: 685.3, method: "PIX" },
  { id: "t-003", date: dayOffset(-4), type: "entrada", category: "Dízimos e ofertas", description: "Contribuições da semana", amount: 1260, method: "Transferência" },
  { id: "t-004", date: dayOffset(-6), type: "saida", category: "Missões e ação social", description: "Cestas básicas — ação social", amount: 480, method: "PIX" },
  { id: "t-005", date: dayOffset(-8), type: "entrada", category: "Doações", description: "Doação para reforma do salão", amount: 750, method: "PIX" },
  { id: "t-006", date: dayOffset(-9), type: "saida", category: "Ministérios", description: "Materiais para ministério infantil", amount: 228.9, method: "Cartão" },
  { id: "t-007", date: dayOffset(-12), type: "saida", category: "Contas da igreja", description: "Internet e telefone", amount: 189.9, method: "Débito automático" },
  { id: "t-008", date: dayOffset(-15), type: "entrada", category: "Dízimos e ofertas", description: "Contribuições da semana", amount: 1430, method: "PIX" },
  { id: "t-009", date: dayOffset(-17), type: "saida", category: "Manutenção", description: "Reparo do ar-condicionado", amount: 350, method: "PIX" },
  { id: "t-010", date: dayOffset(-21), type: "entrada", category: "Dízimos e ofertas", description: "Culto de domingo", amount: 1120, method: "Dinheiro" },
  { id: "t-011", date: dayOffset(-24), type: "saida", category: "Contas da igreja", description: "Material de limpeza", amount: 146.5, method: "Cartão" },
  { id: "t-012", date: dayOffset(-28), type: "entrada", category: "Doações", description: "Oferta para missões", amount: 500, method: "PIX" },
];

const assets: ChurchAsset[] = [
  { id: "a-001", code: "PAT-001", name: "Sistema de som principal", category: "Áudio e vídeo", location: "Templo", status: "bom", value: 12800, acquiredAt: dayOffset(-720), responsible: "Marcos Vinícius" },
  { id: "a-002", code: "PAT-002", name: "Teclado musical Yamaha", category: "Instrumentos", location: "Palco", status: "bom", value: 5600, acquiredAt: dayOffset(-480), responsible: "Marcos Vinícius" },
  { id: "a-003", code: "PAT-003", name: "Projetor Epson", category: "Áudio e vídeo", location: "Templo", status: "regular", value: 3200, acquiredAt: dayOffset(-980), responsible: "Ana Paula" },
  { id: "a-004", code: "PAT-004", name: "Cadeiras do salão (lote 1)", category: "Móveis", location: "Salão principal", status: "bom", value: 8400, acquiredAt: dayOffset(-1250), responsible: "João Pedro" },
  { id: "a-005", code: "PAT-005", name: "Ar-condicionado 24.000 BTU", category: "Equipamentos", location: "Templo", status: "manutencao", value: 4200, acquiredAt: dayOffset(-900), responsible: "Ana Paula" },
  { id: "a-006", code: "PAT-006", name: "Bateria acústica", category: "Instrumentos", location: "Palco", status: "bom", value: 3900, acquiredAt: dayOffset(-640), responsible: "Marcos Vinícius" },
];

function recentSunday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 7 - offset) % 7));
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const events: ChurchEvent[] = [
  { id: "e-001", title: "Culto de celebração", type: "culto", date: recentSunday(-7), time: "19:00", location: "Templo", leader: "Pr. Daniel Costa", attendanceIds: people.slice(0, 7).map((person) => person.id), visitors: 5 },
  { id: "e-002", title: "Célula Esperança", type: "celula", date: dayOffset(-3), time: "19:30", location: "Casa da Ana Paula", leader: "Ana Paula Costa", attendanceIds: people.slice(0, 4).map((person) => person.id), visitors: 0 },
  { id: "e-003", title: "Ensaio do louvor", type: "ensaio", date: dayOffset(1), time: "19:00", location: "Templo", leader: "Marcos Vinícius", attendanceIds: [], visitors: 0 },
  { id: "e-004", title: "Culto de oração", type: "culto", date: dayOffset(2), time: "19:30", location: "Templo", leader: "Pr. Daniel Costa", attendanceIds: [], visitors: 0 },
  { id: "e-005", title: "Célula Nova Vida", type: "celula", date: dayOffset(3), time: "20:00", location: "Salão de convivência", leader: "Beatriz Almeida", attendanceIds: [], visitors: 0 },
  { id: "e-006", title: "Ação social no bairro", type: "acao", date: dayOffset(5), time: "09:00", location: "Pátio da igreja", leader: "Sônia Martins", attendanceIds: [], visitors: 0 },
  { id: "e-007", title: "Culto de celebração", type: "culto", date: dayOffset(7), time: "19:00", location: "Templo", leader: "Pr. Daniel Costa", attendanceIds: [], visitors: 0 },
  { id: "e-008", title: "Reunião de liderança", type: "lideranca", date: dayOffset(10), time: "19:30", location: "Sala de reuniões", leader: "Pr. Daniel Costa", attendanceIds: [], visitors: 0 },
  { id: "e-009", title: "Ensaio do louvor", type: "ensaio", date: dayOffset(8), time: "19:00", location: "Templo", leader: "Marcos Vinícius", attendanceIds: [], visitors: 0 },
];

const commitments: ChurchCommitment[] = [
  { id: "c-001", name: "Reforma do telhado", category: "Obra", totalAmount: 12000, installments: 12, paidInstallments: 7, nextDueDate: dayOffset(4) },
  { id: "c-002", name: "Parcelamento do equipamento de som", category: "Áudio e vídeo", totalAmount: 4800, installments: 8, paidInstallments: 5, nextDueDate: dayOffset(9) },
  { id: "c-003", name: "Instrumentos do ministério de louvor", category: "Ministérios", totalAmount: 3600, installments: 6, paidInstallments: 2, nextDueDate: dayOffset(-3) },
];

export function createSeedDatabase(): ChurchDatabase {
  return {
    version: 1,
    settings: {
      churchName: "Igreja Batista VDC",
      location: "Contagem · Minas Gerais",
      monthlyGoal: 5250,
      openingBalance: 3200,
    },
    transactions: structuredClone(transactions),
    assets: structuredClone(assets),
    events: structuredClone(events),
    people: structuredClone(people),
    commitments: structuredClone(commitments),
    counters: { transaction: 13, asset: 7, event: 10, person: 13 },
  };
}
