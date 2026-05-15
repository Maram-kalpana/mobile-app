import api from "./axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// GET MATERIAL REPORT
export const getMaterialReport = (data) => {
  return api.post("/manager/stock/material-report", data);
};

export const addMaterialConsumption = (data) => {
  return api.post("/manager/stock/material-consumptions/add", data);
};

export const getMaterialConsumptions = (params) => {
  return api.get("/manager/stock/material-consumptions", {
    params,
  });
};

// ─── STOCK REPORT ────────────────────────────────────────────────

// STOCK REPORT LIST (optional ?date= query)
export const getStockReportList = (params) => {
  return api.get("/manager/stock-report/stock-report-list", { params: params || undefined });
};

// STOCK REPORT DETAILS
export const getStockReportDetails = (id) => {
  return api.get(`/manager/stock-report/stock-report-details/${id}`);
};

// UPDATE STOCK REPORT
export const updateStockReport = (id, data) => {
  return api.post(`/manager/stock-report/update-stock-report/${id}`, data);
};

// DELETE STOCK REPORT — sends remark as BOTH query param AND body
// to maximize compatibility with how Laravel reads input for DELETE
// requests. $request->input('remark') reads from query params AND body.
export const deleteStockReport = (id, remark) => {
  return api.delete(
    `/manager/stock-report/delete-stock-report/${id}?remarks=${encodeURIComponent(remark)}`
  );
};

// ADD STOCK REPORT
export const addStockReport = (data) => {
  return api.post("/manager/stock-report/add-stock-report", data);
};