"use client";

import { Award, ArrowRight, BookOpen, Check, Plus, QrCode, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ChurchPerson } from "@/lib/types";

type Enrollment = {
  id: string;
  personId: string;
  person: { id: string; name: string };
  status: "confirmado" | "espera";
  attendancePercent: number;
  paymentStatus: "isento" | "pendente" | "pago";
  pixCopyPaste: string | null;
  pixQrCodeBase64: string | null;
};

type Course = {
  id: string;
  name: string;
  teacher: string;
  audience: string;
  startDate: string;
  endDate: string;
  location: string;
  vacancies: number;
  price: number;
  minAttendancePercent: number;
  enrollments: Enrollment[];
};

export function CoursesView({ people, canEdit }: { people: ChurchPerson[]; canEdit: boolean }) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null);
  const [pixInfo, setPixInfo] = useState<{ copyPaste: string; qrCodeBase64: string } | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/courses");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCourses(data.courses);
    } catch {
      setError("Não foi possível carregar os cursos agora.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createCourse(payload: Omit<Course, "id" | "enrollments">) {
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      setShowForm(false);
      load();
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Não foi possível criar o curso.");
    }
  }

  async function enroll(courseId: string, personId: string) {
    const response = await fetch(`/api/courses/${courseId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Não foi possível inscrever esta pessoa.");
      return;
    }
    if (data.notice) setNotice(data.notice);
    if (data.enrollment?.pixCopyPaste) {
      setPixInfo({ copyPaste: data.enrollment.pixCopyPaste, qrCodeBase64: data.enrollment.pixQrCodeBase64 });
    }
    setEnrollingCourse(null);
    load();
  }

  async function updateEnrollment(courseId: string, enrollmentId: string, updates: Partial<Pick<Enrollment, "attendancePercent" | "paymentStatus">>) {
    await fetch(`/api/courses/${courseId}/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    load();
  }

  async function downloadCertificate(courseId: string, enrollmentId: string) {
    const response = await fetch(`/api/courses/${courseId}/enrollments/${enrollmentId}/certificate`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Não foi possível emitir o certificado.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "certificado.pdf";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!courses) return <div className="empty-state"><span><BookOpen size={19} /></span><strong>Carregando cursos…</strong></div>;

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span />MINISTÉRIOS</div>
          <h1>Cursos</h1>
          <p>Cadastro, inscrição, frequência e certificado automático em PDF.</p>
        </div>
        {canEdit && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Novo curso</button>}
      </section>

      {error && <div className="storage-message"><span>{error}</span><button className="dismiss-message" onClick={() => setError("")} aria-label="Fechar"><X size={15} /></button></div>}
      {notice && <div className="storage-message"><span>{notice}</span><button className="dismiss-message" onClick={() => setNotice("")} aria-label="Fechar"><X size={15} /></button></div>}

      {!courses.length && (
        <div className="empty-state">
          <span><BookOpen size={19} /></span>
          <strong>Nenhum curso cadastrado</strong>
          <p>Cadastre o primeiro curso para abrir inscrições.</p>
        </div>
      )}

      {courses.map((course) => (
        <section className="panel" key={course.id} style={{ marginBottom: 14 }}>
          <div className="panel-heading">
            <div>
              <h2>{course.name}</h2>
              <p>{course.teacher ? `Professor(a): ${course.teacher} · ` : ""}{formatDate(course.startDate)} a {formatDate(course.endDate)}{course.price > 0 ? ` · ${formatCurrency(course.price)}` : " · Gratuito"}</p>
            </div>
            {canEdit && (
              <button className="text-button" onClick={() => setEnrollingCourse(course)}><UserPlus size={14} /> Inscrever pessoa</button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PESSOA</th><th>STATUS</th><th>FREQUÊNCIA</th><th>PAGAMENTO</th><th>CERTIFICADO</th></tr></thead>
              <tbody>
                {course.enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td><span className="table-main">{enrollment.person.name}</span></td>
                    <td><Badge tone={enrollment.status === "confirmado" ? "green" : "warm"}>{enrollment.status === "confirmado" ? "Confirmado" : "Lista de espera"}</Badge></td>
                    <td>
                      {canEdit ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <input
                            className="budget-planned-input"
                            inputMode="numeric"
                            defaultValue={enrollment.attendancePercent}
                            onBlur={(event) => updateEnrollment(course.id, enrollment.id, { attendancePercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
                          />
                          %
                        </span>
                      ) : `${enrollment.attendancePercent}%`}
                    </td>
                    <td>
                      {enrollment.paymentStatus === "pago" ? (
                        <span className="care-ok"><Check size={13} /> Pago</span>
                      ) : enrollment.paymentStatus === "isento" ? (
                        <span className="muted-cell">Gratuito</span>
                      ) : (
                        <div className="commitment-detail">
                          <span>Pendente</span>
                          {enrollment.pixCopyPaste && (
                            <button className="text-button" onClick={() => setPixInfo({ copyPaste: enrollment.pixCopyPaste!, qrCodeBase64: enrollment.pixQrCodeBase64 || "" })}><QrCode size={13} /> Ver PIX</button>
                          )}
                          {canEdit && <button className="text-button" onClick={() => updateEnrollment(course.id, enrollment.id, { paymentStatus: "pago" })}>Marcar pago</button>}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={enrollment.attendancePercent < course.minAttendancePercent}
                        onClick={() => downloadCertificate(course.id, enrollment.id)}
                      >
                        <Award size={13} /> Emitir
                      </button>
                    </td>
                  </tr>
                ))}
                {!course.enrollments.length && <tr><td colSpan={5}><span className="muted-cell">Nenhuma inscrição ainda.</span></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {showForm && <CourseForm onClose={() => setShowForm(false)} onSave={createCourse} />}
      {enrollingCourse && (
        <EnrollForm
          course={enrollingCourse}
          people={people}
          onClose={() => setEnrollingCourse(null)}
          onSave={(personId) => enroll(enrollingCourse.id, personId)}
        />
      )}
      {pixInfo && <PixModal info={pixInfo} onClose={() => setPixInfo(null)} />}
    </>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "warm" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function CourseForm({ onClose, onSave }: { onClose: () => void; onSave: (payload: Omit<Course, "id" | "enrollments">) => void }) {
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [audience, setAudience] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [vacancies, setVacancies] = useState("");
  const [price, setPrice] = useState("");
  const [minAttendancePercent, setMinAttendancePercent] = useState("75");
  const [error, setError] = useState("");

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><BookOpen size={19} /></span>
          <div><h2>Novo curso</h2><p>Nome, professor, datas, vagas e valor.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <form className="modal-form" onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !startDate || !endDate) {
            setError("Informe o nome e as datas de início e fim.");
            return;
          }
          onSave({
            name: name.trim(), teacher: teacher.trim(), audience: audience.trim(),
            startDate, endDate, location: location.trim(),
            vacancies: Number(vacancies) || 0, price: Number(price.replace(",", ".")) || 0,
            minAttendancePercent: Number(minAttendancePercent) || 75,
          });
        }}>
          <Field label="Nome do curso"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Novos Convertidos" /></Field>
          <div className="form-grid">
            <Field label="Professor(a)"><input value={teacher} onChange={(event) => setTeacher(event.target.value)} /></Field>
            <Field label="Público"><input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Opcional" /></Field>
            <Field label="Início"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="Fim"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
            <Field label="Local"><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Opcional" /></Field>
            <Field label="Vagas"><input inputMode="numeric" value={vacancies} onChange={(event) => setVacancies(event.target.value)} placeholder="0 = ilimitado" /></Field>
            <Field label="Valor (R$)"><input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" /></Field>
            <Field label="Frequência mínima p/ certificado (%)"><input inputMode="numeric" value={minAttendancePercent} onChange={(event) => setMinAttendancePercent(event.target.value)} /></Field>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary">Criar curso <ArrowRight size={15} /></button></div>
        </form>
      </section>
    </div>
  );
}

function EnrollForm({
  course,
  people,
  onClose,
  onSave,
}: {
  course: Course;
  people: ChurchPerson[];
  onClose: () => void;
  onSave: (personId: string) => void;
}) {
  const alreadyEnrolled = new Set(course.enrollments.map((item) => item.personId));
  const available = people.filter((person) => !alreadyEnrolled.has(person.id));
  const [personId, setPersonId] = useState("");

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><UserPlus size={19} /></span>
          <div><h2>Inscrever em {course.name}</h2><p>{course.price > 0 ? `Gera uma cobrança PIX de ${formatCurrency(course.price)}.` : "Curso gratuito."}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <form className="modal-form" onSubmit={(event) => { event.preventDefault(); if (personId) onSave(personId); }}>
          <Field label="Pessoa">
            <select value={personId} onChange={(event) => setPersonId(event.target.value)} required>
              <option value="" disabled>Escolher…</option>
              {available.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </Field>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={!personId}>Inscrever <ArrowRight size={15} /></button></div>
        </form>
      </section>
    </div>
  );
}

function PixModal({ info, onClose }: { info: { copyPaste: string; qrCodeBase64: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><QrCode size={19} /></span>
          <div><h2>Pagamento por PIX</h2><p>Escaneie o QR Code ou copie o código.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="modal-form">
          {info.qrCodeBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${info.qrCodeBase64}`} alt="QR Code do PIX" style={{ width: 220, height: 220, margin: "0 auto", display: "block" }} />
          )}
          <div className="field field-full">
            <span>Código copia e cola</span>
            <textarea readOnly value={info.copyPaste} rows={3} />
          </div>
          <div className="modal-actions">
            <button type="button" className="button button-quiet" onClick={() => { navigator.clipboard?.writeText(info.copyPaste); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copiado!" : "Copiar código"}</button>
            <button className="button button-primary" onClick={onClose}>Concluído</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
