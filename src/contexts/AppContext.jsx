import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getVendorsByType,
  addVendorApi,
  updateVendorApi,
  deleteVendorApi,
} from "../api/vendorApi";
import { sameScopedProject } from "../utils/labourProjectScope";
import { useAuth } from "./AuthContext";

/* -------------------- HELPERS -------------------- */

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function dateKey(d = new Date()) {
  // Use LOCAL date (getFullYear / getMonth / getDate) to avoid UTC offset shift.
  // e.g. India is UTC+5:30, so midnight IST is 6:30PM previous day UTC.
  // .toISOString() would return the wrong date during evening hours.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bundleKey(projectId, day) {
  return `${projectId}_${day}`;
}

/* -------------------- CONTEXT -------------------- */

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user, isRestoring } = useAuth();
  const [projects] = useState([
    { id: 'p-001', name: 'Green Valley Apartments', location: 'Sector 14', status: 'Active' },
  ]);

  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState({});
  const [stockData, setStockData] = useState([]);
  // ── Local budget state (no API endpoint for setting total amount) ──
  const [budgetData, setBudgetData] = useState({});

  /** Local labour work log lines keyed by date + vendor (shown on daily labour report cards). */
  const [labourWorkEntries, setLabourWorkEntries] = useState([]);

  const addLabourWorkEntry = useCallback((entry) => {
    const projectIdNorm =
      entry.projectId != null && entry.projectId !== ''
        ? String(entry.projectId)
        : undefined;
    setLabourWorkEntries((prev) => [
      ...prev,
      {
        id: makeId('lwork'),
        createdAt: Date.now(),
        ...entry,
        projectId: projectIdNorm,
      },
    ]);
  }, []);

  const updateLabourWorkEntry = useCallback((id, patch) => {
    if (!id) return;
    const next = { ...patch };
    if (next.projectId != null && next.projectId !== '') {
      next.projectId = String(next.projectId);
    }
    setLabourWorkEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...next } : e))
    );
  }, []);

  const removeLabourWorkEntriesForVendorDate = useCallback((date, vendorId, projectId) => {
    setLabourWorkEntries((prev) =>
      prev.filter(
        (e) =>
          !(
            e.date === date &&
            String(e.vendorId) === String(vendorId) &&
            sameScopedProject(e.projectId, projectId)
          )
      )
    );
  }, []);

  /* -------------------- FETCH VENDORS -------------------- */

  const fetchVendors = async () => {
    try {
      const res = await getVendorsByType();
      console.log("VENDOR API FULL RESPONSE:", JSON.stringify(res?.data, null, 2));
      const raw = res?.data?.data ?? res?.data ?? [];
      const data = Array.isArray(raw) ? raw : [];

      if (data.length === 0) {
        console.warn("VENDOR WARNING: API returned empty array. Check backend /manager/vendors-by-type");
      }

      setVendors(
        data.map((v) => ({
          id: v.id,
          name: v.name || 'Vendor',
          vendorType: String(v.vendor_type || v.type || v.category || '').trim(),
        }))
      );
    } catch (err) {
      console.log("VENDOR FETCH ERROR:", err?.response?.data || err?.message || err);
      // Keep vendors as empty array on error
      setVendors([]);
    }
  };

  // Re-fetch vendors whenever auth state changes (login, restore, logout)
  useEffect(() => {
    if (!isRestoring && user) {
      fetchVendors();
    }
  }, [user, isRestoring]);

  /* -------------------- SAVE / DELETE VENDORS -------------------- */

  const saveVendor = useCallback(async (vendorData) => {
    try {
      const { id, name, phone, category } = vendorData;
      if (id) {
        // UPDATE existing vendor
        const res = await updateVendorApi(id, { name, phone, category });
        console.log("VENDOR UPDATE RESPONSE:", JSON.stringify(res?.data, null, 2));
        setVendors((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, name, phone, category, vendorType: category || v.vendorType } : v
          )
        );
      } else {
        // ADD new vendor
        const res = await addVendorApi({ name, phone, category });
        console.log("VENDOR ADD RESPONSE:", JSON.stringify(res?.data, null, 2));
        const newVendor = res?.data?.data ?? res?.data;
        if (newVendor?.id) {
          setVendors((prev) => [
            ...prev,
            {
              id: newVendor.id,
              name: newVendor.name || name,
              vendorType: String(newVendor.vendor_type || newVendor.type || category || '').trim(),
            },
          ]);
        } else {
          // Fallback: re-fetch all vendors
          await fetchVendors();
        }
      }
    } catch (err) {
      console.log("VENDOR SAVE ERROR:", err?.response?.data || err?.message || err);
      throw err;
    }
  }, []);

  const deleteVendor = useCallback(async (id) => {
    try {
      await deleteVendorApi(id);
      setVendors((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.log("VENDOR DELETE ERROR:", err?.response?.data || err?.message || err);
      throw err;
    }
  }, []);

  /* -------------------- MATERIALS -------------------- */

  const getDailyBundle = useCallback((projectId, day) => {
    return materials[bundleKey(projectId, day)] || {
      materialsIn: [],
      materialsOut: [],
    };
  }, [materials]);

  const addMaterialEntry = useCallback((projectId, payload, day) => {
    const key = bundleKey(projectId, day);

    const existing = materials[key] || {
      materialsIn: [],
      materialsOut: [],
    };

    const listKey = payload.direction === 'out' ? 'materialsOut' : 'materialsIn';

    const updatedList = payload.id
      ? existing[listKey].map((e) =>
          e.id === payload.id ? { ...e, ...payload } : e
        )
      : [...existing[listKey], { ...payload, id: makeId('mat') }];

    const next = {
      ...materials,
      [key]: {
        ...existing,
        [listKey]: updatedList,
      },
    };

    setMaterials(next);
  }, [materials]);

  const deleteMaterialEntry = useCallback((projectId, id, direction, day) => {
    const key = bundleKey(projectId, day);
    const existing = materials[key];

    if (!existing) return;

    const listKey = direction === 'out' ? 'materialsOut' : 'materialsIn';

    const next = {
      ...materials,
      [key]: {
        ...existing,
        [listKey]: existing[listKey].filter((e) => e.id !== id),
      },
    };

    setMaterials(next);
  }, [materials]);

  const materialItemOptions = useCallback(() => {
    const all = Object.values(materials)
      .flatMap((b) => [...(b.materialsIn || []), ...(b.materialsOut || [])])
      .map((e) => e.itemName);

    return [...new Set(all)];
  }, [materials]);

  /* -------------------- STOCK -------------------- */

const addStockEntry = useCallback((payload) => {
  setStockData((prev) => {
    // ✅ EDIT
    if (payload.id) {
      return prev.map((item) =>
        item.id === payload.id ? { ...item, ...payload } : item
      );
    }

    // ✅ NEW
    return [
      ...prev,
      {
        id: makeId('stock'),
        ...payload,
      },
    ];
  });
}, []);

const deleteStockEntry = useCallback((id) => {
  setStockData((prev) => prev.filter((item) => item.id !== id));
}, []);

const getStockByProject = useCallback((projectId) => {
  if (projectId == null) return [];
  return stockData.filter((s) => String(s.projectId) === String(projectId));
}, [stockData]);
/* -------------------- BUDGET (local allocated amount — no API endpoint) -------------------- */

const setTotalAmount = useCallback((projectId, totalAmount) => {
  const n = Number(totalAmount);
  const amt = Number.isFinite(n) && n >= 0 ? n : 0;
  setBudgetData((prev) => ({
    ...prev,
    [projectId]: {
      totalAmount: amt,
    },
  }));
}, []);

const getBudget = useCallback((projectId) => {
  return budgetData[projectId]?.totalAmount ?? 0;
}, [budgetData]);

  /* -------------------- CONTEXT VALUE -------------------- */

  const value = useMemo(() => ({
  projects,
  vendors,

  // VENDORS
  saveVendor,
  deleteVendor,

  // MATERIALS
  getDailyBundle,
  addMaterialEntry,
  deleteMaterialEntry,
  materialItemOptions,

  // STOCK
  addStockEntry,
  deleteStockEntry,   // ✅ ADD THIS (missing)
  getStockByProject,

  // BUDGET (local allocated amount)
  getBudget,
  setTotalAmount,

  labourWorkEntries,
  addLabourWorkEntry,
  updateLabourWorkEntry,
  removeLabourWorkEntriesForVendorDate,

  dateKey,
}), [
  projects,
  vendors,
  saveVendor,
  deleteVendor,
  materials,
  stockData,
  labourWorkEntries,
  addLabourWorkEntry,
  updateLabourWorkEntry,
  removeLabourWorkEntriesForVendorDate,
  addStockEntry,
  deleteStockEntry,
  getStockByProject,
  budgetData,
  setTotalAmount,
]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* -------------------- HOOK -------------------- */

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}