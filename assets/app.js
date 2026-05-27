import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const THEME_KEY = "app-ponto-theme";
const LOCAL_DB_KEY = "app-ponto-local-db-v1";
const LOCAL_SESSION_KEY = "app-ponto-local-session";
const REMEMBER_KEY = "app-ponto-remember-login";
const LOGIN_FILE = "logins/logins.txt";
const DEFAULT_SETTINGS = {
  workDays: [1, 2, 3, 4, 5],
  start: "08:00",
  end: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:30",
};

const firebaseConfig = {
  apiKey: "AIzaSyBxG9GNxfJxWiw8hpreTeShrG009svRmPI",
  authDomain: "artesynal-os-system.firebaseapp.com",
  projectId: "artesynal-os-system",
  storageBucket: "artesynal-os-system.firebasestorage.app",
  messagingSenderId: "539958005846",
  appId: "1:539958005846:web:9120505e097b56bf16ebf7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  profile: null,
  route: "point",
  employees: [],
  punches: [],
  holidays: [],
  settings: { ...DEFAULT_SETTINGS },
  unsubscribes: [],
  localAuth: false,
  localUsers: [],
  pendingPunchAction: null,
  pendingLocation: null,
};

const elements = {
  currentDate: document.querySelector("#current-date"),
  currentTime: document.querySelector("#current-time"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeLabel: document.querySelector("#theme-label"),
  themeIcon: document.querySelector(".theme-icon"),
  loginView: document.querySelector("#login-view"),
  appView: document.querySelector("#app-view"),
  loginForm: document.querySelector("#login-form"),
  loginEmail: document.querySelector("#login-email"),
  loginPassword: document.querySelector("#login-password"),
  rememberLogin: document.querySelector("#remember-login"),
  loginMessage: document.querySelector("#login-message"),
  sessionName: document.querySelector("#session-name"),
  sessionRole: document.querySelector("#session-role"),
  coordinatorRoute: document.querySelector("#coordinator-route"),
  routeButtons: document.querySelectorAll("[data-route]"),
  logoutButton: document.querySelector("#logout-button"),
  pointView: document.querySelector("#point-view"),
  adminView: document.querySelector("#admin-view"),
  selectedEmployee: document.querySelector("#selected-employee"),
  selectedStatus: document.querySelector("#selected-status"),
  actionButtons: document.querySelectorAll("[data-action]"),
  summaryEntrada: document.querySelector("#summary-entrada"),
  summaryPausa: document.querySelector("#summary-pausa"),
  summarySaida: document.querySelector("#summary-saida"),
  summaryTotal: document.querySelector("#summary-total"),
  historyDate: document.querySelector("#history-date"),
  historyBody: document.querySelector("#history-body"),
  emptyRowTemplate: document.querySelector("#empty-row-template"),
  exportCsv: document.querySelector("#export-csv"),
  requestCorrection: document.querySelector("#request-correction"),
  correctionDialog: document.querySelector("#correction-dialog"),
  closeCorrection: document.querySelector("#close-correction"),
  correctionForm: document.querySelector("#correction-form"),
  correctionDate: document.querySelector("#correction-date"),
  correctionTime: document.querySelector("#correction-time"),
  correctionAction: document.querySelector("#correction-action"),
  correctionNote: document.querySelector("#correction-note"),
  locationDialog: document.querySelector("#location-dialog"),
  locationForm: document.querySelector("#location-form"),
  cancelLocation: document.querySelector("#cancel-location"),
  confirmLocation: document.querySelector("#confirm-location"),
  locationPreview: document.querySelector("#location-preview"),
  locationCoordinates: document.querySelector("#location-coordinates"),
  locationAddress: document.querySelector("#location-address"),
  viewLocationDialog: document.querySelector("#view-location-dialog"),
  closeViewLocation: document.querySelector("#close-view-location"),
  viewLocationPreview: document.querySelector("#view-location-preview"),
  viewLocationCoordinates: document.querySelector("#view-location-coordinates"),
  viewLocationAddress: document.querySelector("#view-location-address"),
  adminEmployee: document.querySelector("#admin-employee"),
  adminPeriodType: document.querySelector("#admin-period-type"),
  adminDayLabel: document.querySelector("#admin-day-label"),
  adminMonthLabel: document.querySelector("#admin-month-label"),
  adminYearLabel: document.querySelector("#admin-year-label"),
  adminDay: document.querySelector("#admin-day"),
  adminMonth: document.querySelector("#admin-month"),
  adminYear: document.querySelector("#admin-year"),
  adminHistoryBody: document.querySelector("#admin-history-body"),
  adminHours: document.querySelector("#admin-hours"),
  adminOvertime: document.querySelector("#admin-overtime"),
  adminWorkedDays: document.querySelector("#admin-worked-days"),
  adminAbsences: document.querySelector("#admin-absences"),
  adminLateHours: document.querySelector("#admin-late-hours"),
  pendingCount: document.querySelector("#pending-count"),
  pendingList: document.querySelector("#pending-list"),
  settingsForm: document.querySelector("#settings-form"),
  settingStart: document.querySelector("#setting-start"),
  settingEnd: document.querySelector("#setting-end"),
  settingLunchStart: document.querySelector("#setting-lunch-start"),
  settingLunchEnd: document.querySelector("#setting-lunch-end"),
  holidayForm: document.querySelector("#holiday-form"),
  holidayDate: document.querySelector("#holiday-date"),
  holidayName: document.querySelector("#holiday-name"),
  holidayList: document.querySelector("#holiday-list"),
};

elements.historyDate.value = toDateKey(new Date());
elements.correctionDate.value = toDateKey(new Date());
elements.correctionTime.value = toTimeInput(new Date());
elements.adminDay.value = toDateKey(new Date());
elements.adminMonth.value = toMonthKey(new Date());
elements.adminYear.value = String(new Date().getFullYear());

applyTheme(getSavedTheme());
loadRememberedLogin();
bindEvents();
updateClock();
setInterval(updateClock, 1000);
restoreLocalSession();

onAuthStateChanged(auth, async (user) => {
  if (state.localAuth) return;
  clearSubscriptions();
  state.user = user;
  state.profile = null;

  if (!user) {
    showLoggedOut();
    return;
  }

  try {
    state.profile = await loadUserProfile(user);
    startSubscriptions();
    showLoggedIn();
  } catch (error) {
    showLoginMessage(`Nao foi possivel carregar o perfil: ${friendlyError(error)}`);
    await signOut(auth);
  }
});

function bindEvents() {
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutButton.addEventListener("click", handleLogout);

  elements.routeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      renderRoute();
    });
  });

  elements.actionButtons.forEach((button) => {
    button.addEventListener("click", () => registerPunch(button.dataset.action));
  });

  elements.historyDate.addEventListener("change", renderCollaboratorHistory);
  elements.historyBody.addEventListener("click", handleLocationClick);
  elements.adminHistoryBody.addEventListener("click", handleLocationClick);
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.requestCorrection.addEventListener("click", openCorrectionDialog);
  elements.closeCorrection.addEventListener("click", () => elements.correctionDialog.close());
  elements.correctionForm.addEventListener("submit", submitCorrection);
  elements.cancelLocation.addEventListener("click", closeLocationDialog);
  elements.confirmLocation.addEventListener("click", confirmLocatedPunch);
  elements.closeViewLocation.addEventListener("click", () => elements.viewLocationDialog.close());

  elements.adminEmployee.addEventListener("change", renderAdmin);
  elements.adminPeriodType.addEventListener("change", renderAdmin);
  elements.adminDay.addEventListener("change", renderAdmin);
  elements.adminMonth.addEventListener("change", renderAdmin);
  elements.adminYear.addEventListener("change", renderAdmin);
  elements.pendingList.addEventListener("click", handleReviewClick);
  elements.settingsForm.addEventListener("submit", saveSettings);
  elements.holidayForm.addEventListener("submit", saveHoliday);
  elements.holidayList.addEventListener("click", removeHoliday);
}

async function handleLogin(event) {
  event.preventDefault();
  showLoginMessage("Entrando...");
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  try {
    const localUser = await findLocalLogin(email, password);
    if (localUser) {
      state.localAuth = true;
      state.user = { uid: localUser.id, email: localUser.email };
      state.profile = {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        role: localUser.role,
      };
      loadLocalData();
      rememberLoginPreference(email, password, localUser.id);
      elements.loginForm.reset();
      loadRememberedLogin();
      showLoginMessage("");
      showLoggedIn();
      return;
    }

    state.localAuth = false;
    await signInWithEmailAndPassword(auth, email, password);
    rememberLoginPreference(email, password, null);
    elements.loginForm.reset();
    loadRememberedLogin();
    showLoginMessage("");
  } catch (error) {
    showLoginMessage(friendlyError(error));
  }
}

async function handleLogout() {
  if (state.localAuth) {
    clearSubscriptions();
    state.localAuth = false;
    state.user = null;
    state.profile = null;
    localStorage.removeItem(LOCAL_SESSION_KEY);
    showLoggedOut();
    return;
  }

  localStorage.removeItem(LOCAL_SESSION_KEY);
  await signOut(auth);
}

function rememberLoginPreference(email, password, localUserId) {
  if (!elements.rememberLogin.checked) {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(LOCAL_SESSION_KEY);
    return;
  }

  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password, remember: true }));
  if (localUserId) localStorage.setItem(LOCAL_SESSION_KEY, localUserId);
}

function loadRememberedLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY));
    if (!saved?.remember) return;
    elements.loginEmail.value = saved.email || "";
    elements.loginPassword.value = saved.password || "";
    elements.rememberLogin.checked = true;
  } catch {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

async function restoreLocalSession() {
  const localUserId = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!localUserId) return;

  const users = await loadLoginUsers();
  const localUser = users.find((user) => user.id === localUserId);
  if (!localUser) return;

  state.localUsers = users;
  state.localAuth = true;
  state.user = { uid: localUser.id, email: localUser.email };
  state.profile = {
    id: localUser.id,
    name: localUser.name,
    email: localUser.email,
    role: localUser.role,
  };
  loadLocalData();
  showLoggedIn();
}

async function loadUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return { id: user.uid, ...snapshot.data() };
  }

  const profile = {
    name: user.displayName || user.email.split("@")[0],
    email: user.email,
    role: "collaborator",
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, profile);
  return { id: user.uid, ...profile };
}

function startSubscriptions() {
  state.unsubscribes = [
    onSnapshot(collection(db, "users"), (snapshot) => {
      state.employees = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.role !== "coordinator")
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      render();
    }),
    onSnapshot(collection(db, "punches"), (snapshot) => {
      state.punches = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      render();
    }),
    onSnapshot(collection(db, "holidays"), (snapshot) => {
      state.holidays = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      render();
    }),
    onSnapshot(doc(db, "settings", "workSchedule"), (snapshot) => {
      state.settings = snapshot.exists() ? { ...DEFAULT_SETTINGS, ...snapshot.data() } : { ...DEFAULT_SETTINGS };
      render();
    }),
  ];
}

function clearSubscriptions() {
  state.unsubscribes.forEach((unsubscribe) => unsubscribe());
  state.unsubscribes = [];
}

async function findLocalLogin(email, password) {
  const users = await loadLoginUsers();
  state.localUsers = users;
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password) || null;
}

async function loadLoginUsers() {
  const response = await fetch(`${LOGIN_FILE}?v=${Date.now()}`);
  if (!response.ok) return [];
  const text = await response.text();
  return parseLoginFile(text);
}

function parseLoginFile(text) {
  const users = [];
  let current = null;

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const section = line.match(/^\[(.+)]$/);
    if (section) {
      if (isCompleteLogin(current)) users.push(normalizeLogin(current));
      current = { id: section[1].trim() };
      return;
    }

    if (!current || !line.includes("=")) return;
    const [key, ...valueParts] = line.split("=");
    current[key.trim().toLowerCase()] = valueParts.join("=").trim();
  });

  if (isCompleteLogin(current)) users.push(normalizeLogin(current));
  return users;
}

function isCompleteLogin(user) {
  return Boolean(user?.email && user?.senha && user?.nome && user?.funcao);
}

function normalizeLogin(user) {
  return {
    id: user.id,
    email: user.email,
    password: user.senha,
    name: user.nome,
    role: user.funcao === "coordinator" ? "coordinator" : "collaborator",
  };
}

function loadLocalData() {
  const dbState = readLocalDb();
  state.employees = state.localUsers
    .filter((user) => user.role !== "coordinator")
    .map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  state.punches = dbState.punches;
  state.holidays = dbState.holidays;
  state.settings = dbState.settings;
}

function readLocalDb() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_DB_KEY));
    return {
      punches: saved?.punches || [],
      holidays: saved?.holidays || [],
      settings: { ...DEFAULT_SETTINGS, ...(saved?.settings || {}) },
    };
  } catch {
    return { punches: [], holidays: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

function saveLocalDb() {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify({
    punches: state.punches,
    holidays: state.holidays,
    settings: state.settings,
  }));
}

function localId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function showLoggedOut() {
  elements.loginView.classList.remove("hidden");
  elements.appView.classList.add("hidden");
  elements.coordinatorRoute.classList.add("hidden");
  elements.loginMessage.textContent = "";
  loadRememberedLogin();
  setActionAvailability(null);
}

function showLoggedIn() {
  elements.loginView.classList.add("hidden");
  elements.appView.classList.remove("hidden");
  elements.sessionName.textContent = state.profile.name || state.user.email;
  elements.sessionRole.textContent = isCoordinator() ? "Coordenador" : "Colaborador";

  if (isCoordinator()) {
    elements.coordinatorRoute.classList.remove("hidden");
  } else {
    state.route = "point";
    elements.coordinatorRoute.classList.add("hidden");
  }

  render();
}

function render() {
  if (!state.user || !state.profile) return;
  renderRoute();
  renderCollaborator();
  renderCollaboratorHistory();
  renderAdmin();
}

function renderRoute() {
  const route = isCoordinator() ? state.route : "point";
  elements.pointView.classList.toggle("hidden", route !== "point");
  elements.adminView.classList.toggle("hidden", route !== "admin");
  elements.routeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });
}

function renderCollaborator() {
  const profile = state.profile;
  const status = getCurrentStatus(profile.id);
  elements.selectedEmployee.innerHTML = `
    <strong>${escapeHtml(profile.name || profile.email)}</strong>
    <span>${escapeHtml(profile.email || "")}</span>
  `;
  elements.selectedStatus.textContent = status.label;
  elements.selectedStatus.className = `badge ${status.kind === "idle" ? "muted" : ""}`;
  setActionAvailability(status.nextActions);
  renderTodaySummary();
}

function renderTodaySummary() {
  const entries = getAcceptedPunches(state.profile.id).filter((punch) => toDateKey(punchDate(punch)) === toDateKey(new Date()));
  const summary = summarizePunches(entries);

  elements.summaryEntrada.textContent = summary.entrada ? formatTime(summary.entrada) : "--:--";
  elements.summarySaida.textContent = summary.saida ? formatTime(summary.saida) : "--:--";
  elements.summaryPausa.textContent = formatDuration(summary.pauseMs);
  elements.summaryTotal.textContent = formatDuration(summary.workMs);
}

function renderCollaboratorHistory() {
  if (!state.profile) return;
  const dateKey = elements.historyDate.value;
  const rows = state.punches
    .filter((punch) => punch.employeeId === state.profile.id)
    .filter((punch) => !dateKey || toDateKey(punchDate(punch)) === dateKey)
    .sort((a, b) => punchDate(b) - punchDate(a));

  renderRows(elements.historyBody, rows, false);
}

function renderAdmin() {
  if (!isCoordinator()) return;
  renderAdminEmployeeOptions();
  renderAdminFilterVisibility();
  renderAdminHistory();
  renderPendingReviews();
  renderSettings();
  renderHolidays();
}

function renderAdminEmployeeOptions() {
  const current = elements.adminEmployee.value;
  elements.adminEmployee.innerHTML = "";

  if (!state.employees.length) {
    elements.adminEmployee.innerHTML = `<option value="">Nenhum colaborador</option>`;
    return;
  }

  state.employees.forEach((employee) => {
    const option = document.createElement("option");
    option.value = employee.id;
    option.textContent = employee.name || employee.email || employee.id;
    elements.adminEmployee.append(option);
  });

  if (state.employees.some((employee) => employee.id === current)) {
    elements.adminEmployee.value = current;
  }
}

function renderAdminFilterVisibility() {
  const type = elements.adminPeriodType.value;
  elements.adminDayLabel.classList.toggle("hidden", type !== "day");
  elements.adminMonthLabel.classList.toggle("hidden", type !== "month");
  elements.adminYearLabel.classList.toggle("hidden", type !== "year");
}

function renderAdminHistory() {
  const employeeId = elements.adminEmployee.value;
  if (!employeeId) {
    renderRows(elements.adminHistoryBody, [], false);
    renderAdminSummary(null);
    return;
  }

  const period = getAdminPeriod();
  const rows = state.punches
    .filter((punch) => punch.employeeId === employeeId)
    .filter((punch) => isInPeriod(punchDate(punch), period))
    .sort((a, b) => punchDate(b) - punchDate(a));

  renderRows(elements.adminHistoryBody, rows, false);
  renderAdminSummary(employeeId);
}

function renderAdminSummary(employeeId) {
  if (!employeeId) {
    elements.adminHours.textContent = "0h00";
    elements.adminOvertime.textContent = "0h00";
    elements.adminWorkedDays.textContent = "0";
    elements.adminAbsences.textContent = "0";
    elements.adminLateHours.textContent = "0h00";
    return;
  }

  const month = elements.adminMonth.value || toMonthKey(new Date());
  const [year, monthNumber] = month.split("-").map(Number);
  const expectedDays = getExpectedWorkDays(year, monthNumber);
  const monthPunches = getAcceptedPunches(employeeId).filter((punch) => toMonthKey(punchDate(punch)) === month);
  const grouped = groupPunchesByDate(monthPunches);
  let totalMs = 0;
  let lateMs = 0;
  const workedDays = new Set();

  grouped.forEach((entries, dateKey) => {
    const summary = summarizePunches(entries);
    if (summary.workMs > 0) {
      totalMs += summary.workMs;
      workedDays.add(dateKey);
    }
    if (summary.entrada) {
      const expectedStart = combineDateAndTime(dateKey, state.settings.start);
      if (summary.entrada > expectedStart) {
        lateMs += summary.entrada - expectedStart;
      }
    }
  });

  const expectedMs = expectedDays.length * expectedDailyMs();
  const absences = expectedDays.filter((dateKey) => !workedDays.has(dateKey) && combineDateAndTime(dateKey, "23:59") < new Date()).length;
  const overtimeMs = Math.max(0, totalMs - expectedMs);

  elements.adminHours.textContent = formatDuration(totalMs);
  elements.adminOvertime.textContent = formatDuration(overtimeMs);
  elements.adminWorkedDays.textContent = String(workedDays.size);
  elements.adminAbsences.textContent = String(absences);
  elements.adminLateHours.textContent = formatDuration(lateMs);
}

function renderPendingReviews() {
  const pending = state.punches
    .filter((punch) => punch.source === "manual" && punch.status === "pending")
    .sort((a, b) => punchDate(a) - punchDate(b));

  elements.pendingCount.textContent = String(pending.length);
  elements.pendingList.innerHTML = "";

  if (!pending.length) {
    elements.pendingList.innerHTML = `<p class="empty-table">Nenhuma correcao pendente.</p>`;
    return;
  }

  pending.forEach((punch) => {
    const employee = findEmployee(punch.employeeId);
    const card = document.createElement("article");
    card.className = "review-card";
    card.innerHTML = `
      <header>
        <div>
          <strong>${escapeHtml(employee?.name || punch.employeeName || "Colaborador")}</strong>
          <span class="muted-line">${formatDate(punchDate(punch))} as ${formatTime(punchDate(punch))} - ${formatAction(punch.action)}</span>
        </div>
        ${statusPill(punch.status)}
      </header>
      <p class="message">${escapeHtml(punch.note || "Sem justificativa.")}</p>
      <div class="review-actions">
        <button type="button" class="primary-button" data-review="approved" data-id="${punch.id}">Aprovar</button>
        <button type="button" class="secondary-button" data-review="rejected" data-id="${punch.id}">Recusar</button>
      </div>
    `;
    elements.pendingList.append(card);
  });
}

function renderSettings() {
  const settings = state.settings;
  elements.settingStart.value = settings.start;
  elements.settingEnd.value = settings.end;
  elements.settingLunchStart.value = settings.lunchStart;
  elements.settingLunchEnd.value = settings.lunchEnd;
  document.querySelectorAll("input[name='workday']").forEach((input) => {
    input.checked = settings.workDays.includes(Number(input.value));
  });
}

function renderHolidays() {
  elements.holidayList.innerHTML = "";
  const holidays = [...state.holidays].sort((a, b) => a.date.localeCompare(b.date));

  if (!holidays.length) {
    elements.holidayList.innerHTML = `<p class="empty-table">Nenhum feriado cadastrado.</p>`;
    return;
  }

  holidays.forEach((holiday) => {
    const item = document.createElement("article");
    item.className = "holiday-card";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(holiday.name)}</strong>
        <span class="muted-line">${formatDate(parseDateKey(holiday.date))}</span>
      </div>
      <button type="button" class="icon-button" data-holiday="${holiday.id}" aria-label="Remover feriado">x</button>
    `;
    elements.holidayList.append(item);
  });
}

function renderRows(target, rows) {
  target.innerHTML = "";

  if (!rows.length) {
    target.append(elements.emptyRowTemplate.content.cloneNode(true));
    return;
  }

  rows.forEach((punch) => {
    const date = punchDate(punch);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(date)}</td>
      <td>${formatTime(date)}</td>
      <td>${formatAction(punch.action)}</td>
      <td>${punch.source === "manual" ? "Manual" : "Ponto"}</td>
      <td>${statusPill(punch.status || "approved")}</td>
      <td>${locationButton(punch)}</td>
      <td>${escapeHtml(punch.note || "-")}</td>
    `;
    target.append(tr);
  });
}

async function registerPunch(action) {
  const status = getCurrentStatus(state.profile.id);
  if (!status.nextActions.includes(action)) return;

  state.pendingPunchAction = action;
  state.pendingLocation = null;
  elements.locationCoordinates.textContent = "Buscando coordenadas...";
  elements.locationAddress.textContent = "Aguarde a permissao de localizacao.";
  elements.locationPreview.innerHTML = `<div class="empty-table">Solicitando localizacao...</div>`;
  elements.confirmLocation.disabled = true;
  elements.locationDialog.showModal();

  try {
    const location = await getCurrentLocation();
    state.pendingLocation = location;
    elements.locationCoordinates.textContent = formatCoordinates(location);
    elements.locationAddress.textContent = location.address || "Endereco nao encontrado.";
    elements.locationPreview.innerHTML = mapIframe(location);
    elements.confirmLocation.disabled = false;
  } catch (error) {
    elements.locationCoordinates.textContent = "Nao foi possivel obter a localizacao.";
    elements.locationAddress.textContent = error.message || "Verifique a permissao de localizacao do navegador.";
    elements.locationPreview.innerHTML = `<div class="empty-table">Localizacao indisponivel.</div>`;
  }
}

function closeLocationDialog() {
  state.pendingPunchAction = null;
  state.pendingLocation = null;
  elements.locationDialog.close();
}

async function confirmLocatedPunch() {
  if (!state.pendingPunchAction || !state.pendingLocation) return;
  await createPunch(state.pendingPunchAction, state.pendingLocation);
  closeLocationDialog();
}

async function createPunch(action, location) {
  const status = getCurrentStatus(state.profile.id);

  const punch = {
    id: localId("punch"),
    employeeId: state.profile.id,
    employeeName: state.profile.name || state.user.email,
    employeeEmail: state.profile.email || state.user.email,
    action,
    timestamp: new Date().toISOString(),
    source: "clock",
    status: "approved",
    note: status.notes[action] || "",
    location,
    createdAt: new Date().toISOString(),
  };

  if (state.localAuth) {
    state.punches.push(punch);
    saveLocalDb();
    render();
    return;
  }

  const { id, ...firestorePunch } = punch;
  await addDoc(collection(db, "punches"), {
    ...firestorePunch,
    createdAt: serverTimestamp(),
  });
}

function openCorrectionDialog() {
  elements.correctionDate.value = elements.historyDate.value || toDateKey(new Date());
  elements.correctionTime.value = toTimeInput(new Date());
  elements.correctionDialog.showModal();
}

async function submitCorrection(event) {
  event.preventDefault();
  const timestamp = combineDateAndTime(elements.correctionDate.value, elements.correctionTime.value);

  const punch = {
    id: localId("manual"),
    employeeId: state.profile.id,
    employeeName: state.profile.name || state.user.email,
    employeeEmail: state.profile.email || state.user.email,
    action: elements.correctionAction.value,
    timestamp: timestamp.toISOString(),
    source: "manual",
    status: "pending",
    note: elements.correctionNote.value.trim(),
    requestedBy: state.profile.id,
    createdAt: new Date().toISOString(),
  };

  if (state.localAuth) {
    state.punches.push(punch);
    saveLocalDb();
    render();
  } else {
    const { id, ...firestorePunch } = punch;
    await addDoc(collection(db, "punches"), {
      ...firestorePunch,
      createdAt: serverTimestamp(),
    });
  }

  elements.correctionForm.reset();
  elements.correctionDialog.close();
}

async function handleReviewClick(event) {
  const button = event.target.closest("[data-review]");
  if (!button) return;

  if (state.localAuth) {
    state.punches = state.punches.map((punch) => (
      punch.id === button.dataset.id
        ? { ...punch, status: button.dataset.review, reviewedBy: state.profile.id, reviewedAt: new Date().toISOString() }
        : punch
    ));
    saveLocalDb();
    render();
    return;
  }

  await updateDoc(doc(db, "punches", button.dataset.id), {
    status: button.dataset.review,
    reviewedBy: state.profile.id,
    reviewedAt: serverTimestamp(),
  });
}

async function saveSettings(event) {
  event.preventDefault();
  const workDays = [...document.querySelectorAll("input[name='workday']:checked")].map((input) => Number(input.value));

  const settings = {
    workDays,
    start: elements.settingStart.value,
    end: elements.settingEnd.value,
    lunchStart: elements.settingLunchStart.value,
    lunchEnd: elements.settingLunchEnd.value,
    updatedBy: state.profile.id,
    updatedAt: new Date().toISOString(),
  };

  if (state.localAuth) {
    state.settings = settings;
    saveLocalDb();
    render();
    return;
  }

  await setDoc(doc(db, "settings", "workSchedule"), {
    ...settings,
    updatedBy: state.profile.id,
    updatedAt: serverTimestamp(),
  });
}

async function saveHoliday(event) {
  event.preventDefault();
  const holiday = {
    id: elements.holidayDate.value,
    date: elements.holidayDate.value,
    name: elements.holidayName.value.trim(),
    createdBy: state.profile.id,
    createdAt: new Date().toISOString(),
  };

  if (state.localAuth) {
    state.holidays = state.holidays.filter((item) => item.id !== holiday.id);
    state.holidays.push(holiday);
    saveLocalDb();
    render();
    elements.holidayForm.reset();
    return;
  }

  await setDoc(doc(db, "holidays", elements.holidayDate.value), {
    date: holiday.date,
    name: holiday.name,
    createdBy: state.profile.id,
    createdAt: serverTimestamp(),
  });
  elements.holidayForm.reset();
}

async function removeHoliday(event) {
  const button = event.target.closest("[data-holiday]");
  if (!button) return;

  if (state.localAuth) {
    state.holidays = state.holidays.filter((holiday) => holiday.id !== button.dataset.holiday);
    saveLocalDb();
    render();
    return;
  }

  await deleteDoc(doc(db, "holidays", button.dataset.holiday));
}

async function getCurrentLocation() {
  if (!navigator.geolocation) {
    throw new Error("Seu navegador nao oferece suporte a localizacao.");
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

  const location = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    address: "",
  };

  location.address = await reverseGeocode(location);
  return location;
}

async function reverseGeocode(location) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(location.latitude),
    lon: String(location.longitude),
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
    if (!response.ok) return "";
    const data = await response.json();
    return data.display_name || "";
  } catch {
    return "";
  }
}

function handleLocationClick(event) {
  const button = event.target.closest("[data-location-id]");
  if (!button) return;

  const punch = state.punches.find((item) => item.id === button.dataset.locationId);
  if (!punch?.location) return;

  elements.viewLocationCoordinates.textContent = formatCoordinates(punch.location);
  elements.viewLocationAddress.textContent = punch.location.address || "Endereco nao encontrado.";
  elements.viewLocationPreview.innerHTML = mapIframe(punch.location);
  elements.viewLocationDialog.showModal();
}

function locationButton(punch) {
  if (!punch.location) return "-";
  return `<button type="button" class="location-button" data-location-id="${punch.id}">Ver mapa</button>`;
}

function formatCoordinates(location) {
  const accuracy = Number.isFinite(location.accuracy) ? ` - precisao ${Math.round(location.accuracy)}m` : "";
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}${accuracy}`;
}

function mapIframe(location) {
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const delta = 0.003;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
  return `<iframe title="Mapa do ponto registrado" src="${src}" loading="lazy"></iframe>`;
}

function getCurrentStatus(employeeId) {
  const entries = getAcceptedPunches(employeeId)
    .filter((punch) => toDateKey(punchDate(punch)) === toDateKey(new Date()))
    .sort((a, b) => punchDate(a) - punchDate(b));
  const last = entries.at(-1)?.action;

  const notes = {
    entrada: "Inicio da jornada",
    inicio_pausa: "Pausa iniciada",
    fim_pausa: "Pausa finalizada",
    saida: "Jornada encerrada",
  };

  if (!last || last === "saida") {
    return { label: "Fora da jornada", kind: "idle", nextActions: ["entrada"], notes };
  }

  if (last === "entrada" || last === "fim_pausa") {
    return { label: "Trabalhando", kind: "active", nextActions: ["inicio_pausa", "saida"], notes };
  }

  return { label: "Em pausa", kind: "active", nextActions: ["fim_pausa"], notes };
}

function setActionAvailability(nextActions) {
  elements.actionButtons.forEach((button) => {
    button.disabled = !nextActions || !nextActions.includes(button.dataset.action);
  });
}

function getAcceptedPunches(employeeId) {
  return state.punches
    .filter((punch) => punch.employeeId === employeeId)
    .filter((punch) => punch.status === "approved")
    .sort((a, b) => punchDate(a) - punchDate(b));
}

function summarizePunches(entries) {
  let entrada = null;
  let saida = null;
  let openWorkStart = null;
  let openPauseStart = null;
  let workMs = 0;
  let pauseMs = 0;

  entries.forEach((entry) => {
    const date = punchDate(entry);

    if (entry.action === "entrada") {
      entrada = entrada || date;
      openWorkStart = date;
    }

    if (entry.action === "inicio_pausa" && openWorkStart) {
      workMs += date - openWorkStart;
      openWorkStart = null;
      openPauseStart = date;
    }

    if (entry.action === "fim_pausa" && openPauseStart) {
      pauseMs += date - openPauseStart;
      openPauseStart = null;
      openWorkStart = date;
    }

    if (entry.action === "saida") {
      saida = date;
      if (openWorkStart) {
        workMs += date - openWorkStart;
        openWorkStart = null;
      }
      if (openPauseStart) {
        pauseMs += date - openPauseStart;
        openPauseStart = null;
      }
    }
  });

  const now = new Date();
  if (openWorkStart) workMs += now - openWorkStart;
  if (openPauseStart) pauseMs += now - openPauseStart;

  return { entrada, saida, pauseMs, workMs };
}

function getExpectedWorkDays(year, monthNumber) {
  const dates = [];
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthNumber - 1, day);
    const dateKey = toDateKey(date);
    const isWorkday = state.settings.workDays.includes(date.getDay());
    const isHoliday = state.holidays.some((holiday) => holiday.date === dateKey);
    if (isWorkday && !isHoliday) dates.push(dateKey);
  }

  return dates;
}

function expectedDailyMs() {
  const baseDate = toDateKey(new Date());
  const start = combineDateAndTime(baseDate, state.settings.start);
  const end = combineDateAndTime(baseDate, state.settings.end);
  const lunchStart = combineDateAndTime(baseDate, state.settings.lunchStart);
  const lunchEnd = combineDateAndTime(baseDate, state.settings.lunchEnd);
  return Math.max(0, end - start - Math.max(0, lunchEnd - lunchStart));
}

function groupPunchesByDate(punches) {
  const map = new Map();
  punches.forEach((punch) => {
    const dateKey = toDateKey(punchDate(punch));
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey).push(punch);
  });
  map.forEach((entries) => entries.sort((a, b) => punchDate(a) - punchDate(b)));
  return map;
}

function getAdminPeriod() {
  const type = elements.adminPeriodType.value;

  if (type === "day") {
    const start = parseDateKey(elements.adminDay.value || toDateKey(new Date()));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (type === "year") {
    const year = Number(elements.adminYear.value || new Date().getFullYear());
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }

  const [year, month] = (elements.adminMonth.value || toMonthKey(new Date())).split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

function isInPeriod(date, period) {
  return date >= period.start && date < period.end;
}

function findEmployee(id) {
  if (state.profile?.id === id) return state.profile;
  return state.employees.find((employee) => employee.id === id);
}

function isCoordinator() {
  return state.profile?.role === "coordinator";
}

function punchDate(punch) {
  if (punch.timestamp?.toDate) return punch.timestamp.toDate();
  return new Date(punch.timestamp);
}

function combineDateAndTime(dateKey, timeValue) {
  return new Date(`${dateKey}T${timeValue}:00`);
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toTimeInput(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatTime(date, withSeconds = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
  }).format(date);
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function formatAction(action) {
  return {
    entrada: "Entrada",
    inicio_pausa: "Inicio de pausa",
    fim_pausa: "Fim de pausa",
    saida: "Saida",
  }[action] || action;
}

function statusPill(status) {
  const labels = {
    approved: "Aprovado",
    pending: "Em analise",
    rejected: "Recusado",
  };
  return `<span class="status-pill status-${status}">${labels[status] || status}</span>`;
}

function exportCsv() {
  const rows = [
    ["Data", "Hora", "Acao", "Origem", "Status", "Observacao"],
    ...state.punches
      .filter((punch) => punch.employeeId === state.profile.id)
      .sort((a, b) => punchDate(a) - punchDate(b))
      .map((punch) => {
        const date = punchDate(punch);
        return [
          formatDate(date),
          formatTime(date),
          formatAction(punch.action),
          punch.source === "manual" ? "Manual" : "Ponto",
          punch.status || "approved",
          punch.note || "",
        ];
      }),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historico-ponto-${toDateKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function updateClock() {
  const now = new Date();
  elements.currentDate.textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  elements.currentTime.textContent = formatTime(now, true);
  if (state.profile) renderTodaySummary();
}

function getSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo escuro");
  elements.themeIcon.textContent = isDark ? "C" : "D";
  elements.themeLabel.textContent = isDark ? "Claro" : "Escuro";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
  applyTheme(nextTheme);
}

function showLoginMessage(message) {
  elements.loginMessage.textContent = message;
}

function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("auth/invalid-credential")) return "Email ou senha invalidos.";
  if (code.includes("auth/user-not-found")) return "Usuario nao encontrado.";
  if (code.includes("auth/wrong-password")) return "Senha incorreta.";
  if (code.includes("permission-denied")) return "Sem permissao para acessar estes dados no Firebase.";
  return error?.message || "Ocorreu um erro inesperado.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
