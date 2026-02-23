# 4. Pages & Features

## 4.1 New Frontend Pages

### 4.1.1 OmnichannelMonitorPage (`/omnichannel-monitor`)

**Purpose:** Allow the healthcare team (doctors, nurses) to monitor all incoming
omnichannel patient messages, see parsed structured data, approve AI-drafted
actions, and dispatch replies.

**Required Role:** `doctor` | `nurse` | `admin`

**Data Sources:**
- WebSocket events from Main API Server (`/ws`)
- `GET /api/omnichannel/messages` — paginated message history
- `GET /api/omnichannel/sessions` — active patient MCP sessions
- `POST /api/omnichannel/reply` — send message to patient

**Sub-components:**

| Component | Description |
|---|---|
| `ChannelFilterBar` | Toggle LINE / WhatsApp / Telegram / All |
| `MessageFeed` | Real-time scrolling feed of normalised messages |
| `PatientContextPanel` | Shows MCP context (HPI, meds, labs) for selected patient |
| `AIActionPanel` | Displays AI-suggested actions (orders, prescriptions, referrals) with approve/reject |
| `ReplyComposer` | Text/template reply box; dispatches via patient's channel |
| `ConsentStatusBadge` | Inline indicator of patient PDPA consent status |

---

### 4.1.2 ConsentManagementPage (`/consent-management`) *(Admin only)*

**Purpose:** Audit and manage patient consent records.

**Data Sources:**
- `GET /api/consent/records` — list all consent records
- `DELETE /api/consent/{patientId}` — revoke consent (triggers MCP session deletion)

---

## 4.2 Updated Existing Pages

### DoctorDashboard — New Omnichannel Notification Badge
- Shows unread omnichannel message count
- Quick-link to OmnichannelMonitorPage

### GeminiAIStudio — Extended with MCP Context
- New tab: "MCP Context Viewer" showing live session context for any patient
- Button: "Pull Context from OpenClaw" before generating AI content

---

## 4.3 Component Inventory

```
src/
├── components/
│   └── OmnichannelMonitor.tsx        ← NEW: main monitoring panel
├── pages/
│   └── OmnichannelMonitorPage.tsx    ← NEW: page wrapper + routing
├── services/
│   ├── mcpContextService.ts          ← NEW: MCP REST client + consent API
│   └── omnichannelService.ts         ← NEW: omnichannel API calls
```

---

## 4.4 Routing Changes (`App.tsx`)

```tsx
// Add to existing React Router routes:
<Route path="/omnichannel-monitor" element={
  <RoleGuard roles={['doctor', 'nurse', 'admin']}>
    <OmnichannelMonitorPage />
  </RoleGuard>
} />
<Route path="/consent-management" element={
  <RoleGuard roles={['admin']}>
    <ConsentManagementPage />
  </RoleGuard>
} />
```

---

## 4.5 UI/UX States

| State | Visual Feedback |
|---|---|
| Live message arriving | Green pulse indicator on MessageFeed row |
| Consent pending | Yellow badge "Consent Required" on patient card |
| AI action awaiting approval | Blue highlight with "Approve / Reject" buttons |
| MCP context loading | Skeleton loader in PatientContextPanel |
| Webhook server offline | Red banner "Omnichannel service unavailable" |

---

## 4.6 Mobile Responsiveness

The OmnichannelMonitorPage uses a responsive two-column layout:
- **Desktop (≥ 1024 px):** Message feed left, context panel right
- **Tablet (768–1023 px):** Tabbed view (Messages | Context | Actions)
- **Mobile (< 768 px):** Stacked single-column; context panel collapses

---

## 4.7 RBAC Matrix

| Page / Action | patient | nurse | doctor | admin |
|---|---|---|---|---|
| View OmnichannelMonitor | ✗ | ✓ | ✓ | ✓ |
| Reply to patient | ✗ | ✓ | ✓ | ✓ |
| Approve AI prescription | ✗ | ✗ | ✓ | ✓ |
| Approve lab orders | ✗ | ✗ | ✓ | ✓ |
| View consent records | ✗ | ✗ | ✗ | ✓ |
| Revoke consent | ✗ | ✗ | ✗ | ✓ |
| Request team consult | ✗ | ✓ | ✓ | ✓ |
| Generate referral | ✗ | ✗ | ✓ | ✓ |
