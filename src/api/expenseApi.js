import api from "./axios";

// ─── MANAGER EXPENSES (manager-expenses) ────────────────────────

// DASHBOARD (by project id)
// GET /manager/manager-expenses/dashboard/{project_id}
export const getManagerExpenseDashboard = (projectId) => {
  return api.get(`/manager/manager-expenses/dashboard/${projectId}`);
};

// EXPENSE LIST (by project id)
// GET /manager/manager-expenses/expense-list/{project_id}
export const getManagerExpenseList = (projectId) => {
  return api.get(`/manager/manager-expenses/expense-list/${projectId}`);
};

// EXPENSE DETAILS (by expense id)
// GET /manager/manager-expenses/expense-details/{id}
export const getManagerExpenseDetails = (expenseId) => {
  return api.get(`/manager/manager-expenses/expense-details/${expenseId}`);
};

// ADD MANAGER EXPENSE
// POST /manager/manager-expenses/add-expense
// Body: { project_id, expense_type, party_id, amount, date, remarks }
export const addManagerExpense = (data) => {
  return api.post("/manager/manager-expenses/add-expense", data);
};

// ─── EXPENSES (legacy /expenses) ────────────────────────────────

// GET /manager/expenses
export const getAllExpenses = () => {
  return api.get("/manager/expenses");
};

// GET /manager/expenses/show/{id}
export const getExpenseDetails = (id) => {
  return api.get(`/manager/expenses/show/${id}`);
};

// POST /manager/expenses/add
// Body: { project_id, type, vendor_id, labour_id, item_id, sector, amount, description, expense_date }
export const addExpenseApi = (data) => {
  return api.post("/manager/expenses/add", data);
};