import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, Download, FlaskConical, Plus } from "lucide-react";
import { api } from "../../lib/api/api";
import type {
  LabCatalogueItem,
  LabOrder,
  Patient,
  PatientLabAppointment,
  Role,
} from "../../lib/api/types";
import { formatDate } from "../../lib/format";
import { useToast } from "../../components/feedback/Toast";
import { CrudPage } from "../../components/data/CrudPage";
import { DataTable, type TableColumn } from "../../components/data/DataTable";
import {
  EntityFormDialog,
  type EntityField,
} from "../../components/forms/EntityFormDialog";
import { Button, PageHeader, Panel, StatusBadge } from "../../components/ui";

const labStatuses = ["Ordered", "Collected", "Processing", "Completed", "Reviewed"].map((value) => ({ value, label: value }));
const today = () => new Date().toISOString().slice(0, 10);
const clinicSlots = Array.from({ length: 18 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const appointmentLabel = (status?: LabOrder["appointmentStatus"]) =>
  status === "Legacy" ? "Existing workflow" : status ?? "Unscheduled";

export function LaboratoryWorklistPage({ role }: { role: Role }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [catalogue, setCatalogue] = useState<LabCatalogueItem[]>([]);
  const [scheduleOrder, setScheduleOrder] = useState<LabOrder | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    void Promise.all([
      api.list("patients"),
      api.getLabCatalogue(),
    ]).then(([patientList, entries]) => {
      setPatients(patientList);
      setCatalogue(entries);
    }).catch(() => showToast("Unable to load laboratory selection data.", "error"));
  }, [showToast]);

  const orderFields: EntityField[] = [
    {
      name: "patientId",
      label: "Patient",
      type: "select",
      required: true,
      options: patients.map((item) => ({ value: item.id, label: `${item.name} · ${item.mrn}` })),
    },
    {
      name: "testCode",
      label: "Test catalogue",
      type: "select",
      required: true,
      searchable: true,
      options: [
        ...catalogue.map((item) => ({ value: item.code, label: item.name })),
        { value: "other", label: "Other / custom request" },
      ],
      hint: "Search tests already configured in MedFlow. A custom request remains free text and uses the existing result-entry path.",
    },
    { name: "test", label: "Custom test name (only for Other)" },
    { name: "orderedAt", label: "Order date", type: "date", required: true },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      required: true,
      options: ["Routine", "Urgent"].map((value) => ({ value, label: value })),
    },
    { name: "assignedTo", label: "Assigned technician" },
  ];
  const columns: TableColumn<never>[] = [
    { key: "id", label: "Order ID" },
    {
      key: "patientId",
      label: "Patient",
      render: (row: never) => {
        const order = row as unknown as LabOrder;
        const patient = patients.find((item) => item.id === order.patientId);
        return <Link className="link-button" to={`/patients/${order.patientId}`}>{patient?.name ?? "Patient"}</Link>;
      },
    },
    { key: "test", label: "Test" },
    { key: "orderedAt", label: "Ordered", render: (row: never) => formatDate((row as unknown as LabOrder).orderedAt) },
    { key: "priority", label: "Priority" },
    { key: "assignedTo", label: "Assigned to" },
    {
      key: "appointmentStatus",
      label: "Testing appointment",
      render: (row: never) => appointmentLabel((row as unknown as LabOrder).appointmentStatus),
    },
    { key: "status", label: "Order status" },
  ];
  const beginSchedule = (order: LabOrder) => {
    setScheduleOrder(order);
    setScheduleDate(order.appointmentDate ?? "");
    setScheduleTime(order.appointmentTime ?? "");
  };
  const saveSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleOrder || !scheduleDate || !scheduleTime) return;
    setSavingSchedule(true);
    try {
      await api.scheduleLabAppointment(scheduleOrder.id, scheduleDate, scheduleTime);
      setScheduleOrder(null);
      window.dispatchEvent(new Event("MedFlow:notifications-updated"));
      showToast("Testing appointment scheduled.");
      window.dispatchEvent(new Event("MedFlow:lab-orders-updated"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to schedule testing.", "error");
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <>
      <CrudPage
        collection="labOrders"
        title="Laboratory Worklist"
        description={role === "Laboratory Technician"
          ? "Work on previously recorded orders and new tests with a confirmed testing appointment."
          : "Track test orders and the separate testing appointment before technician processing."}
        columns={columns as never}
        fields={orderFields}
        createFields={role === "Doctor" ? orderFields : undefined}
        createLabel={role === "Doctor" ? "New lab order" : ""}
        allowEdit={false}
        allowArchive={false}
        filters={[{ key: "priority", label: "Priority" }]}
        rowActions={(row, reload) => {
          const order = row as unknown as LabOrder;
          if (role === "Receptionist" && order.status === "Ordered") {
            if (order.appointmentStatus === "Requested")
              return <Button size="sm" variant="primary" onClick={() => void api.confirmLabAppointment(order.id).then(reload).then(() => showToast("Lab appointment confirmed.")).catch((error) => showToast(error instanceof Error ? error.message : "Unable to confirm appointment.", "error"))}><Check size={13} />Confirm slot</Button>;
            if (["Unscheduled", "Legacy", "Cancelled", "Scheduled", undefined].includes(order.appointmentStatus))
              return <Button size="sm" variant="secondary" onClick={() => beginSchedule(order)}><CalendarDays size={13} />{order.appointmentStatus === "Scheduled" ? "Reschedule" : "Schedule test"}</Button>;
          }
          if (role === "Laboratory Technician" && ["Legacy", "Scheduled"].includes(order.appointmentStatus ?? "Legacy")) {
            const next: Partial<Record<LabOrder["status"], LabOrder["status"]>> = { Ordered: "Collected", Collected: "Processing" };
            const status = next[order.status];
            return status ? <Button size="sm" variant="secondary" onClick={() => void api.update("labOrders", order.id, { status }).then(reload).catch((error) => showToast(error instanceof Error ? error.message : "Unable to update test status.", "error"))}><Check size={13} />{status}</Button> : null;
          }
          return null;
        }}
      />
      {scheduleOrder && (
        <div className="modal-backdrop">
          <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="lab-schedule-title">
            <div className="modal-heading">
              <div><h2 id="lab-schedule-title">{scheduleOrder.appointmentStatus === "Scheduled" ? "Reschedule testing" : "Schedule testing"}</h2><p>{scheduleOrder.id} · {scheduleOrder.test}</p></div>
              <Button variant="ghost" onClick={() => setScheduleOrder(null)}>Close</Button>
            </div>
            <form className="entity-form" onSubmit={saveSchedule}>
              <div className="form-grid">
                <label className="form-field"><span>Testing date <span className="required-mark">*</span></span><input type="date" min={today()} required value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /></label>
                <label className="form-field"><span>Testing time <span className="required-mark">*</span></span><select required value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)}><option value="">Choose a 30-minute clinic slot</option>{clinicSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
              </div>
              <p className="activity-kicker">Scheduling a lab-only test does not create a doctor consultation or consultation charge.</p>
              <div className="modal-actions"><Button type="button" onClick={() => setScheduleOrder(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={savingSchedule}>{savingSchedule ? "Saving…" : "Confirm schedule"}</Button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function LaboratoryResultsPage({ role, patientId }: { role: Role; patientId?: string }) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [catalogue, setCatalogue] = useState<LabCatalogueItem[]>([]);
  const [editing, setEditing] = useState<LabOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [resultData, setResultData] = useState<Record<string, string>>({});
  const [resultComments, setResultComments] = useState("");
  const [performedAt, setPerformedAt] = useState(today());
  const [downloading, setDownloading] = useState("");
  const { showToast } = useToast();
  const reload = useCallback(async () => {
    const [labOrders, patientList, tests] = await Promise.all([
      api.list("labOrders"), api.list("patients"), api.getLabCatalogue(),
    ]);
    const permitted = role === "Patient"
      ? labOrders.filter((item) => Boolean(patientId) && item.patientId === patientId && item.status === "Reviewed")
      : labOrders;
    setOrders(permitted);
    setPatients(patientList);
    setCatalogue(tests);
  }, [role, patientId]);
  useEffect(() => { void reload().catch(() => showToast("Unable to load laboratory results.", "error")); }, [reload, showToast]);
  const editingTemplate = useMemo(() => catalogue.find((item) => item.code === editing?.testCode)?.resultFields ?? [], [catalogue, editing]);
  const columns: TableColumn<LabOrder>[] = [
    { key: "id", label: "Order ID" },
    { key: "patientId", label: "Patient", render: (row) => role === "Patient" ? "My result" : <Link className="link-button" to={`/patients/${row.patientId}`}>{patients.find((item) => item.id === row.patientId)?.name ?? "Patient"}</Link> },
    { key: "test", label: "Test" },
    { key: "orderedAt", label: "Ordered", render: (row) => formatDate(row.orderedAt) },
    { key: "result", label: "Result", render: (row) => row.result || Object.values(row.resultData ?? {}).filter(Boolean).join(" · ") || <span className="activity-kicker">Awaiting result</span> },
    { key: "status", label: "Status" },
  ];
  const submitResult = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const summary = editingTemplate.length
      ? editingTemplate.map((field) => `${field.label}: ${resultData[field.key] ?? ""}`).join(" · ")
      : result.trim();
    if (!summary.trim()) return;
    setSaving(true);
    try {
      await api.update("labOrders", editing.id, {
        result: summary,
        ...(editingTemplate.length ? { resultData } : {}),
        resultComments,
        performedAt,
        status: "Completed",
      });
      await reload();
      setEditing(null);
      showToast("Result saved. It remains unreleased until reviewed.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save result.", "error");
    } finally {
      setSaving(false);
    }
  };
  const downloadReport = async (order: LabOrder) => {
    setDownloading(order.id);
    try {
      const blob = await api.downloadLabReport(order.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `laboratory-report-${order.id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to download report.", "error");
    } finally {
      setDownloading("");
    }
  };
  const beginEntry = (order: LabOrder) => {
    setEditing(order);
    setResult(order.result);
    setResultData(order.resultData ?? {});
    setResultComments(order.resultComments ?? "");
    setPerformedAt(order.performedAt ?? today());
  };
  return (
    <>
      <PageHeader title="Laboratory Results" subtitle={role === "Patient" ? "Released laboratory results linked to your profile. Download final reports as PDF." : "Enter structured results for configured tests and release them only after review."} actions={role === "Doctor" ? <Link to="/laboratory"><Button variant="secondary"><Plus size={15} />New order</Button></Link> : undefined} />
      <Panel title={role === "Patient" ? "Released results" : "Results register"} subtitle={role === "Patient" ? "Only released (Reviewed) results are shown." : `${orders.length} orders`}>
        <DataTable
          rows={orders}
          columns={columns}
          searchPlaceholder="Search test, patient, or order…"
          onView={(row) => showToast(row.result || Object.values(row.resultData ?? {}).filter(Boolean).join(" · ") || "No result has been entered yet.", "info")}
          rowActions={(row) => {
            if (row.status === "Reviewed" && ["Doctor", "Patient"].includes(role))
              return <Button size="sm" variant="secondary" disabled={downloading === row.id} onClick={() => void downloadReport(row)}><Download size={13} />{downloading === row.id ? "Preparing…" : "Download PDF"}</Button>;
            if (role === "Laboratory Technician" && row.status === "Collected")
              return <Button size="sm" variant="secondary" onClick={() => void api.update("labOrders", row.id, { status: "Processing" }).then(reload).catch((error) => showToast(error instanceof Error ? error.message : "Unable to update test status.", "error"))}><Check size={13} />Mark processing</Button>;
            if (role === "Laboratory Technician" && row.status === "Processing")
              return <Button size="sm" variant="secondary" onClick={() => beginEntry(row)}><FlaskConical size={13} />Enter result</Button>;
            if (role === "Laboratory Technician" && row.status === "Completed")
              return <Button size="sm" variant="primary" onClick={() => void api.update("labOrders", row.id, { status: "Reviewed" }).then(reload).then(() => showToast("Result reviewed and released.")).catch((error) => showToast(error instanceof Error ? error.message : "Unable to release result.", "error"))}><Check size={13} />Review & release</Button>;
            return null;
          }}
        />
      </Panel>
      {editing && (
        <div className="modal-backdrop">
          <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="lab-result-title">
            <div className="modal-heading"><div><h2 id="lab-result-title">Enter laboratory result</h2><p>{editing.id} · {editing.test}{editing.referenceRange ? ` · configured reference: ${editing.referenceRange}` : ""}</p></div><Button variant="ghost" onClick={() => setEditing(null)}>Close</Button></div>
            <form className="entity-form" onSubmit={submitResult}>
              <div className="form-grid">
                <label className="form-field"><span>Performed / collection date <span className="required-mark">*</span></span><input type="date" required max={today()} value={performedAt} onChange={(event) => setPerformedAt(event.target.value)} /></label>
                {editingTemplate.length ? editingTemplate.map((field) => (
                  <label className="form-field" key={field.key}><span>{field.label} <span className="required-mark">*</span>{field.unit ? ` (${field.unit})` : ""}</span><input required value={resultData[field.key] ?? ""} onChange={(event) => setResultData((current) => ({ ...current, [field.key]: event.target.value }))} /></label>
                )) : <label className="form-field field-wide"><span>Result <span className="required-mark">*</span></span><textarea rows={4} required value={result} onChange={(event) => setResult(event.target.value)} placeholder="Enter the recorded result" /></label>}
                <label className="form-field field-wide"><span>Additional comments</span><textarea rows={3} value={resultComments} onChange={(event) => setResultComments(event.target.value)} /></label>
              </div>
              <p className="activity-kicker">No units, reference ranges, or clinical interpretation are added unless configured for this test.</p>
              <div className="modal-actions"><Button type="button" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save result"}</Button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function LaboratoryBookingPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [appointments, setAppointments] = useState<PatientLabAppointment[]>([]);
  const [orderId, setOrderId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const reload = useCallback(async () => {
    const [bookable, requested] = await Promise.all([api.getBookableLabOrders(), api.getMyLabAppointments()]);
    setOrders(bookable);
    setAppointments(requested);
    setOrderId((current) => bookable.some((item) => item.id === current) ? current : bookable[0]?.id ?? "");
  }, []);
  useEffect(() => { void reload().catch(() => showToast("Unable to load your laboratory bookings.", "error")); }, [reload, showToast]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderId || !date || !time) return;
    setSaving(true);
    try {
      await api.requestLabAppointment(orderId, date, time);
      setDate(""); setTime("");
      await reload();
      showToast("Testing slot requested. It is not confirmed until Receptionist approval.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to request testing.", "error");
    } finally { setSaving(false); }
  };
  const cancel = async (appointmentId: string) => {
    try { await api.cancelLabAppointment(appointmentId); await reload(); showToast("Lab appointment cancelled."); }
    catch (error) { showToast(error instanceof Error ? error.message : "Unable to cancel appointment.", "error"); }
  };
  return (
    <>
      <PageHeader eyebrow="Patient services" title="Book a Lab Test" subtitle="Request testing against an existing clinician-authorized order. This does not create a doctor consultation." />
      <Panel title="Request a testing appointment" subtitle="Only unprocessed tests already ordered by your clinician are eligible. The preferred slot remains pending until confirmed by the clinic.">
        {orders.length ? <form className="entity-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="form-field"><span>Authorized test <span className="required-mark">*</span></span><select required value={orderId} onChange={(event) => setOrderId(event.target.value)}><option value="">Select an ordered test</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.test} · {order.id}</option>)}</select></label>
            <label className="form-field"><span>Preferred date <span className="required-mark">*</span></span><input type="date" min={today()} required value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="form-field"><span>Preferred clinic time <span className="required-mark">*</span></span><select required value={time} onChange={(event) => setTime(event.target.value)}><option value="">Choose a 30-minute slot</option>{clinicSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
          </div>
          <p className="activity-kicker">Your requested time is subject to clinic confirmation; no consultation or consultation billing is created.</p>
          <div className="modal-actions"><Button type="submit" variant="primary" disabled={saving || !orderId}>{saving ? "Submitting…" : "Request lab appointment"}</Button></div>
        </form> : <div className="empty-inline">No eligible clinician-authorized, unprocessed lab orders are available for booking. Contact your clinic if you need a new test order.</div>}
      </Panel>
      <Panel title="My lab testing appointments" subtitle="Requested appointments are pending; only Scheduled appointments are confirmed." className="section-gap">
        {appointments.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Order</th><th>Test</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr></thead><tbody>{appointments.map((item) => <tr key={item.id}><td className="mono">{item.id}</td><td>{item.test}</td><td>{item.appointmentDate ? formatDate(item.appointmentDate) : "—"}</td><td>{item.appointmentTime ?? "—"}</td><td><StatusBadge value={item.appointmentStatus} /></td><td>{item.orderStatus === "Ordered" && ["Requested", "Scheduled"].includes(item.appointmentStatus) ? <Button size="sm" variant="ghost" onClick={() => void cancel(item.id)}>Cancel</Button> : "—"}</td></tr>)}</tbody></table></div> : <div className="empty-inline">No lab-only appointment requests yet.</div>}
      </Panel>
    </>
  );
}
