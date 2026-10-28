export type TransactionType = "entrada" | "saida";

export interface FinancialTransaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  method: string;
}

export type AssetStatus = "bom" | "regular" | "manutencao" | "baixado";

export interface ChurchAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  status: AssetStatus;
  value: number;
  acquiredAt: string;
  responsible: string;
}

export type EventType = "culto" | "celula" | "ensaio" | "lideranca" | "acao";

export interface ChurchEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  leader: string;
  attendanceIds: string[];
  visitors: number;
}

export type PersonStage = "visita" | "contatado" | "frequentador" | "membro";

export interface ChurchPerson {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  stage: PersonStage;
  group: string;
  firstVisit: string;
  notes: string;
  contactDates: string[];
}

export interface ChurchCommitment {
  id: string;
  name: string;
  category: string;
  totalAmount: number;
  installments: number;
  paidInstallments: number;
  nextDueDate: string;
}

export interface ChurchDatabase {
  version: 1;
  settings: {
    churchName: string;
    location: string;
    monthlyGoal: number;
    openingBalance: number;
  };
  transactions: FinancialTransaction[];
  assets: ChurchAsset[];
  events: ChurchEvent[];
  people: ChurchPerson[];
  commitments: ChurchCommitment[];
  counters: {
    transaction: number;
    asset: number;
    event: number;
    person: number;
  };
}
