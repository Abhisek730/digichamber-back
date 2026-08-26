// ============================================================
// DigiChamber — Backend Integration Overrides
// ------------------------------------------------------------
// Loaded AFTER the main app script (and after api-client.js +
// the socket.io client script), so these definitions replace
// the memStorage-based versions above with real API calls.
//
// WIRED in this pass: auth, cases, hearings, tasks, reminders, employees.
// NOT YET WIRED: diary, internal/client chat, DPDP module, file uploads,
// subscription changes — those functions still write to the old in-memory
// `state` only (harmless, just not persisted). See README "Extending this"
// section for the exact same pattern applied to each of those.
// ============================================================

function _withId(doc) {
  if (doc && doc._id && !doc.id) doc.id = doc._id;
  return doc;
}
function _withIds(list) { return (list || []).map(_withId); }

function _buildCompatUser(u) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName || '',
    email: u.email || null,
    dcId: u.dcId || null,
    bar: u.bar || '',
    plan: u.plan || 'solo',
    subscriptionPlan: u.subscriptionPlan || 199,
    driveConnected: false, // Google Drive integration was removed — never worked outside a Claude Artifact sandbox
    isEmployee: u.role === 'employee',
    role: u.employeeRole || '',
    access: u.access || 'full',
    workspaceOwner: u.workspaceOwner || null,
    workspaceOwnerName: 'Workspace Admin'
  };
}

async function loadStateFromAPI() {
  const [cases, hearings, tasks, reminders, employees] = await Promise.all([
    DC.cases.list(),
    DC.hearings.list(),
    DC.tasks.list(),
    DC.reminders.list(),
    DC.employees.list().catch(() => [])
  ]);
  state.cases = _withIds(cases);
  state.hearings = _withIds(hearings);
  state.tasks = _withIds(tasks);
  state.reminders = _withIds(reminders);
  state.employees = _withIds(employees).map((e) => ({
    id: e.id,
    employeeId: e.dcId,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email || '',
    role: e.employeeRole,
    access: e.access,
    assignedCases: e.assignedCases || [],
    addedOn: (e.createdAt || '').split('T')[0]
  }));

  // Not yet wired — kept as safe defaults so unrelated views don't error.
  state.diary = state.diary || [];
  state.files = state.files || [];
  state.activity = state.activity || [];
  state.conversations = state.conversations || { group: [] };
  state.clientChats = state.clientChats || {};
  state.consents = state.consents || {};
  state.consentLog = state.consentLog || [];
  state.rightsRequests = state.rightsRequests || [];
  state.grievances = state.grievances || [];
  state.breachLog = state.breachLog || [];
  state.privacySettings = state.privacySettings || { dpoName: '' };
}

// ---------------- AUTH ----------------

async function checkSession() {
  const token = localStorage.getItem('dc_token');
  if (!token) {
    document.getElementById('auth-screen').style.display = 'flex';
    setTimeout(loadRememberedCredentials, 80);
    return false;
  }
  _token = token; // shared top-level `let` from api-client.js
  try {
    const apiUser = await DC.auth.me();
    await loginUser(_buildCompatUser(apiUser));
    return true;
  } catch (err) {
    localStorage.removeItem('dc_token');
    document.getElementById('auth-screen').style.display = 'flex';
    setTimeout(loadRememberedCredentials, 80);
    return false;
  }
}

async function loginUser(user) {
  state.user = user;
  try {
    await loadStateFromAPI();
  } catch (err) {
    notify('error', 'Could not load your data', err.message);
  }

  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  document.getElementById('user-display-name').textContent = user.firstName + ' ' + (user.lastName || '');
  document.getElementById('user-avatar-text').textContent = (user.firstName[0] + (user.lastName?.[0] || '')).toUpperCase();

  const roleEl = document.querySelector('.user-role');
  const teamNav = document.querySelector('[onclick*="showView(\'team\'"]');
  if (user.isEmployee) {
    if (roleEl) roleEl.textContent = (user.role || 'Team Member') + (user.dcId ? ' · ' + user.dcId : '');
    if (teamNav) teamNav.style.display = 'none';
  } else {
    if (roleEl) roleEl.textContent = 'Senior Counsel';
    if (teamNav) teamNav.style.display = '';
  }

  document.querySelectorAll('.admin-only-new-case').forEach((btn) => {
    btn.style.display = user.isEmployee ? 'none' : '';
  });

  try { DC.connectRealtime(); } catch (e) { /* socket.io client not loaded — real-time chat only */ }

  initApp();
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) {
    notify('error', 'Missing fields', loginTabMode === 'employee' ? 'Enter your DC ID and password' : 'Enter email and password');
    return;
  }
  try {
    const apiUser = loginTabMode === 'employee'
      ? await DC.auth.employeeLogin(email, pass)
      : await DC.auth.login(email, pass);

    if (document.getElementById('remember-me-chk').checked) {
      saveRememberedCredentials(email, pass);
    } else {
      clearRememberedCredentials();
    }
    localStorage.setItem('dc_token', _token);
    await loginUser(_buildCompatUser(apiUser));
  } catch (err) {
    notify('error', 'Login failed', err.message);
  }
}

async function handleSignup() {
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const bar = document.getElementById('signup-bar').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (!fname || !email || !pass) { notify('error', 'Missing fields', 'Fill all required fields'); return; }
  if (pass.length < 6) { notify('error', 'Weak password', 'Minimum 6 characters'); return; }

  try {
    const apiUser = await DC.auth.signup({ firstName: fname, lastName: lname, email, password: pass, bar, plan: 'solo' });
    localStorage.setItem('dc_token', _token);
    await loginUser(_buildCompatUser(apiUser));
  } catch (err) {
    notify('error', 'Signup failed', err.message);
  }
}

async function demoLogin() {
  try {
    const apiUser = await DC.auth.loginDemo();
    localStorage.setItem('dc_token', _token);
    await loginUser(_buildCompatUser(apiUser));
  } catch (err) {
    notify('error', 'Demo login failed', err.message + ' — is the backend running on http://localhost:5000 and have you run "npm run seed"?');
  }
}

function logout() {
  localStorage.removeItem('dc_token');
  _token = null;
  if (DC.socket) { DC.socket.disconnect(); DC.socket = null; }
  location.reload();
}

// ---------------- CASES ----------------

async function addCase() {
  const title = document.getElementById('case-title').value.trim();
  const client = document.getElementById('case-client').value.trim();
  if (!title || !client) { notify('error', 'Missing fields', 'Enter case title and client name'); return; }
  try {
    const payload = {
      number: document.getElementById('case-number').value.trim() || undefined,
      year: document.getElementById('case-year').value || undefined,
      title, client,
      clientEmail: document.getElementById('case-client-email').value.trim(),
      clientPhone: document.getElementById('case-client-phone').value.trim(),
      court: document.getElementById('case-court').value,
      type: document.getElementById('case-type').value,
      status: document.getElementById('case-status').value,
      priority: document.getElementById('case-priority').value,
      notes: document.getElementById('case-notes').value,
      documents: pendingCaseDocs.new ? [...pendingCaseDocs.new] : []
    };
    const c = _withId(await DC.cases.create(payload));
    state.cases.push(c);
    closeModal('add-case-modal');
    clearForm(['case-number', 'case-title', 'case-client', 'case-client-email', 'case-client-phone', 'case-year', 'case-notes']);
    pendingCaseDocs.new = [];
    renderCaseDocList('new');
    updateAllViews();
    populateCaseDropdowns();
    notify('success', 'Case Added', c.number + ' registered successfully');
  } catch (err) {
    notify('error', 'Could not add case', err.message);
  }
}

async function deleteCaseById(caseId) {
  const c = state.cases.find((c) => c.id === caseId);
  if (!c) return;
  if (!confirm('Delete case "' + c.title + '"? This will also remove linked hearings and tasks.')) return;
  try {
    await DC.cases.remove(caseId);
    state.cases = state.cases.filter((x) => x.id !== caseId);
    state.hearings = state.hearings.filter((h) => h.caseId !== caseId);
    state.tasks = state.tasks.filter((t) => t.caseId !== caseId);
    closeDrawer();
    updateAllViews();
    populateCaseDropdowns();
    notify('info', 'Case Deleted', c.title);
  } catch (err) {
    notify('error', 'Could not delete case', err.message);
  }
}

// ---------------- HEARINGS ----------------

async function addHearing() {
  const caseId = document.getElementById('hearing-case').value;
  const date = document.getElementById('hearing-date').value;
  if (!caseId || !date) { notify('error', 'Missing fields', 'Select a case and date'); return; }
  const caseObj = state.cases.find((c) => c.id === caseId);
  try {
    const payload = {
      caseId, date,
      time: document.getElementById('hearing-time').value,
      courtRoom: document.getElementById('hearing-court-room').value || 'Court Room',
      judge: document.getElementById('hearing-judge').value || '',
      purpose: document.getElementById('hearing-purpose').value,
      notes: document.getElementById('hearing-notes').value
    };
    const h = _withId(await DC.hearings.create(payload));
    state.hearings.push(h);
    closeModal('add-hearing-modal');
    clearForm(['hearing-date', 'hearing-court-room', 'hearing-judge', 'hearing-notes']);
    updateAllViews();
    renderFullCalendar();
    notify('success', 'Hearing Scheduled', (caseObj?.title || '') + ' — ' + formatDate(date));
  } catch (err) {
    notify('error', 'Could not schedule hearing', err.message);
  }
}

async function deleteHearing(hearingId) {
  const h = state.hearings.find((h) => h.id === hearingId);
  if (!h) return;
  try {
    await DC.hearings.remove(hearingId);
    state.hearings = state.hearings.filter((x) => x.id !== hearingId);
    updateAllViews();
    renderFullCalendar();
    notify('info', 'Hearing Removed', h.caseTitle);
  } catch (err) {
    notify('error', 'Could not remove hearing', err.message);
  }
}

// ---------------- TASKS ----------------

async function addTask() {
  const title = document.getElementById('task-title').value.trim();
  if (!title) { notify('error', 'Missing', 'Enter task description'); return; }
  try {
    const payload = {
      title,
      due: document.getElementById('task-due').value,
      priority: document.getElementById('task-priority').value,
      caseId: document.getElementById('task-case').value || null
    };
    const t = _withId(await DC.tasks.create(payload));
    state.tasks.push(t);
    closeModal('add-task-modal');
    clearForm(['task-title', 'task-due']);
    updateAllViews();
    notify('success', 'Task Added', title);
  } catch (err) {
    notify('error', 'Could not add task', err.message);
  }
}

async function toggleTask(taskId) {
  const t = state.tasks.find((t) => t.id === taskId);
  if (!t) return;
  const previous = t.done;
  t.done = !t.done; // optimistic UI update
  updateAllViews();
  try {
    await DC.tasks.toggle(taskId);
  } catch (err) {
    t.done = previous; // roll back on failure
    updateAllViews();
    notify('error', 'Could not update task', err.message);
  }
}

async function deleteTask(taskId) {
  try {
    await DC.tasks.remove(taskId);
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    updateAllViews();
  } catch (err) {
    notify('error', 'Could not delete task', err.message);
  }
}

// ---------------- REMINDERS ----------------

async function addReminder() {
  const title = document.getElementById('reminder-title').value.trim();
  const date = document.getElementById('reminder-date').value;
  if (!title || !date) { notify('error', 'Missing fields', 'Enter title and date'); return; }
  try {
    const payload = {
      title, date,
      type: document.getElementById('reminder-type').value,
      desc: document.getElementById('reminder-desc').value
    };
    const r = _withId(await DC.reminders.create(payload));
    state.reminders.push(r);
    closeModal('add-reminder-modal');
    clearForm(['reminder-title', 'reminder-date', 'reminder-desc']);
    updateAllViews();
    notify('success', 'Reminder Set', title + ' — ' + formatDate(date));
  } catch (err) {
    notify('error', 'Could not set reminder', err.message);
  }
}

async function deleteReminder(rid) {
  try {
    await DC.reminders.remove(rid);
    state.reminders = state.reminders.filter((r) => r.id !== rid);
    updateAllViews();
  } catch (err) {
    notify('error', 'Could not delete reminder', err.message);
  }
}

// ---------------- EMPLOYEES ----------------

async function addEmployee() {
  const fname = document.getElementById('emp-fname').value.trim();
  const lname = document.getElementById('emp-lname').value.trim();
  const email = document.getElementById('emp-email').value.trim();
  const role = document.getElementById('emp-role').value;
  const access = document.getElementById('emp-access').value;

  if (!fname) { notify('error', 'Missing name', "Enter the employee's first name"); return; }

  let assignedCases = [];
  if (access === 'limited') {
    assignedCases = Array.from(document.querySelectorAll('#emp-case-picker input[type="checkbox"]:checked')).map((cb) => cb.value);
    if (!assignedCases.length) { notify('error', 'No cases selected', 'Select at least one case for "Assigned Cases Only" access, or choose a different access level'); return; }
  }

  try {
    const result = await DC.employees.create({ firstName: fname, lastName: lname, email, employeeRole: role, access, assignedCases });
    state.employees.push({
      id: result.id, employeeId: result.dcId, firstName: result.firstName, lastName: result.lastName,
      email: email || '', role: result.employeeRole, access: result.access, assignedCases,
      addedOn: new Date().toISOString().split('T')[0]
    });

    closeModal('add-employee-modal');
    clearForm(['emp-fname', 'emp-lname', 'emp-email']);
    renderEmployeeList();
    updateBadges();

    document.getElementById('cred-emp-name').textContent = fname + ' ' + lname;
    fitCredentialText(document.getElementById('cred-emp-id'), result.dcId);
    fitCredentialText(document.getElementById('cred-emp-pass'), result.tempPassword);
    window._lastEmployeeCreds = { id: result.dcId, pass: result.tempPassword, name: fname + ' ' + lname };
    openModal('employee-credentials-modal');

    notify('success', 'Employee Added', result.dcId + ' created for ' + fname);
  } catch (err) {
    notify('error', 'Could not add employee', err.message);
  }
}

async function removeEmployee(empId) {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return;
  if (!confirm(`Remove ${emp.firstName} ${emp.lastName || ''} (${emp.employeeId}) from this workspace? Their login access will be revoked.`)) return;
  try {
    await DC.employees.remove(empId);
    state.employees = state.employees.filter((e) => e.id !== empId);
    renderEmployeeList();
    updateBadges();
    notify('info', 'Employee Removed', emp.firstName + ' ' + (emp.lastName || ''));
  } catch (err) {
    notify('error', 'Could not remove employee', err.message);
  }
}

// ---------------- BOOT ----------------
// The original DOMContentLoaded handler already calls checkSession() synchronously;
// since our checkSession is now async, that call harmlessly resolves later and this
// override's internal logic (above) is what actually decides what's shown.
// Nothing further to do here — checkSession() defined above handles everything.
