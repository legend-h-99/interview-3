import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  QrCode,
  RefreshCcw,
  Search,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Role = 'college' | 'trainees' | 'head' | 'committee' | 'applicant'
type Source = 'qobool' | 'direct'
type Status =
  | 'مستورد من بوابة قبول'
  | 'تسجيل جديد غير مكتمل'
  | 'بانتظار رفع الوثائق'
  | 'بانتظار مراجعة شؤون المتدربين'
  | 'يحتاج إلى استكمال أو تصحيح'
  | 'مكتمل ومعتمد'
  | 'تم إصدار رقم الانتظار'
  | 'بانتظار المقابلة'
  | 'المقابلة جارية'
  | 'تم التقييم'
  | 'بانتظار اعتماد رئيس القسم'
  | 'النتيجة معتمدة'
  | 'معتذر أو لم يحضر'
  | 'مستبعد'

type Applicant = {
  id: string
  nationalId: string
  requestNo: string
  waitingNo?: string
  name: string
  phone: string
  qualification: string
  gpa: number
  source: Source
  status: Status
  committeeId?: string
  interviewAt?: string
  documents: { name: string; status: 'معتمد' | 'ناقص' | 'بانتظار المراجعة' }[]
  scores: { technical: number; communication: number; motivation: number }
  notes: string
  finalResult?: 'مقبول' | 'احتياط' | 'غير مقبول'
  audit: string[]
}

type Committee = {
  id: string
  name: string
  room: string
  members: string[]
}

const roles: { id: Role; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'college', label: 'إدارة الكلية', icon: LayoutDashboard },
  { id: 'trainees', label: 'شؤون المتدربين', icon: ClipboardCheck },
  { id: 'head', label: 'رئيس القسم', icon: GraduationCap },
  { id: 'committee', label: 'لجان المقابلات', icon: UserCheck },
  { id: 'applicant', label: 'واجهة المتقدم', icon: QrCode },
]

const committees: Committee[] = [
  { id: 'c1', name: 'لجنة المقابلات الأولى', room: 'قاعة 203', members: ['م. أحمد سالم', 'م. نورة الحربي'] },
  { id: 'c2', name: 'لجنة المقابلات الثانية', room: 'قاعة 207', members: ['م. خالد العتيبي', 'م. سارة الشهري'] },
  { id: 'c3', name: 'لجنة الوثائق والدعم', room: 'مكتب القبول', members: ['أ. ريم القحطاني', 'أ. محمد الغامدي'] },
]

export const seedApplicants: Applicant[] = [
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

const questions = [
  'عرّف بنفسك وسبب رغبتك في قسم التقنية الخاصة.',
  'اشرح تجربة تقنية أو مشروعًا بسيطًا عملت عليه.',
  'كيف تتعامل مع ضغط الدراسة والعمل ضمن فريق؟',
]

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const apiUrl = (path: string) => `${API_BASE}${path}`

function App() {
  const applicantOnly = new URLSearchParams(window.location.search).get('view') === 'applicant'
  const [role, setRole] = useState<Role>(applicantOnly ? 'applicant' : 'trainees')
  const [applicants, setApplicants] = useState<Applicant[]>(seedApplicants)
  const [selectedId, setSelectedId] = useState(seedApplicants[0].id)
  const [nationalId, setNationalId] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    qualification: '',
    gpa: '90',
  })

  const selected = applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0] ?? seedApplicants[0]
  const stats = useMemo(() => {
    const approved = applicants.filter((item) => item.status === 'النتيجة معتمدة').length
    const pendingDocs = applicants.filter((item) => item.status.includes('مراجعة') || item.status.includes('استكمال')).length
    const interviewed = applicants.filter((item) => item.status === 'بانتظار اعتماد رئيس القسم' || item.status === 'النتيجة معتمدة').length
    return { total: applicants.length, approved, pendingDocs, interviewed }
  }, [applicants])

  const refreshApplicants = async () => {
    const response = await fetch(apiUrl('/api/applicants'))
    if (!response.ok) throw new Error('Unable to load applicants')
    const data = (await response.json()) as { applicants: Applicant[] }
    setApplicants(data.applicants)
    setSelectedId((current) => data.applicants.some((applicant) => applicant.id === current) ? current : data.applicants[0]?.id ?? seedApplicants[0].id)
  }

  useEffect(() => {
    refreshApplicants().catch(() => setApplicants(seedApplicants))
  }, [])

  const updateApplicant = async (id: string, patch: Partial<Applicant>, audit: string) => {
    const next = applicants.map((applicant) =>
      applicant.id === id
        ? { ...applicant, ...patch, audit: [audit, ...applicant.audit].slice(0, 8) }
        : applicant,
    )
    setApplicants(next)
    const response = await fetch(apiUrl(`/api/applicants/${id}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patch, audit }),
    })
    if (response.ok) {
      const data = (await response.json()) as { applicant: Applicant }
      setApplicants((current) => current.map((applicant) => applicant.id === id ? data.applicant : applicant))
    }
  }

  const approveDocuments = async (id: string) => {
    const nextWaitingNo = `W-${String(applicants.filter((item) => item.waitingNo).length + 15).padStart(3, '0')}`
    await updateApplicant(
      id,
      {
        status: 'تم إصدار رقم الانتظار',
        waitingNo: nextWaitingNo,
        documents: selected.documents.map((document) => ({ ...document, status: 'معتمد' })),
      },
      `اعتماد الوثائق وإصدار رقم انتظار ${nextWaitingNo}`,
    )
  }

  const assignCommittee = async (id: string, committeeId: string) => {
    await updateApplicant(
      id,
      { committeeId, interviewAt: '2026-08-18 11:00', status: 'بانتظار المقابلة' },
      'توزيع المتقدم على لجنة وموعد مقابلة',
    )
  }

  const submitEvaluation = async (id: string) => {
    await updateApplicant(id, { status: 'بانتظار اعتماد رئيس القسم', finalResult: calculateScore(selected) >= 75 ? 'مقبول' : 'احتياط' }, 'اعتماد تقييم اللجنة')
  }

  const approveResult = async (id: string) => {
    await updateApplicant(id, { status: 'النتيجة معتمدة' }, 'اعتماد النتيجة النهائية من رئيس القسم')
  }

  const registerApplicant = async () => {
    if (!nationalId || !form.name) return
    const response = await fetch(apiUrl('/api/applicants'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nationalId,
        name: form.name,
        phone: form.phone,
        qualification: form.qualification,
        gpa: Number(form.gpa),
      }),
    })
    if (response.ok) {
      const data = (await response.json()) as { applicant: Applicant }
      setApplicants((current) => [data.applicant, ...current.filter((item) => item.id !== data.applicant.id)])
      setSelectedId(data.applicant.id)
    }
  }

  const resetDemo = async () => {
    await fetch(apiUrl('/api/reset'), { method: 'POST' })
    setApplicants(seedApplicants)
    setSelectedId(seedApplicants[0].id)
  }

  return (
    <main className="app" dir="rtl">
      {!applicantOnly && <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={30} />
          <div>
            <strong>interview 3</strong>
            <span>قسم التقنية الخاصة</span>
          </div>
        </div>
        <nav aria-label="واجهات النظام">
          {roles.map((item) => {
            const Icon = item.icon
            return (
              <button className={role === item.id ? 'active' : ''} key={item.id} onClick={() => setRole(item.id)} type="button">
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <button className="ghost" onClick={resetDemo} type="button">
          <RefreshCcw size={17} />
          استعادة البيانات التجريبية
        </button>
      </aside>}

      <section className={applicantOnly ? 'workspace applicant-only' : 'workspace'}>
        <header className="topbar">
          <div>
            <p>interview 3 / وحدة القبول والمقابلات</p>
            <h1>{applicantOnly ? 'بوابة المتقدمين' : roles.find((item) => item.id === role)?.label}</h1>
          </div>
          {!applicantOnly && <div className="quick-actions">
            <button type="button"><Download size={17} /> تصدير Excel</button>
            <button type="button"><FileText size={17} /> تقرير PDF</button>
          </div>}
        </header>

        {!applicantOnly && role !== 'applicant' && (
          <section className="metrics" aria-label="مؤشرات النظام">
            <Metric icon={Users} label="إجمالي المتقدمين" value={stats.total} />
            <Metric icon={FileCheck2} label="طلبات قيد المراجعة" value={stats.pendingDocs} />
            <Metric icon={CalendarDays} label="تمت مقابلتهم" value={stats.interviewed} />
            <Metric icon={CheckCircle2} label="نتائج معتمدة" value={stats.approved} />
          </section>
        )}

        {role === 'college' && <CollegeView applicants={applicants} stats={stats} />}
        {role === 'trainees' && (
          <OperationsView
            applicants={applicants}
            selected={selected}
            setSelectedId={setSelectedId}
            approveDocuments={approveDocuments}
            updateApplicant={updateApplicant}
          />
        )}
        {role === 'head' && (
          <HeadView applicants={applicants} selected={selected} setSelectedId={setSelectedId} assignCommittee={assignCommittee} approveResult={approveResult} />
        )}
        {role === 'committee' && <CommitteeView applicants={applicants} selected={selected} setSelectedId={setSelectedId} updateApplicant={updateApplicant} submitEvaluation={submitEvaluation} />}
        {role === 'applicant' && (
          <ApplicantView
            applicants={applicants}
            nationalId={nationalId}
            setNationalId={setNationalId}
            form={form}
            setForm={setForm}
            registerApplicant={registerApplicant}
          />
        )}
      </section>
    </main>
  )
}

function calculateScore(applicant: Applicant) {
  return Math.round(applicant.scores.technical * 0.45 + applicant.scores.communication * 0.25 + applicant.scores.motivation * 0.3)
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <article className="metric">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ApplicantTable({ applicants, selectedId, onSelect }: { applicants: Applicant[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>المتقدم</th>
            <th>المصدر</th>
            <th>الحالة</th>
            <th>رقم الانتظار</th>
            <th>المعدل</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((applicant) => (
            <tr className={selectedId === applicant.id ? 'selected' : ''} key={applicant.id} onClick={() => onSelect(applicant.id)}>
              <td data-label="رقم الطلب">{applicant.requestNo}</td>
              <td data-label="المتقدم">{applicant.name}</td>
              <td data-label="المصدر">{applicant.source === 'qobool' ? 'بوابة قبول' : 'تسجيل مباشر'}</td>
              <td data-label="الحالة"><span className={`status ${statusTone(applicant.status)}`}>{applicant.status}</span></td>
              <td data-label="رقم الانتظار">{applicant.waitingNo ?? 'لم يصدر'}</td>
              <td data-label="المعدل">{applicant.gpa}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function statusTone(status: Status) {
  if (status.includes('معتمدة') || status.includes('معتمد') || status.includes('مكتمل')) return 'success'
  if (status.includes('استكمال') || status.includes('تصحيح')) return 'danger'
  if (status.includes('مراجعة') || status.includes('انتظار') || status.includes('اعتماد')) return 'warning'
  return 'info'
}

function Details({ applicant }: { applicant: Applicant }) {
  const committee = committees.find((item) => item.id === applicant.committeeId)
  return (
    <section className="details">
      <div className="section-title">
        <h2>{applicant.name}</h2>
        <span>{applicant.requestNo}</span>
      </div>
      <div className="detail-grid">
        <Info label="رقم الهوية" value={applicant.nationalId} />
        <Info label="الجوال" value={applicant.phone} />
        <Info label="المؤهل" value={applicant.qualification} />
        <Info label="حالة الطلب" value={applicant.status} />
        <Info label="اللجنة" value={committee?.name ?? 'غير موزع'} />
        <Info label="موعد المقابلة" value={applicant.interviewAt ?? 'غير مجدول'} />
        <Info label="التقييم الشامل" value={`${calculateScore(applicant)} من 100`} />
      </div>
      <h3>الوثائق</h3>
      <div className="docs">
        {applicant.documents.map((document) => (
          <span key={document.name}><FileCheck2 size={16} /> {document.name}: {document.status}</span>
        ))}
      </div>
      {applicant.notes && (
        <>
          <h3>ملاحظات المقابلة</h3>
          <p className="notes">{applicant.notes}</p>
        </>
      )}
      <h3>سجل التدقيق</h3>
      <ul className="audit">
        {applicant.audit.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function CollegeView({ applicants, stats }: { applicants: Applicant[]; stats: { total: number; approved: number; pendingDocs: number; interviewed: number } }) {
  return (
    <div className="grid two">
      <section className="panel">
        <div className="section-title"><h2>مراقبة سير العمل</h2><BarChart3 size={21} /></div>
        <div className="progress-list">
          <Progress label="استكمال التسجيل" value={Math.round((applicants.filter((a) => a.waitingNo).length / stats.total) * 100)} />
          <Progress label="إنجاز المقابلات" value={Math.round((stats.interviewed / stats.total) * 100)} />
          <Progress label="اعتماد النتائج" value={Math.round((stats.approved / stats.total) * 100)} />
        </div>
      </section>
      <section className="panel">
        <div className="section-title"><h2>تقرير تنفيذي سريع</h2><ListChecks size={21} /></div>
        <ApplicantTable applicants={applicants} onSelect={() => undefined} />
      </section>
    </div>
  )
}

function OperationsView({ applicants, selected, setSelectedId, approveDocuments, updateApplicant }: {
  applicants: Applicant[]
  selected: Applicant
  setSelectedId: (id: string) => void
  approveDocuments: (id: string) => void
  updateApplicant: (id: string, patch: Partial<Applicant>, audit: string) => void
}) {
  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>قائمة المتقدمين</h2><UploadCloud size={21} /></div>
        <div className="toolbar">
          <button type="button">استيراد من قبول</button>
          <button type="button">إنشاء رقم دفعة</button>
        </div>
        <ApplicantTable applicants={applicants} selectedId={selected.id} onSelect={setSelectedId} />
      </section>
      <section className="panel">
        <Details applicant={selected} />
        <div className="actions">
          <button onClick={() => approveDocuments(selected.id)} type="button"><CheckCircle2 size={17} /> اعتماد الوثائق وإصدار الانتظار</button>
          <button onClick={() => updateApplicant(selected.id, { status: 'يحتاج إلى استكمال أو تصحيح' }, 'إعادة الطلب للاستكمال')} type="button">إعادة للاستكمال</button>
        </div>
      </section>
    </div>
  )
}

function HeadView({ applicants, selected, setSelectedId, assignCommittee, approveResult }: {
  applicants: Applicant[]
  selected: Applicant
  setSelectedId: (id: string) => void
  assignCommittee: (id: string, committeeId: string) => void
  approveResult: (id: string) => void
}) {
  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>اللجان والتوزيع</h2><Users size={21} /></div>
        <div className="committees">
          {committees.map((committee) => (
            <button key={committee.id} onClick={() => assignCommittee(selected.id, committee.id)} type="button">
              <strong>{committee.name}</strong>
              <span>{committee.room} - {committee.members.join('، ')}</span>
            </button>
          ))}
        </div>
        <ApplicantTable applicants={applicants} selectedId={selected.id} onSelect={setSelectedId} />
      </section>
      <section className="panel">
        <Details applicant={selected} />
        <div className="rubric">
          {questions.map((question, index) => <span key={question}>{index + 1}. {question}</span>)}
        </div>
        <div className="actions">
          <button onClick={() => approveResult(selected.id)} type="button"><ShieldCheck size={17} /> اعتماد النتيجة النهائية</button>
        </div>
      </section>
    </div>
  )
}

function CommitteeView({ applicants, selected, setSelectedId, updateApplicant, submitEvaluation }: {
  applicants: Applicant[]
  selected: Applicant
  setSelectedId: (id: string) => void
  updateApplicant: (id: string, patch: Partial<Applicant>, audit: string) => void
  submitEvaluation: (id: string) => void
}) {
  const assigned = applicants.filter((applicant) => applicant.committeeId)
  const setScore = (key: keyof Applicant['scores'], value: number) => {
    updateApplicant(selected.id, { scores: { ...selected.scores, [key]: value }, status: 'المقابلة جارية' }, 'حفظ تقييم مؤقت')
  }
  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>المقابلات المسندة</h2><UserCheck size={21} /></div>
        <ApplicantTable applicants={assigned} selectedId={selected.id} onSelect={setSelectedId} />
      </section>
      <section className="panel">
        <Details applicant={selected} />
        <div className="score-form">
          <Range label="المهارة التقنية" value={selected.scores.technical} onChange={(value) => setScore('technical', value)} />
          <Range label="التواصل" value={selected.scores.communication} onChange={(value) => setScore('communication', value)} />
          <Range label="الدافعية والانضباط" value={selected.scores.motivation} onChange={(value) => setScore('motivation', value)} />
          <textarea value={selected.notes} onChange={(event) => updateApplicant(selected.id, { notes: event.target.value }, 'تحديث ملاحظات المقابلة')} placeholder="ملاحظات المقيم" />
        </div>
        <div className="actions">
          <button onClick={() => submitEvaluation(selected.id)} type="button"><CheckCircle2 size={17} /> اعتماد تقييم المتقدم</button>
        </div>
      </section>
    </div>
  )
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="range">
      <span>{label}</span>
      <input aria-label={label} min="0" max="100" onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} />
      <strong>{value}</strong>
    </label>
  )
}

function ApplicantView({ applicants, nationalId, setNationalId, form, setForm, registerApplicant }: {
  applicants: Applicant[]
  nationalId: string
  setNationalId: (value: string) => void
  form: { name: string; phone: string; qualification: string; gpa: string }
  setForm: (value: { name: string; phone: string; qualification: string; gpa: string }) => void
  registerApplicant: () => void
}) {
  const found = applicants.find((item) => item.nationalId === nationalId)
  return (
    <div className="applicant-shell">
      <section className="panel applicant-card">
        <div className="qr-box"><QrCode size={82} /><span>رابط التسجيل المباشر</span></div>
        <div className="section-title"><h2>البحث أو التسجيل</h2><Search size={21} /></div>
        <label>رقم الهوية الوطنية<input value={nationalId} onChange={(event) => setNationalId(event.target.value)} placeholder="مثال: 1012345678" /></label>
        {found ? (
          <div className="found">
            <Details applicant={found} />
          </div>
        ) : (
          <div className="form-grid">
            <label>الاسم الكامل<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>رقم الجوال<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>المؤهل<input value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} /></label>
            <label>المعدل<input value={form.gpa} onChange={(event) => setForm({ ...form, gpa: event.target.value })} /></label>
            <button onClick={registerApplicant} type="button"><UploadCloud size={17} /> رفع الوثائق وتأكيد الإقرار</button>
          </div>
        )}
      </section>
    </div>
  )
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="progress">
      <span>{label}</span>
      <strong>{value}%</strong>
      <div><i style={{ width: `${value}%` }} /></div>
    </div>
  )
}

export default App
