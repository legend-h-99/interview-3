import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
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
  Sparkles,
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
  nationality: string
  age: number
  certificateType: string
  graduationDate: string
  phone: string
  extraPhone: string
  qualification: string
  gpa: number
  source: Source
  status: Status
  committeeId?: string
  committeeNumber?: string
  committeeTrainerIds?: string[]
  translatorId?: string
  interviewAt?: string
  documents: { name: string; status: 'معتمد' | 'ناقص' | 'بانتظار المراجعة' }[]
  scores: { technical: number; communication: number; motivation: number }
  notes: string
  finalResult?: 'مقبول' | 'احتياط' | 'غير مقبول'
  audit: string[]
}

type Committee = {
  id: string
  number: string
}

type StaffMember = {
  id: string
  name: string
  computerNo?: string
  task: string
}

type CollegeManager = {
  title: string
  name: string
}

const collegeProfile = {
  collegeName: 'الكلية التقنية للاتصالات والمعلومات',
  departmentName: 'قسم التقنية الخاصة للصم وضعاف السمع',
  departmentHeadAndCommitteeChair: 'رائد الغفيلي',
  traineeAffairsDeputy: 'محمد الرميح',
}

const collegeManagers: CollegeManager[] = [
  { title: 'العميد', name: 'د. سعود العتيبي' },
  { title: 'وكيل التدريب', name: 'أحمد الطلحي' },
  { title: 'وكيل الجودة', name: 'عبدالرحمن المالكي' },
]

const roles: { id: Role; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'college', label: 'إدارة الكلية', icon: LayoutDashboard },
  { id: 'trainees', label: 'شؤون المتدربين', icon: ClipboardCheck },
  { id: 'head', label: 'رئيس القسم', icon: GraduationCap },
  { id: 'committee', label: 'لجان المقابلات', icon: UserCheck },
  { id: 'applicant', label: 'واجهة المتقدم', icon: QrCode },
]

const roleDescriptions: Record<Role, string> = {
  college: 'نظرة تنفيذية على سير المقابلات، نسب الإنجاز، والنتائج المعتمدة.',
  trainees: 'مراجعة الطلبات والوثائق وإصدار أرقام الانتظار للمتقدمين.',
  head: 'توزيع المتقدمين على اللجان واعتماد النتائج النهائية.',
  committee: 'إدارة جلسات المقابلة وتسجيل الدرجات والملاحظات.',
  applicant: 'تسجيل طلب جديد أو متابعة حالة الطلب برقم الهوية.',
}

const staffMembers: StaffMember[] = [
  { id: 's1', name: 'رائد الغفيلي', computerNo: '30487', task: 'رئيس القسم / رئيس اللجنة' },
  { id: 's2', name: 'موسى عبدالرحيم الأنصاري', computerNo: '30004', task: 'المنصة الإلكترونية للفرز' },
  { id: 's3', name: 'حسام الدين عثمان مسملي', computerNo: '28996', task: 'المنصة الإلكترونية للفرز' },
  { id: 's4', name: 'سالم سعيد الشمري', computerNo: '27548', task: 'لجنة 1' },
  { id: 's5', name: 'دهام مخلف الشمري', computerNo: '23294', task: 'لجنة 1' },
  { id: 's6', name: 'خالد عبدالعزيز المديفر', computerNo: '31067', task: 'لجنة 2' },
  { id: 's7', name: 'حسين صالح آل سنان', computerNo: '26596', task: 'لجنة 2' },
  { id: 's8', name: 'ماجد سعود الحربي', computerNo: '16712', task: 'لجنة 3' },
  { id: 's9', name: 'إبراهيم علي النصار', task: 'لجنة 3' },
  { id: 's10', name: 'عبدالله محمد الفيفي', computerNo: '30593', task: 'التنظيم والترجمة' },
  { id: 's11', name: 'سطام عبدالعزيز الفهيد', computerNo: '21286', task: 'التنظيم والترجمة' },
]

const committees: Committee[] = [
  { id: 'c1', number: '1' },
  { id: 'c2', number: '2' },
  { id: 'c3', number: '3' },
]

const trainerMembers = staffMembers.filter((member) => member.task.startsWith('لجنة '))
const translatorMembers = staffMembers.filter((member) => member.task === 'التنظيم والترجمة')

export const seedApplicants: Applicant[] = [
  {
    id: 'a1',
    nationalId: '1012345678',
    requestNo: 'REQ-2026-0001',
    waitingNo: 'W-014',
    name: 'عبدالله محمد الزهراني',
    nationality: 'سعودي',
    age: 19,
    certificateType: 'ثانوية عامة',
    graduationDate: '2026-06-15',
    phone: '0551234567',
    extraPhone: '0557654321',
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
    nationality: 'سعودي',
    age: 22,
    certificateType: 'دبلوم حاسب',
    graduationDate: '2025-05-20',
    phone: '0569001122',
    extraPhone: '0569003344',
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
    nationality: 'سعودي',
    age: 20,
    certificateType: 'ثانوية صناعية',
    graduationDate: '2026-06-10',
    phone: '0503332211',
    extraPhone: '0503332244',
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

const questions = [
  'عرّف بنفسك وسبب رغبتك في قسم التقنية الخاصة.',
  'اشرح تجربة تقنية أو مشروعًا بسيطًا عملت عليه.',
  'كيف تتعامل مع ضغط الدراسة والعمل ضمن فريق؟',
]

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const apiUrl = (path: string) => `${API_BASE}${path}`
const exportHeaders = ['اسم الكلية', 'القسم', 'رئيس القسم / رئيس اللجنة', 'مسؤول إدارة الكلية', 'وكيل شؤون المتدربين', 'رقم الطلب', 'الاسم', 'رقم الهوية', 'الجنسية', 'العمر', 'نوع الشهادة', 'تاريخ التخرج', 'رقم الجوال', 'رقم جوال إضافي', 'المصدر', 'الحالة', 'رقم الانتظار', 'موعد المقابلة', 'النتيجة']
const staffExportHeaders = ['الاسم', 'رقم الحاسب', 'المهام']

function csvCell(value: string | number | undefined) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function formatManager(manager: CollegeManager) {
  return `${manager.title}: ${manager.name}`
}

function formatCommittee(committee: Committee) {
  return `لجنة ${committee.number}`
}

function formatTrainerOption(member: StaffMember) {
  return `${member.name} - ${member.computerNo ?? 'بدون رقم حاسب'}`
}

function staffNames(ids: string[] | undefined) {
  return (ids ?? [])
    .map((id) => staffMembers.find((member) => member.id === id)?.name)
    .filter(Boolean)
    .join('، ')
}

function translatorName(id: string | undefined) {
  return id ? staffMembers.find((member) => member.id === id)?.name : undefined
}

function exportApplicantsExcel(applicants: Applicant[], selectedManager: CollegeManager) {
  const rows = applicants.map((applicant) => [
    collegeProfile.collegeName,
    collegeProfile.departmentName,
    collegeProfile.departmentHeadAndCommitteeChair,
    formatManager(selectedManager),
    collegeProfile.traineeAffairsDeputy,
    applicant.requestNo,
    applicant.name,
    applicant.nationalId,
    applicant.nationality,
    applicant.age,
    applicant.certificateType,
    applicant.graduationDate,
    applicant.phone,
    applicant.extraPhone,
    applicant.source === 'qobool' ? 'بوابة قبول' : 'تسجيل مباشر',
    applicant.status,
    applicant.waitingNo ?? '',
    applicant.interviewAt ?? '',
    applicant.finalResult ?? '',
  ])
  const staffRows = staffMembers.map((member) => [member.name, member.computerNo ?? '', member.task])
  const csv = [
    'بيانات المتقدمين',
    [exportHeaders, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'),
    '',
    'بيانات فرق العمل',
    [staffExportHeaders, ...staffRows].map((row) => row.map(csvCell).join(',')).join('\n'),
  ].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `interview-3-applicants-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function openApplicantsPdfReport(applicants: Applicant[], stats: { total: number; approved: number; pendingDocs: number; scheduled: number }, selectedManager: CollegeManager) {
  const report = window.open('', '_blank', 'width=1024,height=720')
  if (!report) return

  const rows = applicants.map((applicant) => `
    <tr>
      <td>${escapeHtml(applicant.requestNo)}</td>
      <td>${escapeHtml(applicant.name)}</td>
      <td>${escapeHtml(applicant.nationalId)}</td>
      <td>${escapeHtml(applicant.nationality)}</td>
      <td>${escapeHtml(applicant.age)}</td>
      <td>${escapeHtml(applicant.certificateType)}</td>
      <td>${escapeHtml(applicant.graduationDate)}</td>
      <td>${escapeHtml(applicant.phone)}</td>
      <td>${escapeHtml(applicant.extraPhone)}</td>
      <td>${escapeHtml(applicant.status)}</td>
      <td>${escapeHtml(applicant.waitingNo ?? 'لم يصدر')}</td>
    </tr>
  `).join('')

  report.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>تقرير interview 3</title>
        <style>
          body { margin: 0; padding: 32px; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #182235; }
          header { border-bottom: 3px solid #0f6b8f; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0; color: #667085; }
          .identity { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
          .identity div { border: 1px solid #d9e2ec; border-radius: 8px; padding: 10px 12px; background: #fafdff; }
          .identity span { display: block; color: #667085; font-size: 12px; }
          .identity strong { display: block; margin-top: 4px; font-size: 15px; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
          .metric { border: 1px solid #d9e2ec; border-radius: 8px; padding: 12px; }
          .metric span { display: block; color: #667085; font-size: 12px; }
          .metric strong { display: block; margin-top: 6px; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d9e2ec; padding: 10px; text-align: right; font-size: 13px; }
          th { background: #fafdff; color: #667085; }
          @media print { body { padding: 18px; } button { display: none; } }
        </style>
      </head>
      <body>
        <header>
          <h1>تقرير interview 3</h1>
          <p>وحدة القبول والمقابلات - ${escapeHtml(new Date().toLocaleDateString('ar-SA'))}</p>
        </header>
        <section class="identity">
          <div><span>اسم الكلية</span><strong>${escapeHtml(collegeProfile.collegeName)}</strong></div>
          <div><span>القسم</span><strong>${escapeHtml(collegeProfile.departmentName)}</strong></div>
          <div><span>رئيس القسم / رئيس اللجنة</span><strong>${escapeHtml(collegeProfile.departmentHeadAndCommitteeChair)}</strong></div>
          <div><span>مسؤول إدارة الكلية</span><strong>${escapeHtml(formatManager(selectedManager))}</strong></div>
          <div><span>وكيل شؤون المتدربين</span><strong>${escapeHtml(collegeProfile.traineeAffairsDeputy)}</strong></div>
        </section>
        <section class="metrics">
          <div class="metric"><span>إجمالي المتقدمين</span><strong>${stats.total}</strong></div>
          <div class="metric"><span>طلبات قيد المراجعة</span><strong>${stats.pendingDocs}</strong></div>
          <div class="metric"><span>مواعيد مجدولة</span><strong>${stats.scheduled}</strong></div>
          <div class="metric"><span>نتائج معتمدة</span><strong>${stats.approved}</strong></div>
        </section>
        <table>
          <thead>
            <tr><th>رقم الطلب</th><th>المتقدم</th><th>رقم الهوية</th><th>الجنسية</th><th>العمر</th><th>نوع الشهادة</th><th>تاريخ التخرج</th><th>رقم الجوال</th><th>رقم جوال إضافي</th><th>الحالة</th><th>رقم الانتظار</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <h2>بيانات فرق العمل</h2>
        <table>
          <thead>
            <tr><th>الاسم</th><th>رقم الحاسب</th><th>المهام</th></tr>
          </thead>
          <tbody>
            ${staffMembers.map((member) => `
              <tr>
                <td>${escapeHtml(member.name)}</td>
                <td>${escapeHtml(member.computerNo ?? '')}</td>
                <td>${escapeHtml(member.task)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `)
  report.document.close()
}

function App() {
  const applicantOnly = new URLSearchParams(window.location.search).get('view') === 'applicant'
  const [role, setRole] = useState<Role>(applicantOnly ? 'applicant' : 'trainees')
  const [applicants, setApplicants] = useState<Applicant[]>(seedApplicants)
  const [selectedId, setSelectedId] = useState(seedApplicants[0].id)
  const [selectedManagerIndex, setSelectedManagerIndex] = useState(0)
  const [nationalId, setNationalId] = useState('')
  const [form, setForm] = useState({
    name: '',
    nationality: 'سعودي',
    age: '',
    certificateType: '',
    graduationDate: '',
    phone: '',
    extraPhone: '',
  })

  const selected = applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0] ?? seedApplicants[0]
  const stats = useMemo(() => {
    const approved = applicants.filter((item) => item.status === 'النتيجة معتمدة').length
    const pendingDocs = applicants.filter((item) => item.status.includes('مراجعة') || item.status.includes('استكمال')).length
    const interviewed = applicants.filter((item) => item.status === 'بانتظار اعتماد رئيس القسم' || item.status === 'النتيجة معتمدة').length
    const scheduled = applicants.filter((item) => item.interviewAt).length
    return { total: applicants.length, approved, pendingDocs, interviewed, scheduled }
  }, [applicants])
  const activeRole = applicantOnly ? 'applicant' : role
  const selectedManager = collegeManagers[selectedManagerIndex] ?? collegeManagers[0]

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

  const assignCommittee = async (id: string, committeeNumber: string, committeeTrainerIds: string[], translatorId: string) => {
    await updateApplicant(
      id,
      {
        committeeId: `c${committeeNumber}`,
        committeeNumber,
        committeeTrainerIds,
        translatorId: translatorId || undefined,
        interviewAt: '2026-08-18 11:00',
        status: 'بانتظار المقابلة',
      },
      'توزيع المتقدم على لجنة ومدربين وموعد مقابلة',
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
        nationality: form.nationality,
        age: Number(form.age),
        certificateType: form.certificateType,
        graduationDate: form.graduationDate,
        phone: form.phone,
        extraPhone: form.extraPhone,
        qualification: form.certificateType,
        gpa: 0,
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
            <span className="institution-line">{collegeProfile.collegeName} · {collegeProfile.departmentName}</span>
            <span className="institution-line">رئيس القسم / رئيس اللجنة: {collegeProfile.departmentHeadAndCommitteeChair}</span>
            <span className="topbar-description">{roleDescriptions[activeRole]}</span>
          </div>
          {!applicantOnly && <div className="quick-actions">
            {role === 'college' && (
              <label className="manager-select">
                مسؤول إدارة الكلية
                <select value={selectedManagerIndex} onChange={(event) => setSelectedManagerIndex(Number(event.target.value))}>
                  {collegeManagers.map((manager, index) => <option key={manager.name} value={index}>{formatManager(manager)}</option>)}
                </select>
              </label>
            )}
            <button onClick={() => exportApplicantsExcel(applicants, selectedManager)} type="button"><Download size={17} /> تصدير Excel</button>
            <button onClick={() => openApplicantsPdfReport(applicants, stats, selectedManager)} type="button"><FileText size={17} /> تقرير PDF</button>
          </div>}
        </header>

        {!applicantOnly && role !== 'applicant' && (
          <>
            <section className="metrics" aria-label="مؤشرات النظام">
              <Metric icon={Users} label="إجمالي المتقدمين" value={stats.total} tone="blue" />
              <Metric icon={FileCheck2} label="طلبات قيد المراجعة" value={stats.pendingDocs} tone="amber" />
              <Metric icon={CalendarDays} label="مواعيد مجدولة" value={stats.scheduled} tone="teal" />
              <Metric icon={CheckCircle2} label="نتائج معتمدة" value={stats.approved} tone="green" />
            </section>
            <section className="insight-strip" aria-label="ملخص سريع">
              <div>
                <Sparkles size={18} />
                <span>جاهزية المقابلات</span>
                <strong>{stats.total ? Math.round((stats.scheduled / stats.total) * 100) : 0}%</strong>
              </div>
              <div>
                <Clock3 size={18} />
                <span>تحتاج متابعة</span>
                <strong>{stats.pendingDocs}</strong>
              </div>
              <div>
                <ShieldCheck size={18} />
                <span>آخر ملف محدد</span>
                <strong>{selected.requestNo}</strong>
              </div>
            </section>
          </>
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

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'blue' | 'amber' | 'teal' | 'green' }) {
  return (
    <article className={`metric ${tone}`}>
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
            <th>رقم الهوية</th>
            <th>الجنسية</th>
            <th>الحالة</th>
            <th>رقم الانتظار</th>
            <th>نوع الشهادة</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((applicant) => (
            <tr className={selectedId === applicant.id ? 'selected' : ''} key={applicant.id} onClick={() => onSelect(applicant.id)}>
              <td data-label="رقم الطلب">{applicant.requestNo}</td>
              <td data-label="المتقدم">{applicant.name}</td>
              <td data-label="رقم الهوية">{applicant.nationalId}</td>
              <td data-label="الجنسية">{applicant.nationality}</td>
              <td data-label="الحالة"><span className={`status ${statusTone(applicant.status)}`}>{applicant.status}</span></td>
              <td data-label="رقم الانتظار">{applicant.waitingNo ?? 'لم يصدر'}</td>
              <td data-label="نوع الشهادة">{applicant.certificateType}</td>
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
  const committeeNumber = applicant.committeeNumber ?? committee?.number
  const trainers = staffNames(applicant.committeeTrainerIds)
  const translator = translatorName(applicant.translatorId)
  return (
    <section className="details">
      <div className="profile-header">
        <div>
          <span className={`status ${statusTone(applicant.status)}`}>{applicant.status}</span>
          <h2>{applicant.name}</h2>
          <p><span>{applicant.requestNo}</span> · {applicant.source === 'qobool' ? 'بوابة قبول' : 'تسجيل مباشر'}</p>
        </div>
        <strong>{applicant.waitingNo ? `رقم الانتظار ${applicant.waitingNo}` : 'بدون رقم انتظار'}</strong>
      </div>
      <div className="detail-grid">
        <Info label="رقم الهوية" value={applicant.nationalId} />
        <Info label="الجنسية" value={applicant.nationality} />
        <Info label="العمر" value={`${applicant.age}`} />
        <Info label="نوع الشهادة" value={applicant.certificateType} />
        <Info label="تاريخ التخرج" value={applicant.graduationDate} />
        <Info label="رقم الجوال" value={applicant.phone} />
        <Info label="رقم جوال إضافي" value={applicant.extraPhone} />
        <Info label="حالة الطلب" value={`الحالة الحالية: ${applicant.status}`} />
        <Info label="اللجنة" value={committeeNumber ? `لجنة ${committeeNumber}` : 'غير موزع'} />
        <Info label="المدربون" value={trainers || 'لم يتم الاختيار'} />
        <Info label="المترجم" value={translator ?? 'بدون مترجم'} />
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
  assignCommittee: (id: string, committeeNumber: string, committeeTrainerIds: string[], translatorId: string) => void
  approveResult: (id: string) => void
}) {
  const initialCommitteeNumber = selected.committeeNumber ?? committees.find((committee) => committee.id === selected.committeeId)?.number ?? ''
  const [committeeNumber, setCommitteeNumber] = useState(initialCommitteeNumber)
  const [trainerIds, setTrainerIds] = useState<string[]>(selected.committeeTrainerIds ?? [])
  const [translatorId, setTranslatorId] = useState(selected.translatorId ?? '')

  useEffect(() => {
    const nextCommitteeNumber = selected.committeeNumber ?? committees.find((committee) => committee.id === selected.committeeId)?.number ?? ''
    setCommitteeNumber(nextCommitteeNumber)
    setTrainerIds(selected.committeeTrainerIds ?? [])
    setTranslatorId(selected.translatorId ?? '')
  }, [selected.id, selected.committeeId, selected.committeeNumber, selected.committeeTrainerIds, selected.translatorId])

  const toggleTrainer = (id: string) => {
    setTrainerIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>اللجان والتوزيع</h2><Users size={21} /></div>
        <label className="list-select">
          اختيار اللجنة
          <select
            aria-label="اختيار اللجنة"
            value={committeeNumber}
            onChange={(event) => {
              setCommitteeNumber(event.target.value)
              setTrainerIds([])
              setTranslatorId('')
            }}
          >
            <option value="">اختر رقم اللجنة</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.number}>{formatCommittee(committee)}</option>
            ))}
          </select>
        </label>
        {committeeNumber && (
          <div className="choice-block">
            <strong>اختيار المدربين</strong>
            <div className="check-list">
              {trainerMembers.map((trainer) => (
                <label className="check-item" key={trainer.id}>
                  <input checked={trainerIds.includes(trainer.id)} onChange={() => toggleTrainer(trainer.id)} type="checkbox" />
                  <span>{trainer.name}</span>
                  <small>{trainer.computerNo ?? 'بدون رقم حاسب'}</small>
                </label>
              ))}
            </div>
            <label className="list-select">
              اختيار مترجم اختياري
              <select aria-label="اختيار مترجم اختياري" value={translatorId} onChange={(event) => setTranslatorId(event.target.value)}>
                <option value="">بدون مترجم</option>
                {translatorMembers.map((translator) => (
                  <option key={translator.id} value={translator.id}>{formatTrainerOption(translator)}</option>
                ))}
              </select>
            </label>
            <button
              className="full-action"
              onClick={() => assignCommittee(selected.id, committeeNumber, trainerIds, translatorId)}
              type="button"
            >
              تثبيت اللجنة والمدربين
            </button>
          </div>
        )}
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
  const [committeeNumber, setCommitteeNumber] = useState('')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(selected.committeeTrainerIds ?? [])
  const [translatorId, setTranslatorId] = useState(selected.translatorId ?? '')
  const selectedStaff = selectedStaffIds
    .map((id) => staffMembers.find((member) => member.id === id))
    .filter((member): member is StaffMember => Boolean(member))
  const assigned = applicants.filter((applicant) => {
    const applicantCommitteeNumber = applicant.committeeNumber ?? committees.find((committee) => committee.id === applicant.committeeId)?.number
    return committeeNumber ? applicantCommitteeNumber === committeeNumber : false
  })

  useEffect(() => {
    setTranslatorId(committeeNumber ? selected.translatorId ?? '' : '')
    setSelectedStaffIds(committeeNumber ? selected.committeeTrainerIds ?? [] : [])
  }, [committeeNumber, selected.id, selected.committeeTrainerIds, selected.translatorId])

  const selectTranslator = (value: string) => {
    setTranslatorId(value)
    updateApplicant(selected.id, { translatorId: value || undefined }, value ? 'اختيار مترجم المقابلة' : 'إلغاء مترجم المقابلة')
  }

  const toggleStaff = (id: string) => {
    const next = selectedStaffIds.includes(id) ? selectedStaffIds.filter((item) => item !== id) : [...selectedStaffIds, id]
    setSelectedStaffIds(next)
    updateApplicant(selected.id, { committeeTrainerIds: next }, 'اختيار مدربي اللجنة')
  }

  const setScore = (key: keyof Applicant['scores'], value: number) => {
    updateApplicant(selected.id, { scores: { ...selected.scores, [key]: value }, status: 'المقابلة جارية' }, 'حفظ تقييم مؤقت')
  }
  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>المقابلات المسندة</h2><UserCheck size={21} /></div>
        <label className="list-select">
          اختيار اللجنة
          <select
            aria-label="اختيار اللجنة في المقابلات"
            value={committeeNumber}
            onChange={(event) => {
              const nextCommitteeNumber = event.target.value
              setCommitteeNumber(nextCommitteeNumber)
              setTranslatorId('')
              setSelectedStaffIds([])
              const firstAssignedApplicant = applicants.find((applicant) => {
                const applicantCommitteeNumber = applicant.committeeNumber ?? committees.find((committee) => committee.id === applicant.committeeId)?.number
                return applicantCommitteeNumber === nextCommitteeNumber
              })
              if (firstAssignedApplicant) {
                setSelectedId(firstAssignedApplicant.id)
              }
            }}
          >
            <option value="">اختر رقم اللجنة</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.number}>{formatCommittee(committee)}</option>
            ))}
          </select>
        </label>
        {committeeNumber && (
          <>
            <div className="choice-block">
              <strong>اختيار المدربين</strong>
              <div className="check-list">
                {trainerMembers.map((member) => (
                  <label className="check-item" key={member.id}>
                    <input checked={selectedStaffIds.includes(member.id)} onChange={() => toggleStaff(member.id)} type="checkbox" />
                    <span>{member.name}</span>
                    <small>{member.computerNo ?? 'بدون رقم حاسب'}</small>
                  </label>
                ))}
              </div>
            </div>
            <label className="list-select">
              اختيار مترجم اختياري
              <select aria-label="اختيار مترجم المقابلة اختياري" value={translatorId} onChange={(event) => selectTranslator(event.target.value)}>
                <option value="">بدون مترجم</option>
                {translatorMembers.map((translator) => (
                  <option key={translator.id} value={translator.id}>{formatTrainerOption(translator)}</option>
                ))}
              </select>
            </label>
            {selectedStaff.length > 0 && (
              <div className="detail-grid compact">
                <Info label="المدربون" value={selectedStaff.map((member) => member.name).join('، ')} />
                <Info label="أرقام الحاسب" value={selectedStaff.map((member) => member.computerNo ?? 'غير متوفر').join('، ')} />
                <Info label="اللجنة المختارة" value={`لجنة ${committeeNumber}`} />
              </div>
            )}
          </>
        )}
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
  form: { name: string; nationality: string; age: string; certificateType: string; graduationDate: string; phone: string; extraPhone: string }
  setForm: (value: { name: string; nationality: string; age: string; certificateType: string; graduationDate: string; phone: string; extraPhone: string }) => void
  registerApplicant: () => void
}) {
  const found = applicants.find((item) => item.nationalId === nationalId)
  return (
    <div className="applicant-shell">
      <section className="applicant-hero">
        <div>
          <span>بوابة آمنة وسريعة</span>
          <h2>سجل طلبك وتابع حالته من مكان واحد</h2>
          <p>تظهر بيانات التسجيل مباشرة لدى شؤون المتدربين واللجان، ويحصل الطلب على رقم مرجعي فور حفظه.</p>
        </div>
        <div className="hero-badge">
          <QrCode size={34} />
          <strong>interview 3</strong>
          <span>متصل بالنظام</span>
        </div>
      </section>
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
            <label>الجنسية<input value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} /></label>
            <label>العمر<input inputMode="numeric" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} /></label>
            <label>نوع الشهادة<input value={form.certificateType} onChange={(event) => setForm({ ...form, certificateType: event.target.value })} /></label>
            <label>تاريخ التخرج<input type="date" value={form.graduationDate} onChange={(event) => setForm({ ...form, graduationDate: event.target.value })} /></label>
            <label>رقم الجوال<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>رقم جوال إضافي<input value={form.extraPhone} onChange={(event) => setForm({ ...form, extraPhone: event.target.value })} /></label>
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
