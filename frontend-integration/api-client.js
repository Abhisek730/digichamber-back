/**
 * DigiChamber API client
 * ------------------------------------------------------------------
 * Drop this <script> before your existing app logic in digichamber.html
 * (or link it as a separate file). It gives you a `DC` object with
 * methods that mirror the shape of your old memStorage-based state,
 * but talk to the real backend instead.
 *
 * This does NOT automatically rewrite your 8000+ lines of UI code —
 * it gives you the plumbing. You still need to swap calls like
 * `state.cases.push(c); saveState();` for `await DC.cases.create(c)`
 * in each function (addCase, addHearing, addTask, etc.) and re-render
 * from what the API returns instead of the in-memory `state` object.
 *
 * Set API_BASE to wherever you deploy this backend.
 */
const API_BASE = 'https://digichamber-back.onrender.com/api';

let _token = null; // set by DC.auth.login/signup/loginDemo

function authHeaders(extra = {}) {
  return _token ? { Authorization: `Bearer ${_token}`, ...extra } : extra;
}

async function request(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (isForm) {
    opts.body = body; // FormData sets its own Content-Type boundary
  }
  Object.assign(opts.headers, authHeaders());

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
}

const DC = {
  auth: {
    async signup(payload) {
      const data = await request('POST', '/auth/signup', payload);
      _token = data.token;
      return data.user;
    },
    async login(email, password) {
      const data = await request('POST', '/auth/login', { email, password });
      _token = data.token;
      return data.user;
    },
    async employeeLogin(dcId, password) {
      const data = await request('POST', '/auth/employee-login', { dcId, password });
      _token = data.token;
      return data.user;
    },
    async loginDemo() {
      const data = await request('POST', '/auth/demo');
      _token = data.token;
      return data.user;
    },
    async me() {
      const data = await request('GET', '/auth/me');
      return data.user;
    },
    logout() {
      _token = null;
    }
  },

  cases: {
    list: () => request('GET', '/cases'),
    get: (id) => request('GET', `/cases/${id}`),
    create: (payload) => request('POST', '/cases', payload),
    update: (id, payload) => request('PUT', `/cases/${id}`, payload),
    remove: (id) => request('DELETE', `/cases/${id}`)
  },

  hearings: {
    list: () => request('GET', '/hearings'),
    create: (payload) => request('POST', '/hearings', payload),
    update: (id, payload) => request('PUT', `/hearings/${id}`, payload),
    remove: (id) => request('DELETE', `/hearings/${id}`)
  },

  tasks: {
    list: () => request('GET', '/tasks'),
    create: (payload) => request('POST', '/tasks', payload),
    toggle: (id) => request('PATCH', `/tasks/${id}/toggle`),
    update: (id, payload) => request('PUT', `/tasks/${id}`, payload),
    remove: (id) => request('DELETE', `/tasks/${id}`)
  },

  reminders: {
    list: () => request('GET', '/reminders'),
    create: (payload) => request('POST', '/reminders', payload),
    remove: (id) => request('DELETE', `/reminders/${id}`)
  },

  diary: {
    list: () => request('GET', '/diary'),
    create: (payload) => request('POST', '/diary', payload),
    update: (id, payload) => request('PUT', `/diary/${id}`, payload),
    remove: (id) => request('DELETE', `/diary/${id}`)
  },

  files: {
    list: () => request('GET', '/files'),
    upload: (file, { caseId, desc } = {}) => {
      const form = new FormData();
      form.append('file', file);
      if (caseId) form.append('caseId', caseId);
      if (desc) form.append('desc', desc);
      return request('POST', '/files/upload', form, true);
    },
    downloadUrl: (id) => `${API_BASE}/files/${id}/download`, // fetch with auth header, or open with a signed link if you add one
    remove: (id) => request('DELETE', `/files/${id}`)
  },

  activity: {
    list: (limit = 50) => request('GET', `/activity?limit=${limit}`)
  },

  chat: {
    listConversations: () => request('GET', '/chat/conversations'),
    getGroup: () => request('GET', '/chat/conversations/group'),
    getDirect: (otherUserId) => request('GET', `/chat/conversations/direct/${otherUserId}`),
    sendMessage: (conversationId, text) => request('POST', `/chat/conversations/${conversationId}/messages`, { text })
  },

  clientChats: {
    list: () => request('GET', '/client-chats'),
    get: (clientName) => request('GET', `/client-chats/${encodeURIComponent(clientName)}`),
    sendMessage: (clientName, text, sender = 'advocate', channel = 'chat') =>
      request('POST', `/client-chats/${encodeURIComponent(clientName)}/messages`, { text, sender, channel })
  },

  employees: {
    list: () => request('GET', '/employees'),
    create: (payload) => request('POST', '/employees', payload), // returns { dcId, tempPassword, ... } — show this once to the advocate
    remove: (id) => request('DELETE', `/employees/${id}`)
  },

  dpdp: {
    getConsent: () => request('GET', '/dpdp/consent'),
    updateConsent: (payload) => request('PUT', '/dpdp/consent', payload),
    consentLog: () => request('GET', '/dpdp/consent/log'),
    listRightsRequests: () => request('GET', '/dpdp/rights-requests'),
    submitRightsRequest: (payload) => request('POST', '/dpdp/rights-requests', payload),
    setRightsRequestStatus: (id, status) => request('PATCH', `/dpdp/rights-requests/${id}/status`, { status }),
    listGrievances: () => request('GET', '/dpdp/grievances'),
    fileGrievance: (payload) => request('POST', '/dpdp/grievances', payload),
    setGrievanceStatus: (id, status, response) => request('PATCH', `/dpdp/grievances/${id}/status`, { status, response }),
    listBreaches: () => request('GET', '/dpdp/breach-log'),
    reportBreach: (payload) => request('POST', '/dpdp/breach-log', payload),
    updateBreach: (id, payload) => request('PATCH', `/dpdp/breach-log/${id}`, payload),
    getSettings: () => request('GET', '/dpdp/settings'),
    updateSettings: (payload) => request('PUT', '/dpdp/settings', payload)
  },

  stickies: {
    list: () => request('GET', '/stickies'),
    create: (text) => request('POST', '/stickies', { text }),
    update: (id, text) => request('PUT', `/stickies/${id}`, { text }),
    remove: (id) => request('DELETE', `/stickies/${id}`)
  },

  subscription: {
    get: () => request('GET', '/subscription'),
    setPlan: (plan) => request('PUT', '/subscription', { plan })
  },

  // ---------------------------------------------------------------
  // Real-time chat (Socket.io). Requires the socket.io client script:
  // <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"><\/script>
  // ---------------------------------------------------------------
  socket: null,
  connectRealtime() {
    if (!_token || typeof io === 'undefined') return null;
    DC.socket = io(API_BASE.replace('/api', ''), { auth: { token: _token } });
    return DC.socket;
  }
};
