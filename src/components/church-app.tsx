"use client";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Church,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Download,
  Heart,
  LayoutDashboard,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings as SettingsIcon,
  UsersRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  averageAttendance,
  currentMonth,
  formatMonthLabel,
  monthKey,
  monthTotals,
  monthTransactions,
  peopleNeedingCare,
  shiftMonth,
} from "@/lib/selectors";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { downloadFile, toCsv, uid } from "@/lib/utils";
import { useCurrentUser } from "@/lib/use-current-user";
import { canAccessFinance, canAccessSettings, canEditFinance, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { CellsView } from "@/components/cells-view";
import { BudgetView } from "@/components/budget-view";
import { SettingsView } from "@/components/settings-view";
import type {
  ChurchAsset,
  ChurchDatabase,
  ChurchEvent,
  ChurchPerson,
  EventType,
  FinancialTransaction,
  PersonStage,
  TransactionType,
} from "@/lib/types";

const pages = [
  { id: "painel", label: "Painel", icon: LayoutDashboard },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "patrimonio", label: "Patrimônio", icon: Package },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "pessoas", label: "Pessoas", icon: Users },
  { id: "celulas", label: "Células", icon: UsersRound },
  { id: "configuracoes", label: "Configurações", icon: SettingsIcon },
] as const;

type PageId = (typeof pages)[number]["id"];
type Modal = "transaction" | "asset" | "event" | "person" | "attendance" | null;
type FinanceTab = "lancamentos" | "orcamento" | "compromissos";

function isPageVisible(id: PageId, role: Role): boolean {
  if (role === "bispa") return true;
  if (id === "financeiro") return canAccessFinance(role);
  if (id === "configuracoes") return canAccessSettings(role);
  if (id === "painel" || id === "agenda") return true;
  return role !== "membro";
}

const eventLabels: Record<EventType, string> = {
  culto: "Culto",
  celula: "Célula",
  ensaio: "Ensaio",
  lideranca: "Liderança",
  acao: "Ação social",
};

const stageLabels: Record<PersonStage, string> = {
  visita: "Visitante",
  contatado: "Em contato",
  frequentador: "Frequentador",
  membro: "Membro",
};

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function avatarColor(name: string): string {
  const colors = ["sage", "blue", "peach", "lilac"];
  return colors[name.charCodeAt(0) % colors.length];
}

function whatsappLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function EmptyState({
  title,
  description,
  icon: Icon = CalendarDays,
}: {
  title: string;
  description: string;
  icon?: typeof CalendarDays;
}) {
  return <div className="empty-state"><span><Icon size={19} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function PanelHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span />{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={18} /></div>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  );
}

function ModalFrame({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Plus;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <span className="modal-icon"><Icon size={19} /></span>
          <div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return <label className={`field ${full ? "field-full" : ""}`}><span>{label}</span>{children}</label>;
}

function TransactionForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (transaction: Omit<FinancialTransaction, "id">) => void;
}) {
  const [type, setType] = useState<TransactionType>("entrada");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Dízimos e ofertas");
  const [date, setDate] = useState(dateKey(new Date()));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("PIX");
  const [error, setError] = useState("");
  const categories = type === "entrada"
    ? ["Dízimos e ofertas", "Doações", "Eventos", "Outras entradas"]
    : ["Contas da igreja", "Ministérios", "Missões e ação social", "Manutenção", "Obra", "Outras saídas"];

  return (
    <ModalFrame title="Novo lançamento" subtitle="Registre uma entrada ou despesa da igreja." icon={CircleDollarSign} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => {
        event.preventDefault();
        const numericAmount = Number(amount.replace(",", "."));
        if (!description.trim() || !date || !Number.isFinite(numericAmount) || numericAmount <= 0) {
          setError("Informe uma descrição, uma data e um valor maior que zero.");
          return;
        }
        onSave({ type, description: description.trim(), category, date, amount: numericAmount, method });
      }}>
        <div className="segmented-control">
          <button type="button" className={type === "entrada" ? "selected income-choice" : ""} onClick={() => { setType("entrada"); setCategory("Dízimos e ofertas"); }}>Entrada</button>
          <button type="button" className={type === "saida" ? "selected expense-choice" : ""} onClick={() => { setType("saida"); setCategory("Contas da igreja"); }}>Saída</button>
        </div>
        <Field label="Descrição"><input autoFocus value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Dízimos do culto de domingo" maxLength={100} /></Field>
        <div className="form-grid">
          <Field label="Categoria"><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Valor (R$)"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></Field>
          <Field label="Data"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label="Forma de pagamento"><select value={method} onChange={(event) => setMethod(event.target.value)}>{["PIX", "Dinheiro", "Transferência", "Cartão", "Débito automático"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Salvar lançamento <ArrowRight size={15} /></button></div>
      </form>
    </ModalFrame>
  );
}

function AssetForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (asset: Omit<ChurchAsset, "id" | "code">) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Móveis");
  const [location, setLocation] = useState("");
  const [value, setValue] = useState("");
  const [responsible, setResponsible] = useState("");
  const [error, setError] = useState("");
  return (
    <ModalFrame title="Novo bem" subtitle="Inclua um item no inventário da igreja." icon={Package} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => {
        event.preventDefault();
        const amount = Number(value.replace(",", ".")) || 0;
        if (!name.trim() || !location.trim()) {
          setError("Informe o nome do bem e onde ele está localizado.");
          return;
        }
        onSave({ name: name.trim(), category, location: location.trim(), value: amount, responsible: responsible.trim() || "A definir", status: "bom", acquiredAt: dateKey(new Date()) });
      }}>
        <Field label="Nome do bem"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Microfone sem fio" /></Field>
        <div className="form-grid">
          <Field label="Categoria"><select value={category} onChange={(event) => setCategory(event.target.value)}>{["Áudio e vídeo", "Instrumentos", "Móveis", "Equipamentos", "Imóvel", "Outros"].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Valor estimado (R$)"><input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0,00" /></Field>
          <Field label="Localização"><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ex.: Templo" /></Field>
          <Field label="Responsável"><input value={responsible} onChange={(event) => setResponsible(event.target.value)} placeholder="Nome do responsável" /></Field>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Adicionar ao patrimônio <ArrowRight size={15} /></button></div>
      </form>
    </ModalFrame>
  );
}

function EventForm({
  initialDate,
  onClose,
  onSave,
}: {
  initialDate: string;
  onClose: () => void;
  onSave: (event: Omit<ChurchEvent, "id" | "attendanceIds" | "visitors">) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("culto");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [leader, setLeader] = useState("");
  const [error, setError] = useState("");
  return (
    <ModalFrame title="Novo evento" subtitle="Adicione um culto ou atividade à agenda." icon={CalendarDays} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim() || !date || !location.trim()) {
          setError("Preencha o nome, a data e o local do evento.");
          return;
        }
        onSave({ title: title.trim(), type, date, time, location: location.trim(), leader: leader.trim() || "A definir" });
      }}>
        <Field label="Nome do evento"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Culto de celebração" /></Field>
        <div className="form-grid">
          <Field label="Tipo"><select value={type} onChange={(event) => setType(event.target.value as EventType)}>{Object.entries(eventLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
          <Field label="Data"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label="Horário"><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field>
          <Field label="Local"><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ex.: Templo" /></Field>
          <Field label="Responsável" full><input value={leader} onChange={(event) => setLeader(event.target.value)} placeholder="Nome do líder ou responsável" /></Field>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Adicionar à agenda <ArrowRight size={15} /></button></div>
      </form>
    </ModalFrame>
  );
}

function PersonForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (person: Omit<ChurchPerson, "id" | "contactDates">) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [stage, setStage] = useState<PersonStage>("visita");
  const [group, setGroup] = useState("");
  const [error, setError] = useState("");
  return (
    <ModalFrame title="Cadastrar pessoa" subtitle="Receba visitantes e acompanhe cada passo." icon={Users} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError("Informe o nome da pessoa.");
          return;
        }
        onSave({ name: name.trim(), phone: phone.trim(), email: email.trim(), birthday, stage, group: group.trim(), firstVisit: dateKey(new Date()), notes: "", cellId: null });
      }}>
        <Field label="Nome completo"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome e sobrenome" /></Field>
        <div className="form-grid">
          <Field label="Telefone"><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(31) 99999-9999" /></Field>
          <Field label="E-mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@email.com" /></Field>
          <Field label="Etapa"><select value={stage} onChange={(event) => setStage(event.target.value as PersonStage)}>{Object.entries(stageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
          <Field label="Célula ou ministério"><input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="Opcional" /></Field>
          <Field label="Aniversário" full><input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></Field>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Cadastrar pessoa <ArrowRight size={15} /></button></div>
      </form>
    </ModalFrame>
  );
}

function AttendanceForm({
  event,
  people,
  onClose,
  onSave,
}: {
  event: ChurchEvent;
  people: ChurchPerson[];
  onClose: () => void;
  onSave: (attendeeIds: string[], visitors: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(event.attendanceIds));
  const [visitors, setVisitors] = useState(String(event.visitors));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ModalFrame title="Marcar presença" subtitle={`${event.title} · ${formatDate(event.date)}`} icon={CalendarCheck} onClose={onClose}>
      <form className="modal-form" onSubmit={(event2) => {
        event2.preventDefault();
        onSave([...selected], Number(visitors) || 0);
      }}>
        <div className="people-toolbar"><span className="result-count">{selected.size} de {people.length} marcados</span></div>
        <div className="table-wrap" style={{ maxHeight: 280, overflowY: "auto" }}>
          <table>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={selected.has(person.id)} onChange={() => toggle(person.id)} />
                      <span>{person.name}</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Field label="Visitantes (não cadastrados)"><input inputMode="numeric" value={visitors} onChange={(event2) => setVisitors(event2.target.value)} placeholder="0" /></Field>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Salvar presença <Check size={15} /></button></div>
      </form>
    </ModalFrame>
  );
}

export default function ChurchApp() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading, setUser } = useCurrentUser();
  const [db, setDb] = useState<ChurchDatabase | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [page, setPage] = useState<PageId>("painel");
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] = useState<"todas" | TransactionType>("todas");
  const [financeTab, setFinanceTab] = useState<FinanceTab>("lancamentos");
  const [modal, setModal] = useState<Modal>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [selectedStage, setSelectedStage] = useState<"todos" | PersonStage>("todos");
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (!userLoading && !currentUser) router.push("/login");
  }, [userLoading, currentUser, router]);

  useEffect(() => {
    let active = true;
    fetch("/api/church")
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/login");
          return null;
        }
        if (!response.ok) throw new Error("load-failed");
        return response.json();
      })
      .then((payload) => {
        if (!active || !payload) return;
        setDb(payload.data);
        setVersion(payload.version);
        setStorageReady(true);
      })
      .catch(() => {
        if (active) setStorageError("Não foi possível carregar os dados da igreja. Recarregue a página.");
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!db || version === null || !storageReady) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    let cancelled = false;
    fetch("/api/church", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, data: db }),
    })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 409) {
          setStorageError("Os dados foram atualizados por outra pessoa agora há pouco. Recarregando...");
          const fresh = await fetch("/api/church").then((response2) => response2.json());
          skipNextSave.current = true;
          setDb(fresh.data);
          setVersion(fresh.version);
          return;
        }
        if (!response.ok) {
          setStorageError("Não foi possível salvar agora. Suas alterações continuam nesta tela.");
          return;
        }
        const data = await response.json();
        setVersion(data.version);
        setStorageError("");
      })
      .catch(() => {
        if (!cancelled) setStorageError("Não foi possível salvar agora. Verifique sua internet.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const activePage = pages.find((item) => item.id === page) ?? pages[0];
  const monthEntries = useMemo(() => db ? monthTransactions(db.transactions, month) : [], [db, month]);
  const totals = useMemo(() => monthTotals(monthEntries), [monthEntries]);
  const attention = useMemo(() => db ? peopleNeedingCare(db) : [], [db]);
  const role = currentUser?.role ?? "membro";
  const canWriteFinance = canEditFinance(role);
  const visiblePages = pages.filter((item) => isPageVisible(item.id, role));

  function closeModal() {
    setModal(null);
    setAttendanceEventId(null);
  }

  function addTransaction(data: Omit<FinancialTransaction, "id">) {
    setDb((current) => current && ({
      ...current,
      transactions: [{ ...data, id: uid("mov") }, ...current.transactions],
      counters: { ...current.counters, transaction: current.counters.transaction + 1 },
    }));
    closeModal();
  }

  function addAsset(data: Omit<ChurchAsset, "id" | "code">) {
    setDb((current) => {
      if (!current) return current;
      const number = current.counters.asset;
      return {
        ...current,
        assets: [{ ...data, id: uid("asset"), code: `PAT-${String(number).padStart(3, "0")}` }, ...current.assets],
        counters: { ...current.counters, asset: number + 1 },
      };
    });
    closeModal();
  }

  function addEvent(data: Omit<ChurchEvent, "id" | "attendanceIds" | "visitors">) {
    setDb((current) => current && ({
      ...current,
      events: [...current.events, { ...data, id: uid("event"), attendanceIds: [], visitors: 0 }].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
      counters: { ...current.counters, event: current.counters.event + 1 },
    }));
    closeModal();
  }

  function addPerson(data: Omit<ChurchPerson, "id" | "contactDates">) {
    setDb((current) => current && ({
      ...current,
      people: [{ ...data, id: uid("person"), contactDates: [] }, ...current.people],
      counters: { ...current.counters, person: current.counters.person + 1 },
    }));
    closeModal();
  }

  function updatePerson(id: string, updates: Partial<ChurchPerson>) {
    setDb((current) => current && ({
      ...current,
      people: current.people.map((person) => person.id === id ? { ...person, ...updates } : person),
    }));
  }

  function updateAsset(id: string, status: ChurchAsset["status"]) {
    setDb((current) => current && ({
      ...current,
      assets: current.assets.map((asset) => asset.id === id ? { ...asset, status } : asset),
    }));
  }

  function payInstallment(id: string) {
    setDb((current) => {
      if (!current) return current;
      const item = current.commitments.find((commitment) => commitment.id === id);
      if (!item || item.paidInstallments >= item.installments) return current;
      const nextDate = toLocalDate(item.nextDueDate);
      nextDate.setDate(nextDate.getDate() + 30);
      const amount = item.totalAmount / item.installments;
      const updatedCommitment = {
        ...item,
        paidInstallments: item.paidInstallments + 1,
        nextDueDate: dateKey(nextDate),
      };
      return {
        ...current,
        commitments: current.commitments.map((entry) => entry.id === id ? updatedCommitment : entry),
        transactions: [{
          id: uid("mov"),
          date: dateKey(new Date()),
          type: "saida",
          category: item.category,
          description: `Parcela ${updatedCommitment.paidInstallments}/${item.installments} · ${item.name}`,
          amount,
          method: "Transferência",
        }, ...current.transactions],
      };
    });
  }

  function saveAttendance(attendeeIds: string[], visitors: number) {
    const eventId = attendanceEventId;
    setDb((current) => current && ({
      ...current,
      events: current.events.map((event) => event.id === eventId ? { ...event, attendanceIds: attendeeIds, visitors } : event),
    }));
    closeModal();
  }

  async function assignPersonCell(personId: string, cellId: string | null) {
    const response = await fetch(`/api/people/${personId}/cell`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId }),
    });
    if (response.ok) updatePerson(personId, { cellId });
  }

  function updateChurchSettings(updates: ChurchDatabase["settings"]) {
    setDb((current) => current && ({ ...current, settings: updates }));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function exportTransactions() {
    const rows = [
      ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Forma de pagamento"],
      ...monthEntries.map((item) => [item.date, item.type, item.category, item.description, item.amount, item.method]),
    ];
    downloadFile(`prestacao-de-contas-${month}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  }

  if (!db || userLoading || !currentUser) {
    return <main className="loading-screen"><span className="loading-mark"><Church size={23} /></span><p>Preparando a gestão da igreja…</p></main>;
  }

  if (currentUser.mustChangePassword) {
    return <ForcedPasswordChange onDone={() => setUser({ ...currentUser, mustChangePassword: false })} />;
  }

  const today = dateKey(new Date());
  const upcomingEvents = [...db.events].filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const birthdayCount = db.people.filter((person) => person.birthday && person.birthday.slice(5, 7) === month.slice(5, 7)).length;
  const memberCount = db.people.filter((person) => person.stage === "membro").length;
  const lowAssetCount = db.assets.filter((asset) => asset.status === "manutencao").length;
  const monthVisitors = db.people.filter((person) => monthKey(person.firstVisit) === month).length;
  const goalPercent = Math.round((totals.income / Math.max(db.settings.monthlyGoal, 1)) * 100);
  const attendanceEvent = attendanceEventId ? db.events.find((event) => event.id === attendanceEventId) ?? null : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => { setPage("painel"); setSearch(""); }}>
          <span className="brand-mark"><Church size={20} /></span>
          <span className="brand-copy"><strong>VDC <i>comunidade</i></strong><small>GESTÃO DA IGREJA</small></span>
        </button>
        <div className="church-switch">
          <span className="church-avatar">{initials(db.settings.churchName)[0] ?? "V"}</span>
          <span><strong>{db.settings.churchName}</strong><small>{db.settings.location}</small></span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-heading">COMUNIDADE</p>
        <nav className="side-nav" aria-label="Navegação principal">
          {visiblePages.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => { setPage(id); setSearch(""); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === "pessoas" && attention.length > 0 && <span className="nav-count">{attention.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span><Heart size={16} /></span>
          <strong>Uma comunidade que cuida</strong>
          <p>Um primeiro passo para organizar e fortalecer nossa igreja.</p>
          <button onClick={() => setPage("pessoas")}>Acompanhar pessoas <ArrowRight size={13} /></button>
        </div>
        <div className="sidebar-profile"><span className="avatar">{initials(currentUser.name)}</span><span><strong>{currentUser.name}</strong><small>{ROLE_LABELS[role]}</small></span></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs"><span>{db.settings.churchName}</span><b>/</b><strong>{activePage.label}</strong></div>
          <div className="topbar-right"><span className="saved-status"><i /> Dados na nuvem</span><button className="icon-button notice-button" aria-label={`${attention.length} lembretes`} onClick={() => setPage("painel")}><Bell size={18} />{attention.length > 0 && <i />}</button><span className="avatar top-avatar">{initials(currentUser.name)}</span></div>
        </header>

        <div className="content">
          {storageError && <div className="storage-message"><span>{storageError}</span><button className="dismiss-message" onClick={() => setStorageError("")} aria-label="Fechar"><X size={15} /></button></div>}

          {page === "painel" && (
            <>
              <section className="welcome-row">
                <PageHeading eyebrow={`${new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date())} · ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date())}`} title={`Paz, ${currentUser.name.split(" ")[0]} ✨`} description="Um resumo da vida e do cuidado com a nossa comunidade." />
                <div className="month-picker"><button onClick={() => setMonth((value) => shiftMonth(value, -1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button><span>{formatMonthLabel(month)}</span><button onClick={() => setMonth((value) => shiftMonth(value, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button></div>
              </section>
              <section className="metrics-grid">
                <Metric label="Entradas no mês" value={formatCurrency(totals.income)} note="Dízimos, ofertas e doações" icon={ArrowDownLeft} tone="tone-green" />
                <Metric label="Saídas no mês" value={formatCurrency(totals.expenses)} note="Despesas e ministérios" icon={ArrowUpRight} tone="tone-peach" />
                <Metric label="Presença média" value={`${averageAttendance(db, month)} pessoas`} note="Nos cultos deste mês" icon={Users} tone="tone-blue" />
                <Metric label="Membros" value={String(memberCount)} note={`${monthVisitors} novas visitas neste mês`} icon={Heart} tone="tone-lilac" />
              </section>
              <section className="dashboard-grid">
                <article className="panel dashboard-finance">
                  <PanelHeading title="Cuidado com os recursos" subtitle={`Resumo de ${formatMonthLabel(month)}`} action={<button className="text-button" onClick={() => setPage("financeiro")}>Ver financeiro <ArrowRight size={14} /></button>} />
                  <div className="finance-overview">
                    <div className="balance-block"><span>Resultado do mês</span><strong className={totals.income - totals.expenses >= 0 ? "amount-positive" : "amount-negative"}>{formatCurrency(totals.income - totals.expenses)}</strong><small>Entradas menos saídas registradas</small></div>
                    <div className="goal-block"><div className="goal-copy"><span>Entradas · meta mensal</span><strong>{goalPercent}%{goalPercent > 100 ? " 🎉" : ""}</strong></div><div className="goal-track"><span style={{ width: `${Math.min(100, goalPercent)}%` }} /></div><small>{formatCurrency(totals.income)} de {formatCurrency(db.settings.monthlyGoal)}{goalPercent > 100 ? " — meta superada" : ""}</small></div>
                  </div>
                  <div className="finance-legend"><span><i className="legend-income" /> Entradas <b>{formatCurrency(totals.income)}</b></span><span><i className="legend-expense" /> Saídas <b>{formatCurrency(totals.expenses)}</b></span></div>
                </article>
                <article className="panel attention-panel">
                  <PanelHeading title="Cuidado pastoral" subtitle="Pessoas que podem precisar de um contato" action={attention.length > 0 ? <Badge tone="warm">{attention.length}</Badge> : undefined} />
                  {attention.length ? <div className="attention-list">{attention.slice(0, 4).map(({ person, reason }) => {
                    const link = whatsappLink(person.phone);
                    return (
                      <div className="attention-row" key={person.id}>
                        <button style={{ border: "none", padding: 0, flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", textAlign: "left" }} onClick={() => { setPage("pessoas"); setSearch(person.name); }}>
                          <span className={`avatar avatar-${avatarColor(person.name)}`}>{initials(person.name)}</span>
                          <span className="attention-copy"><strong>{person.name}</strong><small>{reason}</small></span>
                        </button>
                        {link && <a href={link} target="_blank" rel="noreferrer" className="icon-button" aria-label={`Chamar ${person.name} no WhatsApp`}><MessageCircle size={15} /></a>}
                      </div>
                    );
                  })}</div> : <div className="all-clear"><Heart size={18} /><strong>Todos acompanhados</strong><span>Não há pessoas sinalizadas agora.</span></div>}
                </article>
                <article className="panel events-panel">
                  <PanelHeading title="Na vida da igreja" subtitle="Próximos encontros e atividades" action={<button className="text-button" onClick={() => setPage("agenda")}>Abrir agenda <ArrowRight size={14} /></button>} />
                  {upcomingEvents.length ? <div className="upcoming-list">{upcomingEvents.slice(0, 4).map((event) => <div className="upcoming-row" key={event.id}><span className="event-date-tile"><b>{toLocalDate(event.date).getDate()}</b><small>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(toLocalDate(event.date)).replace(".", "")}</small></span><span className="upcoming-copy"><strong>{event.title}</strong><small>{event.time} · {event.location}</small></span><Badge tone={event.type}>{eventLabels[event.type]}</Badge></div>)}</div> : <p className="empty-copy">Nenhum evento agendado.</p>}
                </article>
                <article className="panel community-panel">
                  <PanelHeading title="Nossa comunidade" subtitle="Pessoas caminhando juntas" />
                  <div className="community-counts"><div><span className="community-icon tone-green"><Users size={17} /></span><span><strong>{memberCount}</strong><small>Membros</small></span></div><div><span className="community-icon tone-blue"><Heart size={17} /></span><span><strong>{monthVisitors}</strong><small>Visitantes no mês</small></span></div><div><span className="community-icon tone-gold"><CalendarDays size={17} /></span><span><strong>{birthdayCount}</strong><small>Aniversários no mês</small></span></div></div>
                  <div className="community-footer"><span>Bem-vindos à família</span><div className="avatar-stack">{db.people.filter((person) => person.stage === "membro").slice(0, 4).map((person) => <span key={person.id} className={`avatar avatar-${avatarColor(person.name)}`}>{initials(person.name)}</span>)}</div></div>
                </article>
              </section>
              <section className="panel recent-panel"><PanelHeading title="Movimentações recentes" subtitle="Entradas e despesas registradas no mês" action={<button className="text-button" onClick={() => setPage("financeiro")}>Ver lançamentos <ArrowRight size={14} /></button>} /><TransactionTable transactions={monthEntries.slice(0, 5)} /></section>
            </>
          )}

          {page === "financeiro" && (
            <>
              <PageHeading eyebrow="ADMINISTRAÇÃO" title="Financeiro" description="Dízimos, ofertas, despesas e transparência com os recursos." action={canWriteFinance ? <button className="button button-primary" onClick={() => setModal("transaction")}><Plus size={16} /> Novo lançamento</button> : undefined} />
              <section className="metrics-grid finance-metrics">
                <Metric label="Entradas" value={formatCurrency(totals.income)} note={formatMonthLabel(month)} icon={ArrowDownLeft} tone="tone-green" />
                <Metric label="Saídas" value={formatCurrency(totals.expenses)} note={`${monthEntries.filter((entry) => entry.type === "saida").length} despesas registradas`} icon={ArrowUpRight} tone="tone-peach" />
                <Metric label="Resultado" value={formatCurrency(totals.income - totals.expenses)} note="Entradas menos saídas" icon={CircleDollarSign} tone="tone-blue" />
                <Metric label="Compromissos em aberto" value={String(db.commitments.filter((item) => item.paidInstallments < item.installments).length)} note="Parcelamentos e despesas futuras" icon={ClipboardList} tone="tone-lilac" />
              </section>
              <section className="panel finance-panel">
                <div className="finance-toolbar">
                  <div className="tabs" role="tablist">{([["lancamentos", "Lançamentos"], ["orcamento", "Orçamento"], ["compromissos", "Compromissos"]] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={financeTab === key} className={financeTab === key ? "active" : ""} onClick={() => setFinanceTab(key)}>{label}</button>)}</div>
                  <div className="finance-actions"><div className="month-picker month-picker-small"><button onClick={() => setMonth((value) => shiftMonth(value, -1))} aria-label="Mês anterior"><ChevronLeft size={15} /></button><span>{formatMonthLabel(month)}</span><button onClick={() => setMonth((value) => shiftMonth(value, 1))} aria-label="Próximo mês"><ChevronRight size={15} /></button></div>{financeTab === "lancamentos" && <button className="icon-button" onClick={exportTransactions} aria-label="Exportar prestação de contas CSV"><Download size={16} /></button>}</div>
                </div>
                {financeTab === "lancamentos" && <><div className="list-toolbar"><div className="segmented-control segmented-small"><button className={transactionType === "todas" ? "selected" : ""} onClick={() => setTransactionType("todas")}>Todos</button><button className={transactionType === "entrada" ? "selected income-choice" : ""} onClick={() => setTransactionType("entrada")}>Entradas</button><button className={transactionType === "saida" ? "selected expense-choice" : ""} onClick={() => setTransactionType("saida")}>Saídas</button></div><span className="result-count">{monthEntries.filter((entry) => transactionType === "todas" || entry.type === transactionType).length} lançamentos</span></div><TransactionTable transactions={monthEntries.filter((entry) => transactionType === "todas" || entry.type === transactionType)} /></>}
                {financeTab === "orcamento" && <BudgetView month={month} canEdit={canWriteFinance} />}
                {financeTab === "compromissos" && <CommitmentView db={db} onPay={payInstallment} canEdit={canWriteFinance} />}
              </section>
              <div className="finance-note"><span>ⓘ</span><p>Os dados ficam salvos na nuvem e são compartilhados por toda a equipe com acesso ao sistema.</p></div>
            </>
          )}

          {page === "patrimonio" && (
            <>
              <PageHeading eyebrow="ADMINISTRAÇÃO" title="Patrimônio" description="Inventário dos bens, equipamentos e espaços da igreja." action={<button className="button button-primary" onClick={() => setModal("asset")}><Plus size={16} /> Cadastrar bem</button>} />
              <section className="metrics-grid three-metrics">
                <Metric label="Bens ativos" value={String(db.assets.filter((asset) => asset.status !== "baixado").length)} note="Itens em uso pela igreja" icon={Package} tone="tone-green" />
                <Metric label="Valor estimado" value={formatCurrency(db.assets.filter((asset) => asset.status !== "baixado").reduce((sum, asset) => sum + asset.value, 0))} note="Valor declarado no inventário" icon={CircleDollarSign} tone="tone-blue" />
                <Metric label="Em manutenção" value={String(lowAssetCount)} note={lowAssetCount ? "Acompanhe estes itens" : "Nenhum item em manutenção"} icon={ClipboardList} tone="tone-peach" />
              </section>
              <section className="panel listing-panel"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por bem, código ou local..." /></div><span className="result-count">{db.assets.length} bens cadastrados</span></div>
                <div className="table-wrap"><table><thead><tr><th>BEM</th><th>CATEGORIA</th><th>LOCALIZAÇÃO</th><th>RESPONSÁVEL</th><th>VALOR</th><th>CONDIÇÃO</th></tr></thead><tbody>
                  {db.assets.filter((asset) => `${asset.name} ${asset.code} ${asset.location} ${asset.category}`.toLowerCase().includes(search.toLowerCase())).map((asset) => <tr key={asset.id}><td><span className="table-main">{asset.name}</span><span className="table-sub">{asset.code}</span></td><td>{asset.category}</td><td>{asset.location}</td><td>{asset.responsible}</td><td>{formatCurrency(asset.value)}</td><td><label className="inline-select"><span className="sr-only">Condição de {asset.name}</span><select value={asset.status} onChange={(event) => updateAsset(asset.id, event.target.value as ChurchAsset["status"])}><option value="bom">Bom</option><option value="regular">Regular</option><option value="manutencao">Em manutenção</option><option value="baixado">Baixado</option></select><ChevronDown size={12} /></label></td></tr>)}
                </tbody></table>
                {!db.assets.some((asset) => `${asset.name} ${asset.code} ${asset.location} ${asset.category}`.toLowerCase().includes(search.toLowerCase())) && <EmptyState title="Nenhum bem encontrado" description="Tente outra busca ou cadastre um novo item." />}
                </div>
              </section>
            </>
          )}

          {page === "agenda" && (
            <AgendaView
              events={db.events}
              month={month}
              selectedDate={selectedDate}
              onMonth={setMonth}
              onSelectDate={setSelectedDate}
              onAdd={() => setModal("event")}
              onMarkAttendance={(eventId) => { setAttendanceEventId(eventId); setModal("attendance"); }}
            />
          )}

          {page === "pessoas" && (
            <>
              <PageHeading eyebrow="COMUNIDADE" title="Pessoas" description="Acompanhe visitantes, membros e o cuidado com cada pessoa." action={<button className="button button-primary" onClick={() => setModal("person")}><Plus size={16} /> Cadastrar pessoa</button>} />
              <section className="people-summary">
                <div><span className="people-summary-icon tone-green"><Users size={18} /></span><span><small>Pessoas cadastradas</small><strong>{db.people.length}</strong></span></div>
                <div><span className="people-summary-icon tone-blue"><Heart size={18} /></span><span><small>Membros</small><strong>{memberCount}</strong></span></div>
                <div><span className="people-summary-icon tone-peach"><Bell size={18} /></span><span><small>Precisam de contato</small><strong>{attention.length}</strong></span></div>
                <div><span className="people-summary-icon tone-lilac"><CalendarDays size={18} /></span><span><small>Aniversários este mês</small><strong>{birthdayCount}</strong></span></div>
              </section>
              <section className="panel listing-panel"><div className="people-toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, telefone ou célula..." /></div><label className="filter-select"><span className="sr-only">Filtrar etapa</span><select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value as "todos" | PersonStage)}><option value="todos">Todas as etapas</option>{Object.entries(stageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={14} /></label><span className="result-count">{db.people.filter((person) => (selectedStage === "todos" || person.stage === selectedStage) && `${person.name} ${person.phone} ${person.group}`.toLowerCase().includes(search.toLowerCase())).length} pessoas</span></div>
                <div className="table-wrap"><table><thead><tr><th>PESSOA</th><th>ETAPA</th><th>CÉLULA / MINISTÉRIO</th><th>PRIMEIRA VISITA</th><th>TELEFONE</th><th>ACOMPANHAMENTO</th></tr></thead><tbody>
                  {db.people.filter((person) => (selectedStage === "todos" || person.stage === selectedStage) && `${person.name} ${person.phone} ${person.group}`.toLowerCase().includes(search.toLowerCase())).map((person) => {
                    const needsContact = attention.some((item) => item.person.id === person.id);
                    return <tr key={person.id}><td><div className="person-cell"><span className={`avatar avatar-${avatarColor(person.name)}`}>{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.email || "E-mail não informado"}</small></span></div></td><td><select className={`stage-select stage-${person.stage}`} aria-label={`Etapa de ${person.name}`} value={person.stage} onChange={(event) => updatePerson(person.id, { stage: event.target.value as PersonStage })}>{Object.entries(stageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td><td>{person.group || <span className="muted-cell">Ainda não vinculada</span>}</td><td>{formatDate(person.firstVisit)}</td><td>{person.phone || "—"}</td><td>{needsContact ? <button className="contact-button" onClick={() => updatePerson(person.id, { contactDates: [...person.contactDates, dateKey(new Date())], stage: person.stage === "visita" ? "contatado" : person.stage })}><Heart size={13} /> Registrar contato</button> : <span className="care-ok"><Check size={14} /> Acompanhada</span>}</td></tr>;
                  })}
                </tbody></table></div>
              </section>
            </>
          )}

          {page === "celulas" && <CellsView people={db.people} canEdit={role !== "membro"} onPersonCellChange={assignPersonCell} />}

          {page === "configuracoes" && (
            <SettingsView
              settings={db.settings}
              currentUserId={currentUser.id}
              onSaveSettings={updateChurchSettings}
              onLogout={handleLogout}
            />
          )}

          <footer className="app-footer"><span>© {new Date().getFullYear()} {db.settings.churchName}</span><span><i /> Salvo na nuvem</span><span>Feito para cuidar da comunidade</span></footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navegação móvel">{visiblePages.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setSearch(""); }}><Icon size={18} /><span>{label}</span></button>)}</nav>
      {modal === "transaction" && <TransactionForm onClose={closeModal} onSave={addTransaction} />}
      {modal === "asset" && <AssetForm onClose={closeModal} onSave={addAsset} />}
      {modal === "event" && <EventForm initialDate={selectedDate} onClose={closeModal} onSave={addEvent} />}
      {modal === "person" && <PersonForm onClose={closeModal} onSave={addPerson} />}
      {modal === "attendance" && attendanceEvent && <AttendanceForm event={attendanceEvent} people={db.people} onClose={closeModal} onSave={saveAttendance} />}
    </div>
  );
}

function ForcedPasswordChange({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="login-screen">
      <section className="login-card">
        <span className="login-mark"><Lock size={22} /></span>
        <h1>Defina sua senha</h1>
        <p>Por segurança, troque a senha provisória antes de continuar.</p>
        <form className="login-form" onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (newPassword.length < 8) {
            setError("A nova senha precisa ter pelo menos 8 caracteres.");
            return;
          }
          setLoading(true);
          try {
            const response = await fetch("/api/auth/change-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              setError(data.error || "Não foi possível trocar a senha.");
              return;
            }
            onDone();
          } finally {
            setLoading(false);
          }
        }}>
          <label className="login-field"><span>Senha provisória</span><input type="password" autoFocus value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
          <label className="login-field"><span>Nova senha</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary login-submit" type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar nova senha"}</button>
        </form>
      </section>
    </main>
  );
}

function TransactionTable({ transactions }: { transactions: FinancialTransaction[] }) {
  if (!transactions.length) return <div className="empty-state"><span><CircleDollarSign size={19} /></span><strong>Nenhum lançamento neste mês</strong><p>Adicione entradas e despesas para organizar a prestação de contas.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>LANÇAMENTO</th><th>CATEGORIA</th><th>DATA</th><th>FORMA</th><th className="align-right">VALOR</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td><div className="transaction-title"><span className={item.type === "entrada" ? "transaction-in" : "transaction-out"}>{item.type === "entrada" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><span><strong>{item.description}</strong><small>{item.type === "entrada" ? "Entrada" : "Saída"}</small></span></div></td><td>{item.category}</td><td>{formatDate(item.date)}</td><td>{item.method}</td><td className={`align-right transaction-amount ${item.type === "entrada" ? "amount-positive" : "amount-negative"}`}>{item.type === "entrada" ? "+" : "−"} {formatCurrency(item.amount)}</td></tr>)}</tbody></table></div>;
}

function CommitmentView({
  db,
  onPay,
  canEdit,
}: {
  db: ChurchDatabase;
  onPay: (id: string) => void;
  canEdit: boolean;
}) {
  const open = db.commitments.filter((item) => item.paidInstallments < item.installments);
  return <div className="commitments-list">{open.map((item) => { const installment = item.totalAmount / item.installments; const overdue = item.nextDueDate < dateKey(new Date()); const progress = Math.round(item.paidInstallments / item.installments * 100); return <article className="commitment-card" key={item.id}><div className="commitment-top"><span className="commitment-icon"><ClipboardList size={17} /></span><Badge tone={overdue ? "warm" : "green"}>{overdue ? "Parcela vencida" : "Em andamento"}</Badge></div><h3>{item.name}</h3><p>{item.category} · {item.paidInstallments} de {item.installments} parcelas pagas</p><div className="commitment-progress"><span style={{ width: `${progress}%` }} /></div><div className="commitment-detail"><span>Próxima parcela <b>{formatCurrency(installment)}</b></span><span>{overdue ? "Venceu" : "Vencimento"} em {formatDate(item.nextDueDate)}</span></div>{canEdit && <button className="button button-secondary" onClick={() => onPay(item.id)}><Check size={14} /> Registrar parcela paga</button>}</article>; })}{!open.length && <div className="empty-state"><span><Check size={19} /></span><strong>Sem compromissos em aberto</strong><p>Todos os parcelamentos foram quitados.</p></div>}</div>;
}

function AgendaView({
  events,
  month,
  selectedDate,
  onMonth,
  onSelectDate,
  onAdd,
  onMarkAttendance,
}: {
  events: ChurchEvent[];
  month: string;
  selectedDate: string;
  onMonth: (month: string) => void;
  onSelectDate: (date: string) => void;
  onAdd: () => void;
  onMarkAttendance: (eventId: string) => void;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const gridStart = new Date(year, monthNumber - 1, 1 - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const selectedEvents = events.filter((event) => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = events.filter((event) => event.date >= dateKey(new Date())).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5);
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <>
      <PageHeading eyebrow="VIDA EM COMUNIDADE" title="Agenda da igreja" description="Cultos, células e momentos importantes da nossa comunidade." action={<button className="button button-primary" onClick={onAdd}><Plus size={16} /> Novo evento</button>} />
      <section className="agenda-layout">
        <article className="panel calendar-panel">
          <div className="calendar-toolbar"><div><h2>{formatMonthLabel(month)}</h2><p>Selecione um dia para ver os encontros</p></div><div className="calendar-controls"><button onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><ChevronLeft size={17} /></button><button onClick={() => onMonth(currentMonth())}>Hoje</button><button onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Próximo mês"><ChevronRight size={17} /></button></div></div>
          <div className="calendar-grid">{weekdays.map((day) => <div className="weekday" key={day}>{day}</div>)}{days.map((day) => { const key = dateKey(day); const dayEvents = events.filter((event) => event.date === key); const inMonth = day.getMonth() === monthNumber - 1; return <button key={key} className={`calendar-day ${inMonth ? "" : "outside"} ${key === selectedDate ? "selected" : ""} ${key === dateKey(new Date()) ? "today" : ""}`} onClick={() => onSelectDate(key)}><span className="day-number">{day.getDate()}</span><span className="day-events">{dayEvents.slice(0, 2).map((event) => <i className={`event-pill event-${event.type}`} key={event.id}>{event.title}</i>)}{dayEvents.length > 2 && <small>+{dayEvents.length - 2} eventos</small>}</span><span className="mobile-event-dots">{dayEvents.slice(0, 3).map((event) => <i className={`event-dot event-${event.type}`} key={event.id} />)}</span></button>; })}</div>
        </article>
        <aside className="agenda-aside">
          <article className="panel selected-day-panel"><PanelHeading title={new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(toLocalDate(selectedDate))} subtitle={selectedEvents.length ? `${selectedEvents.length} encontro${selectedEvents.length > 1 ? "s" : ""} neste dia` : "Um bom dia para criar um encontro"} />{selectedEvents.length ? <div className="selected-events">{selectedEvents.map((event) => <EventCard key={event.id} event={event} onMarkAttendance={onMarkAttendance} />)}</div> : <div className="empty-state compact-empty"><span><CalendarDays size={18} /></span><strong>Dia livre</strong><p>Use este tempo para planejar um novo encontro.</p><button className="text-button" onClick={onAdd}><Plus size={14} /> Adicionar evento</button></div>}</article>
          <article className="panel next-events-panel"><PanelHeading title="Em breve" subtitle="Próximos encontros da igreja" />{upcoming.length ? <div className="upcoming-list">{upcoming.map((event) => <EventCard key={event.id} event={event} compact />)}</div> : <p className="empty-copy">Nenhum evento futuro.</p>}</article>
        </aside>
      </section>
    </>
  );
}

function EventCard({ event, compact = false, onMarkAttendance }: { event: ChurchEvent; compact?: boolean; onMarkAttendance?: (eventId: string) => void }) {
  const isPastOrToday = event.date <= dateKey(new Date());
  return (
    <div className={`event-card ${compact ? "event-card-compact" : ""}`}>
      <span className={`event-card-mark event-${event.type}`} />
      <div className="event-card-copy">
        <Badge tone={event.type}>{eventLabels[event.type]}</Badge>
        <strong>{event.title}</strong>
        <small><Clock3 size={12} /> {formatDate(event.date)} · {event.time}</small>
        <small><MapPin size={12} /> {event.location}</small>
        {!compact && <small className="event-leader">Responsável: {event.leader}</small>}
        {!compact && isPastOrToday && onMarkAttendance && (
          <button className="text-button" type="button" onClick={() => onMarkAttendance(event.id)}>
            <CalendarCheck size={13} /> {event.attendanceIds.length > 0 ? `${event.attendanceIds.length} presentes` : "Marcar presença"}
          </button>
        )}
      </div>
    </div>
  );
}
