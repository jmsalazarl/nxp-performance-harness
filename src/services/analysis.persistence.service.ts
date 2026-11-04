import type { AnalysisInput } from "../models/analysis.types";
import type { WorkloadContract } from "../models/workloadContract.types";
import { validateAnalysisInput } from "./validateAnalysis";

const DB_NAME = "nxp-performance-analysis";
const DB_VERSION = 2;
const STORE_NAME = "analysis_drafts";
const CONTRACT_STORE_NAME = "approved_contracts";

const isAvailable = (): boolean =>
  typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";

const openDatabase = (): Promise<IDBDatabase> => {
  if (!isAvailable()) {
    return Promise.reject(new Error("IndexedDB no esta disponible"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
      if (!database.objectStoreNames.contains(CONTRACT_STORE_NAME)) {
        database.createObjectStore(CONTRACT_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
  });
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Fallo la operacion de IndexedDB"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Fallo la transaccion de IndexedDB"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Se aborto la transaccion de IndexedDB"));
    };
  });
};

export const isAnalysisPersistenceAvailable = isAvailable;

export async function loadAnalysisDraft(analysisId: string): Promise<AnalysisInput | null> {
  if (!isAvailable()) return null;

  const draft = await withStore<AnalysisInput | undefined>("readonly", (store) => store.get(analysisId));
  if (!draft || !validateAnalysisInput(draft).valid) return null;
  return draft;
}

export async function saveAnalysisDraft(draft: AnalysisInput): Promise<void> {
  const validation = validateAnalysisInput(draft);
  if (!validation.valid) {
    throw new Error("No se puede guardar un analisis invalido");
  }
  if (!isAvailable()) return;

  await withStore<IDBValidKey>("readwrite", (store) => store.put(draft, draft.analysisId));
}

export async function saveApprovedWorkloadContract(contract: WorkloadContract): Promise<void> {
  if (!isAvailable()) return;
  const key = `${contract.analysisId}:v${contract.analysisVersion}`;
  await withStoreInStore<IDBValidKey>(CONTRACT_STORE_NAME, "readwrite", (store) => store.put(contract, key));
}

export async function loadApprovedWorkloadContract(analysisId: string, version: number): Promise<WorkloadContract | null> {
  if (!isAvailable()) return null;
  const key = `${analysisId}:v${version}`;
  return (await withStoreInStore<WorkloadContract | undefined>(CONTRACT_STORE_NAME, "readonly", (store) => store.get(key))) ?? null;
}

export async function listApprovedWorkloadContracts(analysisId: string): Promise<WorkloadContract[]> {
  if (!isAvailable()) return [];
  const contracts = await withStoreInStore<WorkloadContract[]>(CONTRACT_STORE_NAME, "readonly", (store) => store.getAll());
  return contracts.filter((contract) => contract.analysisId === analysisId).sort((left, right) => left.analysisVersion - right.analysisVersion);
}

export async function getWorkloadContractLifecycleStatus(contract: WorkloadContract): Promise<"approved" | "obsolete"> {
  const contracts = await listApprovedWorkloadContracts(contract.analysisId);
  const latestVersion = contracts.reduce((latest, item) => Math.max(latest, item.analysisVersion), contract.analysisVersion);
  return contract.analysisVersion < latestVersion ? "obsolete" : "approved";
}

function withStoreInStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Fallo la operacion de IndexedDB"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Fallo la transaccion de IndexedDB"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Se aborto la transaccion de IndexedDB"));
    };
  }));
}

export const AnalysisPersistenceService = {
  isAvailable: isAnalysisPersistenceAvailable,
  loadDraft: loadAnalysisDraft,
  saveDraft: saveAnalysisDraft,
  saveApprovedContract: saveApprovedWorkloadContract,
  loadApprovedContract: loadApprovedWorkloadContract,
  listApprovedContracts: listApprovedWorkloadContracts,
  getContractLifecycleStatus: getWorkloadContractLifecycleStatus,
};
