"use client";

import { Church, Lock, Mail, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/bootstrap")
      .then((response) => response.json())
      .then((data) => setNeedsSetup(Boolean(data.needsSetup)))
      .catch(() => setNeedsSetup(false))
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (needsSetup && (!name.trim() || password.length < 8)) {
      setError("Informe seu nome e crie uma senha com pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(needsSetup ? "/api/auth/bootstrap" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsSetup ? { name, email, password } : { email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Não foi possível entrar. Tente novamente.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <main className="loading-screen"><span className="loading-mark"><Church size={23} /></span><p>Carregando…</p></main>;
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <span className="login-mark"><Church size={24} /></span>
        <h1>MANT VDC</h1>
        <p>{needsSetup ? "Primeiro acesso: crie a conta principal (bispa) para começar a usar o sistema." : "Entre com seu e-mail e senha para acessar a gestão da igreja."}</p>
        <form className="login-form" onSubmit={handleSubmit}>
          {needsSetup && (
            <label className="login-field">
              <span><UserIcon size={15} /> Nome completo</span>
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required />
            </label>
          )}
          <label className="login-field">
            <span><Mail size={15} /> E-mail</span>
            <input type="email" autoFocus={!needsSetup} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@email.com" required />
          </label>
          <label className="login-field">
            <span><Lock size={15} /> Senha</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={needsSetup ? "Crie uma senha (mín. 8 caracteres)" : "Sua senha"} required minLength={needsSetup ? 8 : undefined} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary login-submit" type="submit" disabled={loading}>
            {loading ? "Entrando…" : needsSetup ? "Criar conta e entrar" : "Entrar"}
          </button>
        </form>
        {!needsSetup && <p className="login-hint">Esqueceu a senha? Peça para a bispa gerar uma nova em Configurações → Usuários.</p>}
      </section>
    </main>
  );
}
