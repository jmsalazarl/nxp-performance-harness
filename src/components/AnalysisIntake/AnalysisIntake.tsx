import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { AnalysisInput, JourneyType, TestObjective } from "../../models/analysis.types";
import type { WorkloadContract } from "../../models/workloadContract.types";
import { AnalysisPersistenceService, loadAnalysisDraft } from "../../services/analysis.persistence.service";
import { validateAnalysisDemand, type DemandValidationResult } from "../../services/validateAnalysisDemand";
import { validateBusinessJourneys, type BusinessJourneyValidationResult } from "../../services/validateBusinessJourneys";
import { calculateWorkload } from "../../services/calculateWorkload";
import { analyzeAnalysisEvidence } from "../../services/analyzeAnalysisEvidence";
import { generateTestPlan } from "../../services/generateTestPlan";
import { createApprovedWorkloadContract, serializeWorkloadContract } from "../../services/workloadContract.service";
import { downloadTextFile } from "../../utils/downloader";
import styles from "./AnalysisIntake.module.css";

interface AnalysisIntakeProps {
  onClose: () => void;
}

type JourneyPriority = "critical" | "high" | "normal";

interface IntakeForm {
  applicationType: string;
  objectives: TestObjective[];
  currentCustomers: string;
  customersSixMonths: string;
  customersTwelveMonths: string;
  dailyActiveUsers: string;
  sessionsPerUserPerDay: string;
  peakSharePercent: string;
  peakWindowMinutes: string;
  stressMultiplier: string;
  journeyName: string;
  journeyType: JourneyType;
  journeyPriority: JourneyPriority;
  shareOfUsersPercent: string;
  journeyFrequency: string;
  journeyDurationSeconds: string;
  operationCount: string;
  writePercent: string;
  integrations: string;
  referenceTitle: string;
  referenceUrl: string;
  referenceContext: string;
  referenceSupportedValue: string;
  latencyP95Ms: string;
  errorRatePercent: string;
  availabilityPercent: string;
}

const initialForm: IntakeForm = {
  applicationType: "web",
  objectives: ["capacity", "growth"],
  currentCustomers: "",
  customersSixMonths: "",
  customersTwelveMonths: "",
  dailyActiveUsers: "",
  sessionsPerUserPerDay: "",
  peakSharePercent: "",
  peakWindowMinutes: "60",
  stressMultiplier: "2",
  journeyName: "",
  journeyType: "synchronous",
  journeyPriority: "high",
  shareOfUsersPercent: "",
  journeyFrequency: "",
  journeyDurationSeconds: "",
  operationCount: "",
  writePercent: "",
  integrations: "",
  referenceTitle: "",
  referenceUrl: "",
  referenceContext: "",
  referenceSupportedValue: "",
  latencyP95Ms: "500",
  errorRatePercent: "1",
  availabilityPercent: "99.9",
};

const objectiveOptions: Array<{ value: TestObjective; label: string }> = [
  { value: "capacity", label: "Capacidad" },
  { value: "load", label: "Carga" },
  { value: "stress", label: "Estres" },
  { value: "soak", label: "Resistencia" },
  { value: "regression", label: "Regresion" },
  { value: "growth", label: "Crecimiento" },
];

const createAnalysisId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : uuidv4();

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createDraft(form: IntakeForm, analysisId: string, createdAt: string, version: number): AnalysisInput {
  const values: Array<[string, string, string]> = [
    ["demand.currentCustomers", form.currentCustomers, "customers"],
    ["demand.customersSixMonths", form.customersSixMonths, "customers"],
    ["demand.customersTwelveMonths", form.customersTwelveMonths, "customers"],
    ["demand.dailyActiveUsers", form.dailyActiveUsers, "users"],
    ["behavior.sessionsPerUserPerDay", form.sessionsPerUserPerDay, "sessions_per_day"],
    ["behavior.peakSharePercent", form.peakSharePercent, "percent"],
    ["behavior.peakWindowMinutes", form.peakWindowMinutes, "minutes"],
    ["behavior.stressMultiplier", form.stressMultiplier, "multiplier"],
    ["journey.name", form.journeyName, "text"],
    ["journey.type", form.journeyType, "type"],
    ["journey.priority", form.journeyPriority, "level"],
    ["journey.shareOfUsersPercent", form.shareOfUsersPercent, "percent"],
    ["journey.frequency", form.journeyFrequency, "per_user_per_day"],
    ["journey.durationSeconds", form.journeyDurationSeconds, "seconds"],
    ["journey.operationCount", form.operationCount, "operations"],
    ["journey.writePercent", form.writePercent, "percent"],
    ["integrations", form.integrations, "text"],
    ["slo.latencyP95Ms", form.latencyP95Ms, "milliseconds"],
    ["slo.errorRatePercent", form.errorRatePercent, "percent"],
    ["slo.availabilityPercent", form.availabilityPercent, "percent"],
  ];

  const answers = values
    .filter(([, value]) => value.trim() !== "")
    .map(([path, value, unit]) => ({
      path,
      value: toNumber(value) ?? value,
      unit,
      source: "user" as const,
      confidence: "medium" as const,
    }));

  const current = toNumber(form.currentCustomers);
  const sixMonths = toNumber(form.customersSixMonths);
  const twelveMonths = toNumber(form.customersTwelveMonths);
  const horizon = current !== undefined || sixMonths !== undefined || twelveMonths !== undefined
    ? { current, sixMonths, twelveMonths, unit: "registered_customers" }
    : undefined;

  const frequency = toNumber(form.journeyFrequency);
  const duration = toNumber(form.journeyDurationSeconds);
  const operationCount = toNumber(form.operationCount);
  const writePercent = toNumber(form.writePercent) ?? 0;
  const shareOfUsersPercent = toNumber(form.shareOfUsersPercent);
  const operations = operationCount !== undefined && operationCount > 0
    ? [
        ...(operationCount - Math.round(operationCount * writePercent / 100) > 0
          ? [{ name: "read_operations", count: operationCount - Math.round(operationCount * writePercent / 100), type: "read" as const }]
          : []),
        ...(Math.round(operationCount * writePercent / 100) > 0
          ? [{ name: "write_operations", count: Math.round(operationCount * writePercent / 100), type: "write" as const }]
          : []),
      ]
    : [];
  const journeys = form.journeyName.trim() !== "" && frequency !== undefined && frequency > 0 && duration !== undefined && duration > 0 && shareOfUsersPercent !== undefined && operations.length > 0
    ? [{
        id: form.journeyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "journey-1",
        name: form.journeyName.trim(),
        type: form.journeyType,
        priority: form.journeyPriority,
        shareOfUsersPercent,
        frequencyPerUserPerDay: frequency,
        averageDurationSeconds: duration,
        operations,
        slo: {
          latencyP95Ms: toNumber(form.latencyP95Ms),
          errorRatePercent: toNumber(form.errorRatePercent),
          availabilityPercent: toNumber(form.availabilityPercent),
        },
      }]
    : [];
  const references = form.referenceTitle.trim() !== "" && form.referenceUrl.trim() !== "" && form.referenceContext.trim() !== "" && form.referenceSupportedValue.trim() !== ""
    ? [{
        title: form.referenceTitle.trim(),
        url: form.referenceUrl.trim(),
        consultedAt: new Date().toISOString(),
        context: form.referenceContext.trim(),
        supportedValue: form.referenceSupportedValue.trim(),
      }]
    : [];

  return {
    schemaVersion: 1,
    analysisId,
    version,
    status: "draft",
    applicationType: form.applicationType,
    testObjectives: form.objectives,
    horizon,
    journeys,
    answers,
    references,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function formFromDraft(draft: AnalysisInput): IntakeForm {
  const answerMap = new Map(draft.answers.map((answer) => [answer.path, String(answer.value)]));
  const journey = draft.journeys?.[0];
  const reference = draft.references[0];
  return {
    ...initialForm,
    applicationType: draft.applicationType,
    objectives: draft.testObjectives,
    currentCustomers: draft.horizon?.current?.toString() ?? "",
    customersSixMonths: draft.horizon?.sixMonths?.toString() ?? "",
    customersTwelveMonths: draft.horizon?.twelveMonths?.toString() ?? "",
    dailyActiveUsers: answerMap.get("demand.dailyActiveUsers") ?? "",
    sessionsPerUserPerDay: answerMap.get("behavior.sessionsPerUserPerDay") ?? "",
    peakSharePercent: answerMap.get("behavior.peakSharePercent") ?? "",
    peakWindowMinutes: answerMap.get("behavior.peakWindowMinutes") ?? initialForm.peakWindowMinutes,
    stressMultiplier: answerMap.get("behavior.stressMultiplier") ?? initialForm.stressMultiplier,
    journeyName: answerMap.get("journey.name") ?? "",
    journeyType: journey?.type ?? (answerMap.get("journey.type") as JourneyType | undefined) ?? initialForm.journeyType,
    journeyPriority: (answerMap.get("journey.priority") as JourneyPriority | undefined) ?? initialForm.journeyPriority,
    shareOfUsersPercent: journey?.shareOfUsersPercent?.toString() ?? answerMap.get("journey.shareOfUsersPercent") ?? "",
    journeyFrequency: answerMap.get("journey.frequency") ?? "",
    journeyDurationSeconds: answerMap.get("journey.durationSeconds") ?? "",
    operationCount: journey?.operations.reduce((total, operation) => total + operation.count, 0).toString() ?? answerMap.get("journey.operationCount") ?? "",
    writePercent: journey?.operations.length
      ? ((journey.operations.filter((operation) => operation.type === "write").reduce((total, operation) => total + operation.count, 0) / journey.operations.reduce((total, operation) => total + operation.count, 0)) * 100).toString()
      : answerMap.get("journey.writePercent") ?? "",
    integrations: answerMap.get("integrations") ?? "",
    referenceTitle: reference?.title ?? "",
    referenceUrl: reference?.url ?? "",
    referenceContext: reference?.context ?? "",
    referenceSupportedValue: reference?.supportedValue ?? "",
    latencyP95Ms: answerMap.get("slo.latencyP95Ms") ?? initialForm.latencyP95Ms,
    errorRatePercent: answerMap.get("slo.errorRatePercent") ?? initialForm.errorRatePercent,
    availabilityPercent: answerMap.get("slo.availabilityPercent") ?? initialForm.availabilityPercent,
  };
}

export function AnalysisIntake({ onClose }: AnalysisIntakeProps): JSX.Element {
  const [analysisId] = useState(createAnalysisId);
  const [createdAt] = useState(() => new Date().toISOString());
  const [analysisVersion, setAnalysisVersion] = useState(1);
  const [form, setForm] = useState<IntakeForm>(initialForm);
  const [section, setSection] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Borrador local");
  const [demandValidation, setDemandValidation] = useState<DemandValidationResult | null>(null);
  const [journeyValidation, setJourneyValidation] = useState<BusinessJourneyValidationResult | null>(null);
  const [planStatus, setPlanStatus] = useState<"draft" | "approved">("draft");
  const [approvedContract, setApprovedContract] = useState<WorkloadContract | null>(null);

  const draft = useMemo(() => createDraft(form, analysisId, createdAt, analysisVersion), [analysisId, analysisVersion, createdAt, form]);
  const workload = useMemo(() => calculateWorkload(draft), [draft]);
  const evidence = useMemo(() => analyzeAnalysisEvidence(draft), [draft]);
  const testPlan = useMemo(() => generateTestPlan(draft), [draft]);

  useEffect(() => {
    let mounted = true;
    loadAnalysisDraft(analysisId)
      .then((saved) => {
        if (mounted && saved) setForm(formFromDraft(saved));
      })
      .catch(() => {
        if (mounted) setSaveState("No se pudo cargar el borrador");
      })
      .finally(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, [analysisId]);

  useEffect(() => {
    if (!isHydrated || planStatus === "approved") return;
    const timeoutId = window.setTimeout(() => {
      setSaveState("Guardando...");
      AnalysisPersistenceService.saveDraft(draft)
        .then(() => setSaveState("Borrador guardado"))
        .catch(() => setSaveState("No se pudo guardar el borrador"));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [draft, isHydrated, planStatus]);

  const update = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    if (planStatus === "approved") {
      setPlanStatus("draft");
      setApprovedContract(null);
      setAnalysisVersion((current) => current + 1);
      setSaveState("Nueva version en borrador");
    }
    setForm((current) => ({ ...current, [key]: value }));
  };

  const approvePlan = async () => {
    setSaveState("Aprobando contrato...");
    try {
      const contract = await createApprovedWorkloadContract(draft, testPlan);
      await AnalysisPersistenceService.saveApprovedContract(contract);
      setApprovedContract(contract);
      setPlanStatus("approved");
      setSaveState(`Contrato aprobado: ${contract.contractDigest.slice(0, 19)}...`);
    } catch {
      setSaveState("No se pudo aprobar el contrato");
    }
  };

  const downloadApprovedContract = () => {
    if (!approvedContract) return;
    downloadTextFile(serializeWorkloadContract(approvedContract), `workload-contract-${approvedContract.analysisId}-v${approvedContract.analysisVersion}.json`);
  };

  const toggleObjective = (objective: TestObjective) => {
    setForm((current) => ({
      ...current,
      objectives: current.objectives.includes(objective)
        ? current.objectives.filter((item) => item !== objective)
        : [...current.objectives, objective],
    }));
  };

  const nextSection = () => {
    if (section === 1) {
      const result = validateAnalysisDemand(draft);
      setDemandValidation(result);
      if (!result.valid) return;
    }
    if (section === 2 && draft.journeys && draft.journeys.length > 0) {
      const result = validateBusinessJourneys(draft.journeys);
      setJourneyValidation(result);
      if (!result.valid) return;
    }
    setSection((current) => current + 1);
  };

  const sections = ["Contexto", "Demanda", "Journey", "Evidencia", "SLO", "Revision"];

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="analysis-intake-title">
      <section className={styles.dialog}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>NUEVO ANALISIS</span>
            <h1 id="analysis-intake-title">Construye tu plan de performance</h1>
            <p>Responde estas preguntas para convertir tu contexto de negocio en una prueba medible.</p>
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Cerrar analisis">×</button>
        </header>

        <nav className={styles.steps} aria-label="Secciones del analisis">
          {sections.map((label, index) => (
            <button
              key={label}
              className={index === section ? styles.activeStep : styles.step}
              type="button"
              onClick={() => setSection(index)}
            >
              <span>{index + 1}</span>{label}
            </button>
          ))}
        </nav>

        <div className={styles.body}>
          {section === 0 && (
            <div className={styles.section}>
              <div className={styles.sectionIntro}>
                <span className={styles.kicker}>01 / CONTEXTO</span>
                <h2>Define el escenario</h2>
                <p>El tipo de aplicacion y el objetivo determinan las preguntas y pruebas que se propondran.</p>
              </div>
              <label className={styles.field}>Tipo de aplicacion
                <select value={form.applicationType} onChange={(event) => update("applicationType", event.target.value)}>
                  <option value="web">Aplicacion web</option>
                  <option value="api">API o servicio</option>
                  <option value="mobile-backend">Backend movil</option>
                  <option value="batch">Procesamiento batch</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <fieldset className={styles.fieldset}>
                <legend>Que quieres conocer?</legend>
                <div className={styles.checkGrid}>
                  {objectiveOptions.map((option) => (
                    <label className={styles.check} key={option.value}>
                      <input type="checkbox" checked={form.objectives.includes(option.value)} onChange={() => toggleObjective(option.value)} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {section === 1 && (
            <div className={styles.section}>
              <div className={styles.sectionIntro}>
                <span className={styles.kicker}>02 / DEMANDA</span>
                <h2>Cuantas personas esperas atender?</h2>
                <p>Los clientes registrados no equivalen automaticamente a usuarios activos. Capturamos ambos datos por separado.</p>
              </div>
              <div className={styles.grid}>
                <NumberField label="Clientes actuales" value={form.currentCustomers} onChange={(value) => update("currentCustomers", value)} />
                <NumberField label="Clientes en 6 meses" value={form.customersSixMonths} onChange={(value) => update("customersSixMonths", value)} />
                <NumberField label="Clientes en 12 meses" value={form.customersTwelveMonths} onChange={(value) => update("customersTwelveMonths", value)} />
                <NumberField label="Usuarios activos diarios" value={form.dailyActiveUsers} onChange={(value) => update("dailyActiveUsers", value)} />
                <NumberField label="Sesiones por usuario al dia" value={form.sessionsPerUserPerDay} onChange={(value) => update("sessionsPerUserPerDay", value)} step="0.1" />
                <NumberField label="Porcentaje de trafico pico" value={form.peakSharePercent} onChange={(value) => update("peakSharePercent", value)} suffix="%" step="0.1" />
                <NumberField label="Duracion de ventana pico" value={form.peakWindowMinutes} onChange={(value) => update("peakWindowMinutes", value)} suffix="min" />
                <NumberField label="Multiplicador de estres" value={form.stressMultiplier} onChange={(value) => update("stressMultiplier", value)} suffix="x" step="0.1" />
              </div>
              {demandValidation && demandValidation.errors.length > 0 && (
                <div className={styles.errorBox} role="alert">
                  <strong>Corrige estos valores antes de continuar:</strong>
                  <ul>{demandValidation.errors.map((item) => <li key={`${item.path}-${item.rule}`}>{item.message}</li>)}</ul>
                </div>
              )}
              {demandValidation && demandValidation.missingFields.length > 0 && (
                <div className={styles.warningBox} role="status">
                  <strong>Datos que faltan para calcular la carga:</strong>
                  <span>{demandValidation.missingFields.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {section === 2 && (
            <div className={styles.section}>
              <div className={styles.sectionIntro}>
                <span className={styles.kicker}>03 / JOURNEY</span>
                <h2>Describe una operacion importante</h2>
                <p>Un journey representa un flujo de negocio completo, no una sola request tecnica.</p>
              </div>
              <div className={styles.grid}>
                <label className={`${styles.field} ${styles.wide}`}>Nombre del journey
                  <input value={form.journeyName} onChange={(event) => update("journeyName", event.target.value)} placeholder="Ej. Checkout" />
                </label>
                <label className={styles.field}>Tipo de journey
                  <select value={form.journeyType} onChange={(event) => update("journeyType", event.target.value as JourneyType)}>
                    <option value="synchronous">Sincrono</option>
                    <option value="asynchronous">Asincrono</option>
                    <option value="batch">Batch</option>
                  </select>
                </label>
                <label className={styles.field}>Prioridad
                  <select value={form.journeyPriority} onChange={(event) => update("journeyPriority", event.target.value as JourneyPriority)}>
                    <option value="critical">Critica</option>
                    <option value="high">Alta</option>
                    <option value="normal">Normal</option>
                  </select>
                </label>
                <NumberField label="Porcentaje de usuarios" value={form.shareOfUsersPercent} onChange={(value) => update("shareOfUsersPercent", value)} suffix="%" step="0.1" />
                <NumberField label="Frecuencia por usuario al dia" value={form.journeyFrequency} onChange={(value) => update("journeyFrequency", value)} step="0.1" />
                <NumberField label="Duracion promedio" value={form.journeyDurationSeconds} onChange={(value) => update("journeyDurationSeconds", value)} suffix="seg" />
                <NumberField label="Operaciones por journey" value={form.operationCount} onChange={(value) => update("operationCount", value)} />
                <NumberField label="Operaciones de escritura" value={form.writePercent} onChange={(value) => update("writePercent", value)} suffix="%" />
                <label className={`${styles.field} ${styles.wide}`}>Integraciones externas
                  <textarea value={form.integrations} onChange={(event) => update("integrations", event.target.value)} placeholder="Pagos, correo, almacenamiento, APIs externas..." rows={3} />
                </label>
              </div>
              {journeyValidation && journeyValidation.errors.length > 0 && (
                <div className={styles.errorBox} role="alert">
                  <strong>Corrige estos datos del journey:</strong>
                  <ul>{journeyValidation.errors.map((item) => <li key={`${item.path}-${item.rule}`}>{item.message}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {section === 3 && (
            <div className={styles.section}>
              <div className={styles.sectionIntro}>
                <span className={styles.kicker}>04 / EVIDENCIA</span>
                <h2>Que respalda tus estimaciones?</h2>
                <p>Registra una fuente tecnica o academica para documentar rangos y supuestos del analisis.</p>
              </div>
              <div className={styles.grid}>
                <label className={`${styles.field} ${styles.wide}`}>Titulo de la referencia
                  <input value={form.referenceTitle} onChange={(event) => update("referenceTitle", event.target.value)} placeholder="Ej. Estudio de comportamiento de usuarios" />
                </label>
                <label className={`${styles.field} ${styles.wide}`}>URL
                  <input type="url" value={form.referenceUrl} onChange={(event) => update("referenceUrl", event.target.value)} placeholder="https://..." />
                </label>
                <label className={styles.field}>Contexto
                  <input value={form.referenceContext} onChange={(event) => update("referenceContext", event.target.value)} placeholder="Tipo de aplicacion o poblacion" />
                </label>
                <label className={styles.field}>Valor respaldado
                  <input value={form.referenceSupportedValue} onChange={(event) => update("referenceSupportedValue", event.target.value)} placeholder="Rango o supuesto" />
                </label>
              </div>
              {form.referenceTitle || form.referenceUrl || form.referenceContext || form.referenceSupportedValue ? (
                <div className={styles.warningBox} role="status">Completa todos los campos para guardar la referencia en el contrato.</div>
              ) : null}
            </div>
          )}

          {section === 4 && (
            <div className={styles.section}>
              <div className={styles.sectionIntro}>
                <span className={styles.kicker}>04 / CALIDAD</span>
                <h2>Cuando consideras que funciona bien?</h2>
                <p>Estos objetivos se usaran para aceptar o rechazar cada escenario de carga.</p>
              </div>
              <div className={styles.grid}>
                <NumberField label="Latencia p95 maxima" value={form.latencyP95Ms} onChange={(value) => update("latencyP95Ms", value)} suffix="ms" />
                <NumberField label="Tasa maxima de errores" value={form.errorRatePercent} onChange={(value) => update("errorRatePercent", value)} suffix="%" step="0.1" />
                <NumberField label="Disponibilidad esperada" value={form.availabilityPercent} onChange={(value) => update("availabilityPercent", value)} suffix="%" step="0.1" />
              </div>
              <div className={styles.note}><strong>Importante:</strong> los valores de esta pantalla son objetivos declarados. El benchmark posterior determinara si se cumplen.</div>
            </div>
          )}

          {section === 5 && (
            <div className={styles.section}>
              <div className={styles.sectionIntro}>
                <span className={styles.kicker}>05 / REVISION</span>
                <h2>Revisa antes de continuar</h2>
                <p>El borrador se guarda localmente. La siguiente etapa calculara la carga y propondra los stages.</p>
              </div>
              <div className={styles.reviewGrid}>
                <ReviewItem label="Aplicacion" value={form.applicationType} />
                <ReviewItem label="Objetivos" value={form.objectives.length ? form.objectives.join(", ") : "Sin definir"} />
                <ReviewItem label="Clientes en 6 meses" value={form.customersSixMonths || "Sin definir"} />
                <ReviewItem label="Usuarios activos diarios" value={form.dailyActiveUsers || "Sin definir"} />
                <ReviewItem label="Journey principal" value={form.journeyName || "Sin definir"} />
                <ReviewItem label="Latencia p95" value={`${form.latencyP95Ms || "Sin definir"} ms`} />
              </div>
              <div className={styles.workloadCard}>
                <div>
                  <span className={styles.kicker}>MODELO INICIAL</span>
                  <h3>Escenarios calculados</h3>
                </div>
                {workload.scenarios.length > 0 ? (
                  <div className={styles.scenarioList}>
                    {workload.scenarios.map((scenario) => (
                      <div className={styles.scenario} key={scenario.id}>
                        <span>{scenario.type}</span>
                        <strong>{scenario.targetRate.toFixed(2)} iter/s</strong>
                        <small>{scenario.requestRate.toFixed(2)} req/s · {scenario.concurrency.toFixed(1)} concurrentes</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.missingWorkload}>Faltan datos para calcular escenarios.</p>
                )}
                {workload.missingData.length > 0 && <small className={styles.missingWorkload}>Faltan: {workload.missingData.join(", ")}</small>}
              </div>
              <div className={styles.evidenceSummary}>
                <span className={styles.kicker}>CONFIANZA DEL MODELO</span>
                <strong>{evidence.confidence}</strong>
                <small>{evidence.assumptions.length} supuesto(s) registrado(s) · {draft.references.length} referencia(s)</small>
                {evidence.contradictions.length > 0 && <small className={styles.errorText}>Contradicciones: {evidence.contradictions.join(", ")}</small>}
              </div>
              <div className={styles.planCard}>
                <div className={styles.planHeader}>
                  <div>
                    <span className={styles.kicker}>PLAN CAPACITY-STEPPED</span>
                    <h3>Stages propuestos</h3>
                  </div>
                  <span className={testPlan.canApprove ? styles.planReady : styles.planBlocked}>{planStatus === "approved" ? "Aprobado" : testPlan.canApprove ? "Listo para revisar" : "Bloqueado"}</span>
                </div>
                {testPlan.stages.length > 0 ? (
                  <div className={styles.stageList}>
                    {testPlan.stages.map((stage) => <div className={styles.stageRow} key={stage.id}><span>{stage.type}</span><strong>{stage.targetRate.toFixed(2)} iter/s</strong><small>{stage.duration}</small></div>)}
                  </div>
                ) : <p className={styles.missingWorkload}>No hay stages hasta completar los datos minimos.</p>}
                {testPlan.acceptanceCriteria.length > 0 && <div className={styles.criteria}><strong>Criterios:</strong>{testPlan.acceptanceCriteria.map((criteria) => <span key={criteria}>{criteria}</span>)}</div>}
                {testPlan.assumptions.length > 0 && <div className={testPlan.confidence === "high" ? styles.assumptionBox : styles.warningBox}><strong>Supuestos ({testPlan.confidence}):</strong><span>{testPlan.assumptions.join(" ")}</span></div>}
                {testPlan.missingData.length > 0 && <div className={styles.warningBox}><strong>Faltan datos para aprobar:</strong><span>{testPlan.missingData.join(", ")}</span></div>}
                <div className={styles.planActions}>
                  <button className={styles.primary} type="button" disabled={!testPlan.canApprove || planStatus === "approved"} onClick={() => void approvePlan()}>Aprobar y congelar contrato</button>
                  {approvedContract && <button className={styles.secondary} type="button" onClick={downloadApprovedContract}>Descargar contrato</button>}
                </div>
              </div>
              <div className={styles.note}><strong>Estado:</strong> {saveState}. La aprobacion congela esta version; cualquier cambio crea una nueva version en borrador.</div>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <span className={styles.saveStatus} aria-live="polite">{saveState}</span>
          <div className={styles.actions}>
            <button className={styles.secondary} type="button" onClick={onClose}>Cerrar</button>
            <button className={styles.secondary} type="button" disabled={section === 0} onClick={() => setSection((current) => current - 1)}>Anterior</button>
            {section < sections.length - 1 && <button className={styles.primary} type="button" onClick={nextSection}>Continuar</button>}
          </div>
        </footer>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, step = "1" }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; step?: string }): JSX.Element {
  return (
    <label className={styles.field}>{label}
      <span className={styles.inputWithSuffix}>
        <input aria-label={label} type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }): JSX.Element {
  return <div className={styles.reviewItem}><span>{label}</span><strong>{value}</strong></div>;
}
