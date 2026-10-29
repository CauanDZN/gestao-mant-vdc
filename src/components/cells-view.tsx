"use client";

import { AlertTriangle, ArrowRight, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { initials } from "@/lib/format";
import type { ChurchPerson } from "@/lib/types";

type Cell = {
  id: string;
  name: string;
  leader: string;
  auxiliar: string;
  host: string;
  weekday: string;
  time: string;
  address: string;
  neighborhood: string;
  audience: string;
  capacity: number;
  supervisor: string;
  members: { id: string; name: string }[];
  attendances: { id: string; date: string; attendeeIds: string[]; visitors: number }[];
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const AUDIENCES = ["misto", "casais", "jovens", "adolescentes", "mulheres", "homens"];

export function CellsView({
  people,
  canEdit,
  onPersonCellChange,
}: {
  people: ChurchPerson[];
  canEdit: boolean;
  onPersonCellChange: (personId: string, cellId: string | null) => void;
}) {
  const [cells, setCells] = useState<Cell[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/cells");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCells(data.cells);
    } catch {
      setError("Não foi possível carregar as células agora.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const assignedIds = new Set(
    (cells ?? []).flatMap((cell) => cell.members.map((member) => member.id)),
  );
  const needingGroup = people.filter(
    (person) => (person.stage === "membro" || person.stage === "frequentador") && !assignedIds.has(person.id),
  );

  async function createCell(payload: Omit<Cell, "id" | "members" | "attendances">) {
    const response = await fetch("/api/cells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      setShowForm(false);
      load();
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Não foi possível criar a célula.");
    }
  }

  if (!cells) {
    return <div className="empty-state"><span><Users size={19} /></span><strong>Carregando células…</strong></div>;
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span />VIDA EM COMUNIDADE</div>
          <h1>Células (PGs)</h1>
          <p>Nenhum membro sem grupo: acompanhe células, líderes e quem ainda precisa ser encaminhado.</p>
        </div>
        {canEdit && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Nova célula</button>}
      </section>

      {error && <div className="storage-message"><span>{error}</span><button className="dismiss-message" onClick={() => setError("")} aria-label="Fechar"><X size={15} /></button></div>}

      <section className="metrics-grid three-metrics">
        <article className="metric-card">
          <div className="metric-icon tone-green"><Users size={18} /></div>
          <span className="metric-label">Células ativas</span>
          <strong className="metric-value">{cells.length}</strong>
          <span className="metric-note">Grupos cadastrados</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon tone-peach"><AlertTriangle size={18} /></div>
          <span className="metric-label">Precisam de grupo</span>
          <strong className="metric-value">{needingGroup.length}</strong>
          <span className="metric-note">Meta: zero</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon tone-blue"><Users size={18} /></div>
          <span className="metric-label">Pessoas em células</span>
          <strong className="metric-value">{assignedIds.size}</strong>
          <span className="metric-note">Vinculadas a um grupo</span>
        </article>
      </section>

      {needingGroup.length > 0 && (
        <section className="panel attention-panel">
          <div className="panel-heading"><div><h2>Precisam de grupo</h2><p>Vincule cada pessoa à célula mais próxima</p></div></div>
          <div className="attention-list">
            {needingGroup.map((person) => (
              <div className="attention-row" key={person.id}>
                <span className="avatar">{initials(person.name)}</span>
                <span className="attention-copy"><strong>{person.name}</strong><small>{person.phone || "Sem telefone"}</small></span>
                {canEdit && (
                  <label className="inline-select">
                    <span className="sr-only">Vincular {person.name} a uma célula</span>
                    <select defaultValue="" onChange={async (event) => { if (event.target.value) { await onPersonCellChange(person.id, event.target.value); load(); } }}>
                      <option value="" disabled>Escolher célula…</option>
                      {cells.map((cell) => <option key={cell.id} value={cell.id}>{cell.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="cells-grid">
        {cells.map((cell) => (
          <article className="panel" key={cell.id}>
            <div className="panel-heading">
              <div><h2>{cell.name}</h2><p>{WEEKDAYS[Number(cell.weekday)] ?? cell.weekday} · {cell.time}</p></div>
            </div>
            <p className="budget-disclaimer">{cell.address}{cell.neighborhood ? ` · ${cell.neighborhood}` : ""}</p>
            <div className="community-counts">
              <div><span className="community-icon tone-green"><Users size={17} /></span><span><strong>{cell.members.length}</strong><small>Membros{cell.capacity ? ` de ${cell.capacity}` : ""}</small></span></div>
            </div>
            <p className="budget-disclaimer">Líder: {cell.leader || "A definir"}{cell.auxiliar ? ` · Auxiliar: ${cell.auxiliar}` : ""}</p>
            {cell.members.length > 0 && (
              <div className="avatar-stack">{cell.members.slice(0, 6).map((member) => <span key={member.id} className="avatar">{initials(member.name)}</span>)}</div>
            )}
          </article>
        ))}
        {!cells.length && (
          <div className="empty-state">
            <span><Users size={19} /></span>
            <strong>Nenhuma célula cadastrada</strong>
            <p>Cadastre a primeira célula para começar a organizar os grupos.</p>
          </div>
        )}
      </section>

      {showForm && <CellForm onClose={() => setShowForm(false)} onSave={createCell} />}
    </>
  );
}

function CellForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: Omit<Cell, "id" | "members" | "attendances">) => void;
}) {
  const [name, setName] = useState("");
  const [leader, setLeader] = useState("");
  const [weekday, setWeekday] = useState("0");
  const [time, setTime] = useState("19:30");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [audience, setAudience] = useState("misto");
  const [capacity, setCapacity] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><Users size={19} /></span>
          <div><h2>Nova célula</h2><p>Cadastre o grupo e onde ele se reúne.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <form className="modal-form" onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !address.trim()) {
            setError("Informe o nome e o endereço da célula.");
            return;
          }
          onSave({
            name: name.trim(), leader: leader.trim(), auxiliar: "", host: "",
            weekday, time, address: address.trim(), neighborhood: neighborhood.trim(),
            audience, capacity: Number(capacity) || 0, supervisor: supervisor.trim(),
          });
        }}>
          <label className="field field-full"><span>Nome da célula</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Célula Esperança" /></label>
          <div className="form-grid">
            <label className="field"><span>Líder</span><input value={leader} onChange={(event) => setLeader(event.target.value)} placeholder="Nome do líder" /></label>
            <label className="field"><span>Supervisor</span><input value={supervisor} onChange={(event) => setSupervisor(event.target.value)} placeholder="Opcional" /></label>
            <label className="field"><span>Dia da semana</span><select value={weekday} onChange={(event) => setWeekday(event.target.value)}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
            <label className="field"><span>Horário</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            <label className="field"><span>Público</span><select value={audience} onChange={(event) => setAudience(event.target.value)}>{AUDIENCES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="field"><span>Capacidade</span><input inputMode="numeric" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Opcional" /></label>
            <label className="field field-full"><span>Endereço</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rua, número" /></label>
            <label className="field"><span>Bairro</span><input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="Opcional" /></label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Criar célula <ArrowRight size={15} /></button></div>
        </form>
      </section>
    </div>
  );
}
