"use client";

import { Check, QrCode, Ticket, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ChurchEvent, ChurchPerson } from "@/lib/types";

type Registration = {
  id: string;
  personId: string;
  person: { id: string; name: string };
  paymentStatus: "isento" | "pendente" | "pago";
  amount: number;
  pixCopyPaste: string | null;
  pixQrCodeBase64: string | null;
};

export function EventRegistrationsModal({
  event,
  people,
  canEdit,
  onClose,
}: {
  event: ChurchEvent;
  people: ChurchPerson[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const [registrations, setRegistrations] = useState<Registration[] | null>(null);
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pix, setPix] = useState<{ copyPaste: string; qrCodeBase64: string } | null>(null);

  async function load() {
    try {
      const response = await fetch(`/api/events/${event.id}/registrations`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRegistrations(data.registrations);
    } catch {
      setError("Não foi possível carregar as inscrições agora.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const enrolledIds = new Set((registrations ?? []).map((item) => item.personId));
  const available = people.filter((person) => !enrolledIds.has(person.id));

  async function submit() {
    if (!personId) return;
    const response = await fetch(`/api/events/${event.id}/registrations`, {
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
    if (data.registration?.pixCopyPaste) {
      setPix({ copyPaste: data.registration.pixCopyPaste, qrCodeBase64: data.registration.pixQrCodeBase64 });
    }
    setPersonId("");
    load();
  }

  async function markPaid(registrationId: string) {
    await fetch(`/api/events/${event.id}/registrations/${registrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "pago" }),
    });
    load();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <span className="modal-icon"><Ticket size={19} /></span>
          <div><h2>Inscrições</h2><p>{event.title}{event.price ? ` · ${formatCurrency(event.price)}` : " · Gratuito"}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>

        <div className="modal-form">
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-error" style={{ color: "#8d7447" }}>{notice}</p>}

          {canEdit && (
            <div className="list-toolbar" style={{ padding: 0 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Inscrever pessoa</span>
                <select value={personId} onChange={(event2) => setPersonId(event2.target.value)}>
                  <option value="">Escolher…</option>
                  {available.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </label>
              <button className="button button-secondary" type="button" disabled={!personId} onClick={submit}><UserPlus size={14} /> Inscrever</button>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>PESSOA</th><th>PAGAMENTO</th><th></th></tr></thead>
              <tbody>
                {(registrations ?? []).map((registration) => (
                  <tr key={registration.id}>
                    <td>{registration.person.name}</td>
                    <td>
                      {registration.paymentStatus === "pago" ? (
                        <span className="care-ok"><Check size={13} /> Pago</span>
                      ) : registration.paymentStatus === "isento" ? (
                        <span className="muted-cell">Gratuito</span>
                      ) : (
                        <span>Pendente</span>
                      )}
                    </td>
                    <td>
                      {registration.pixCopyPaste && registration.paymentStatus === "pendente" && (
                        <button className="text-button" onClick={() => setPix({ copyPaste: registration.pixCopyPaste!, qrCodeBase64: registration.pixQrCodeBase64 || "" })}><QrCode size={13} /> PIX</button>
                      )}
                      {canEdit && registration.paymentStatus === "pendente" && (
                        <button className="text-button" onClick={() => markPaid(registration.id)}>Marcar pago</button>
                      )}
                    </td>
                  </tr>
                ))}
                {registrations && !registrations.length && <tr><td colSpan={3}><span className="muted-cell">Nenhuma inscrição ainda.</span></td></tr>}
              </tbody>
            </table>
          </div>

          <div className="modal-actions"><button className="button button-primary" onClick={onClose}>Fechar</button></div>
        </div>
      </section>

      {pix && (
        <div className="modal-backdrop" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) setPix(null); }}>
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <span className="modal-icon"><QrCode size={19} /></span>
              <div><h2>Pagamento por PIX</h2></div>
              <button className="icon-button" onClick={() => setPix(null)} aria-label="Fechar"><X size={17} /></button>
            </header>
            <div className="modal-form">
              {pix.qrCodeBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code do PIX" style={{ width: 200, height: 200, margin: "0 auto", display: "block" }} />
              )}
              <textarea readOnly value={pix.copyPaste} rows={3} />
              <div className="modal-actions"><button className="button button-primary" onClick={() => setPix(null)}>Concluído</button></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
