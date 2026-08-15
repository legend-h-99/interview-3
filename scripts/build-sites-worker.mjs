import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const distDir = new URL('../dist/', import.meta.url)
const serverDir = new URL('../dist/server/', import.meta.url)

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
    const filePath = `/${relative(rootUrl.pathname, entryUrl.pathname)}`
    files.push({
      path: filePath,
      type: contentTypes[extname(entry.name)] ?? 'application/octet-stream',
      body: buffer.toString('base64'),
    })
  }

  return files
}

const files = await collectFiles(distDir)
const seedApplicants = [
  {
    id: 'a1',
    nationalId: '1012345678',
    requestNo: 'REQ-2026-0001',
    waitingNo: 'W-014',
    name: 'عبدالله محمد الزهراني',
    phone: '0551234567',
    qualification: 'ثانوية عامة - مسار علمي',
    gpa: 93.4,
    source: 'qobool',
    status: 'بانتظار المقابلة',
    committeeId: 'c1',
    committeeNumber: '1',
    committeeTrainerIds: ['s4', 's5'],
    interviewAt: '2026-08-18 09:30',
    documents: [
      { name: 'الهوية الوطنية', status: 'معتمد' },
      { name: 'الشهادة الدراسية', status: 'معتمد' },
      { name: 'نموذج الإقرار', status: 'معتمد' },
    ],
    scores: { technical: 0, communication: 0, motivation: 0 },
    notes: '',
    audit: ['استيراد من بوابة قبول', 'اعتماد الوثائق', 'إصدار رقم انتظار'],
  },
  {
    id: 'a2',
    nationalId: '1023456789',
    requestNo: 'REQ-2026-0002',
    name: 'سلمان فهد المطيري',
    phone: '0569001122',
    qualification: 'دبلوم حاسب',
    gpa: 88.2,
    source: 'direct',
    status: 'بانتظار مراجعة شؤون المتدربين',
    documents: [
      { name: 'الهوية الوطنية', status: 'بانتظار المراجعة' },
      { name: 'الشهادة الدراسية', status: 'بانتظار المراجعة' },
      { name: 'نموذج الإقرار', status: 'معتمد' },
    ],
    scores: { technical: 0, communication: 0, motivation: 0 },
    notes: '',
    audit: ['تسجيل مباشر عبر QR', 'رفع الوثائق'],
  },
  {
    id: 'a3',
    nationalId: '1034567890',
    requestNo: 'REQ-2026-0003',
    waitingNo: 'W-008',
    name: 'رائد علي الشهري',
    phone: '0503332211',
    qualification: 'ثانوية صناعية',
    gpa: 91.7,
    source: 'qobool',
    status: 'بانتظار اعتماد رئيس القسم',
    committeeId: 'c2',
    committeeNumber: '2',
    committeeTrainerIds: ['s6', 's7'],
    interviewAt: '2026-08-18 10:15',
    documents: [
      { name: 'الهوية الوطنية', status: 'معتمد' },
      { name: 'الشهادة الدراسية', status: 'معتمد' },
      { name: 'نموذج الإقرار', status: 'معتمد' },
    ],
    scores: { technical: 86, communication: 78, motivation: 92 },
    notes: 'حضور جيد ومعرفة تقنية مناسبة.',
    finalResult: 'مقبول',
    audit: ['استيراد من بوابة قبول', 'إدخال تقييم اللجنة', 'بانتظار الاعتماد النهائي'],
  },
]
const workerSource = `
const files = new Map(${JSON.stringify(files.map((file) => [file.path, file]))});
const seedApplicants = ${JSON.stringify(seedApplicants)};
const schemaSql = ${JSON.stringify(`CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  national_id TEXT NOT NULL UNIQUE,
  request_no TEXT NOT NULL UNIQUE,
  waiting_no TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
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
  audit_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`)};
const indexSql = [
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_national_id ON applicants (national_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_applicants_request_no ON applicants (request_no)',
  'CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants (status)',
];
const migrationSql = [
  'ALTER TABLE applicants ADD COLUMN committee_number TEXT',
  'ALTER TABLE applicants ADD COLUMN committee_trainers_json TEXT',
  'ALTER TABLE applicants ADD COLUMN translator_id TEXT',
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

const allowedOrigins = new Set([
  'https://legend-h-99.github.io',
  'https://interviews-tech-system.hossam-a-m22.chatgpt.site',
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://legend-h-99.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
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
    phone: row.phone,
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
    audit: JSON.parse(row.audit_json),
  };
}

function insertApplicantStatement(db, applicant) {
  return db.prepare(\`INSERT OR IGNORE INTO applicants (
    id, national_id, request_no, waiting_no, name, phone, qualification, gpa,
    source, status, committee_id, committee_number, committee_trainers_json,
    translator_id, interview_at, documents_json, scores_json, notes, final_result, audit_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`).bind(
    applicant.id,
    applicant.nationalId,
    applicant.requestNo,
    applicant.waitingNo || null,
    applicant.name,
    applicant.phone,
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
    JSON.stringify(applicant.audit),
  );
}

async function ensureDb(env) {
  const db = env.DB;
  if (!db) throw new Error('D1 binding DB is unavailable');
  await db.batch([
    db.prepare(schemaSql),
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
  const count = await db.prepare('SELECT COUNT(*) AS total FROM applicants').first();
  if ((count?.total ?? 0) === 0) {
    await db.batch(seedApplicants.map((applicant) => insertApplicantStatement(db, applicant)));
  }
  return db;
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
  const applicant = {
    id: crypto.randomUUID(),
    nationalId: body.nationalId,
    requestNo: \`REQ-2026-\${String((count?.total ?? 0) + 1).padStart(4, '0')}\`,
    name: body.name,
    phone: body.phone,
    qualification: body.qualification,
    gpa: Number(body.gpa),
    source: 'direct',
    status: 'بانتظار مراجعة شؤون المتدربين',
    committeeTrainerIds: [],
    documents: [
      { name: 'الهوية الوطنية', status: 'بانتظار المراجعة' },
      { name: 'الشهادة الدراسية', status: 'بانتظار المراجعة' },
      { name: 'نموذج الإقرار', status: 'معتمد' },
    ],
    scores: { technical: 0, communication: 0, motivation: 0 },
    notes: '',
    audit: ['إنشاء طلب جديد وتأكيد الإقرار'],
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
  const next = {
    ...current,
    ...(body.patch || {}),
    audit: [body.audit, ...current.audit].filter(Boolean).slice(0, 8),
  };
  await db.prepare(\`UPDATE applicants SET
    waiting_no = ?,
    name = ?,
    phone = ?,
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
    audit_json = ?,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?\`).bind(
      next.waitingNo || null,
      next.name,
      next.phone,
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
await writeFile(join(serverDir.pathname, 'index.js'), workerSource.trimStart())
await mkdir(join(distDir.pathname, '.openai'), { recursive: true })
await copyFile(new URL('../.openai/hosting.json', import.meta.url), join(distDir.pathname, '.openai/hosting.json'))
