import { createSeedState, STORAGE_KEY, IMAGE_DB_NAME, TODAY } from "./data.js";

const content = document.getElementById("page-content");
const modalRoot = document.getElementById("modal-root");
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const statusLabels = { active: "Ativo", inactive: "Inativo", stable: "Estável", attention: "Atenção", priority: "Revisão prioritária", scheduled: "Agendada", completed: "Concluída", cancelled: "Cancelada", pending: "Pendente", accepted: "Aceita", rejected: "Rejeitada", archived: "Arquivada" };
const iconMarkup = {
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-1.5a4 4 0 0 0-3-3.87M16.5 3.3a3.5 3.5 0 0 1 0 6.8"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2M22 12h-2"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.6a8 8 0 0 1-1.6.9l-.4 1.9h-2.8l-.4-1.9a8 8 0 0 1-1.6-.9l-1.8.6-1.4-2.4 1.5-1.2a8 8 0 0 1 0-1.8L5.7 12l1.4-2.4 1.8.6a8 8 0 0 1 1.6-.9l.4-1.9h2.8l.4 1.9a8 8 0 0 1 1.6.9l1.8-.6 1.4 2.4-1.5 1.2a8 8 0 0 1 0 1.8Z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.9 1.6c-1.1 1-1.7 1.3-1.7 2.9M12 17h.01"/></svg>'
};

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const value = JSON.parse(raw);
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.patients) || !Array.isArray(value.lesions)) return createSeedState();
    return value;
  } catch (error) {
    console.warn("Não foi possível ler os dados locais; a demonstração será reiniciada.", error);
    return createSeedState();
  }
}

let state = readState();
let route = "dashboard";
let selectedPatientId = null;
let patientTab = "summary";
let patientSearch = "";
let patientStatusFilter = "active";
let agendaDate = TODAY;
let agendaStatusFilter = "all";
let mapPatientId = "P-10284";
let mapView = "front";
let showArchivedLesions = false;
let selectedLesionId = "L-0245";
let settingsTab = "clinic";
let generatedReportFilter = "all";
const photoUrlCache = new Map();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateNavigation();
    return true;
  } catch (error) {
    console.error("Falha ao salvar a demonstração local.", error);
    toast("Não foi possível salvar. O armazenamento do navegador pode estar cheio.", true);
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function icon(name) { return iconMarkup[name] || ""; }
function uid(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase(); }
function nowIso() { return new Date().toISOString(); }
function todayLocal() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function getPatient(id) { return state.patients.find(function (p) { return p.id === id; }); }
function getLesion(id) { return state.lesions.find(function (l) { return l.id === id; }); }
function formatDate(value, options) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", options || { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "");
}
function formatDateLong(value) { return formatDate(value, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function formatTime(value) { return value || "—"; }
function sortMeasurementsLatestFirst(measurements) {
  return (measurements || []).map(function (measurement, index) { return { measurement: measurement, index: index }; })
    .sort(function (a, b) { return b.measurement.date.localeCompare(a.measurement.date) || b.index - a.index; })
    .map(function (entry) { return entry.measurement; });
}
function ageAt(dob) {
  if (!dob) return "—";
  const born = new Date(dob + "T12:00:00");
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const month = today.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < born.getDate())) age--;
  return age + " anos";
}
function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(function (part) { return part[0] || ""; }).join("").toUpperCase();
}
function avatarClass(name) {
  let total = 0;
  for (let i = 0; i < name.length; i++) total += name.charCodeAt(i);
  return "avatar-" + (total % 6 + 1);
}
function avatar(name, extra) {
  return '<span class="person-avatar ' + avatarClass(name || "") + (extra ? " " + extra : "") + '">' + escapeHtml(initials(name)) + "</span>";
}
function statusPill(key) {
  const extra = { active: "status-active", stable: "status-stable", completed: "status-completed", accepted: "status-accepted", attention: "status-attention", scheduled: "status-scheduled", pending: "status-pending", priority: "status-priority", cancelled: "status-cancelled", rejected: "status-rejected", archived: "status-archived", inactive: "status-inactive" }[key] || "status-archived";
  return '<span class="status-pill ' + extra + '">' + escapeHtml(statusLabels[key] || key || "—") + "</span>";
}
function recordAudit(action, entity, detail) {
  state.audit.unshift({ id: uid("AU"), action: action, entity: entity, detail: detail || "", actor: state.currentUser.name, date: nowIso() });
  if (state.audit.length > 300) state.audit.length = 300;
}
function addEvent(patientId, type, title, detail) {
  state.events.unshift({ id: uid("EV"), patientId: patientId, type: type, title: title, detail: detail || "", date: nowIso(), actor: state.currentUser.name });
}
function toast(message, error) {
  const region = document.getElementById("toast-region");
  const item = document.createElement("div");
  item.className = "toast" + (error ? " error" : "");
  item.innerHTML = '<span class="toast-symbol">' + (error ? "!" : "✓") + "</span><span>" + escapeHtml(message) + "</span>";
  region.appendChild(item);
  window.setTimeout(function () { item.remove(); }, 3500);
}
function updateNavigation() {
  const count = document.getElementById("nav-patient-count");
  if (count) count.textContent = state.patients.filter(function (p) { return p.status === "active"; }).length;
  const clinicName = document.querySelector(".clinic-meta b");
  if (clinicName) clinicName.textContent = state.clinic.name.replace(" Clínica Dermatológica", "");
  document.querySelectorAll(".nav-link").forEach(function (el) { el.classList.toggle("active", el.dataset.route === route || (route === "patient" && el.dataset.route === "patients")); });
}
function pageTitle() {
  return { dashboard: "Visão geral", patients: "Pacientes", patient: "Prontuário", agenda: "Agenda", lesions: "Lesões e mapa", reports: "Relatórios", settings: "Configurações" }[route] || "Visão geral";
}
function go(next, id) {
  route = next;
  if (next === "patient") { selectedPatientId = id; patientTab = "summary"; }
  document.getElementById("breadcrumb-current").textContent = next === "patient" ? "Prontuário" : pageTitle();
  document.querySelectorAll(".nav-link").forEach(function (el) { el.classList.toggle("active", el.dataset.route === next || (next === "patient" && el.dataset.route === "patients")); });
  document.getElementById("sidebar").classList.remove("open");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function render() {
  document.getElementById("breadcrumb-current").textContent = route === "patient" ? "Prontuário" : pageTitle();
  updateNavigation();
  const pages = { dashboard: renderDashboard, patients: renderPatients, patient: renderPatientDetail, agenda: renderAgenda, lesions: renderLesions, reports: renderReports, settings: renderSettings };
  content.innerHTML = (pages[route] || renderDashboard)();
  if (route === "lesions") hydratePhotoImages();
  if (route === "patient") hydratePhotoImages();
}

function pageHead(title, description, actions) {
  return '<div class="page-head"><div><span class="eyebrow">DERMAVISION · CLÍNICA</span><h1>' + title + '</h1><p>' + description + '</p></div><div class="page-actions">' + (actions || "") + "</div></div>";
}

function statCard(label, value, trend, note, iconName) {
  return '<article class="stat-card"><div class="stat-top"><span>' + label + '</span><span class="stat-icon">' + icon(iconName) + '</span></div><div class="stat-value"><strong>' + value + '</strong><span class="stat-trend">' + trend + '</span></div><div class="stat-foot">' + note + "</div></article>";
}

function patientRow(patient) {
  const lesionCount = state.lesions.filter(function (l) { return l.patientId === patient.id && !l.archived; }).length;
  return '<tr class="clickable-row" data-action="open-patient" data-id="' + escapeHtml(patient.id) + '"><td><div class="person-cell">' + avatar(patient.name) + '<span><b>' + escapeHtml(patient.name) + '</b><small>' + escapeHtml(patient.id) + '</small></span></div></td><td>' + escapeHtml(ageAt(patient.dob)) + '</td><td>' + escapeHtml(formatDate(patient.lastVisit)) + '</td><td>' + lesionCount + (lesionCount === 1 ? " lesão" : " lesões") + '</td><td>' + statusPill(patient.status) + '</td><td><button class="row-action" data-action="open-patient" data-id="' + escapeHtml(patient.id) + '">Abrir prontuário</button></td></tr>';
}

function renderDashboard() {
  const active = state.patients.filter(function (p) { return p.status === "active"; });
  const todayAppointments = state.appointments.filter(function (a) { return a.date === TODAY && a.status !== "cancelled"; }).sort(function (a, b) { return a.time.localeCompare(b.time); });
  const monitored = state.lesions.filter(function (l) { return !l.archived; });
  const pending = state.suggestions.filter(function (s) { return s.status === "pending"; }).length;
  const recent = active.slice().sort(function (a, b) { return (b.lastVisit || "").localeCompare(a.lastVisit || ""); }).slice(0, 4);
  const latestEvents = state.events.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 4);
  const apptHtml = todayAppointments.slice(0, 4).map(function (a, i) {
    const person = getPatient(a.patientId);
    return '<div class="agenda-item"><span class="agenda-time">' + escapeHtml(a.time) + '</span><div class="agenda-person">' + avatar(person ? person.name : "Paciente") + '<span><b>' + escapeHtml(person ? person.name : "Paciente") + '</b><small>' + escapeHtml(a.type) + '</small></span></div><span class="agenda-dot ' + (i === 1 ? "amber" : i === 2 ? "coral" : "") + '"></span></div>';
  }).join("");
  const eventHtml = latestEvents.map(function (event) {
    const patient = getPatient(event.patientId);
    const symbol = { visit: "✓", lesion: "◉", image: "▧", patient: "+" }[event.type] || "•";
    return '<div class="activity-item"><div class="activity-timeline"><span class="activity-dot">' + symbol + '</span></div><div class="activity-text"><b>' + escapeHtml(patient ? patient.name : "Registro clínico") + "</b> · " + escapeHtml(event.title) + '<small>' + escapeHtml(formatDate(event.date, { day: "2-digit", month: "short" })) + " · " + escapeHtml(event.detail) + "</small></div></div>";
  }).join("");
  const rows = recent.map(patientRow).join("");
  const dayNumber = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" }).format(new Date(TODAY + "T12:00:00"));
  return pageHead("Visão geral", "Acompanhe a rotina clínica e os registros recentes da sua unidade.", '<span class="date-label"><span>◷</span>' + escapeHtml(formatDateLong(TODAY)) + '</span><button class="button button-primary" data-action="new-patient"><span>＋</span> Novo paciente</button>') +
    '<div class="grid stats-grid">' +
    statCard("Pacientes ativos", active.length, "↗ 8%", "em acompanhamento na unidade", "users") +
    statCard("Consultas hoje", todayAppointments.length, "• Agenda", "inclui atendimentos concluídos", "calendar") +
    statCard("Lesões acompanhadas", monitored.length, "• Ativas", "com histórico longitudinal", "target") +
    statCard("Sugestões para revisar", pending, "• Assistivo", "aguardando validação profissional", "chart") +
    '</div><div class="grid dashboard-grid">' +
    '<section class="panel"><div class="panel-head"><div><h2>Pacientes recentes</h2><p>Últimos registros acessados na clínica</p></div><button class="text-link" data-route="patients">Ver pacientes <span>→</span></button></div><div class="table-wrap"><table><thead><tr><th>PACIENTE</th><th>IDADE</th><th>ÚLTIMA CONSULTA</th><th>ACOMPANHAMENTO</th><th>STATUS</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6"><div class="empty-state">Nenhum paciente cadastrado.</div></td></tr>') + '</tbody></table></div></section>' +
    '<section class="panel agenda-panel"><div class="panel-head"><div><h2>Agenda de hoje</h2><p>Consultas programadas para a unidade</p></div><button class="text-link" data-route="agenda">Ver agenda <span>→</span></button></div><div class="agenda-date-strip"><div class="agenda-date-big">' + dayNumber + '</div><div><b>' + escapeHtml(formatDate(TODAY, { weekday: "long", month: "long", year: "numeric" })) + '</b><small>' + todayAppointments.length + (todayAppointments.length === 1 ? " horário" : " horários") + ' · Dra. Mariana Martins</small></div></div><div class="agenda-list">' + (apptHtml || '<div class="empty-state">Sem consultas para hoje.</div>') + '</div></section>' +
    '</div><div class="grid dashboard-bottom"><section class="panel"><div class="panel-head"><div><h2>Atividade recente</h2><p>Registros adicionados ao acompanhamento</p></div><button class="text-link" data-route="settings" data-settings-tab="audit">Ver auditoria <span>→</span></button></div><div class="activity-list">' + (eventHtml || '<div class="empty-state">Ainda não há atividades registradas.</div>') + '</div></section>' +
    '<section class="panel"><div class="panel-head"><div><h2>Acesso rápido</h2><p>Atalhos para tarefas frequentes</p></div></div><div class="quick-grid"><button class="quick-action" data-action="new-appointment"><span>＋</span><b>Agendar consulta</b></button><button class="quick-action" data-action="new-lesion"><span>◎</span><b>Registrar lesão</b></button><button class="quick-action" data-route="lesions"><span>⌖</span><b>Abrir mapa corporal</b></button><button class="quick-action" data-route="reports"><span>↗</span><b>Gerar relatório</b></button></div></section></div>' +
    '<p class="footer-note">DermaVision · ambiente demonstrativo com dados fictícios · sem uso para diagnóstico ou atendimento real</p>';
}

function renderPatients() {
  const query = patientSearch.trim().toLocaleLowerCase("pt-BR");
  const patients = state.patients.filter(function (p) {
    const matchQuery = !query || (p.name + " " + p.id + " " + p.phone + " " + p.email).toLocaleLowerCase("pt-BR").includes(query);
    const matchStatus = patientStatusFilter === "all" || p.status === patientStatusFilter;
    return matchQuery && matchStatus;
  }).sort(function (a, b) { return a.name.localeCompare(b.name, "pt-BR"); });
  const rows = patients.map(patientRow).join("");
  return pageHead("Pacientes", "Consulte e organize os cadastros e o acompanhamento clínico.", '<button class="button button-primary" data-action="new-patient"><span>＋</span> Novo paciente</button>') +
    '<div class="toolbar"><div class="toolbar-left"><label class="search-box"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input id="patient-search" type="search" placeholder="Buscar por nome, código ou contato" value="' + escapeHtml(patientSearch) + '" aria-label="Buscar pacientes" /></label></div><div class="toolbar-right"><select class="select-control" id="patient-status-filter" aria-label="Filtrar pacientes"><option value="active"' + (patientStatusFilter === "active" ? " selected" : "") + '>Pacientes ativos</option><option value="inactive"' + (patientStatusFilter === "inactive" ? " selected" : "") + '>Inativos</option><option value="all"' + (patientStatusFilter === "all" ? " selected" : "") + '>Todos os pacientes</option></select><button class="button button-secondary" data-action="export-patients">↓ Exportar lista</button></div></div>' +
    '<section class="panel patients-panel"><div class="panel-head"><div><h2>Cadastro de pacientes</h2><p>Prontuários vinculados à unidade DermaVision</p></div><span class="status-pill status-active">' + patients.length + ' registros</span></div><div class="table-wrap"><table><thead><tr><th>PACIENTE</th><th>IDADE</th><th>ÚLTIMA CONSULTA</th><th>ACOMPANHAMENTO</th><th>STATUS</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6"><div class="empty-state"><div><span class="empty-state-icon">⌕</span><strong>Nenhum paciente encontrado</strong>Ajuste a busca ou cadastre um novo paciente.</div></div></td></tr>') + '</tbody></table></div><div class="table-count">Exibindo ' + patients.length + " de " + state.patients.length + " prontuários demonstrativos</div></section>" +
    '<p class="footer-note">Os cadastros e contatos são fictícios. Use apenas dados de demonstração neste ambiente.</p>';
}

function patientTabs() {
  const tabs = [["summary", "Resumo"], ["lesions", "Lesões"], ["appointments", "Consultas"], ["records", "Tratamentos e exames"]];
  return '<div class="patient-tabs">' + tabs.map(function (item) {
    return '<button class="patient-tab' + (patientTab === item[0] ? " active" : "") + '" data-action="patient-tab" data-tab="' + item[0] + '">' + item[1] + "</button>";
  }).join("") + "</div>";
}

function patientEvents(patientId) {
  return state.events.filter(function (e) { return e.patientId === patientId; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
}

function renderTimeline(events) {
  if (!events.length) return '<div class="empty-state"><div><span class="empty-state-icon">◷</span><strong>Sem registros na linha do tempo</strong>Novos atendimentos e evoluções aparecerão aqui.</div></div>';
  return '<div class="timeline">' + events.map(function (event) {
    const symbol = { visit: "✓", lesion: "◉", image: "▧", treatment: "＋", exam: "⌕", patient: "●" }[event.type] || "•";
    return '<div class="timeline-item"><span class="timeline-icon">' + symbol + '</span><div class="timeline-copy"><b>' + escapeHtml(event.title) + '</b><p>' + escapeHtml(event.detail || "") + '</p><small>' + escapeHtml(formatDate(event.date, { day: "2-digit", month: "long", year: "numeric" })) + " · " + escapeHtml(event.actor || "Equipe clínica") + "</small></div></div>";
  }).join("") + "</div>";
}

function patientAppointments(patientId) {
  return state.appointments.filter(function (a) { return a.patientId === patientId; }).sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
}

function renderPatientLesions(patient) {
  const lesions = state.lesions.filter(function (l) { return l.patientId === patient.id; });
  const rows = lesions.map(function (lesion) {
    const latest = sortMeasurementsLatestFirst(lesion.measurements)[0];
    return '<div class="timeline-item"><span class="timeline-icon">◉</span><div class="timeline-copy"><b>' + escapeHtml(lesion.id) + " · " + escapeHtml(lesion.location) + '</b><p>' + escapeHtml(lesion.description) + " · " + (latest ? escapeHtml(latest.length + " × " + latest.width + " mm") : "Sem medidas registradas") + '</p><small>Primeiro registro em ' + escapeHtml(formatDate(lesion.firstSeen)) + " · " + statusLabels[lesion.archived ? "archived" : lesion.status] + '</small></div><button class="timeline-link" data-action="open-lesion" data-id="' + escapeHtml(lesion.id) + '">Abrir</button></div>';
  }).join("");
  const createAction = patient.status === "active" ? '<button class="button button-primary button-small" data-action="new-lesion" data-patient-id="' + escapeHtml(patient.id) + '">＋ Registrar lesão</button>' : '<span class="muted" style="font-size:8px">Cadastro inativo · histórico preservado</span>';
  return '<section class="panel patient-summary-card"><div class="section-title"><h3>Lesões registradas</h3>' + createAction + '</div>' + (rows ? '<div class="timeline">' + rows + "</div>" : '<div class="empty-state"><div><span class="empty-state-icon">◎</span><strong>Nenhuma lesão registrada</strong>Registre uma lesão para iniciar seu acompanhamento longitudinal.</div></div>') + "</section>";
}

function renderPatientAppointments(patient) {
  const items = patientAppointments(patient.id);
  const rows = items.map(function (a) {
    return '<div class="appointment-row"><span class="appointment-hour">' + escapeHtml(a.time) + '</span><div class="appointment-patient">' + avatar(patient.name) + '<span><b>' + escapeHtml(a.type) + '</b><small>' + escapeHtml(formatDate(a.date)) + " · " + escapeHtml(a.provider) + '</small></span></div><span class="appointment-meta">' + escapeHtml(a.duration + " min") + '</span><span class="appointment-meta">' + statusPill(a.status) + '</span><div class="appointment-action">' + (a.status === "scheduled" ? '<button class="row-action" data-action="appointment-register" data-id="' + escapeHtml(a.id) + '">Registrar</button>' : '<button class="row-action" data-action="appointment-detail" data-id="' + escapeHtml(a.id) + '">Detalhes</button>') + "</div></div>";
  }).join("");
  const createAction = patient.status === "active" ? '<button class="button button-primary button-small" data-action="new-appointment" data-patient-id="' + escapeHtml(patient.id) + '">＋ Agendar</button>' : '<span class="muted" style="font-size:8px">Cadastro inativo</span>';
  return '<section class="panel"><div class="panel-head"><div><h2>Histórico de consultas</h2><p>Agendamentos e atendimentos registrados</p></div>' + createAction + '</div>' + (rows ? rows : '<div class="empty-state"><div><span class="empty-state-icon">◷</span><strong>Nenhuma consulta registrada</strong>Agende um horário para este paciente.</div></div>') + "</section>";
}

function renderPatientRecords(patient) {
  const treatments = state.treatments.filter(function (t) { return t.patientId === patient.id; });
  const exams = state.exams.filter(function (e) { return e.patientId === patient.id; });
  const treatmentRows = treatments.map(function (t) {
    return '<div class="patient-metric-row"><span><b>' + escapeHtml(t.description) + '</b><br><small>' + escapeHtml(formatDate(t.startDate)) + (t.endDate ? " · até " + escapeHtml(formatDate(t.endDate)) : "") + "</small></span>" + statusPill(t.status) + "</div>";
  }).join("");
  const examRows = exams.map(function (e) {
    return '<div class="patient-metric-row"><span><b>' + escapeHtml(e.type) + '</b><br><small>' + escapeHtml(formatDate(e.date)) + " · " + escapeHtml(e.result) + "</small></span></div>";
  }).join("");
  const treatmentAction = patient.status === "active" ? '<button class="button button-secondary button-small" data-action="new-treatment" data-patient-id="' + escapeHtml(patient.id) + '">＋ Registrar</button>' : "";
  const examAction = patient.status === "active" ? '<button class="button button-secondary button-small" data-action="new-exam" data-patient-id="' + escapeHtml(patient.id) + '">＋ Registrar</button>' : "";
  return '<div class="grid" style="gap:13px"><section class="panel" style="padding:16px"><div class="section-title"><h3>Tratamentos</h3>' + treatmentAction + '</div>' + (treatmentRows || '<div class="empty-state">Nenhum tratamento registrado.</div>') + '</section><section class="panel" style="padding:16px"><div class="section-title"><h3>Exames e registros</h3>' + examAction + '</div>' + (examRows || '<div class="empty-state">Nenhum exame registrado.</div>') + "</section></div>";
}

function renderPatientDetail() {
  const patient = getPatient(selectedPatientId);
  if (!patient) return pageHead("Prontuário", "Paciente indisponível.", '<button class="button button-secondary" data-route="patients">← Voltar para pacientes</button>') + '<section class="panel empty-state">Este cadastro não está disponível.</section>';
  const lesions = state.lesions.filter(function (l) { return l.patientId === patient.id && !l.archived; });
  const visits = patientAppointments(patient.id);
  const upcoming = visits.filter(function (a) { return a.status === "scheduled" && a.date >= todayLocal(); }).length;
  let mainPanel = "";
  if (patientTab === "lesions") mainPanel = renderPatientLesions(patient);
  else if (patientTab === "appointments") mainPanel = renderPatientAppointments(patient);
  else if (patientTab === "records") mainPanel = renderPatientRecords(patient);
  else {
    const events = patientEvents(patient.id);
    mainPanel = '<div class="grid" style="gap:13px"><section class="panel patient-summary-card"><div class="section-title"><h3>Dados cadastrais</h3><button class="text-link" data-action="edit-patient" data-id="' + escapeHtml(patient.id) + '">Editar cadastro <span>↗</span></button></div><div class="details-grid"><div class="detail-item"><small>Data de nascimento</small><b>' + escapeHtml(formatDate(patient.dob)) + " · " + escapeHtml(ageAt(patient.dob)) + '</b></div><div class="detail-item"><small>Contato</small><b>' + escapeHtml(patient.phone || "Não informado") + '</b></div><div class="detail-item"><small>E-mail</small><b>' + escapeHtml(patient.email || "Não informado") + '</b></div><div class="detail-item"><small>Identificador</small><b>' + escapeHtml(patient.id) + '</b></div><div class="detail-item"><small>CPF demonstrativo</small><b>' + escapeHtml(patient.cpf || "Não informado") + '</b></div><div class="detail-item"><small>Cadastro</small><b>' + escapeHtml(formatDate(patient.createdAt)) + '</b></div></div>' + (patient.notes ? '<div class="modal-note"><b>Observação administrativa:</b> ' + escapeHtml(patient.notes) + "</div>" : "") + '</section><section class="panel patient-summary-card"><div class="section-title"><h3>Histórico clínico</h3><span class="muted" style="font-size:9px">Mais recentes primeiro</span></div>' + renderTimeline(events) + "</section></div>";
  }
  const deactivateAction = patient.status === "active" ? '<button class="button button-secondary button-small" data-action="toggle-patient-status" data-id="' + escapeHtml(patient.id) + '">Desativar</button>' : '<button class="button button-soft button-small" data-action="toggle-patient-status" data-id="' + escapeHtml(patient.id) + '">Reativar</button>';
  return pageHead("Prontuário do paciente", "Histórico individualizado e registros de acompanhamento.", '<button class="button button-secondary" data-route="patients">← Pacientes</button>') +
    '<div class="patient-hero">' + avatar(patient.name) + '<div class="patient-hero-copy"><h2>' + escapeHtml(patient.name) + '</h2><div class="patient-subline"><span>' + escapeHtml(patient.id) + '</span><span>' + escapeHtml(ageAt(patient.dob)) + '</span><span>' + escapeHtml(patient.phone || "Sem telefone") + '</span>' + statusPill(patient.status) + '</div></div><div class="patient-hero-actions">' + deactivateAction + '<button class="button button-secondary button-small" data-action="edit-patient" data-id="' + escapeHtml(patient.id) + '">Editar</button>' + (patient.status === "active" ? '<button class="button button-primary button-small" data-action="new-appointment" data-patient-id="' + escapeHtml(patient.id) + '">＋ Agendar consulta</button>' : "") + "</div></div>" +
    '<div class="patient-overview"><div>' + patientTabs() + mainPanel + '</div><aside class="patient-side"><section class="panel"><div class="section-title"><h3>Resumo do acompanhamento</h3></div><div class="patient-metric-row"><span>Lesões ativas</span><b>' + lesions.length + '</b></div><div class="patient-metric-row"><span>Próximas consultas</span><b>' + upcoming + '</b></div><div class="patient-metric-row"><span>Tratamentos ativos</span><b>' + state.treatments.filter(function (t) { return t.patientId === patient.id && t.status === "active"; }).length + '</b></div><div class="patient-metric-row"><span>Última consulta</span><b style="font-size:10px">' + escapeHtml(formatDate(patient.lastVisit)) + '</b></div></section><section class="panel"><div class="section-title"><h3>Ações rápidas</h3></div><div class="quick-grid" style="padding:0">' + (patient.status === "active" ? '<button class="quick-action" data-action="new-lesion" data-patient-id="' + escapeHtml(patient.id) + '"><span>◎</span><b>Registrar lesão</b></button><button class="quick-action" data-action="new-treatment" data-patient-id="' + escapeHtml(patient.id) + '"><span>＋</span><b>Registrar tratamento</b></button><button class="quick-action" data-action="new-exam" data-patient-id="' + escapeHtml(patient.id) + '"><span>⌕</span><b>Registrar exame</b></button><button class="quick-action" data-action="patient-report" data-patient-id="' + escapeHtml(patient.id) + '"><span>↗</span><b>Relatório clínico</b></button>' : '<div class="modal-note">O cadastro está inativo. Reative-o para criar novos registros clínicos.</div>') + "</div></section></aside></div>" +
    '<p class="footer-note">Registro demonstrativo · avaliação clínica e decisões são responsabilidade do profissional de saúde.</p>';
}

function localDateString(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function weekDates(anchor) {
  const date = new Date(anchor + "T12:00:00");
  const weekday = date.getDay();
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return Array.from({ length: 7 }, function (_, i) { const day = new Date(date); day.setDate(date.getDate() + i); return localDateString(day); });
}

function appointmentRow(a) {
  const patient = getPatient(a.patientId);
  const primary = a.status === "scheduled" ? '<button class="button button-soft button-small" data-action="appointment-register" data-id="' + escapeHtml(a.id) + '">Registrar</button>' : a.status === "cancelled" ? "" : '<button class="row-action" data-action="appointment-detail" data-id="' + escapeHtml(a.id) + '">Detalhes</button>';
  const cancel = a.status === "scheduled" ? '<button class="row-action" data-action="appointment-cancel" data-id="' + escapeHtml(a.id) + '">Cancelar</button>' : "";
  return '<div class="appointment-row"><span class="appointment-hour">' + escapeHtml(a.time) + '</span><div class="appointment-patient">' + avatar(patient ? patient.name : "Paciente") + '<span><b>' + escapeHtml(patient ? patient.name : "Paciente") + '</b><small>' + escapeHtml(a.type) + " · " + escapeHtml(a.id) + '</small></span></div><span class="appointment-meta">' + escapeHtml(a.provider) + '</span><span class="appointment-meta">' + statusPill(a.status) + '</span><div class="appointment-action" style="display:flex;gap:5px">' + primary + cancel + "</div></div>";
}

function renderAgenda() {
  const dates = weekDates(agendaDate);
  let appointments = state.appointments.filter(function (a) { return a.date === agendaDate; });
  if (agendaStatusFilter !== "all") appointments = appointments.filter(function (a) { return a.status === agendaStatusFilter; });
  appointments = appointments.sort(function (a, b) { return a.time.localeCompare(b.time); });
  const dayCards = dates.map(function (date) {
    const d = new Date(date + "T12:00:00");
    const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(".", "");
    const number = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(d);
    const hasEvents = state.appointments.some(function (a) { return a.date === date && a.status !== "cancelled"; });
    return '<button class="week-day' + (agendaDate === date ? " active" : "") + '" data-action="select-agenda-date" data-date="' + date + '">' + dayLabel + '<b>' + number + '</b><span style="color:' + (hasEvents ? "#70ae95" : "transparent") + '">•</span></button>';
  }).join("");
  const titleDate = formatDate(agendaDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return pageHead("Agenda", "Organize consultas e registre os atendimentos da clínica.", '<button class="button button-secondary" data-action="export-appointments">↓ Exportar agenda</button><button class="button button-primary" data-action="new-appointment"><span>＋</span> Agendar consulta</button>') +
    '<div class="agenda-controls"><div class="week-strip">' + dayCards + '</div><input class="select-control" style="height:38px" id="agenda-date" type="date" value="' + escapeHtml(agendaDate) + '" aria-label="Selecionar data" /><select id="agenda-status" class="select-control" aria-label="Filtrar situação"><option value="all"' + (agendaStatusFilter === "all" ? " selected" : "") + '>Todas as situações</option><option value="scheduled"' + (agendaStatusFilter === "scheduled" ? " selected" : "") + '>Agendadas</option><option value="completed"' + (agendaStatusFilter === "completed" ? " selected" : "") + '>Concluídas</option><option value="cancelled"' + (agendaStatusFilter === "cancelled" ? " selected" : "") + '>Canceladas</option></select></div>' +
    '<section class="panel agenda-full"><div class="panel-head"><div><h2>' + escapeHtml(titleDate) + '</h2><p>' + appointments.length + (appointments.length === 1 ? " consulta" : " consultas") + ' · Dra. Mariana Martins</p></div><span class="date-label"><span>◷</span> Unidade principal</span></div>' + (appointments.map(appointmentRow).join("") || '<div class="empty-state"><div><span class="empty-state-icon">◷</span><strong>Nenhuma consulta para esta data</strong>Escolha outro dia ou agende um novo horário.</div></div>') + '</section><p class="footer-note">Agendamentos são armazenados apenas neste navegador demonstrativo.</p>';
}

function currentMapLesions() {
  return state.lesions.filter(function (l) {
    return l.patientId === mapPatientId && l.view === mapView && (showArchivedLesions || !l.archived);
  }).sort(function (a, b) { return a.id.localeCompare(b.id); });
}

function mapPatientSelect() {
  const options = state.patients.map(function (p) {
    return '<option value="' + escapeHtml(p.id) + '"' + (p.id === mapPatientId ? " selected" : "") + '>' + escapeHtml(p.name) + " · " + escapeHtml(p.id) + "</option>";
  }).join("");
  return '<select id="map-patient-select" class="select-control map-patient-select" aria-label="Selecionar paciente">' + options + "</select>";
}

function bodySilhouette() {
  const detail = mapView === "front"
    ? '<path class="body-detail" d="M50 30v68M41 31l-5 48M59 31l5 48M44 99l-3 49M56 99l3 49M46 48h8"/>'
    : '<path class="body-detail" d="M50 30v68M42 37q8 6 16 0M43 54q7 5 14 0M42 74q8 4 16 0M41 31l-5 48M59 31l5 48M44 99l-3 49M56 99l3 49"/>'
  return '<svg class="body-silhouette" viewBox="0 0 100 160" role="img" aria-label="' + (mapView === "front" ? "Mapa corporal frontal" : "Mapa corporal posterior") + '"><ellipse class="body-fill" cx="50" cy="14" rx="8" ry="10"/><path class="body-fill" d="M44 24h12l3 7 11 5 9 31-6 2-9-24-2 31 3 24-6 3-8-24-1-24-1 24-8 24-6-3 3-24-2-31-9 24-6-2 9-31 11-5z"/><path class="body-fill" d="M43 95h14l-1 12 2 41-6 1-2-34-2-18-2 18-2 34-6-1 2-41z"/>' + detail + "</svg>";
}

function lesionTimeline(lesion) {
  const points = sortMeasurementsLatestFirst(lesion.measurements);
  const events = points.map(function (point, index) {
    return '<div class="timeline-item"><span class="timeline-icon">' + (index === 0 ? "◉" : "·") + '</span><div class="timeline-copy"><b>' + escapeHtml(point.length + " × " + point.width + " mm") + '</b><p>' + escapeHtml(point.notes || "Medidas registradas para acompanhamento.") + '</p><small>' + escapeHtml(formatDate(point.date)) + "</small></div></div>";
  });
  return '<div class="timeline">' + (events.join("") || '<div class="empty-state">Sem evolução registrada.</div>') + "</div>";
}

function renderPhotoThumb(image) {
  return '<div class="photo-thumb" data-photo-thumb="' + escapeHtml(image.id) + '"><span>' + escapeHtml(formatDate(image.date || image.createdAt, { day: "2-digit", month: "short" })) + '</span><img data-image-id="' + escapeHtml(image.id) + '" alt="Imagem de acompanhamento adicionada ao registro ' + escapeHtml(image.name || "fotográfico") + '" /></div>';
}

function renderAISuggestion(suggestion) {
  const lesion = getLesion(suggestion.lesionId);
  const resolved = suggestion.status !== "pending";
  return '<article class="ai-suggestion"><div class="suggestion-top"><b>' + escapeHtml(suggestion.type) + '</b>' + (suggestion.score ? '<span class="match-score">' + suggestion.score + '% similaridade*</span>' : "") + '</div><p>' + escapeHtml(suggestion.evidence) + '</p><div class="suggestion-pair"><span>' + escapeHtml(suggestion.oldLabel) + '</span><b>↔</b><span>' + escapeHtml(suggestion.newLabel) + '</span></div>' + (resolved ? '<div style="display:flex;align-items:center;gap:7px">' + statusPill(suggestion.status) + '<small style="color:#94a198;font-size:8px">' + escapeHtml(suggestion.decisionBy || "") + "</small></div>" : '<small style="display:block;margin-bottom:8px;color:#9aa69f;font-size:8px">Lesão associada: ' + escapeHtml(lesion ? lesion.id : suggestion.lesionId) + '</small><div class="suggestion-actions"><button class="accept" data-action="accept-suggestion" data-id="' + escapeHtml(suggestion.id) + '">✓ Aceitar</button><button class="reject" data-action="reject-suggestion" data-id="' + escapeHtml(suggestion.id) + '">× Rejeitar</button></div>') + "</article>";
}

function renderLesions() {
  const patients = state.patients;
  if (!patients.some(function (p) { return p.id === mapPatientId; })) mapPatientId = patients[0] ? patients[0].id : "";
  let visible = currentMapLesions();
  if (!visible.length) {
    const other = state.lesions.find(function (l) { return l.patientId === mapPatientId && (showArchivedLesions || !l.archived); });
    if (other && other.view !== mapView) {
      selectedLesionId = other.id;
    } else if (!visible.some(function (l) { return l.id === selectedLesionId; })) selectedLesionId = "";
  } else if (!visible.some(function (l) { return l.id === selectedLesionId; })) {
    selectedLesionId = visible[0].id;
  }
  const lesion = getLesion(selectedLesionId);
  if (lesion && (lesion.patientId !== mapPatientId || lesion.view !== mapView || (lesion.archived && !showArchivedLesions))) selectedLesionId = "";
  if (selectedLesionId && !lesion) selectedLesionId = "";
  const selected = getLesion(selectedLesionId);
  const patientOptions = patients.map(function (p) { return '<option value="' + escapeHtml(p.id) + '"' + (p.id === mapPatientId ? " selected" : "") + '>' + escapeHtml(p.name) + " · " + escapeHtml(p.id) + "</option>"; }).join("");
  const pins = visible.map(function (l) {
    const left = Math.max(15, Math.min(82, 22 + Number(l.x || 50) * .58));
    const top = Math.max(8, Math.min(91, 8 + Number(l.y || 50) * .78));
    return '<button class="body-pin ' + (l.status === "attention" ? "attention" : l.status === "priority" ? "priority" : "") + (l.id === selectedLesionId ? " selected" : "") + '" style="left:' + left + "%;top:" + top + '%" data-action="select-lesion" data-id="' + escapeHtml(l.id) + '" aria-label="Selecionar lesão ' + escapeHtml(l.id) + '"></button>';
  }).join("");
  const lesionList = visible.map(function (l) {
    return '<button class="text-link" style="width:100%;justify-content:space-between;padding:6px 2px;border-bottom:1px solid #eef2ef" data-action="select-lesion" data-id="' + escapeHtml(l.id) + '"><span>' + escapeHtml(l.id + " · " + l.location) + '</span><span>' + statusPill(l.archived ? "archived" : l.status) + "</span></button>";
  }).join("");
  let detail = '<div class="empty-state"><div><span class="empty-state-icon">◎</span><strong>Selecione uma lesão no mapa</strong>Os registros de acompanhamento aparecerão aqui.</div></div>';
  if (selected) {
    const last = sortMeasurementsLatestFirst(selected.measurements)[0];
    const photos = (selected.images || []).filter(function (img) { return !img.deleted; });
    const photoMarkup = photos.length ? '<div class="photo-grid">' + photos.map(renderPhotoThumb).join("") + '<button class="photo-thumb" data-action="upload-photo" aria-label="Adicionar foto">＋<span>Adicionar foto</span></button></div>' : '<div class="photo-empty"><div><b>Nenhuma imagem vinculada</b><br>Adicione fotos para construir a comparação temporal.</div></div><div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="button button-secondary button-small" data-action="upload-photo">＋ Adicionar foto</button></div>';
    detail = '<div class="lesion-title-row"><div><h3>' + escapeHtml(selected.location) + '</h3><small class="lesion-code">' + escapeHtml(selected.id) + " · Desde " + escapeHtml(formatDate(selected.firstSeen)) + '</small></div>' + statusPill(selected.archived ? "archived" : selected.status) + '</div><div class="lesion-facts"><div class="lesion-fact"><small>ÚLTIMA MEDIDA</small><b>' + (last ? escapeHtml(last.length + " × " + last.width + " mm") : "—") + '</b></div><div class="lesion-fact"><small>ATUALIZADO EM</small><b>' + (last ? escapeHtml(formatDate(last.date)) : "—") + '</b></div><div class="lesion-fact"><small>REGISTROS</small><b>' + selected.measurements.length + '</b></div></div><p style="margin:0 0 12px;color:#87958f;font-size:8px;line-height:1.55">' + escapeHtml(selected.description) + '</p><section class="lesion-photo-area"><div class="photo-area-head"><span>Imagens da lesão</span><button class="text-link" data-action="compare-photos">Comparar</button></div>' + photoMarkup + '<input id="lesion-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden /></section><div class="lesion-history"><div class="section-title"><h4>Histórico de medidas</h4><button class="button button-soft button-small" data-action="new-evolution" data-id="' + escapeHtml(selected.id) + '">＋ Evolução</button></div>' + lesionTimeline(selected) + '</div><div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="text-link" data-action="toggle-lesion-archive" data-id="' + escapeHtml(selected.id) + '">' + (selected.archived ? "Restaurar lesão" : "Arquivar lesão") + "</button></div>";
  }
  let suggestions = state.suggestions.filter(function (s) { return s.status === "pending" && (!selected || s.lesionId === selected.id); });
  if (!suggestions.length) suggestions = state.suggestions.filter(function (s) { return s.status === "pending" && state.lesions.some(function (l) { return l.id === s.lesionId && l.patientId === mapPatientId; }); });
  const aiContent = suggestions.length ? suggestions.map(renderAISuggestion).join("") : '<div class="ai-empty">Nenhuma sugestão pendente para este paciente.<br>Os registros clínicos existentes não foram alterados.</div>';
  const filteredActive = state.lesions.filter(function (l) { return l.patientId === mapPatientId && !l.archived; });
  return pageHead("Lesões e mapa corporal", "Visualize a localização e a evolução de cada registro.", '<button class="button button-secondary" data-action="new-evolution"' + (selected ? ' data-id="' + escapeHtml(selected.id) + '"' : "") + '>＋ Registrar evolução</button><button class="button button-primary" data-action="new-lesion" data-patient-id="' + escapeHtml(mapPatientId) + '">＋ Nova lesão</button>') +
    '<div class="lesion-layout"><section class="panel lesion-map-panel"><div class="panel-head"><div><h2>Mapa corporal</h2><p>Marcadores registrados pela equipe</p></div></div><select class="select-control map-patient-select" id="map-patient-select" aria-label="Selecionar paciente">' + patientOptions + '</select><div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 8px"><div class="map-controls"><button class="map-toggle' + (mapView === "front" ? " active" : "") + '" data-action="set-map-view" data-view="front">Frente</button><button class="map-toggle' + (mapView === "back" ? " active" : "") + '" data-action="set-map-view" data-view="back">Costas</button></div><label style="display:flex;align-items:center;gap:5px;color:#81918a;font-size:8px"><input id="show-archived-lesions" type="checkbox"' + (showArchivedLesions ? " checked" : "") + '> Arquivadas</label></div><div class="body-map">' + bodySilhouette() + pins + '</div><div class="map-legend"><span class="legend-item"><i class="legend-dot"></i> Estável</span><span class="legend-item"><i class="legend-dot attention"></i> Atenção</span><span class="legend-item"><i class="legend-dot priority"></i> Revisão prioritária</span></div><div style="margin-top:10px"><div class="section-title"><h3 style="font-size:9px">Lesões de ' + escapeHtml((getPatient(mapPatientId) || {}).name || "Paciente") + '</h3><span style="color:#96a29c;font-size:8px">' + filteredActive.length + " ativas</span></div>" + (lesionList || '<div class="empty-state" style="min-height:55px">Nenhuma lesão nesta visualização.</div>') + "</div></section>" +
    '<section class="panel lesion-detail-panel"><div class="panel-head"><div><h2>Detalhes e evolução</h2><p>Identificador permanente · histórico preservado</p></div><button class="icon-button" title="Abrir prontuário" data-action="open-patient" data-id="' + escapeHtml(mapPatientId) + '">↗</button></div>' + detail + "</section>" +
    '<section class="panel ai-panel"><div class="panel-head"><div><h2>Apoio assistivo</h2><p>Revisão de correspondências sugeridas</p></div><span class="ai-badge"><span></span> IA · demonstração</span></div><div class="ai-disclaimer"><span>!</span><div>As sugestões são simuladas para demonstrar o fluxo. Este módulo não analisa imagens e não produz diagnóstico.</div></div><div class="ai-panel-content">' + aiContent + '</div><p style="margin:10px 1px 0;color:#a1aaa4;font-size:7px;line-height:1.5">* Percentual ilustrativo de similaridade, sem modelo de visão computacional. Toda correspondência exige revisão profissional.</p></section></div>' +
    '<p class="footer-note">A classificação exibida é apenas um marcador de acompanhamento registrado pela equipe. Não representa diagnóstico automatizado.</p>';
}

let reportPatientFilter = "all";
function renderReports() {
  const patientOptions = state.patients.map(function (p) { return '<option value="' + escapeHtml(p.id) + '"' + (reportPatientFilter === p.id ? " selected" : "") + '>' + escapeHtml(p.name) + "</option>"; }).join("");
  const historyRows = state.reports.slice().sort(function (a, b) { return b.generatedAt.localeCompare(a.generatedAt); }).map(function (report) {
    return '<div class="report-history-row"><span class="report-file-icon">' + escapeHtml(report.format.toUpperCase()) + '</span><div><b>' + escapeHtml(report.title) + '</b><small>' + escapeHtml(formatDate(report.generatedAt, { day: "2-digit", month: "short", year: "numeric" })) + " · " + escapeHtml(report.scope || "Clínica") + '</small></div><button class="report-download" data-action="repeat-report" data-id="' + escapeHtml(report.id) + '" aria-label="Gerar novamente">↻</button></div>';
  }).join("");
  return pageHead("Relatórios", "Consolide informações da clínica para análise e exportação.", "") +
    '<div class="grid reports-grid"><section><div class="report-hero"><span class="eyebrow">EXPORTAÇÃO CLÍNICA</span><h2>Monte um relatório para acompanhar a evolução.</h2><p>Selecione um paciente ou a unidade, escolha os registros que deseja incluir e gere um arquivo para revisão. A exportação fica registrada no histórico local da demonstração.</p></div>' +
    '<section class="panel" style="margin-top:13px;padding:17px"><div class="section-title"><h3>Dados do relatório</h3><span class="status-pill status-active">Somente leitura</span></div><div class="form-grid"><div class="form-field"><label for="report-patient">Escopo</label><select id="report-patient"><option value="all"' + (reportPatientFilter === "all" ? " selected" : "") + '>Toda a unidade</option>' + patientOptions + '</select></div><div class="form-field"><label for="report-from">Período inicial</label><input id="report-from" type="date" value="2026-01-01" /></div><div class="form-field"><label for="report-to">Período final</label><input id="report-to" type="date" value="' + TODAY + '" /></div></div><div class="section-title" style="margin-top:17px"><h3>Seções incluídas</h3><span style="color:#96a29c;font-size:8px">Selecione ao menos uma</span></div><div class="report-options"><label class="report-option"><input type="checkbox" name="report-section" value="patients" checked /><span><b>Dados cadastrais</b><small>Identificação e contato demonstrativos</small></span></label><label class="report-option"><input type="checkbox" name="report-section" value="appointments" checked /><span><b>Consultas</b><small>Agendamentos e status do atendimento</small></span></label><label class="report-option"><input type="checkbox" name="report-section" value="lesions" checked /><span><b>Lesões e evolução</b><small>Localização e medidas registradas</small></span></label><label class="report-option"><input type="checkbox" name="report-section" value="treatments" /><span><b>Tratamentos e exames</b><small>Registros associados ao paciente</small></span></label></div><div class="modal-note"><b>Privacidade:</b> os arquivos gerados contêm dados pessoais demonstrativos. Guarde-os somente em local controlado.</div><div class="settings-actions"><button class="button button-secondary" data-action="generate-pdf">Imprimir / salvar PDF</button><button class="button button-primary" data-action="generate-csv">↓ Gerar CSV</button></div></section></section>' +
    '<aside class="reports-side"><section class="panel"><div class="panel-head"><div><h2>Relatórios gerados</h2><p>Histórico de exportações nesta demonstração</p></div><span class="status-pill status-active">' + state.reports.length + '</span></div><div style="padding:0 15px 9px">' + (historyRows || '<div class="empty-state"><div><span class="empty-state-icon">↗</span><strong>Nenhum relatório gerado</strong>Os arquivos exportados aparecerão aqui.</div></div>') + '</div></section><section class="panel" style="padding:16px"><div class="section-title"><h3>Incluído no relatório</h3></div><div class="patient-metric-row"><span>Dados estruturados</span><b style="font-size:10px">CSV</b></div><div class="patient-metric-row"><span>Documento imprimível</span><b style="font-size:10px">PDF*</b></div><div class="patient-metric-row"><span>Origem</span><b style="font-size:10px">Local</b></div><p style="margin:10px 0 0;color:#9aa69f;font-size:8px;line-height:1.55">* Use a opção de impressão do navegador e escolha salvar em PDF.</p></section></aside></div><p class="footer-note">Relatórios são gerados no navegador e não substituem o prontuário clínico oficial.</p>';
}

function auditRows() {
  return state.audit.slice(0, 40).map(function (event) {
    return '<div class="audit-row"><span>' + escapeHtml(formatDate(event.date, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })) + '</span><b>' + escapeHtml(event.action) + '</b><span>' + escapeHtml(event.entity) + " · " + escapeHtml(event.detail) + '</span><span>' + escapeHtml(event.actor) + "</span></div>";
  }).join("");
}

function renderSettings() {
  const tabs = [["clinic", "Dados da clínica"], ["preferences", "Preferências"], ["audit", "Auditoria"]];
  let settingsContent = "";
  if (settingsTab === "audit") {
    settingsContent = '<h2>Rastreabilidade local</h2><p>Eventos recentes adicionados por esta demonstração. Este registro é armazenado no navegador e pode ser apagado pelo usuário.</p><div class="audit-row" style="color:#97a39d;font-size:8px;font-weight:700"><span>DATA</span><span>AÇÃO</span><span>ENTIDADE E CONTEXTO</span><span>RESPONSÁVEL</span></div>' + (auditRows() || '<div class="empty-state">Nenhum evento registrado.</div>');
  } else if (settingsTab === "preferences") {
    settingsContent = '<h2>Preferências da unidade</h2><p>Configure parâmetros de exibição e reveja onde os dados da demonstração são mantidos.</p><form id="preferences-form"><div class="settings-form-grid"><div class="form-field"><label for="pref-duration">Duração padrão da consulta (minutos)</label><select id="pref-duration"><option value="20"' + (state.clinic.defaultDuration === 20 ? " selected" : "") + '>20 minutos</option><option value="30"' + (state.clinic.defaultDuration === 30 ? " selected" : "") + '>30 minutos</option><option value="40"' + (state.clinic.defaultDuration === 40 ? " selected" : "") + '>40 minutos</option><option value="60"' + (state.clinic.defaultDuration === 60 ? " selected" : "") + '>60 minutos</option></select></div><div class="form-field"><label for="pref-reminder">Lembrete padrão (horas antes)</label><select id="pref-reminder"><option value="12"' + (state.clinic.reminderHours === 12 ? " selected" : "") + '>12 horas</option><option value="24"' + (state.clinic.reminderHours === 24 ? " selected" : "") + '>24 horas</option><option value="48"' + (state.clinic.reminderHours === 48 ? " selected" : "") + '>48 horas</option></select></div></div><div class="settings-notice"><b>Armazenamento de demonstração</b><br>Cadastros e histórico ficam no armazenamento local do navegador. Imagens são guardadas no banco local do navegador. Não há conta, servidor ou sincronização entre dispositivos.</div><div class="settings-actions"><button class="button button-primary" type="submit">Salvar preferências</button></div></form><div class="settings-notice"><b>Restaurar a demonstração</b><br>Substitui os registros locais pelos dados fictícios iniciais e remove as imagens armazenadas nesta origem.<div style="margin-top:10px"><button class="button button-danger button-small" data-action="reset-demo">Restaurar dados fictícios</button></div></div>';
  } else {
    settingsContent = '<h2>Dados cadastrais da clínica</h2><p>Informações exibidas no espaço de trabalho da demonstração.</p><form id="clinic-form"><div class="settings-form-grid"><div class="form-field"><label for="clinic-name">Nome da clínica</label><input id="clinic-name" name="name" required maxlength="120" value="' + escapeHtml(state.clinic.name) + '" /></div><div class="form-field"><label for="clinic-registration">Identificador demonstrativo</label><input id="clinic-registration" name="registration" maxlength="30" value="' + escapeHtml(state.clinic.registration) + '" /></div><div class="form-field"><label for="clinic-phone">Telefone</label><input id="clinic-phone" name="phone" maxlength="30" value="' + escapeHtml(state.clinic.phone) + '" /></div><div class="form-field"><label for="clinic-email">E-mail</label><input id="clinic-email" name="email" type="email" maxlength="120" value="' + escapeHtml(state.clinic.email) + '" /></div><div class="form-field full"><label for="clinic-address">Endereço</label><input id="clinic-address" name="address" maxlength="180" value="' + escapeHtml(state.clinic.address) + '" /></div></div><div class="settings-notice">Os valores são fictícios e não representam uma unidade real. A clínica está configurada apenas para visualizar a experiência demonstrativa.</div><div class="settings-actions"><button class="button button-primary" type="submit">Salvar alterações</button></div></form>';
  }
  return pageHead("Configurações", "Gerencie os dados da unidade e consulte a atividade registrada.", "") + '<div class="grid settings-grid"><nav class="panel settings-nav" aria-label="Configurações">' + tabs.map(function (tab) { return '<button class="settings-tab' + (settingsTab === tab[0] ? " active" : "") + '" data-action="settings-tab" data-tab="' + tab[0] + '">' + tab[1] + "</button>"; }).join("") + '</nav><section class="panel settings-content">' + settingsContent + '</section></div><p class="footer-note">Esta área não configura autenticação, permissões de produção ou integração externa.</p>';
}

function showModal(title, subtitle, body, wide) {
  modalRoot.innerHTML = '<div class="modal-backdrop" id="modal-backdrop"><section class="modal' + (wide ? " modal-wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><h2 id="modal-title">' + escapeHtml(title) + '</h2><p>' + escapeHtml(subtitle || "") + '</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button></header><div class="modal-body">' + body + "</div></section></div>";
  modalRoot.querySelectorAll("form").forEach(function (form) {
    form.addEventListener("submit", handleSubmit);
    form.querySelectorAll('button[type="submit"]').forEach(function (button) {
      button.type = "button";
      button.dataset.action = "submit-modal";
      button.dataset.formId = form.getAttribute("id");
    });
    form.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && event.target.tagName !== "TEXTAREA" && event.target.tagName !== "BUTTON") {
        event.preventDefault();
        handleSubmit({ target: form, preventDefault: function () {} });
      }
    });
  });
  const first = modalRoot.querySelector("input:not([type=hidden]),select,textarea,button");
  if (first) window.setTimeout(function () { first.focus(); }, 20);
}
function closeModal() { modalRoot.innerHTML = ""; }
function field(label, name, type, value, required, attributes, hint) {
  const formName = name.indexOf("-") >= 0 ? name.slice(name.indexOf("-") + 1) : name;
  return '<div class="form-field"><label for="' + name + '">' + label + (required ? ' <span class="required-mark">*</span>' : "") + '</label><input id="' + name + '" name="' + formName + '" type="' + (type || "text") + '" value="' + escapeHtml(value || "") + '"' + (required ? " required" : "") + (attributes || "") + " />" + (hint ? '<small class="hint">' + hint + "</small>" : "") + "</div>";
}
function selectField(label, name, choices, selected, required) {
  const formName = name.indexOf("-") >= 0 ? name.slice(name.indexOf("-") + 1) : name;
  return '<div class="form-field"><label for="' + name + '">' + label + (required ? ' <span class="required-mark">*</span>' : "") + '</label><select id="' + name + '" name="' + formName + '"' + (required ? " required" : "") + '>' + choices.map(function (choice) { return '<option value="' + escapeHtml(choice[0]) + '"' + (choice[0] === selected ? " selected" : "") + '>' + escapeHtml(choice[1]) + "</option>"; }).join("") + "</select></div>";
}
function patientChoices(selected, activeOnly) {
  return state.patients.filter(function (p) { return !activeOnly || p.status === "active"; }).map(function (p) { return [p.id, p.name + " · " + p.id]; });
}
function defaultActivePatient(preferred) {
  const person = preferred ? getPatient(preferred) : null;
  if (person && person.status === "active") return person.id;
  const firstActive = state.patients.find(function (p) { return p.status === "active"; });
  return firstActive ? firstActive.id : "";
}

function openPatientModal(patient) {
  const isEdit = Boolean(patient);
  const p = patient || { name: "", dob: "", sex: "Não informado", cpf: "", phone: "", email: "", notes: "" };
  const body = '<form id="patient-form" novalidate><input type="hidden" name="id" value="' + escapeHtml(p.id || "") + '" /><div id="patient-form-error" class="form-error hidden"></div><div class="form-grid">' +
    field("Nome completo", "patient-name", "text", p.name, true, ' maxlength="120" autocomplete="name"') +
    field("Data de nascimento", "patient-dob", "date", p.dob, true, ' max="' + todayLocal() + '"') +
    selectField("Gênero", "patient-sex", [["Não informado", "Prefiro não informar"], ["Feminino", "Feminino"], ["Masculino", "Masculino"], ["Outro", "Outro"]], p.sex || "Não informado", false) +
    field("Telefone", "patient-phone", "tel", p.phone, false, ' maxlength="30" autocomplete="tel"') +
    field("E-mail", "patient-email", "email", p.email, false, ' maxlength="120" autocomplete="email"') +
    field("CPF demonstrativo", "patient-cpf", "text", p.cpf, false, ' maxlength="18" placeholder="Opcional"') +
    '<div class="form-field full"><label for="patient-notes">Observações administrativas</label><textarea id="patient-notes" name="notes" maxlength="600">' + escapeHtml(p.notes || "") + '</textarea><small class="hint">Não inclua informações clínicas sensíveis neste campo demonstrativo.</small></div></div><div class="modal-note">Os dados ficam armazenados somente neste navegador. Use informações fictícias.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">' + (isEdit ? "Salvar alterações" : "Cadastrar paciente") + "</button></div></form>";
  showModal(isEdit ? "Editar cadastro" : "Novo paciente", isEdit ? "Atualize as informações cadastrais do prontuário." : "Preencha os dados demonstrativos para criar um prontuário.", body);
}

function openAppointmentModal(patientId) {
  if (patientId && getPatient(patientId) && getPatient(patientId).status !== "active") {
    toast("Reative o cadastro antes de agendar uma consulta.", true);
    return;
  }
  const defaultPatient = defaultActivePatient(patientId || selectedPatientId || mapPatientId);
  const choices = patientChoices(defaultPatient, true);
  const dateDefault = agendaDate || todayLocal();
  const body = '<form id="appointment-form" novalidate><div id="appointment-form-error" class="form-error hidden"></div><div class="form-grid">' +
    selectField("Paciente", "appointment-patient", choices, defaultPatient, true) +
    field("Data", "appointment-date", "date", dateDefault, true, ' min="' + todayLocal() + '"') +
    field("Horário", "appointment-time", "time", "14:20", true, "") +
    selectField("Duração", "appointment-duration", [["20", "20 minutos"], ["30", "30 minutos"], ["40", "40 minutos"], ["60", "60 minutos"]], String(state.clinic.defaultDuration || 30), true) +
    selectField("Tipo de consulta", "appointment-type", [["Consulta dermatológica", "Consulta dermatológica"], ["Retorno dermatológico", "Retorno dermatológico"], ["Acompanhamento", "Acompanhamento"], ["Avaliação de lesão", "Avaliação de lesão"]], "Consulta dermatológica", true) +
    '<div class="form-field"><label for="appointment-provider">Profissional</label><input id="appointment-provider" name="provider" value="' + escapeHtml(state.currentUser.name) + '" readonly /></div>' +
    '<div class="form-field full"><label for="appointment-note">Observação administrativa</label><textarea id="appointment-note" name="note" maxlength="400" placeholder="Opcional"></textarea></div></div><div class="modal-note"><b>Conflitos de agenda:</b> o sistema verifica sobreposição de horários com outras consultas desta unidade.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Confirmar agendamento</button></div></form>';
  showModal("Agendar consulta", "Selecione o paciente e o horário do atendimento.", body);
}

function openAttendanceModal(appointment, readOnly) {
  const patient = getPatient(appointment.patientId);
  const body = '<form id="attendance-form"><input type="hidden" name="id" value="' + escapeHtml(appointment.id) + '" /><div class="form-grid"><div class="form-field"><label>Paciente</label><input readonly value="' + escapeHtml(patient ? patient.name : "Paciente") + '" /></div><div class="form-field"><label>Agendamento</label><input readonly value="' + escapeHtml(formatDate(appointment.date) + " · " + appointment.time + " · " + appointment.type) + '" /></div><div class="form-field full"><label for="attendance-note">Registro do atendimento</label><textarea id="attendance-note" name="note" maxlength="3000" ' + (readOnly ? "readonly" : "") + ' placeholder="Registre as observações clínicas do atendimento">' + escapeHtml(appointment.note || "") + "</textarea></div></div>" + (readOnly ? '<div class="modal-note">Atendimento concluído em ' + escapeHtml(formatDate(appointment.date)) + ". O histórico demonstrativo permanece disponível para consulta.</div>" : '<div class="modal-note">Este campo é demonstrativo e não substitui um prontuário clínico oficial.</div>') + '<div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Fechar</button>' + (readOnly ? "" : '<button type="submit" class="button button-primary">Concluir atendimento</button>') + "</div></form>";
  showModal(readOnly ? "Detalhes do atendimento" : "Registrar atendimento", (patient ? patient.name : "Paciente") + " · " + appointment.id, body);
}

function openCancelAppointmentModal(appointment) {
  const body = '<form id="cancel-appointment-form"><input type="hidden" name="id" value="' + escapeHtml(appointment.id) + '" /><div class="form-field"><label for="cancel-reason">Motivo do cancelamento</label><textarea id="cancel-reason" name="reason" maxlength="300" required placeholder="Informe um motivo para manter no histórico"></textarea></div><div class="modal-note">A consulta será marcada como cancelada. O registro e o motivo permanecem no histórico demonstrativo.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Voltar</button><button type="submit" class="button button-danger">Confirmar cancelamento</button></div></form>';
  showModal("Cancelar consulta", "O histórico do agendamento será preservado.", body);
}

function openLesionModal(patientId) {
  if (patientId && getPatient(patientId) && getPatient(patientId).status !== "active") {
    toast("Reative o cadastro antes de registrar novas lesões.", true);
    return;
  }
  const selected = defaultActivePatient(patientId || selectedPatientId || mapPatientId);
  const choices = patientChoices(selected, true);
  const body = '<form id="lesion-form" novalidate><div id="lesion-form-error" class="form-error hidden"></div><div class="form-grid">' +
    selectField("Paciente", "lesion-patient", choices, selected, true) +
    field("Região corporal", "lesion-location", "text", "", true, ' maxlength="120" placeholder="Ex.: braço esquerdo · face externa"') +
    selectField("Vista do mapa", "lesion-view", [["front", "Frente"], ["back", "Costas"]], mapView, true) +
    selectField("Marcador de acompanhamento", "lesion-status", [["stable", "Estável"], ["attention", "Atenção"], ["priority", "Revisão prioritária"]], "stable", true) +
    field("Maior medida (mm)", "lesion-length", "number", "", true, ' min="0.1" max="500" step="0.1" placeholder="Ex.: 4.2"') +
    field("Menor medida (mm)", "lesion-width", "number", "", true, ' min="0.1" max="500" step="0.1" placeholder="Ex.: 3.7"') +
    field("Posição horizontal no mapa (0 a 100)", "lesion-x", "number", "50", true, ' min="0" max="100"') +
    field("Posição vertical no mapa (0 a 100)", "lesion-y", "number", "45", true, ' min="0" max="100"') +
    '<div class="form-field full"><label for="lesion-description">Características observadas</label><textarea id="lesion-description" name="description" maxlength="1000" placeholder="Descrição para acompanhamento profissional"></textarea></div></div><div class="modal-note"><b>Identificador:</b> será criado automaticamente. A posição no mapa é aproximada e pode ser revisada visualmente.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Registrar lesão</button></div></form>';
  showModal("Registrar nova lesão", "Associe um identificador permanente e registre a primeira medida.", body);
}

function openEvolutionModal(lesionId) {
  const lesion = getLesion(lesionId);
  if (!lesion) { toast("Selecione uma lesão antes de registrar a evolução.", true); return; }
  const last = lesion.measurements.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0] || {};
  const body = '<form id="evolution-form"><input type="hidden" name="id" value="' + escapeHtml(lesion.id) + '" /><div class="form-grid"><div class="form-field"><label>Lesão</label><input readonly value="' + escapeHtml(lesion.id + " · " + lesion.location) + '" /></div>' +
    field("Data do registro", "evolution-date", "date", todayLocal(), true, ' max="' + todayLocal() + '"') +
    field("Maior medida (mm)", "evolution-length", "number", last.length || "", true, ' min="0.1" max="500" step="0.1"') +
    field("Menor medida (mm)", "evolution-width", "number", last.width || "", true, ' min="0.1" max="500" step="0.1"') +
    selectField("Marcador de acompanhamento", "evolution-status", [["stable", "Estável"], ["attention", "Atenção"], ["priority", "Revisão prioritária"]], lesion.status, true) +
    '<div class="form-field full"><label for="evolution-notes">Observações</label><textarea id="evolution-notes" name="notes" maxlength="800" placeholder="Descreva o registro de acompanhamento">' + escapeHtml(last.notes || "") + '</textarea></div></div><div class="modal-note">A evolução será acrescentada ao histórico. Os registros anteriores serão preservados.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Salvar evolução</button></div></form>';
  showModal("Registrar evolução", "Atualize as medidas e preserve a linha do tempo da lesão.", body);
}

function openSuggestionRejection(suggestion) {
  const body = '<form id="suggestion-reject-form"><input type="hidden" name="id" value="' + escapeHtml(suggestion.id) + '" /><div class="form-field"><label for="reject-reason">Motivo da rejeição</label><textarea id="reject-reason" name="reason" maxlength="500" required placeholder="Registre a justificativa profissional"></textarea></div><div class="modal-note">A decisão será associada ao usuário e à data. A sugestão não altera os registros clínicos.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Voltar</button><button type="submit" class="button button-danger">Registrar rejeição</button></div></form>';
  showModal("Rejeitar sugestão", suggestion.type, body);
}

function openSuggestionAcceptance(suggestion) {
  const body = '<form id="suggestion-accept-form"><input type="hidden" name="id" value="' + escapeHtml(suggestion.id) + '" /><div class="modal-note"><b>Confirmação profissional.</b><br>' + escapeHtml(suggestion.evidence) + '<br><br>Aceitar registra sua decisão e mantém as evidências como sugestão assistiva. Nenhum diagnóstico ou alteração clínica será criado automaticamente.</div><div class="form-field" style="margin-top:12px"><label for="accept-note">Observação opcional</label><textarea id="accept-note" name="note" maxlength="500"></textarea></div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Voltar</button><button type="submit" class="button button-primary">Confirmar aceite</button></div></form>';
  showModal("Validar sugestão", suggestion.type, body);
}

function openTreatmentModal(patientId) {
  if (patientId && getPatient(patientId) && getPatient(patientId).status !== "active") { toast("Reative o cadastro antes de criar um tratamento.", true); return; }
  const selected = defaultActivePatient(patientId || selectedPatientId);
  const choices = patientChoices(selected, true);
  const body = '<form id="treatment-form"><div class="form-grid">' + selectField("Paciente", "treatment-patient", choices, selected, true) + field("Descrição", "treatment-description", "text", "", true, ' maxlength="160"') + field("Data de início", "treatment-start", "date", todayLocal(), true, "") + selectField("Status", "treatment-status", [["active", "Ativo"], ["completed", "Encerrado"]], "active", true) + '<div class="form-field full"><label for="treatment-note">Observações</label><textarea id="treatment-note" name="note" maxlength="700"></textarea></div></div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Salvar tratamento</button></div></form>';
  showModal("Registrar tratamento", "Vincule um tratamento ao prontuário do paciente.", body);
}

function openExamModal(patientId) {
  if (patientId && getPatient(patientId) && getPatient(patientId).status !== "active") { toast("Reative o cadastro antes de criar um exame.", true); return; }
  const selected = defaultActivePatient(patientId || selectedPatientId);
  const choices = patientChoices(selected, true);
  const body = '<form id="exam-form"><div class="form-grid">' + selectField("Paciente", "exam-patient", choices, selected, true) + selectField("Tipo de exame", "exam-type", [["Dermatoscopia", "Dermatoscopia"], ["Registro fotográfico", "Registro fotográfico"], ["Biópsia", "Biópsia"], ["Outro", "Outro"]], "Dermatoscopia", true) + field("Data", "exam-date", "date", todayLocal(), true, ' max="' + todayLocal() + '"') + '<div class="form-field full"><label for="exam-result">Resultado ou observações</label><textarea id="exam-result" name="result" maxlength="1500" required></textarea></div></div><div class="modal-note">O resultado é armazenado localmente nesta demonstração.</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Salvar exame</button></div></form>';
  showModal("Registrar exame", "Associe o registro ao prontuário do paciente.", body);
}

function openAppointmentInfo(appointment) {
  const person = getPatient(appointment.patientId);
  const body = '<div class="form-grid"><div class="form-field"><label>Paciente</label><input readonly value="' + escapeHtml(person ? person.name : "Paciente") + '" /></div><div class="form-field"><label>Status</label><input readonly value="' + escapeHtml(statusLabels[appointment.status]) + '" /></div><div class="form-field"><label>Data e horário</label><input readonly value="' + escapeHtml(formatDate(appointment.date) + " · " + appointment.time + " · " + appointment.duration + " min") + '" /></div><div class="form-field"><label>Profissional</label><input readonly value="' + escapeHtml(appointment.provider) + '" /></div><div class="form-field full"><label>Observações</label><textarea readonly>' + escapeHtml(appointment.note || "Sem observações registradas.") + "</textarea></div></div>" + (person ? '<button class="button button-soft button-small" style="margin-top:13px" data-action="open-patient" data-id="' + escapeHtml(person.id) + '">Abrir prontuário</button>' : "") + '<div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Fechar</button></div>';
  showModal("Detalhes da consulta", appointment.id, body);
}

function openImageDatabase() {
  return new Promise(function (resolve, reject) {
    if (!window.indexedDB) { reject(new Error("O navegador não oferece armazenamento local de imagens.")); return; }
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error || new Error("Falha ao abrir armazenamento local.")); };
  });
}
async function storeImage(id, file) {
  const db = await openImageDatabase();
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction("photos", "readwrite");
    transaction.objectStore("photos").put({ id: id, blob: file, name: file.name, type: file.type });
    transaction.oncomplete = function () { db.close(); resolve(true); };
    transaction.onerror = function () { db.close(); reject(transaction.error || new Error("Falha ao guardar imagem.")); };
  });
}
async function loadImage(id) {
  if (photoUrlCache.has(id)) return photoUrlCache.get(id);
  const db = await openImageDatabase();
  const record = await new Promise(function (resolve, reject) {
    const request = db.transaction("photos", "readonly").objectStore("photos").get(id);
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
  db.close();
  if (!record || !record.blob) return "";
  const url = URL.createObjectURL(record.blob);
  photoUrlCache.set(id, url);
  return url;
}
async function deleteAllStoredImages() {
  if (!window.indexedDB) return;
  const db = await openImageDatabase();
  await new Promise(function (resolve, reject) {
    const request = db.transaction("photos", "readwrite").objectStore("photos").clear();
    request.onsuccess = function () { resolve(true); };
    request.onerror = function () { reject(request.error); };
  });
  db.close();
  photoUrlCache.forEach(function (url) { URL.revokeObjectURL(url); });
  photoUrlCache.clear();
}
function hydratePhotoImages() {
  document.querySelectorAll("img[data-image-id]").forEach(async function (img) {
    try {
      const url = await loadImage(img.dataset.imageId);
      if (url && img.isConnected) img.src = url;
      else if (!url && img.isConnected) img.closest(".photo-thumb").classList.add("photo-missing");
    } catch (error) {
      if (img.isConnected) img.closest(".photo-thumb").classList.add("photo-missing");
    }
  });
}

function csvCell(value) {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function downloadText(filename, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
}
function reportRows(sections, patientId, from, to) {
  const patients = state.patients.filter(function (p) { return patientId === "all" || p.id === patientId; });
  const ids = new Set(patients.map(function (p) { return p.id; }));
  const rows = [["Seção", "Paciente", "Identificador", "Data", "Detalhes"]];
  if (sections.includes("patients")) patients.forEach(function (p) { rows.push(["Paciente", p.name, p.id, p.createdAt, [p.phone, p.email, p.status].filter(Boolean).join(" · ")]); });
  if (sections.includes("appointments")) state.appointments.filter(function (a) { return ids.has(a.patientId) && a.date >= from && a.date <= to; }).forEach(function (a) { const p = getPatient(a.patientId); rows.push(["Consulta", p ? p.name : "", a.id, a.date + " " + a.time, a.type + " · " + statusLabels[a.status] + (a.note ? " · " + a.note : "")]); });
  if (sections.includes("lesions")) state.lesions.filter(function (l) { return ids.has(l.patientId); }).forEach(function (l) { const p = getPatient(l.patientId); sortMeasurementsLatestFirst(l.measurements).filter(function (m) { return m.date >= from && m.date <= to; }).forEach(function (m) { rows.push(["Evolução da lesão", p ? p.name : "", l.id, m.date, l.location + " · " + m.length + " × " + m.width + " mm · " + m.notes]); }); });
  if (sections.includes("treatments")) state.treatments.filter(function (t) { return ids.has(t.patientId) && t.startDate >= from && t.startDate <= to; }).forEach(function (t) { const p = getPatient(t.patientId); rows.push(["Tratamento", p ? p.name : "", t.id, t.startDate, t.description + " · " + statusLabels[t.status] + (t.note ? " · " + t.note : "")]); });
  if (sections.includes("treatments")) state.exams.filter(function (e) { return ids.has(e.patientId) && e.date >= from && e.date <= to; }).forEach(function (e) { const p = getPatient(e.patientId); rows.push(["Exame", p ? p.name : "", e.id, e.date, e.type + " · " + e.result]); });
  return rows;
}
function rememberReport(format, patientId, sections, from, to) {
  const patient = patientId === "all" ? null : getPatient(patientId);
  const report = { id: uid("RP"), title: patient ? "Relatório · " + patient.name : "Relatório da unidade", format: format, patientId: patientId, sections: sections, from: from, to: to, scope: patient ? patient.name : "Toda a unidade", generatedAt: nowIso() };
  state.reports.unshift(report);
  recordAudit("Relatório exportado", report.id, report.title + " · " + format.toUpperCase());
  saveState();
  return report;
}
function selectedReportConfig() {
  const sections = Array.from(document.querySelectorAll('input[name="report-section"]:checked')).map(function (input) { return input.value; });
  const from = document.getElementById("report-from")?.value || "1900-01-01";
  const to = document.getElementById("report-to")?.value || todayLocal();
  const patientId = document.getElementById("report-patient")?.value || reportPatientFilter;
  if (!sections.length) { toast("Selecione ao menos uma seção para exportar.", true); return null; }
  if (from > to) { toast("A data inicial deve ser anterior à data final.", true); return null; }
  return { sections: sections, from: from, to: to, patientId: patientId };
}
function exportCsv(config, remember) {
  const rows = reportRows(config.sections, config.patientId, config.from, config.to);
  const csv = "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(";"); }).join("\r\n");
  const report = remember ? rememberReport("csv", config.patientId, config.sections, config.from, config.to) : null;
  const suffix = config.patientId === "all" ? "unidade" : config.patientId.toLowerCase();
  downloadText("dermavision-" + suffix + "-" + todayLocal() + ".csv", csv, "text/csv;charset=utf-8");
  if (remember) { render(); toast("CSV gerado e registrado no histórico."); }
  return report;
}
function printReport(config, remember) {
  const rows = reportRows(config.sections, config.patientId, config.from, config.to);
  const escape = escapeHtml;
  const tableRows = rows.slice(1).map(function (r) { return "<tr>" + r.map(function (cell) { return "<td>" + escape(cell) + "</td>"; }).join("") + "</tr>"; }).join("");
  const patient = config.patientId === "all" ? null : getPatient(config.patientId);
  const title = patient ? "Relatório clínico · " + patient.name : "Relatório da unidade DermaVision";
  const popup = window.open("", "_blank");
  if (!popup) { toast("Permita a janela de impressão para salvar o relatório em PDF.", true); return; }
  popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + escape(title) + '</title><style>body{font:12px Arial,sans-serif;color:#243c36;margin:32px}h1{font-size:20px}p{color:#62756c;font-size:11px}.note{background:#f7f1e2;padding:10px;margin:18px 0;font-size:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:8px;border-bottom:1px solid #dce5df;vertical-align:top;font-size:10px}th{background:#f3f7f4;color:#49675b}@media print{body{margin:18mm}}</style></head><body><h1>' + escape(title) + '</h1><p>Período: ' + escape(formatDate(config.from)) + " até " + escape(formatDate(config.to)) + " · Gerado em " + escape(formatDate(nowIso())) + '</p><div class="note">Demonstração com dados fictícios. Este documento não substitui o prontuário clínico oficial.</div><table><thead><tr>' + rows[0].map(function (cell) { return "<th>" + escape(cell) + "</th>"; }).join("") + "</tr></thead><tbody>" + tableRows + "</tbody></table></body></html>");
  popup.document.close();
  window.setTimeout(function () { popup.focus(); popup.print(); }, 100);
  if (remember) { rememberReport("pdf", config.patientId, config.sections, config.from, config.to); render(); }
}

function openHelpModal() {
  const body = '<div class="grid" style="gap:12px"><div class="modal-note"><b>Pacientes</b><br>Cadastre registros fictícios, abra o prontuário e navegue entre as abas de histórico.</div><div class="modal-note"><b>Lesões e mapa</b><br>Escolha uma pessoa, alterne frente e costas e selecione um marcador para ver as medidas registradas. Fotos são guardadas no armazenamento local do navegador.</div><div class="modal-note"><b>Apoio assistivo</b><br>Os percentuais e sugestões são demonstrativos. Revise, aceite ou rejeite cada sugestão para registrar uma decisão profissional de exemplo.</div><div class="settings-notice"><b>Uso previsto:</b> demonstração funcional com dados fictícios. Não conecte registros reais nem utilize a aplicação em atendimento.</div></div><div class="modal-footer"><button class="button button-primary" data-action="close-modal">Entendi</button></div>';
  showModal("Guia rápido", "Conheça os principais fluxos da demonstração.", body);
}

function openPatientStatusConfirmation(patient) {
  const next = patient.status === "active" ? "inactive" : "active";
  const verb = next === "inactive" ? "desativar" : "reativar";
  const body = '<div class="modal-note">O histórico clínico e os registros associados serão preservados. O prontuário ficará marcado como <b>' + escapeHtml(statusLabels[next].toLowerCase()) + '</b>.</div><form id="patient-status-form"><input type="hidden" name="id" value="' + escapeHtml(patient.id) + '"><input type="hidden" name="status" value="' + next + '"><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Confirmar ação</button></div></form>';
  showModal("Confirmar " + verb + " paciente", patient.name, body);
}

function openLesionArchiveConfirmation(lesion) {
  const action = lesion.archived ? "restaurar" : "arquivar";
  const body = '<div class="modal-note">O histórico desta lesão será mantido. ' + (lesion.archived ? "Ela voltará a aparecer no mapa ativo." : "Ela deixará de aparecer no mapa ativo, mas continuará no prontuário.") + '</div><form id="lesion-archive-form"><input type="hidden" name="id" value="' + escapeHtml(lesion.id) + '"><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Confirmar ' + action + "</button></div></form>";
  showModal("Confirmar " + action + " lesão", lesion.id + " · " + lesion.location, body);
}

async function handlePhotoUpload(input) {
  const lesion = getLesion(selectedLesionId);
  if (!lesion) { toast("Selecione uma lesão antes de anexar imagens.", true); return; }
  const files = Array.from(input.files || []);
  if (!files.length) return;
  const valid = [];
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) continue;
    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(file);
        const decodable = bitmap.width > 0 && bitmap.height > 0;
        bitmap.close();
        if (decodable) valid.push(file);
      } else {
        const objectUrl = URL.createObjectURL(file);
        const decodable = await new Promise(function (resolve) {
          const image = new Image();
          image.onload = function () { resolve(image.naturalWidth > 0 && image.naturalHeight > 0); };
          image.onerror = function () { resolve(false); };
          image.src = objectUrl;
        });
        URL.revokeObjectURL(objectUrl);
        if (decodable) valid.push(file);
      }
    } catch (error) {
      console.warn("Arquivo de imagem ilegível ignorado.", error);
    }
  }
  if (valid.length !== files.length) toast("Arquivos inválidos ou ilegíveis foram ignorados. Use JPG, PNG ou WebP válidos até 15 MB.", true);
  let saved = 0;
  for (const file of valid) {
    try {
      const id = uid("IMG");
      await storeImage(id, file);
      lesion.images = lesion.images || [];
      lesion.images.push({ id: id, name: file.name, type: file.type, size: file.size, date: todayLocal(), createdAt: nowIso() });
      saved++;
    } catch (error) {
      console.error(error);
      toast("Falha ao guardar uma imagem neste navegador.", true);
    }
  }
  if (saved) {
    addEvent(lesion.patientId, "image", "Imagem adicionada", lesion.id + " · " + saved + (saved === 1 ? " arquivo" : " arquivos"));
    recordAudit("Imagem adicionada", lesion.id, saved + " arquivo(s) de imagem");
    saveState();
    render();
    toast(saved + (saved === 1 ? " imagem vinculada à lesão." : " imagens vinculadas à lesão."));
  }
  input.value = "";
}

function openCompareModal() {
  const lesion = getLesion(selectedLesionId);
  const photos = lesion ? (lesion.images || []).filter(function (img) { return !img.deleted; }) : [];
  if (photos.length < 2) {
    showModal("Comparação temporal", "Imagens vinculadas à lesão", '<div class="empty-state"><div><span class="empty-state-icon">▧</span><strong>Adicione ao menos duas imagens</strong>O comparador será disponibilizado quando houver dois registros fotográficos.</div></div><div class="modal-footer"><button class="button button-primary" data-action="close-modal">Fechar</button></div>');
    return;
  }
  const sorted = photos.slice().sort(function (a, b) { return (a.date || a.createdAt).localeCompare(b.date || b.createdAt); });
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const body = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div><div class="photo-area-head">Antes · ' + escapeHtml(formatDate(first.date)) + '</div><div class="photo-thumb" style="height:260px"><span>Foto anterior</span><img data-image-id="' + escapeHtml(first.id) + '" alt="Imagem anterior da lesão" /></div></div><div><div class="photo-area-head">Depois · ' + escapeHtml(formatDate(last.date)) + '</div><div class="photo-thumb" style="height:260px"><span>Foto mais recente</span><img data-image-id="' + escapeHtml(last.id) + '" alt="Imagem mais recente da lesão" /></div></div></div><div class="modal-note">Compare as imagens visualmente. Diferenças de iluminação, ângulo e distância podem alterar a aparência. A avaliação permanece com o profissional.</div><div class="modal-footer"><button class="button button-secondary" data-action="close-modal">Fechar</button></div>';
  showModal("Comparação antes e depois", lesion.id + " · " + lesion.location, body, true);
  hydratePhotoImages();
}

function handleClick(event) {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    event.preventDefault();
    const next = routeButton.dataset.route;
    if (next === "settings" && routeButton.dataset.settingsTab) settingsTab = routeButton.dataset.settingsTab;
    if (next === "patient") go("patient", routeButton.dataset.id);
    else go(next);
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    if (event.target.id === "modal-backdrop") closeModal();
    return;
  }
  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;
  if (action === "submit-modal") {
    const form = document.getElementById(actionButton.dataset.formId);
    if (form) handleSubmit({ target: form, preventDefault: function () {} });
    return;
  }
  if (action === "close-modal") { closeModal(); return; }
  if (action === "open-patient") { go("patient", id); return; }
  if (action === "open-lesion") {
    const l = getLesion(id);
    if (l) { mapPatientId = l.patientId; mapView = l.view; selectedLesionId = l.id; go("lesions"); }
    return;
  }
  if (action === "new-patient") { openPatientModal(null); return; }
  if (action === "edit-patient") { openPatientModal(getPatient(id)); return; }
  if (action === "new-appointment") { openAppointmentModal(actionButton.dataset.patientId); return; }
  if (action === "new-lesion") { openLesionModal(actionButton.dataset.patientId); return; }
  if (action === "new-evolution") { openEvolutionModal(id || selectedLesionId); return; }
  if (action === "new-treatment") { openTreatmentModal(actionButton.dataset.patientId); return; }
  if (action === "new-exam") { openExamModal(actionButton.dataset.patientId); return; }
  if (action === "appointment-register") {
    const appt = state.appointments.find(function (a) { return a.id === id; });
    if (appt) openAttendanceModal(appt, false);
    return;
  }
  if (action === "appointment-detail") {
    const appt = state.appointments.find(function (a) { return a.id === id; });
    if (appt) appt.status === "completed" ? openAttendanceModal(appt, true) : openAppointmentInfo(appt);
    return;
  }
  if (action === "appointment-cancel") {
    const appt = state.appointments.find(function (a) { return a.id === id; });
    if (appt) openCancelAppointmentModal(appt);
    return;
  }
  if (action === "patient-tab") { patientTab = actionButton.dataset.tab; render(); return; }
  if (action === "select-agenda-date") { agendaDate = actionButton.dataset.date; render(); return; }
  if (action === "set-map-view") { mapView = actionButton.dataset.view; const next = currentMapLesions(); selectedLesionId = next[0] ? next[0].id : ""; render(); return; }
  if (action === "select-lesion") { selectedLesionId = id; render(); return; }
  if (action === "accept-suggestion") {
    const suggestion = state.suggestions.find(function (s) { return s.id === id; });
    if (suggestion && suggestion.status === "pending") openSuggestionAcceptance(suggestion);
    return;
  }
  if (action === "reject-suggestion") {
    const suggestion = state.suggestions.find(function (s) { return s.id === id; });
    if (suggestion && suggestion.status === "pending") openSuggestionRejection(suggestion);
    return;
  }
  if (action === "toggle-patient-status") { const p = getPatient(id); if (p) openPatientStatusConfirmation(p); return; }
  if (action === "toggle-lesion-archive") { const l = getLesion(id); if (l) openLesionArchiveConfirmation(l); return; }
  if (action === "upload-photo") {
    if (!selectedLesionId) { toast("Selecione uma lesão antes de anexar imagens.", true); return; }
    let input = document.getElementById("lesion-file-input");
    if (!input) {
      input = document.createElement("input");
      input.id = "lesion-file-input"; input.type = "file"; input.accept = "image/jpeg,image/png,image/webp"; input.multiple = true; input.hidden = true;
      document.body.appendChild(input);
      input.addEventListener("change", function () { handlePhotoUpload(input); });
    }
    input.click(); return;
  }
  if (action === "compare-photos") { openCompareModal(); return; }
  if (action === "settings-tab") { settingsTab = actionButton.dataset.tab; render(); return; }
  if (action === "help") { openHelpModal(); return; }
  if (action === "notifications") { mapPatientId = "P-10279"; selectedLesionId = "L-0188"; mapView = "back"; go("lesions"); toast("Há sugestões assistivas aguardando revisão."); return; }
  if (action === "profile") { document.getElementById("profile-popover").classList.toggle("hidden"); return; }
  if (action === "logout") { sessionStorage.removeItem("dermavision-demo-auth"); appView.classList.add("hidden"); authView.classList.remove("hidden"); closeModal(); return; }
  if (action === "export-patients") { exportPatientsCsv(); return; }
  if (action === "export-appointments") { exportAppointmentsCsv(); return; }
  if (action === "generate-csv") { const config = selectedReportConfig(); if (config) exportCsv(config, true); return; }
  if (action === "generate-pdf") { const config = selectedReportConfig(); if (config) printReport(config, true); return; }
  if (action === "repeat-report") {
    const report = state.reports.find(function (r) { return r.id === id; });
    if (!report) return;
    const config = { sections: report.sections, patientId: report.patientId, from: report.from, to: report.to };
    report.format === "csv" ? exportCsv(config, false) : printReport(config, false);
    return;
  }
  if (action === "patient-report") { reportPatientFilter = actionButton.dataset.patientId; go("reports"); return; }
  if (action === "reset-demo") { resetDemo(); return; }
  if (action === "dismiss-banner") { document.querySelector(".demo-banner")?.remove(); return; }
  if (action === "mobile-menu") { document.getElementById("sidebar").classList.toggle("open"); return; }
}

function overlap(a, b) {
  const toMinutes = function (time) { const parts = time.split(":").map(Number); return parts[0] * 60 + parts[1]; };
  const aStart = toMinutes(a.time), bStart = toMinutes(b.time);
  return aStart < bStart + b.duration && bStart < aStart + a.duration;
}
function displayFormError(id, message) {
  const box = document.getElementById(id);
  if (box) { box.textContent = message; box.classList.remove("hidden"); }
}

function handleSubmit(event) {
  const form = event.target;
  if (!form || form.tagName !== "FORM") return;
  const id = form.getAttribute("id") || "";
  if (id === "login-form") {
    event.preventDefault();
    if (!form.reportValidity()) return;
    sessionStorage.setItem("dermavision-demo-auth", "true");
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    route = "dashboard";
    render();
    return;
  }
  if (["patient-form", "appointment-form", "attendance-form", "cancel-appointment-form", "lesion-form", "evolution-form", "suggestion-reject-form", "suggestion-accept-form", "treatment-form", "exam-form", "clinic-form", "preferences-form", "patient-status-form", "lesion-archive-form"].includes(id)) {
    event.preventDefault();
    if (!form.reportValidity()) return;
  } else return;
  const data = new FormData(form);
  if (id === "patient-form") {
    const existingId = String(data.get("id") || "");
    const name = String(data.get("name") || "").trim();
    const dob = String(data.get("dob") || "");
    const duplicate = state.patients.find(function (p) { return p.id !== existingId && p.dob === dob && p.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"); });
    if (duplicate) { displayFormError("patient-form-error", "Já existe um paciente com este nome e data de nascimento. Revise o cadastro antes de continuar."); return; }
    if (existingId) {
      const patient = getPatient(existingId);
      if (!patient) return;
      Object.assign(patient, { name: name, dob: dob, sex: String(data.get("sex") || ""), phone: String(data.get("phone") || "").trim(), email: String(data.get("email") || "").trim(), cpf: String(data.get("cpf") || "").trim(), notes: String(data.get("notes") || "").trim() });
      recordAudit("Paciente atualizado", patient.id, "Dados cadastrais atualizados");
      addEvent(patient.id, "patient", "Cadastro atualizado", "Informações cadastrais alteradas");
      selectedPatientId = patient.id;
      toast("Cadastro atualizado.");
    } else {
      const patient = { id: uid("P"), name: name, dob: dob, sex: String(data.get("sex") || ""), phone: String(data.get("phone") || "").trim(), email: String(data.get("email") || "").trim(), cpf: String(data.get("cpf") || "").trim(), status: "active", createdAt: todayLocal(), notes: String(data.get("notes") || "").trim(), lastVisit: "" };
      state.patients.push(patient);
      selectedPatientId = patient.id;
      addEvent(patient.id, "patient", "Paciente cadastrado", "Novo prontuário demonstrativo");
      recordAudit("Paciente cadastrado", patient.id, "Novo prontuário criado");
      route = "patient";
      patientTab = "summary";
      toast("Paciente cadastrado.");
    }
    saveState(); closeModal(); render(); return;
  }
  if (id === "appointment-form") {
    const patientId = String(data.get("patient") || "");
    const date = String(data.get("date") || "");
    const time = String(data.get("time") || "");
    const duration = Number(data.get("duration") || 30);
    const patient = getPatient(patientId);
    if (!patient || patient.status !== "active") { displayFormError("appointment-form-error", "Selecione um paciente ativo."); return; }
    if (date < todayLocal()) { displayFormError("appointment-form-error", "Não é possível agendar uma consulta em uma data passada."); return; }
    const candidate = { date: date, time: time, duration: duration, provider: String(data.get("provider") || state.currentUser.name) };
    const conflict = state.appointments.find(function (a) { return a.date === date && a.provider === candidate.provider && a.status !== "cancelled" && overlap(a, candidate); });
    if (conflict) {
      const suggestions = ["09:00", "11:00", "14:30", "16:00"].filter(function (slot) {
        const alternative = { date: date, time: slot, duration: duration };
        return !state.appointments.some(function (a) { return a.date === date && a.provider === candidate.provider && a.status !== "cancelled" && overlap(a, alternative); });
      }).slice(0, 3);
      displayFormError("appointment-form-error", "Conflito com " + conflict.time + ". Horários livres sugeridos: " + (suggestions.join(", ") || "nenhum disponível neste dia") + ".");
      return;
    }
    const appointment = { id: uid("C"), patientId: patientId, date: date, time: time, duration: duration, type: String(data.get("type") || "Consulta dermatológica"), status: "scheduled", provider: candidate.provider, note: String(data.get("note") || "").trim() };
    state.appointments.push(appointment);
    addEvent(patientId, "visit", "Consulta agendada", formatDate(date) + " · " + time);
    recordAudit("Consulta agendada", appointment.id, patient.name + " · " + date + " " + time);
    agendaDate = date;
    selectedPatientId = patientId;
    route = "patient";
    patientTab = "appointments";
    saveState(); closeModal(); render(); toast("Consulta agendada para " + formatDate(date) + " às " + time + "."); return;
  }
  if (id === "attendance-form") {
    const appointment = state.appointments.find(function (a) { return a.id === String(data.get("id") || ""); });
    if (!appointment) return;
    appointment.status = "completed";
    appointment.note = String(data.get("note") || "").trim();
    const patient = getPatient(appointment.patientId);
    if (patient) patient.lastVisit = appointment.date;
    addEvent(appointment.patientId, "visit", "Atendimento concluído", appointment.type + (appointment.note ? " · " + appointment.note.slice(0, 180) : ""));
    recordAudit("Consulta concluída", appointment.id, "Atendimento clínico registrado");
    saveState(); closeModal(); render(); toast("Atendimento registrado no histórico."); return;
  }
  if (id === "cancel-appointment-form") {
    const appointment = state.appointments.find(function (a) { return a.id === String(data.get("id") || ""); });
    if (!appointment) return;
    appointment.status = "cancelled";
    appointment.note = [appointment.note, "Cancelada: " + String(data.get("reason") || "").trim()].filter(Boolean).join(" · ");
    addEvent(appointment.patientId, "visit", "Consulta cancelada", appointment.date + " · " + appointment.time);
    recordAudit("Consulta cancelada", appointment.id, "Motivo registrado");
    saveState(); closeModal(); render(); toast("Consulta cancelada; histórico preservado."); return;
  }
  if (id === "lesion-form") {
    const patient = getPatient(String(data.get("patient") || ""));
    if (!patient || patient.status !== "active") { displayFormError("lesion-form-error", "Selecione um paciente ativo."); return; }
    const lesion = { id: uid("L"), patientId: patient.id, location: String(data.get("location") || "").trim(), view: String(data.get("view") || "front"), x: Number(data.get("x") || 50), y: Number(data.get("y") || 45), status: String(data.get("status") || "stable"), firstSeen: todayLocal(), measurements: [{ date: todayLocal(), length: Number(data.get("length")), width: Number(data.get("width")), notes: "Registro inicial" }], description: String(data.get("description") || "").trim(), images: [], archived: false };
    if (!lesion.location || lesion.measurements[0].length <= 0 || lesion.measurements[0].width <= 0) { displayFormError("lesion-form-error", "Informe localização e medidas válidas."); return; }
    state.lesions.push(lesion);
    mapPatientId = patient.id; mapView = lesion.view; selectedLesionId = lesion.id; route = "lesions";
    addEvent(patient.id, "lesion", "Lesão registrada", lesion.id + " · " + lesion.location);
    recordAudit("Lesão registrada", lesion.id, patient.name + " · " + lesion.location);
    saveState(); closeModal(); render(); toast("Lesão registrada com identificador " + lesion.id + "."); return;
  }
  if (id === "evolution-form") {
    const lesion = getLesion(String(data.get("id") || ""));
    if (!lesion) return;
    const item = { date: String(data.get("date") || todayLocal()), length: Number(data.get("length")), width: Number(data.get("width")), notes: String(data.get("notes") || "").trim() };
    if (item.length <= 0 || item.width <= 0) { toast("Informe medidas maiores que zero.", true); return; }
    lesion.measurements.push(item);
    lesion.status = String(data.get("status") || lesion.status);
    addEvent(lesion.patientId, "lesion", "Evolução registrada", lesion.id + " · " + item.length + " × " + item.width + " mm");
    recordAudit("Evolução registrada", lesion.id, "Medidas e observações atualizadas");
    saveState(); closeModal(); render(); toast("Evolução adicionada à linha do tempo."); return;
  }
  if (id === "suggestion-accept-form" || id === "suggestion-reject-form") {
    const suggestion = state.suggestions.find(function (s) { return s.id === String(data.get("id") || ""); });
    if (!suggestion || suggestion.status !== "pending") return;
    suggestion.status = id === "suggestion-accept-form" ? "accepted" : "rejected";
    suggestion.decisionAt = nowIso();
    suggestion.decisionBy = state.currentUser.name;
    suggestion.decisionNote = String(data.get(id === "suggestion-accept-form" ? "note" : "reason") || "").trim();
    recordAudit(suggestion.status === "accepted" ? "Sugestão aceita" : "Sugestão rejeitada", suggestion.id, suggestion.decisionNote || "Decisão profissional registrada");
    saveState(); closeModal(); render(); toast(suggestion.status === "accepted" ? "Aceite profissional registrado." : "Rejeição profissional registrada."); return;
  }
  if (id === "patient-status-form") {
    const patient = getPatient(String(data.get("id") || ""));
    if (!patient) return;
    patient.status = String(data.get("status") || "inactive");
    recordAudit(patient.status === "active" ? "Paciente reativado" : "Paciente desativado", patient.id, "Histórico preservado");
    saveState(); closeModal(); render(); toast("Situação do paciente atualizada."); return;
  }
  if (id === "lesion-archive-form") {
    const lesion = getLesion(String(data.get("id") || ""));
    if (!lesion) return;
    lesion.archived = !lesion.archived;
    recordAudit(lesion.archived ? "Lesão arquivada" : "Lesão restaurada", lesion.id, "Histórico preservado");
    saveState(); closeModal(); render(); toast(lesion.archived ? "Lesão arquivada; histórico preservado." : "Lesão restaurada no mapa."); return;
  }
  if (id === "treatment-form") {
    const patientId = String(data.get("patient") || "");
    const treatment = { id: uid("T"), patientId: patientId, description: String(data.get("description") || "").trim(), startDate: String(data.get("start") || todayLocal()), endDate: String(data.get("status")) === "completed" ? todayLocal() : "", status: String(data.get("status") || "active"), note: String(data.get("note") || "").trim() };
    state.treatments.push(treatment);
    addEvent(patientId, "treatment", "Tratamento registrado", treatment.description);
    recordAudit("Tratamento registrado", treatment.id, treatment.description);
    saveState(); closeModal(); render(); toast("Tratamento vinculado ao prontuário."); return;
  }
  if (id === "exam-form") {
    const patientId = String(data.get("patient") || "");
    const exam = { id: uid("E"), patientId: patientId, type: String(data.get("type") || ""), date: String(data.get("date") || todayLocal()), result: String(data.get("result") || "").trim() };
    state.exams.push(exam);
    addEvent(patientId, "exam", "Exame registrado", exam.type);
    recordAudit("Exame registrado", exam.id, exam.type);
    saveState(); closeModal(); render(); toast("Exame vinculado ao prontuário."); return;
  }
  if (id === "clinic-form") {
    Object.assign(state.clinic, { name: String(data.get("name") || "").trim(), registration: String(data.get("registration") || "").trim(), phone: String(data.get("phone") || "").trim(), email: String(data.get("email") || "").trim(), address: String(data.get("address") || "").trim() });
    recordAudit("Dados da clínica atualizados", "CLINIC", "Informações demonstrativas atualizadas");
    saveState(); render(); toast("Dados da clínica atualizados."); return;
  }
  if (id === "preferences-form") {
    state.clinic.defaultDuration = Number(document.getElementById("pref-duration").value);
    state.clinic.reminderHours = Number(document.getElementById("pref-reminder").value);
    recordAudit("Preferências atualizadas", "SETTINGS", "Parâmetros da unidade atualizados");
    saveState(); render(); toast("Preferências salvas."); return;
  }
}

function exportPatientsCsv() {
  const rows = [["Identificador", "Nome", "Nascimento", "Idade", "Telefone", "E-mail", "Status"]];
  state.patients.forEach(function (p) { rows.push([p.id, p.name, p.dob, ageAt(p.dob), p.phone, p.email, statusLabels[p.status]]); });
  downloadText("dermavision-pacientes-" + todayLocal() + ".csv", "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(";"); }).join("\r\n"), "text/csv;charset=utf-8");
  recordAudit("Lista exportada", "PATIENTS", state.patients.length + " cadastros");
  saveState(); toast("Lista demonstrativa exportada.");
}
function exportAppointmentsCsv() {
  const rows = [["Identificador", "Paciente", "Data", "Hora", "Tipo", "Profissional", "Status"]];
  state.appointments.slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).forEach(function (a) { const p = getPatient(a.patientId); rows.push([a.id, p ? p.name : "", a.date, a.time, a.type, a.provider, statusLabels[a.status]]); });
  downloadText("dermavision-agenda-" + todayLocal() + ".csv", "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(";"); }).join("\r\n"), "text/csv;charset=utf-8");
  recordAudit("Agenda exportada", "APPOINTMENTS", state.appointments.length + " consultas");
  saveState(); toast("Agenda demonstrativa exportada.");
}

async function resetDemo() {
  if (!window.confirm("Restaurar os dados fictícios iniciais? Os registros locais desta demonstração serão substituídos.")) return;
  try { await deleteAllStoredImages(); } catch (error) { console.warn("Falha ao remover imagens locais.", error); }
  state = createSeedState();
  saveState();
  route = "dashboard"; patientSearch = ""; patientStatusFilter = "active"; agendaDate = TODAY; mapPatientId = "P-10284"; mapView = "front"; selectedLesionId = "L-0245"; settingsTab = "clinic";
  render(); toast("Dados fictícios iniciais restaurados.");
}

document.addEventListener("click", handleClick);
document.addEventListener("submit", handleSubmit);
document.addEventListener("change", function (event) {
  const target = event.target;
  if (target.id === "patient-status-filter") { patientStatusFilter = target.value; render(); }
  if (target.id === "agenda-date" && target.value) { agendaDate = target.value; render(); }
  if (target.id === "agenda-status") { agendaStatusFilter = target.value; render(); }
  if (target.id === "map-patient-select") {
    mapPatientId = target.value;
    const matching = state.lesions.find(function (l) { return l.patientId === mapPatientId && l.view === mapView && (showArchivedLesions || !l.archived); });
    selectedLesionId = matching ? matching.id : "";
    render();
  }
  if (target.id === "show-archived-lesions") { showArchivedLesions = target.checked; render(); }
  if (target.id === "report-patient") reportPatientFilter = target.value;
  if (target.id === "lesion-file-input") handlePhotoUpload(target);
});
let searchTimer;
document.addEventListener("input", function (event) {
  if (event.target.id === "patient-search") {
    patientSearch = event.target.value;
    window.clearTimeout(searchTimer);
    const position = event.target.selectionStart;
    searchTimer = window.setTimeout(function () {
      render();
      const input = document.getElementById("patient-search");
      if (input) { input.focus(); input.setSelectionRange(position, position); }
    }, 110);
  }
});
document.getElementById("mobile-menu").addEventListener("click", function () { document.getElementById("sidebar").classList.toggle("open"); });
document.getElementById("profile-menu").addEventListener("click", function () { document.getElementById("profile-popover").classList.toggle("hidden"); });
document.getElementById("dismiss-banner").addEventListener("click", function () { document.querySelector(".demo-banner")?.remove(); });
document.addEventListener("click", function (event) {
  const pop = document.getElementById("profile-popover");
  if (pop && !event.target.closest("#profile-popover") && !event.target.closest("#profile-menu")) pop.classList.add("hidden");
});

if (sessionStorage.getItem("dermavision-demo-auth") === "true") {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  render();
}
