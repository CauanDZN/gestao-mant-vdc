import { z } from "zod";

const id = z.string().min(1).max(120);
const shortText = z.string().max(250);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const amount = z.number().finite().nonnegative();

export const churchDatabaseSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    churchName: z.string().trim().min(1).max(120),
    location: z.string().trim().min(1).max(160),
    monthlyGoal: amount,
    openingBalance: amount,
  }).strict(),
  transactions: z.array(z.object({
    id,
    date,
    type: z.enum(["entrada", "saida"]),
    category: shortText,
    description: z.string().trim().min(1).max(250),
    amount,
    method: shortText,
  }).strict()).max(5000),
  assets: z.array(z.object({
    id,
    code: z.string().min(1).max(40),
    name: z.string().trim().min(1).max(160),
    category: shortText,
    location: shortText,
    status: z.enum(["bom", "regular", "manutencao", "baixado"]),
    value: amount,
    acquiredAt: date,
    responsible: shortText,
  }).strict()).max(2000),
  events: z.array(z.object({
    id,
    title: z.string().trim().min(1).max(160),
    type: z.enum(["culto", "celula", "ensaio", "lideranca", "acao"]),
    date,
    time: z.string().regex(/^\d{2}:\d{2}$/),
    location: shortText,
    leader: shortText,
    attendanceIds: z.array(id).max(2000),
    visitors: z.number().int().nonnegative().max(10000),
  }).strict()).max(2000),
  people: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(160),
    phone: z.string().max(40),
    email: z.string().max(250),
    birthday: z.union([z.literal(""), date]),
    stage: z.enum(["visita", "contatado", "frequentador", "membro"]),
    group: shortText,
    firstVisit: date,
    notes: z.string().max(2000),
    contactDates: z.array(date).max(1000),
  }).strict()).max(10000),
  commitments: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(160),
    category: shortText,
    totalAmount: amount,
    installments: z.number().int().positive().max(1200),
    paidInstallments: z.number().int().nonnegative().max(1200),
    nextDueDate: date,
  }).strict()).max(2000),
  counters: z.object({
    transaction: z.number().int().positive(),
    asset: z.number().int().positive(),
    event: z.number().int().positive(),
    person: z.number().int().positive(),
  }).strict(),
}).strict();

export const churchSnapshotSchema = z.object({
  version: z.number().int().nonnegative(),
  data: churchDatabaseSchema,
}).strict();
