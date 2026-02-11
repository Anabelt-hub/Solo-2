"use strict";

/**
 * Solo Project 2 (Step 1 update)
 * ✅ Browser no longer owns data (no localStorage)
 * ✅ All CRUD goes through backend via fetch()
 *
 * NOTE: Update API_BASE to your backend URL.
 * - Local dev (Flask): http://localhost:5000
 * - Deployed backend:  https://your-backend-host.com
 */
const API_BASE = "http://localhost:5000";

const el = (id) => document.getElementById(id);

// Tabs / views
const tabList = el("tabList");
const tabForm = el("tabForm");
const tabStats = el("tabStats");

const viewList = el("viewList");
const viewForm = el("viewForm");
const viewStats = el("viewStats");

// List controls
const recordsTbody = el("recordsTbody");
const searchInput = el("searchInput");
const statusFilter = el("statusFilter");
const newBtn = el("newBtn");

// Form controls
const recordForm = el("recordForm");
const formTitle = el("formTitle");
const recordId = el("recordId");
const titleInput = el("title");
const typeInput = el("type");
const genreInput = el("genre");
const yearInput = el("year");
const ratingInput = el("rating");
const statusInput = el("status");
const notesInput = el("notes");
const cancelBtn = el("cancelBtn");
const deleteBtn = el("deleteBtn");
const formError = el("formError");

// Stats controls
const statTotal = el("statTotal");
const statCompleted = el("statCompleted");
const statAvgRating = el("statAvgRating");
const statTopGenre = el("statTopGenre");
const statusBreakdown = el("statusBreakdown");

// In-memory data (now populated from server)
let records = [];

/* --------------------------- API Helpers --------------------------- */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const message = data && typeof data === "object" && data.error ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// Basic CRUD endpoints (you will implement these on the backend)
async function apiGetRecords() {
  // If your backend returns { items: [...] }, we handle that in refreshFromServer()
  return apiFetch("/api/records", { method: "GET" });
}

async function apiCreateRecord(record) {
  return apiFetch("/api/records", { method: "POST", body: JSON.stringify(record) });
}

async function apiUpdateRecord(id, record) {
  return apiFetch(`/api/records/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(record) });
}

async function apiDeleteRecord(id) {
  return apiFetch(`/api/records/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// Load latest dataset from server and re-render
async function refreshFromServer() {
  const data = await apiGetRecords();
  records = Array.isArray(data) ? data : (data?.items || []);
  renderList(); // keeps list + stats synced
}

/* --------------------------- View helpers --------------------------- */
function setActiveTab(active) {
  for (const t of [tabList, tabForm, tabStats]) t.classList.remove("active");
  active.classList.add("active");
}

function showView(which) {
  viewList.classList.add("hidden");
  viewForm.classList.add("hidden");
  viewStats.classList.add("hidden");
  which.classList.remove("hidden");
}

/* --------------------------- Validation --------------------------- */
function validateFormData(data) {
  const errs = [];

  if (!data.title || data.title.trim().length === 0) errs.push("Title is required.");
  if (!data.type) errs.push("Type is required.");
  if (!data.genre || data.genre.trim().length === 0) errs.push("Genre is required.");

  if (!Number.isInteger(data.year)) errs.push("Year must be a whole number.");
  if (data.year < 1900 || data.year > 2100) errs.push("Year must be between 1900 and 2100.");

  if (!data.status) errs.push("Status is required.");

  if (data.rating !== null) {
    if (!Number.isInteger(data.rating)) errs.push("Rating must be a whole number.");
    if (data.rating < 1 || data.rating > 10) errs.push("Rating must be between 1 and 10.");
  }

  return errs;
}

/* --------------------------- Rendering --------------------------- */
function getFilteredRecords() {
  const q = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  return records.filter((r) => {
    const matchesText = (r.title || "").toLowerCase().includes(q);
    const matchesStatus = status === "ALL" ? true : r.status === status;
    return matchesText && matchesStatus;
  });
}

function renderList() {
  const filtered = getFilteredRecords();

  recordsTbody.innerHTML = "";
  for (const r of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.title)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(r.genre)}</td>
      <td>${r.year}</td>
      <td>${r.rating ?? "—"}</td>
      <td>${escapeHtml(r.status)}</td>
      <td class="right">
        <button data-action="edit" data-id="${r.id}">Edit</button>
        <button data-action="delete" data-id="${r.id}" class="danger">Delete</button>
      </td>
    `;
    recordsTbody.appendChild(tr);
  }

  renderStats(); // keep stats accurate even when user stays on list
}

function renderStats() {
  statTotal.textContent = String(records.length);

  const completed = records.filter((r) => r.status === "Completed");
  statCompleted.textContent = String(completed.length);

  const completedWithRating = completed.filter((r) => Number.isInteger(r.rating));
  if (completedWithRating.length === 0) {
    statAvgRating.textContent = "—";
  } else {
    const avg = completedWithRating.reduce((sum, r) => sum + r.rating, 0) / completedWithRating.length;
    statAvgRating.textContent = avg.toFixed(1);
  }

  const genreCounts = new Map();
  for (const r of records) {
    const g = String(r.genre || "").trim();
    if (!g) continue;
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
  }
  let topGenre = "—";
  let topCount = 0;
  for (const [g, c] of genreCounts.entries()) {
    if (c > topCount) {
      topCount = c;
      topGenre = g;
    }
  }
  statTopGenre.textContent = topGenre;

  const statuses = ["Planned", "Watching", "Completed", "Dropped"];
  statusBreakdown.innerHTML = "";
  for (const s of statuses) {
    const count = records.filter((r) => r.status === s).length;
    const li = document.createElement("li");
    li.textContent = `${s}: ${count}`;
    statusBreakdown.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* --------------------------- Form helpers --------------------------- */
function clearForm() {
  recordId.value = "";
  titleInput.value = "";
  typeInput.value = "";
  genreInput.value = "";
  yearInput.value = "";
  ratingInput.value = "";
  statusInput.value = "";
  notesInput.value = "";
  formError.classList.add("hidden");
  formError.textContent = "";
  deleteBtn.classList.add("hidden");
  formTitle.textContent = "Add Record";
}

function fillForm(r) {
  recordId.value = r.id;
  titleInput.value = r.title;
  typeInput.value = r.type;
  genreInput.value = r.genre;
  yearInput.value = r.year;
  ratingInput.value = r.rating ?? "";
  statusInput.value = r.status;
  notesInput.value = r.notes ?? "";
  deleteBtn.classList.remove("hidden");
  formTitle.textContent = "Edit Record";
}

/* --------------------------- Navigation --------------------------- */
function goList() {
  setActiveTab(tabList);
  showView(viewList);
  renderList();
}

function goForm() {
  setActiveTab(tabForm);
  showView(viewForm);
}

function goStats() {
  setActiveTab(tabStats);
  showView(viewStats);
  renderStats();
}

/* --------------------------- Events --------------------------- */
tabList.addEventListener("click", goList);

tabForm.addEventListener("click", () => {
  clearForm();
  goForm();
});

tabStats.addEventListener("click", goStats);

newBtn.addEventListener("click", () => {
  clearForm();
  goForm();
});

searchInput.addEventListener("input", renderList);
statusFilter.addEventListener("change", renderList);

recordsTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const rec = records.find((r) => r.id === id);

  if (action === "edit" && rec) {
    fillForm(rec);
    goForm();
  }

  if (action === "delete" && rec) {
    const ok = confirm(`Delete "${rec.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await apiDeleteRecord(id);
      await refreshFromServer();
    } catch (err) {
      alert(err.message);
    }
  }
});

recordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    title: titleInput.value.trim(),
    type: typeInput.value,
    genre: genreInput.value.trim(),
    year: Number.parseInt(yearInput.value, 10),
    rating: ratingInput.value.trim() === "" ? null : Number.parseInt(ratingInput.value, 10),
    status: statusInput.value,
    notes: notesInput.value.trim(),
  };

  // Client-side validation (server still validates too)
  const errs = validateFormData(data);
  if (errs.length > 0) {
    formError.textContent = errs.join(" ");
    formError.classList.remove("hidden");
    return;
  }

  const id = recordId.value;

  try {
    if (id) {
      await apiUpdateRecord(id, data);
    } else {
      await apiCreateRecord(data);
    }

    // Re-pull data from server and go back to list
    await refreshFromServer();
    goList();
  } catch (err) {
    // Show server-side validation message (or general error)
    formError.textContent = err.message;
    formError.classList.remove("hidden");
  }
});

cancelBtn.addEventListener("click", goList);

deleteBtn.addEventListener("click", async () => {
  const id = recordId.value;
  if (!id) return;

  const rec = records.find((r) => r.id === id);
  const ok = confirm(`Delete "${rec?.title ?? "this record"}"? This cannot be undone.`);
  if (!ok) return;

  try {
    await apiDeleteRecord(id);
    await refreshFromServer();
    goList();
  } catch (err) {
    alert(err.message);
  }
});

/* --------------------------- Init --------------------------- */
async function init() {
  try {
    await refreshFromServer();
    goList();
  } catch (err) {
    console.error(err);
    alert(
      `Could not load records from server.\n\n` +
      `Make sure your backend is running and API_BASE is correct.\n\n` +
      `Error: ${err.message}`
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
