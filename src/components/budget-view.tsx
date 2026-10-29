"use client";

import { AlertTriangle, ArrowRight, Plus, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

type MonthEntry = { month: number; planned: number; realized: number };
type Category = {
  id: string;
  name: string;
  type: "receita" | "despesa";
  months: MonthEntry[];
  plannedTotal: number;
  realizedTotal: number;
};

function statusTone(percent: number, type: Category["type"]): "green" | "gold" | "warm" {
  if (type === "receita") return percent >= 100 ? "green" : percent >= 80 ? "gold" : "warm";
  if (percent > 100) return "warm";
  if (percent >= 80) return "gold";
  return "green";
}

export function BudgetView({
  month,
  canEdit,
}: {
  month: string;
  canEdit: boolean;
}) {
  const year = Number(month.slice(0, 4)) || new Date().getFullYear();
  const monthNumber = Number(month.slice(5, 7)) || 1;
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const response = await fetch(`/api/budget?year=${year}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCategories(data.categories);
    } catch {
      setError("Não foi possível carregar o orçamento agora.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  async function savePlanned(categoryId: string, value: number) {
    await fetch("/api/budget/lines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, year, month: monthNumber, plannedAmount: value }),
    });
    load();
  }

  async function createCategory(name: string, type: Category["type"]) {
    const response = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    if (response.ok) {
      setShowForm(false);
      load();
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Não foi possível criar a categoria.");
    }
  }

  if (!categories) {
    return <div className="empty-state"><span><Wallet size={19} /></span><strong>Carregando orçamento…</strong></div>;
  }

  const income = categories.filter((category) => category.type === "receita");
  const expenses = categories.filter((category) => category.type === "despesa");
  const monthPlannedExpenses = expenses.reduce((sum, c) => sum + (c.months.find((m) => m.month === monthNumber)?.planned ?? 0), 0);
  const monthRealizedExpenses = expenses.reduce((sum, c) => sum + (c.months.find((m) => m.month === monthNumber)?.realized ?? 0), 0);
  const monthPlannedIncome = income.reduce((sum, c) => sum + (c.months.find((m) => m.month === monthNumber)?.planned ?? 0), 0);
  const monthRealizedIncome = income.reduce((sum, c) => sum + (c.months.find((m) => m.month === monthNumber)?.realized ?? 0), 0);
  const monthsElapsed = Math.max(1, monthNumber);
  const yearRealizedExpenses = expenses.reduce((sum, c) => sum + c.realizedTotal, 0);
  const yearPlannedExpenses = expenses.reduce((sum, c) => sum + c.plannedTotal, 0);
  const projectedYearEnd = (yearRealizedExpenses / monthsElapsed) * 12;
  const alerts = [...income, ...expenses].filter((category) => {
    const entry = category.months.find((m) => m.month === monthNumber);
    if (!entry || entry.planned <= 0) return false;
    return entry.realized / entry.planned >= 0.9;
  });

  return (
    <div className="budget-view">
      {error && <div className="storage-message"><span>{error}</span><button className="dismiss-message" onClick={() => setError("")} aria-label="Fechar"><X size={15} /></button></div>}

      <div className="budget-summary">
        <div><span>Receitas planejadas no mês</span><strong>{formatCurrency(monthPlannedIncome)}</strong></div>
        <div><span>Receitas realizadas</span><strong>{formatCurrency(monthRealizedIncome)}</strong></div>
        <div><span>Despesas planejadas no mês</span><strong>{formatCurrency(monthPlannedExpenses)}</strong></div>
        <div className="budget-remaining"><span>Despesas realizadas</span><strong>{formatCurrency(monthRealizedExpenses)}</strong></div>
      </div>

      {alerts.length > 0 && (
        <div className="storage-message">
          <span><AlertTriangle size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />{alerts.length} categoria(s) já passaram de 90% do orçado este mês: {alerts.map((a) => a.name).join(", ")}.</span>
        </div>
      )}

      <BudgetGroup title="Receitas" categories={income} monthNumber={monthNumber} canEdit={canEdit} onSave={savePlanned} />
      <BudgetGroup title="Despesas" categories={expenses} monthNumber={monthNumber} canEdit={canEdit} onSave={savePlanned} />

      <div className="budget-row">
        <div className="budget-label"><strong>Projeção de fim de ano (despesas)</strong><span>{formatCurrency(projectedYearEnd)} <i>de</i> {formatCurrency(yearPlannedExpenses)} planejado</span></div>
        <div className="budget-track"><span className={projectedYearEnd > yearPlannedExpenses ? "warm" : "green"} style={{ width: `${Math.min(100, (projectedYearEnd / Math.max(yearPlannedExpenses, 1)) * 100)}%` }} /></div>
      </div>

      {canEdit && (
        <button className="button button-secondary" type="button" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Nova categoria de orçamento
        </button>
      )}

      {showForm && <CategoryForm onClose={() => setShowForm(false)} onSave={createCategory} />}
    </div>
  );
}

function BudgetGroup({
  title,
  categories,
  monthNumber,
  canEdit,
  onSave,
}: {
  title: string;
  categories: Category[];
  monthNumber: number;
  canEdit: boolean;
  onSave: (categoryId: string, value: number) => void;
}) {
  if (!categories.length) return null;
  return (
    <div className="budget-list">
      <p className="nav-heading">{title.toUpperCase()}</p>
      {categories.map((category) => {
        const entry = category.months.find((m) => m.month === monthNumber) ?? { planned: 0, realized: 0, month: monthNumber };
        const percent = entry.planned > 0 ? Math.round((entry.realized / entry.planned) * 100) : entry.realized > 0 ? 999 : 0;
        const tone = statusTone(percent, category.type);
        return (
          <div className="budget-row" key={category.id}>
            <div className="budget-label">
              <span className={`budget-dot ${tone}`} />
              <strong>{category.name}</strong>
              <span>{formatCurrency(entry.realized)} <i>de</i>{" "}
                {canEdit ? (
                  <input
                    className="budget-planned-input"
                    inputMode="decimal"
                    defaultValue={entry.planned || ""}
                    placeholder="0,00"
                    onBlur={(event) => {
                      const value = Number(event.target.value.replace(",", ".")) || 0;
                      if (value !== entry.planned) onSave(category.id, value);
                    }}
                  />
                ) : formatCurrency(entry.planned)}
              </span>
            </div>
            <div className="budget-track"><span className={tone} style={{ width: `${Math.min(100, percent)}%` }} /></div>
            <small>{percent}% {percent > 100 ? "— meta superada" : "utilizado"}</small>
          </div>
        );
      })}
    </div>
  );
}

function CategoryForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, type: Category["type"]) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Category["type"]>("despesa");
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><Wallet size={19} /></span>
          <div><h2>Nova categoria de orçamento</h2><p>Separe receitas de despesas para o orçado x realizado.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <form className="modal-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave(name.trim(), type); }}>
          <label className="field field-full"><span>Nome da categoria</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Missões e ação social" /></label>
          <div className="segmented-control">
            <button type="button" className={type === "receita" ? "selected income-choice" : ""} onClick={() => setType("receita")}>Receita</button>
            <button type="button" className={type === "despesa" ? "selected expense-choice" : ""} onClick={() => setType("despesa")}>Despesa</button>
          </div>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Criar categoria <ArrowRight size={15} /></button></div>
        </form>
      </section>
    </div>
  );
}
