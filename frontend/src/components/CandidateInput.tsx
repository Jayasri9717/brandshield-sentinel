import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { parseCsvObjects } from "../utils/csv";

export type CandidateField = { key: string; label: string; required?: boolean; placeholder?: string };

export function CandidateInput({
  fields,
  onAdd,
  onImport,
}: {
  fields: CandidateField[];
  onAdd: (candidate: Record<string, string>) => void;
  onImport: (candidates: Record<string, string>[]) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function addCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fields.some((field) => field.required && !values[field.key]?.trim())) {
      setMessage("Complete all required candidate fields.");
      return;
    }
    onAdd(values);
    setValues({});
    setMessage("");
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const candidates = parseCsvObjects(await file.text(), fields.filter((field) => field.required).map((field) => field.key));
      if (!candidates.length) throw new Error("The CSV contains headers but no candidate rows.");
      onImport(candidates);
      setMessage(`Imported ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}.`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not read this CSV file.");
    }
  }

  return (
    <section className="panel candidate-input-panel">
      <div className="section-heading">
        <div><p className="eyebrow">CANDIDATE INPUT</p><h2>Add candidates</h2></div>
        <button className="subtle-button" type="button" onClick={() => fileRef.current?.click()}>Import CSV</button>
      </div>
      <p className="panel-description">Add candidates individually or import a CSV with these column headers: {fields.map((field) => field.key).join(", ")}.</p>
      <input ref={fileRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event)} aria-label="Import candidate CSV" />
      <form className="candidate-form" onSubmit={addCandidate}>
        {fields.map((field) => (
          <label className="candidate-field" key={field.key}>
            <span>{field.label}{field.required ? " *" : ""}</span>
            <input className="form-control" required={field.required} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder ?? field.key} />
          </label>
        ))}
        <button className="primary-button" type="submit">Add candidate</button>
      </form>
      {message && <p className="inline-feedback" role="status">{message}</p>}
    </section>
  );
}
