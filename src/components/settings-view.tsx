"use client";

import { ArrowRight, Check, Copy, LogOut, Plus, Settings, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";

type ChurchSettings = {
  churchName: string;
  location: string;
  monthlyGoal: number;
  openingBalance: number;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export function SettingsView({
  settings,
  currentUserId,
  onSaveSettings,
  onLogout,
}: {
  settings: ChurchSettings;
  currentUserId: string;
  onSaveSettings: (settings: ChurchSettings) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<"igreja" | "usuarios">("usuarios");

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span />ADMINISTRAÇÃO</div>
          <h1>Configurações</h1>
          <p>Dados da igreja, usuários com acesso ao sistema e perfis de permissão.</p>
        </div>
        <button className="button button-quiet" onClick={onLogout}><LogOut size={15} /> Sair</button>
      </section>

      <section className="panel finance-panel">
        <div className="finance-toolbar">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "usuarios"} className={tab === "usuarios" ? "active" : ""} onClick={() => setTab("usuarios")}>Usuários</button>
            <button role="tab" aria-selected={tab === "igreja"} className={tab === "igreja" ? "active" : ""} onClick={() => setTab("igreja")}>Dados da igreja</button>
          </div>
        </div>
        {tab === "usuarios" ? <UsersPanel currentUserId={currentUserId} /> : <ChurchSettingsPanel settings={settings} onSave={onSaveSettings} />}
      </section>
    </>
  );
}

function ChurchSettingsPanel({ settings, onSave }: { settings: ChurchSettings; onSave: (settings: ChurchSettings) => void }) {
  const [churchName, setChurchName] = useState(settings.churchName);
  const [location, setLocation] = useState(settings.location);
  const [monthlyGoal, setMonthlyGoal] = useState(String(settings.monthlyGoal));
  const [openingBalance, setOpeningBalance] = useState(String(settings.openingBalance));
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="modal-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          churchName: churchName.trim() || settings.churchName,
          location: location.trim() || settings.location,
          monthlyGoal: Number(monthlyGoal.replace(",", ".")) || 0,
          openingBalance: Number(openingBalance.replace(",", ".")) || 0,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }}
    >
      <div className="form-grid">
        <label className="field field-full"><span>Nome oficial da igreja</span><input value={churchName} onChange={(event) => setChurchName(event.target.value)} /></label>
        <label className="field field-full"><span>Localização</span><input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <label className="field"><span>Meta mensal de entradas (R$)</span><input inputMode="decimal" value={monthlyGoal} onChange={(event) => setMonthlyGoal(event.target.value)} /></label>
        <label className="field"><span>Saldo inicial (R$)</span><input inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /></label>
      </div>
      <div className="modal-actions">
        {saved && <span className="care-ok"><Check size={14} /> Salvo</span>}
        <button className="button button-primary" type="submit">Salvar dados da igreja</button>
      </div>
    </form>
  );
}

function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setUsers(data.users);
    } catch {
      setError("Não foi possível carregar os usuários agora.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(payload: { name: string; email: string; phone: string; role: Role }) {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Não foi possível criar o usuário.");
      return;
    }
    setShowForm(false);
    setTempPassword({ email: payload.email, password: data.tempPassword });
    load();
  }

  async function updateUser(id: string, updates: { role?: Role; active?: boolean }) {
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (response.ok) load();
    else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Não foi possível atualizar o usuário.");
    }
  }

  async function resetPassword(id: string, email: string) {
    const response = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setTempPassword({ email, password: data.tempPassword });
    else setError(data.error || "Não foi possível gerar uma nova senha.");
  }

  if (!users) return <div className="empty-state"><span><Users size={19} /></span><strong>Carregando usuários…</strong></div>;

  return (
    <>
      <div className="list-toolbar">
        <span className="result-count">{users.length} usuário(s) com acesso</span>
        <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Novo usuário</button>
      </div>
      {error && <div className="storage-message"><span>{error}</span><button className="dismiss-message" onClick={() => setError("")} aria-label="Fechar"><X size={15} /></button></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>PESSOA</th><th>PERFIL</th><th>ÚLTIMO ACESSO</th><th>STATUS</th><th>AÇÕES</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><span className="table-main">{user.name}</span><span className="table-sub">{user.email}</span></td>
                <td>
                  <label className="inline-select">
                    <span className="sr-only">Perfil de {user.name}</span>
                    <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value as Role })}>
                      {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                    </select>
                  </label>
                </td>
                <td>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca acessou"}</td>
                <td>{user.active ? <span className="care-ok"><Check size={14} /> Ativo</span> : <span className="muted-cell">Inativo</span>}</td>
                <td>
                  <div className="commitment-detail">
                    <button className="text-button" type="button" onClick={() => resetPassword(user.id, user.email)}>Gerar senha</button>
                    {user.id !== currentUserId && (
                      <button className="text-button" type="button" onClick={() => updateUser(user.id, { active: !user.active })}>
                        {user.active ? "Desativar" : "Ativar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <UserForm onClose={() => setShowForm(false)} onSave={createUser} />}
      {tempPassword && <TempPasswordModal info={tempPassword} onClose={() => setTempPassword(null)} />}
    </>
  );
}

function UserForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: { name: string; email: string; phone: string; role: Role }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("secretaria");
  const [error, setError] = useState("");

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><ShieldCheck size={19} /></span>
          <div><h2>Novo usuário</h2><p>Conceda acesso a mais alguém da liderança.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <form className="modal-form" onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !email.trim()) {
            setError("Informe nome e e-mail.");
            return;
          }
          onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), role });
        }}>
          <label className="field field-full"><span>Nome completo</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome e sobrenome" /></label>
          <div className="form-grid">
            <label className="field"><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@email.com" /></label>
            <label className="field"><span>Telefone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(31) 99999-9999" /></label>
            <label className="field field-full"><span>Perfil de acesso</span>
              <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Criar usuário <ArrowRight size={15} /></button></div>
        </form>
      </section>
    </div>
  );
}

function TempPasswordModal({ info, onClose }: { info: { email: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><Settings size={19} /></span>
          <div><h2>Senha provisória gerada</h2><p>Compartilhe com {info.email} por um canal seguro. Ela será trocada no primeiro acesso.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="modal-form">
          <div className="field field-full">
            <span>Senha provisória</span>
            <div className="list-toolbar">
              <code style={{ fontSize: 18, letterSpacing: 1 }}>{info.password}</code>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  navigator.clipboard?.writeText(info.password).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                aria-label="Copiar senha"
              >
                <Copy size={16} />
              </button>
            </div>
            {copied && <small className="care-ok"><Check size={13} /> Copiada</small>}
          </div>
          <div className="modal-actions"><button className="button button-primary" onClick={onClose}>Concluído</button></div>
        </div>
      </section>
    </div>
  );
}
