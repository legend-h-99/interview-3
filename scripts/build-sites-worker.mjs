import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = new URL('../dist/', import.meta.url)
const serverDir = new URL('../dist/server/', import.meta.url)
const distPath = fileURLToPath(distDir)
const serverPath = fileURLToPath(serverDir)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
}

async function collectFiles(dirUrl, rootUrl = dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === 'server') continue
    const entryUrl = new URL(entry.name, `${dirUrl.href}/`)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryUrl, rootUrl)))
      continue
    }
    const buffer = await readFile(entryUrl)
    const filePath = `/${relative(fileURLToPath(rootUrl), fileURLToPath(entryUrl))}`
    files.push({
      path: filePath,
      type: contentTypes[extname(entry.name)] ?? 'application/octet-stream',
      body: buffer.toString('base64'),
    })
  }

  return files
}

const files = await collectFiles(distDir)
const acceptedApplicants = JSON.parse(await readFile(new URL('../src/data/acceptedApplicants.json', import.meta.url), 'utf8'))
const neutralStatus = 'غير محدد'
const defaultInterviewScores = {
  signLanguage: 0,
  appearance: 0,
  generalInfo: 0,
  responseSpeed: 0,
  questionScores: [0, 0, 0, 0, 0],
  hasAssociatedDifficulty: '',
  weakHearing: '',
  knowsSignLanguage: '',
  weakMentalAbilities: '',
  distinguished: '',
}

function normalizeImportedPhone(phone) {
  return phone.startsWith('5') ? `0${phone}` : phone
}

function graduationYearOnly(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
    const arabicIndex = arabicDigits.indexOf(digit)
    if (arabicIndex >= 0) return String(arabicIndex)
    const persianIndex = persianDigits.indexOf(digit)
    return persianIndex >= 0 ? String(persianIndex) : digit
  }).replace(/\D/g, '').slice(0, 4)
}

function acceptedToApplicant(item, index) {
  return {
    id: `accepted-${item.nationalId}`,
    nationalId: item.nationalId,
    requestNo: `ACC-2026-${String(index + 1).padStart(4, '0')}`,
    name: item.name,
    nationality: '',
    age: 0,
    certificateType: item.major,
    graduationDate: '',
    phone: normalizeImportedPhone(item.phone),
    extraPhone: '',
    qualification: item.program,
    gpa: 0,
    source: 'qobool',
    status: neutralStatus,
    documents: [],
    scores: {},
    notes: '',
    admissionStatus: item.admissionStatus,
    organization: item.organization,
    major: item.major,
    program: item.program,
    preferenceNo: item.preferenceNo,
    audit: [],
  }
}

const seedApplicants = [
  ...acceptedApplicants.map(acceptedToApplicant),
  {
    id: 'a1',
    nationalId: '1012345678',
    requestNo: 'REQ-2026-0001',
    waitingNo: 'W-014',
    name: 'عبدالله محمد الزهراني',
    nationality: 'سعودي',
    age: 19,
    certificateType: 'ثانوية عامة',
    graduationDate: '2026',
    phone: '0551234567',
    extraPhone: '0557654321',
    qualification: 'ثانوية عامة - مسار علمي',
    gpa: 93.4,
    source: 'qobool',
    status: neutralStatus,
    committeeId: 'c1',
    committeeNumber: '1',
    committeeTrainerIds: ['s4', 's5'],
    interviewAt: '2026-08-18 09:30',
    documents: [],
    scores: {},
    notes: '',
    audit: [],
  },
  {
    id: 'a2',
    nationalId: '1023456789',
    requestNo: 'REQ-2026-0002',
    name: 'سلمان فهد المطيري',
    nationality: 'سعودي',
    age: 22,
    certificateType: 'دبلوم حاسب',
    graduationDate: '2025',
    phone: '0569001122',
    extraPhone: '0569003344',
    qualification: 'دبلوم حاسب',
    gpa: 88.2,
    source: 'direct',
    status: neutralStatus,
    documents: [],
    scores: {},
    notes: '',
    audit: [],
  },
  {
    id: 'a3',
    nationalId: '1034567890',
    requestNo: 'REQ-2026-0003',
    waitingNo: 'W-008',
    name: 'رائد علي الشهري',
    nationality: 'سعودي',
    age: 20,
    certificateType: 'ثانوية صناعية',
    graduationDate: '2026',
    phone: '0503332211',
    extraPhone: '0503332244',
    qualification: 'ثانوية صناعية',
    gpa: 91.7,
    source: 'qobool',
    status: neutralStatus,
    committeeId: 'c2',
    committeeNumber: '2',
    committeeTrainerIds: ['s6', 's7'],
    interviewAt: '2026-08-18 10:15',
    documents: [],
    scores: {},
    notes: '',
    audit: [],
  },
]
const workerSource = `
const files = new Map(${JSON.stringify(files.map((file) => [file.path, file]))});
const seedApplicants = ${JSON.stringify(seedApplicants)};
const defaultInterviewScores = ${JSON.stringify(defaultInterviewScores)};
const neutralStatus = ${JSON.stringify(neutralStatus)};
const graduationYearOnly = ${graduationYearOnly.toString()};
const maxConcurrentUsers = 150;
const schemaSql = ${JSON.stringify(`CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  national_id TEXT NOT NULL UNIQUE,
  request_no TEXT NOT NULL UNIQUE,
  waiting_no TEXT,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL DEFAULT '',
  age INTEGER NOT NULL DEFAULT 0,
  certificate_type TEXT NOT NULL DEFAULT '',
  graduation_date TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  extra_phone TEXT NOT NULL DEFAULT '',
  qualification TEXT NOT NULL,
  gpa REAL NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  committee_id TEXT,
  committee_number TEXT,
  committee_trainers_json TEXT,
  translator_id TEXT,
  interview_at TEXT,
  documents_json TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  final_result TEXT,
  admission_status TEXT,
  organization TEXT,
  major TEXT,
  program TEXT,
  preference_no TEXT,
  audit_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`)};
const sessionsSql = ${JSON.stringify(`CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
)`)};
const indexSql = [
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_national_id ON applicants (national_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_request_no ON applicants (request_no)',
  'CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants (status)',
  'CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions (expires_at)',
];
const migrationSql = [
  'ALTER TABLE applicants ADD COLUMN committee_number TEXT',
  'ALTER TABLE applicants ADD COLUMN committee_trainers_json TEXT',
  'ALTER TABLE applicants ADD COLUMN translator_id TEXT',
  "ALTER TABLE applicants ADD COLUMN nationality TEXT NOT NULL DEFAULT ''",
  'ALTER TABLE applicants ADD COLUMN age INTEGER NOT NULL DEFAULT 0',
  "ALTER TABLE applicants ADD COLUMN certificate_type TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE applicants ADD COLUMN graduation_date TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE applicants ADD COLUMN extra_phone TEXT NOT NULL DEFAULT ''",
  'ALTER TABLE applicants ADD COLUMN admission_status TEXT',
  'ALTER TABLE applicants ADD COLUMN organization TEXT',
  'ALTER TABLE applicants ADD COLUMN major TEXT',
  'ALTER TABLE applicants ADD COLUMN program TEXT',
  'ALTER TABLE applicants ADD COLUMN preference_no TEXT',
];

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });
}

function normalizeDigits(value) {
  return String(value ?? '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function toNumber(value, fallback = 0) {
  const number = Number(normalizeDigits(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : fallback;
}

const allowedOrigins = new Set([
  'https://legend-h-99.github.io',
  'https://interviews-tech-system.hossam-a-m22.chatgpt.site',
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://legend-h-99.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-session-id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function rowToApplicant(row) {
  return {
    id: row.id,
    nationalId: row.national_id,
    requestNo: row.request_no,
    waitingNo: row.waiting_no || undefined,
    name: row.name,
    nationality: row.nationality || '',
    age: Number(row.age || 0),
    certificateType: row.certificate_type || row.qualification || '',
    graduationDate: graduationYearOnly(row.graduation_date || ''),
    phone: row.phone,
    extraPhone: row.extra_phone || '',
    qualification: row.qualification,
    gpa: row.gpa,
    source: row.source,
    status: row.status,
    committeeId: row.committee_id || undefined,
    committeeNumber: row.committee_number || undefined,
    committeeTrainerIds: row.committee_trainers_json ? JSON.parse(row.committee_trainers_json) : undefined,
    translatorId: row.translator_id || undefined,
    interviewAt: row.interview_at || undefined,
    documents: JSON.parse(row.documents_json),
    scores: JSON.parse(row.scores_json),
    notes: row.notes || '',
    finalResult: row.final_result || undefined,
    admissionStatus: row.admission_status || undefined,
    organization: row.organization || undefined,
    major: row.major || undefined,
    program: row.program || undefined,
    preferenceNo: row.preference_no || undefined,
    audit: JSON.parse(row.audit_json),
  };
}

function insertApplicantStatement(db, applicant) {
  return db.prepare(\`INSERT OR IGNORE INTO applicants (
    id, national_id, request_no, waiting_no, name, nationality, age, certificate_type,
    graduation_date, phone, extra_phone, qualification, gpa,
    source, status, committee_id, committee_number, committee_trainers_json,
    translator_id, interview_at, documents_json, scores_json, notes, final_result,
    admission_status, organization, major, program, preference_no, audit_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`).bind(
    applicant.id,
    applicant.nationalId,
    applicant.requestNo,
    applicant.waitingNo || null,
    applicant.name,
    applicant.nationality || '',
    Number(applicant.age || 0),
    applicant.certificateType || applicant.qualification || '',
    graduationYearOnly(applicant.graduationDate || ''),
    applicant.phone,
    applicant.extraPhone || '',
    applicant.qualification,
    applicant.gpa,
    applicant.source,
    applicant.status,
    applicant.committeeId || null,
    applicant.committeeNumber || null,
    applicant.committeeTrainerIds ? JSON.stringify(applicant.committeeTrainerIds) : null,
    applicant.translatorId || null,
    applicant.interviewAt || null,
    JSON.stringify(applicant.documents),
    JSON.stringify(applicant.scores),
    applicant.notes || '',
    applicant.finalResult || null,
    applicant.admissionStatus || null,
    applicant.organization || null,
    applicant.major || null,
    applicant.program || null,
    applicant.preferenceNo || null,
    JSON.stringify(applicant.audit),
  );
}

async function ensureDb(env) {
  const db = env.DB;
  if (!db) throw new Error('D1 binding DB is unavailable');
  await db.batch([
    db.prepare(schemaSql),
    db.prepare(sessionsSql),
    ...indexSql.map((statement) => db.prepare(statement)),
    db.prepare('PRAGMA optimize'),
  ]);
  for (const statement of migrationSql) {
    try {
      await db.prepare(statement).run();
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('duplicate column')) throw error;
    }
  }
  await db.batch(seedApplicants.map((applicant) => insertApplicantStatement(db, applicant)));
  return db;
}

async function touchSession(env, request) {
  const db = await ensureDb(env);
  await db.prepare("DELETE FROM active_sessions WHERE expires_at <= datetime('now')").run();
  const fallbackId = request.headers.get('cf-connecting-ip') || 'anonymous';
  const sessionId = request.headers.get('x-session-id') || \`fallback-\${fallbackId}\`;
  const existing = await db.prepare('SELECT id FROM active_sessions WHERE id = ?').bind(sessionId).first();
  const current = await db.prepare("SELECT COUNT(*) AS total FROM active_sessions WHERE expires_at > datetime('now')").first();
  const active = Number(current?.total || 0);
  if (!existing && active >= maxConcurrentUsers) {
    return json({ error: 'capacity_reached', active, max: maxConcurrentUsers }, { status: 429 });
  }
  await db.prepare("INSERT OR REPLACE INTO active_sessions (id, last_seen, expires_at) VALUES (?, CURRENT_TIMESTAMP, datetime('now', '+90 seconds'))").bind(sessionId).run();
  const next = await db.prepare("SELECT COUNT(*) AS total FROM active_sessions WHERE expires_at > datetime('now')").first();
  return json({ sessionId, active: Number(next?.total || 0), max: maxConcurrentUsers });
}

async function listApplicants(env) {
  const db = await ensureDb(env);
  const result = await db.prepare('SELECT * FROM applicants ORDER BY created_at DESC, request_no DESC').all();
  return json({ applicants: result.results.map(rowToApplicant) });
}

async function createApplicant(env, request) {
  const db = await ensureDb(env);
  const body = await request.json();
  const existing = await db.prepare('SELECT * FROM applicants WHERE national_id = ?').bind(body.nationalId).first();
  if (existing) return json({ applicant: rowToApplicant(existing), duplicate: true });

  const count = await db.prepare('SELECT COUNT(*) AS total FROM applicants').first();
  const interviewed = await db.prepare('SELECT COUNT(*) AS total FROM applicants WHERE waiting_no IS NOT NULL').first();
  const waitingNo = \`INT-\${String((interviewed?.total ?? 0) + 1).padStart(3, '0')}\`;
  const applicant = {
    id: crypto.randomUUID(),
    nationalId: body.nationalId,
    requestNo: \`REQ-2026-\${String((count?.total ?? 0) + 1).padStart(4, '0')}\`,
    waitingNo,
    name: body.name,
    nationality: body.nationality || '',
    age: toNumber(body.age),
    certificateType: body.certificateType || body.qualification || '',
    graduationDate: graduationYearOnly(body.graduationDate || ''),
    phone: body.phone,
    extraPhone: body.extraPhone || '',
    qualification: body.qualification || body.certificateType || '',
    gpa: toNumber(body.gpa),
    source: body.source === 'qobool' ? 'qobool' : 'direct',
    status: neutralStatus,
    committeeTrainerIds: [],
    documents: [],
    scores: {},
    notes: '',
    audit: [],
  };
  await insertApplicantStatement(db, applicant).run();
  return json({ applicant }, { status: 201 });
}

async function updateApplicant(env, request, id) {
  const db = await ensureDb(env);
  const currentRow = await db.prepare('SELECT * FROM applicants WHERE id = ?').bind(id).first();
  if (!currentRow) return json({ error: 'Applicant not found' }, { status: 404 });
  const current = rowToApplicant(currentRow);
  const body = await request.json();
  const patch = body.patch || {};
  const nextAudit = Array.isArray(patch.audit)
    ? patch.audit
    : body.audit
      ? [body.audit, ...current.audit].filter(Boolean).slice(0, 8)
      : current.audit;
  const next = {
    ...current,
    ...patch,
    audit: nextAudit,
  };
  await db.prepare(\`UPDATE applicants SET
    waiting_no = ?,
    name = ?,
    nationality = ?,
    age = ?,
    certificate_type = ?,
    graduation_date = ?,
    phone = ?,
    extra_phone = ?,
    qualification = ?,
    gpa = ?,
    source = ?,
    status = ?,
    committee_id = ?,
    committee_number = ?,
    committee_trainers_json = ?,
    translator_id = ?,
    interview_at = ?,
    documents_json = ?,
    scores_json = ?,
    notes = ?,
    final_result = ?,
    admission_status = ?,
    organization = ?,
    major = ?,
    program = ?,
    preference_no = ?,
    audit_json = ?,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?\`).bind(
      next.waitingNo || null,
      next.name,
      next.nationality || '',
      Number(next.age || 0),
      next.certificateType || next.qualification || '',
      graduationYearOnly(next.graduationDate || ''),
      next.phone,
      next.extraPhone || '',
      next.qualification,
      next.gpa,
      next.source,
      next.status,
      next.committeeId || null,
      next.committeeNumber || null,
      next.committeeTrainerIds ? JSON.stringify(next.committeeTrainerIds) : null,
      next.translatorId || null,
      next.interviewAt || null,
      JSON.stringify(next.documents),
      JSON.stringify(next.scores),
      next.notes || '',
      next.finalResult || null,
      next.admissionStatus || null,
      next.organization || null,
      next.major || null,
      next.program || null,
      next.preferenceNo || null,
      JSON.stringify(next.audit),
      id,
    ).run();
  const row = await db.prepare('SELECT * FROM applicants WHERE id = ?').bind(id).first();
  return json({ applicant: rowToApplicant(row) });
}

async function resetApplicants(env) {
  const db = await ensureDb(env);
  await db.prepare('DELETE FROM applicants').run();
  await db.batch(seedApplicants.map((applicant) => insertApplicantStatement(db, applicant)));
  return json({ applicants: seedApplicants });
}

async function handleApi(request, env) {
  try {
    const url = new URL(request.url);
    let response;
    if (url.pathname === '/api/session' && request.method === 'POST') response = await touchSession(env, request);
    if (!response) {
      const sessionResponse = await touchSession(env, request);
      if (sessionResponse.status === 429) return withCors(sessionResponse, request);
    }
    if (url.pathname === '/api/applicants' && request.method === 'GET') response = await listApplicants(env);
    if (url.pathname === '/api/applicants' && request.method === 'POST') response = await createApplicant(env, request);
    const match = url.pathname.match(/^\\/api\\/applicants\\/([^/]+)$/);
    if (!response && match && request.method === 'PATCH') response = await updateApplicant(env, request, match[1]);
    if (!response && url.pathname === '/api/reset' && request.method === 'POST') response = await resetApplicants(env);
    return withCors(response || json({ error: 'Not found' }, { status: 404 }), request);
  } catch (error) {
    return withCors(json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 }), request);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    const asset = files.get(url.pathname) || files.get('/index.html');
    return new Response(decodeBase64(asset.body), {
      headers: {
        'content-type': asset.type,
        'cache-control': url.pathname === '/index.html' ? 'no-store' : 'public, max-age=31536000, immutable',
      },
    });
  },
};
`

await mkdir(serverDir, { recursive: true })
await writeFile(join(serverPath, 'index.js'), workerSource.trimStart())
await mkdir(join(distPath, '.openai'), { recursive: true })
await copyFile(new URL('../.openai/hosting.json', import.meta.url), join(distPath, '.openai/hosting.json'))
