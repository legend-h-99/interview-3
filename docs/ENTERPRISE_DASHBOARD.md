# Interview 3 Enterprise Dashboard

## Scope

The advanced dashboard adds a SaaS-style operational view for internal users. It uses the existing applicant data, SVG/CSS visualizations, local preference storage, and the current REST endpoints so it remains compatible with GitHub Pages and the deployed worker.

## Main Sections

- Executive summary KPIs.
- Visual analytics: status line chart, result donut, committee heatmap, committee bar chart, score averages, yes/no indicators.
- Alerts for no-shows, pending review, and unassigned applicants.
- Smart table with search, status filter, source filter, and sorting.
- Quick actions to trainees, committee, Qobooli report, and data sync.
- API and security contract reference.

## API Contracts

```http
GET /api/applicants
Response: { "applicants": Applicant[] }

PATCH /api/applicants/:id
Body: { "patch": Partial<Applicant>, "audit": string }
Response: { "applicant": Applicant }

POST /api/session
Response: { "active": number, "max": 150 }

SSE /api/events
Event: { "type": "created|updated|deleted", "applicantId": string, "changedAt": string }
```

## Security Notes

- Internal screens remain separated by role navigation.
- Every applicant update supports audit log entries.
- React output escaping protects normal UI text from XSS.
- A CSRF token should be added when the platform moves to a full server-side session model.

## Testing

- Unit and UI coverage exists in `src/App.test.tsx`.
- Required checks:
  - `npm test -- --run`
  - `npm run build`
  - `npm run check`
