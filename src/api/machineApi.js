import api from "./axios";

// 🔥 GET LIST (REAL DATA)
export const getEquipmentEntries = (params) =>
  api.get("/manager/equipment-entries", { params });

// 🔥 SINGLE ENTRY (edit form)
export const getMachineById = (id) =>
  api.get(`/manager/equipment-entries/show/${id}`);

// 🔥 ADD ENTRY
export const addMachine = (data) =>
  api.post("/manager/equipment-entries/add", data);

// 🔥 UPDATE ENTRY
export const updateMachine = (id, data) =>
  api.post(`/manager/equipment-entries/update/${id}`, data);

// 🔥 DELETE ENTRY
export const deleteMachine = (id, payload) =>
  api.delete(`/manager/equipment-entries/delete/${id}`, {
    data: payload ?? {},
  });

export const getMachines = () => {
  return api.get('/manager/get-machinery');
};