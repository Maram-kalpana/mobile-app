import api from "./axios";

// ─── LABOUR CRUD ────────────────────────────────────────────────

// GET LIST — supports ?date=YYYY-MM-DD, ?attendance=present|absent, ?project_id=X
export const getLabours = (params) => {
  console.log(
    "[labourApi] getLabours params:",
    JSON.stringify(params)
  );

  return api.get("/manager/labours/list", {
    params,
  });
};

// ADD
export const addLabour = (data) => {
  console.log("[labourApi] addLabour payload:", JSON.stringify(data));
  return api.post("/manager/labours/add", data);
};

// SHOW
export const getLabourById = (id) => {
  return api.get(`/manager/labours/show/${id}`);
};

// UPDATE
export const updateLabour = (id, data) => {
  console.log(`[labourApi] updateLabour(${id}):`, JSON.stringify(data));
  return api.post(`/manager/labours/update/${id}`, data);
};

// DELETE
export const deleteLabour = (id, reason) => {
  console.log(`[labourApi] deleteLabour(${id})`, reason);
  return api.delete(`/manager/labours/delete/${id}`, { data: { reason } });
};
// ─── WORK ENTRIES ────────────────────────────────────────────────

// ADD WORK
export const addWork = (data) => {
  console.log("[labourApi] addWork payload:", JSON.stringify(data));
  return api.post("/manager/labours/add-work", data);
};

// UPDATE WORK (by work_group_id)
export const updateWork = (workGroupId, data) => {
  console.log(`[labourApi] updateWork(${workGroupId}):`, JSON.stringify(data));
  return api.post(`/manager/labours/update-work/${workGroupId}`, data);
};

// WORK LIST (optional ?date= query)
export const getWorkList = (params) => {
  console.log("[labourApi] getWorkList params:", JSON.stringify(params));
  return api.get("/manager/labours/work-list", { params: params || undefined });
};

// WORK DETAILS
export const getWorkDetails = (id) => {
  console.log(`[labourApi] getWorkDetails(${id})`);
  return api.get(`/manager/labours/work-details/${id}`);
};