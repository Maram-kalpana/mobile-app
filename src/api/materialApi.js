import api from "./axios";

// GET LIST
export const getMaterialEntries = (params) => {
  return api.get("/manager/material-entries", { params });
};

// ADD
export const addMaterialEntryApi = (data) => {
  return api.post("/manager/material-entries/add", data);
};

// UPDATE
export const updateMaterialEntryApi = (id, data) => {
  return api.post(`/manager/material-entries/update/${id}`, data);
};

// DELETE
// DELETE
export const deleteMaterialEntryApi = (id, payload) => {
  return api.delete(`/manager/material-entries/delete/${id}`, {
    data: payload,
  });
};

// ITEMS BY VENDOR
export const getMaterialsByVendor = (vendorId) => {
  return api.get(`/manager/material-entries/materials-by-vendor`, {
    params: { vendor_id: vendorId },
  });
};