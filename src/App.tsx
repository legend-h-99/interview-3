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
import acceptedApplicantsData from './data/acceptedApplicants.json'

type Role = 'college' | 'trainees' | 'head' | 'committee' | 'applicant'
type Source = 'qobool' | 'direct'
type Status =
  | 'مستورد من بوابة قبول'
  | 'تسجيل جديد غير مكتمل'
  | 'بانتظار رفع الوثائق'
  | 'بانتظار استكمال بيانات المتقدم'
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
  scores: InterviewScores
  notes: string
  finalResult?: 'مقبول' | 'احتياط' | 'غير مقبول'
  admissionStatus?: string
  organization?: string
  major?: string
  program?: string
  preferenceNo?: string
  audit: string[]
}

type ApplicantForm = Pick<Applicant, 'nationalId' | 'name' | 'nationality' | 'certificateType' | 'graduationDate' | 'phone' | 'extraPhone'> & {
  age: string
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

type AcceptedApplicant = {
  nationalId: string
  name: string
  phone: string
  organization: string
  major: string
  program: string
  preferenceNo: string
  admissionStatus: string
}

type YesNo = '' | 'نعم' | 'لا'

type InterviewScores = {
  technical?: number
  communication?: number
  motivation?: number
  signLanguage?: number
  appearance?: number
  generalInfo?: number
  responseSpeed?: number
  questionScores?: number[]
  hasAssociatedDifficulty?: YesNo
  weakHearing?: YesNo
  knowsSignLanguage?: YesNo
  weakMentalAbilities?: YesNo
  distinguished?: YesNo
}

type InterviewQuestion = {
  category: 'رياضيات' | 'إنجليزي'
  prompt: string
  answer: string
}

type ChartDatum = {
  label: string
  value: number
  color: string
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
const roleIds = roles.map((item) => item.id)

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
const acceptedApplicants = acceptedApplicantsData as AcceptedApplicant[]

function normalizeImportedPhone(phone: string) {
  return phone.startsWith('5') ? `0${phone}` : phone
}

function normalizeDigits(value: string) {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicDigits.indexOf(digit)
    if (arabicIndex >= 0) return String(arabicIndex)
    const persianIndex = persianDigits.indexOf(digit)
    return persianIndex >= 0 ? String(persianIndex) : digit
  })
}

function flexibleNumber(value: string | number | undefined) {
  const normalized = normalizeDigits(String(value ?? '')).replace(/[^0-9.-]/g, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function acceptedToApplicant(item: AcceptedApplicant, index: number): Applicant {
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
    status: 'بانتظار استكمال بيانات المتقدم',
    documents: [
      { name: 'الهوية الوطنية', status: 'بانتظار المراجعة' },
      { name: 'الشهادة الدراسية', status: 'بانتظار المراجعة' },
      { name: 'نموذج الإقرار', status: 'معتمد' },
    ],
    scores: { technical: 0, communication: 0, motivation: 0 },
    notes: '',
    admissionStatus: item.admissionStatus,
    organization: item.organization,
    major: item.major,
    program: item.program,
    preferenceNo: item.preferenceNo,
    audit: ['استيراد بيانات القبول النهائي', 'بانتظار استكمال بيانات المتقدم'],
  }
}

const acceptedSeedApplicants = acceptedApplicants.map(acceptedToApplicant)

export const seedApplicants: Applicant[] = [
  ...acceptedSeedApplicants,
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

const interviewQuestionSets: InterviewQuestion[][] = [
  [
    { category: 'رياضيات', prompt: '٤ + ٥ =', answer: '٩' },
    { category: 'رياضيات', prompt: '٨ - ٢ =', answer: '٦' },
    { category: 'رياضيات', prompt: '٦ × ٥ =', answer: '٣٠' },
    { category: 'إنجليزي', prompt: 'ما هو الحرف الكبير من g؟', answer: 'G' },
    { category: 'إنجليزي', prompt: 'ما معنى كلمة Home؟', answer: 'منزل' },
  ],
  [
    { category: 'رياضيات', prompt: '٧ + ٢ =', answer: '٩' },
    { category: 'رياضيات', prompt: '١٠ - ٤ =', answer: '٦' },
    { category: 'رياضيات', prompt: '٦ × ٢ =', answer: '١٢' },
    { category: 'إنجليزي', prompt: 'ما هو الحرف الكبير من a؟', answer: 'A' },
    { category: 'إنجليزي', prompt: 'ما معنى كلمة Car؟', answer: 'سيارة' },
  ],
  [
    { category: 'رياضيات', prompt: '٣ + ٨ =', answer: '١١' },
    { category: 'رياضيات', prompt: '٦ - ٤ =', answer: '٢' },
    { category: 'رياضيات', prompt: '٤ × ٥ =', answer: '٢٠' },
    { category: 'إنجليزي', prompt: 'ما هو الحرف الكبير من r؟', answer: 'R' },
    { category: 'إنجليزي', prompt: 'ما معنى كلمة Table؟', answer: 'طاولة' },
  ],
  [
    { category: 'رياضيات', prompt: '٨ + ٢ =', answer: '١٠' },
    { category: 'رياضيات', prompt: '٩ - ٤ =', answer: '٥' },
    { category: 'رياضيات', prompt: '٤ × ٣ =', answer: '١٢' },
    { category: 'إنجليزي', prompt: 'ما هو الحرف الكبير من h؟', answer: 'H' },
    { category: 'إنجليزي', prompt: 'ما معنى كلمة city؟', answer: 'مدينة' },
  ],
]

const defaultInterviewScores = {
  signLanguage: 0,
  appearance: 0,
  generalInfo: 0,
  responseSpeed: 0,
  questionScores: [0, 0, 0, 0, 0],
  hasAssociatedDifficulty: '' as YesNo,
  weakHearing: '' as YesNo,
  knowsSignLanguage: '' as YesNo,
  weakMentalAbilities: '' as YesNo,
  distinguished: '' as YesNo,
}

const emptyApplicantForm: ApplicantForm = {
  nationalId: '',
  name: '',
  nationality: 'سعودي',
  age: '',
  certificateType: '',
  graduationDate: '',
  phone: '',
  extraPhone: '',
}

const chartColors = ['#0f6b8f', '#0f766e', '#b7791f', '#64748b', '#8b5cf6', '#dc2626']
const maxConcurrentUsers = 150

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const apiUrl = (path: string) => `${API_BASE}${path}`
const exportHeaders = ['اسم الكلية', 'القسم', 'رئيس القسم / رئيس اللجنة', 'مسؤول إدارة الكلية', 'وكيل شؤون المتدربين', 'رقم الطلب', 'الاسم', 'رقم الهوية', 'الجنسية', 'العمر', 'نوع الشهادة', 'تاريخ التخرج', 'رقم الجوال', 'رقم جوال إضافي', 'البرنامج', 'حالة القبول', 'المصدر', 'الحالة', 'رقم المقابلة', 'موعد المقابلة', 'النتيجة', 'الإشارة من 25', 'المظهر العام من 5', 'معلومات عامة من 15', 'سرعة الاستجابة من 5', 'المجموع من 50', 'صعوبة أو إعاقة مصاحبة', 'ضعيف سمع', 'يتقن لغة الإشارة', 'ضعف عام بالقدرات العقلية والاستيعاب', 'متقدم متميز', 'أسئلة الرياضيات', 'أسئلة الإنجليزي', 'ملاحظات']
const staffExportHeaders = ['الاسم', 'رقم الحاسب', 'المهام']
let fallbackSessionId = ''

function sessionId() {
  const storageKey = 'interview-3-session-id'
  const nextId = () => crypto.randomUUID?.() ?? `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
  try {
    const storage = window.localStorage
    const existing = typeof storage?.getItem === 'function' ? storage.getItem(storageKey) : ''
    if (existing) return existing
    if (typeof storage?.setItem !== 'function') {
      if (!fallbackSessionId) fallbackSessionId = nextId()
      return fallbackSessionId
    }
    const next = nextId()
    storage.setItem(storageKey, next)
    return next
  } catch {
    if (!fallbackSessionId) fallbackSessionId = nextId()
    return fallbackSessionId
  }
}

function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('x-session-id', sessionId())
  return fetch(apiUrl(path), { ...init, headers })
}

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

function getApplicantQuestionSet(applicant: Applicant) {
  const numericSeed = Number(applicant.nationalId.slice(-2))
  const fallbackSeed = applicant.nationalId.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return interviewQuestionSets[(Number.isFinite(numericSeed) ? numericSeed : fallbackSeed) % interviewQuestionSets.length]
}

function formatQuestionsForExport(applicant: Applicant, category: InterviewQuestion['category']) {
  return getApplicantQuestionSet(applicant)
    .filter((question) => question.category === category)
    .map((question) => `${question.prompt} الإجابة: ${question.answer}`)
    .join(' | ')
}

function registrationSourceLabel(source: Source) {
  return source === 'qobool' ? 'مسجل من البوابة' : 'مسجل بشكل مباشر'
}

function applicantToForm(applicant: Applicant): ApplicantForm {
  return {
    nationalId: applicant.nationalId,
    name: applicant.name,
    nationality: applicant.nationality || 'سعودي',
    age: applicant.age ? String(applicant.age) : '',
    certificateType: applicant.certificateType,
    graduationDate: applicant.graduationDate,
    phone: applicant.phone,
    extraPhone: applicant.extraPhone,
  }
}

function formToApplicantPatch(form: ApplicantForm): Partial<Applicant> {
  return {
    nationalId: form.nationalId,
    name: form.name,
    nationality: form.nationality,
    age: Number(form.age || 0),
    certificateType: form.certificateType,
    graduationDate: form.graduationDate,
    phone: form.phone,
    extraPhone: form.extraPhone,
    qualification: form.certificateType,
  }
}

function normalizeScores(scores: InterviewScores = {}) {
  const questionScores = [...(scores.questionScores ?? defaultInterviewScores.questionScores)]
    .slice(0, 5)
    .map((score) => Math.min(3, Math.max(0, Number(score || 0))))
  while (questionScores.length < 5) questionScores.push(0)
  const generalInfo = questionScores.reduce((total, score) => total + score, 0)
  return {
    ...defaultInterviewScores,
    ...scores,
    signLanguage: Math.min(25, Math.max(0, Number(scores.signLanguage || 0))),
    appearance: Math.min(5, Math.max(0, Number(scores.appearance || 0))),
    responseSpeed: Math.min(5, Math.max(0, Number(scores.responseSpeed || 0))),
    questionScores,
    generalInfo,
    hasAssociatedDifficulty: scores.hasAssociatedDifficulty ?? '',
    weakHearing: scores.weakHearing ?? '',
    knowsSignLanguage: scores.knowsSignLanguage ?? '',
    weakMentalAbilities: scores.weakMentalAbilities ?? '',
    distinguished: scores.distinguished ?? '',
  }
}

function exportApplicantsExcel(applicants: Applicant[], selectedManager: CollegeManager) {
  const rows = applicants.map((applicant) => {
    const scores = normalizeScores(applicant.scores)
    return [
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
      applicant.program ?? '',
      applicant.admissionStatus ?? '',
      registrationSourceLabel(applicant.source),
      applicant.status,
      applicant.waitingNo ?? '',
      applicant.interviewAt ?? '',
      applicant.finalResult ?? '',
      scores.signLanguage,
      scores.appearance,
      scores.generalInfo,
      scores.responseSpeed,
      calculateScore(applicant),
      scores.hasAssociatedDifficulty,
      scores.weakHearing,
      scores.knowsSignLanguage,
      scores.weakMentalAbilities,
      scores.distinguished,
      formatQuestionsForExport(applicant, 'رياضيات'),
      formatQuestionsForExport(applicant, 'إنجليزي'),
      applicant.notes,
    ]
  })
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

function pdfBarChart(title: string, data: ChartDatum[]) {
  const max = Math.max(...data.map((item) => item.value), 0)
  const rows = max === 0
    ? '<p class="empty">لا توجد بيانات كافية</p>'
    : data.map((item) => `
      <div class="pdf-bar-row">
        <span>${escapeHtml(item.label)}</span>
        <div><i style="width:${Math.max(7, (item.value / max) * 100)}%;background:${item.color}"></i></div>
        <strong>${item.value}</strong>
      </div>
    `).join('')
  return `<article class="pdf-chart"><h3>${escapeHtml(title)}</h3>${rows}</article>`
}

function pdfDonutChart(title: string, data: ChartDatum[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let offset = 0
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const segments = total === 0 ? '' : data.filter((item) => item.value > 0).map((item) => {
    const dash = (item.value / total) * circumference
    const segment = `<circle cx="55" cy="55" fill="none" r="${radius}" stroke="${item.color}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" stroke-linecap="round" stroke-width="16"></circle>`
    offset += dash
    return segment
  }).join('')
  const legend = data.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.label)}: ${item.value}</span>`).join('')
  return `
    <article class="pdf-chart">
      <h3>${escapeHtml(title)}</h3>
      ${total === 0 ? '<p class="empty">لا توجد بيانات كافية</p>' : `
        <div class="pdf-donut">
          <svg viewBox="0 0 110 110" width="150" height="150">
            <circle cx="55" cy="55" fill="none" r="${radius}" stroke="#e7eef5" stroke-width="16"></circle>
            ${segments}
            <text dominant-baseline="middle" text-anchor="middle" x="55" y="55">${total}</text>
          </svg>
          <div>${legend}</div>
        </div>
      `}
    </article>
  `
}

function pdfScoreBars(scores: ReturnType<typeof computeVisualAnalytics>['scores']) {
  return `
    <article class="pdf-chart">
      <h3>متوسطات التقييم</h3>
      ${scores.map((score) => `
        <div class="pdf-bar-row">
          <span>${escapeHtml(score.label)}</span>
          <div><i style="width:${score.max ? (score.value / score.max) * 100 : 0}%;background:${score.color}"></i></div>
          <strong>${score.value}/${score.max}</strong>
        </div>
      `).join('')}
    </article>
  `
}

function pdfYesNoSummary(items: ReturnType<typeof computeVisualAnalytics>['yesNo']) {
  return `
    <article class="pdf-chart">
      <h3>مؤشرات نعم / لا</h3>
      ${items.map((item) => {
        const percent = item.total ? Math.round((item.yes / item.total) * 100) : 0
        return `<div class="pdf-yes-no"><span>${escapeHtml(item.label)}</span><strong>${item.total ? `${percent}% نعم` : 'لا توجد بيانات'}</strong></div>`
      }).join('')}
    </article>
  `
}

function openApplicantsPdfReport(applicants: Applicant[], stats: { total: number; approved: number; pendingDocs: number; scheduled: number }, selectedManager: CollegeManager) {
  const report = window.open('', '_blank', 'width=1024,height=720')
  if (!report) return
  const analytics = computeVisualAnalytics(applicants)
  const charts = [
    pdfBarChart('توزيع حالات الطلبات', analytics.status),
    pdfDonutChart('توزيع النتائج', analytics.results),
    pdfBarChart('توزيع اللجان', analytics.committees),
    pdfScoreBars(analytics.scores),
    pdfYesNoSummary(analytics.yesNo),
  ].join('')

  const rows = applicants.map((applicant) => {
    const scores = normalizeScores(applicant.scores)
    return `
      <tr>
        <td>${escapeHtml(applicant.requestNo)}</td>
        <td>${escapeHtml(applicant.name)}</td>
        <td>${escapeHtml(applicant.nationalId)}</td>
        <td>${escapeHtml(applicant.status)}</td>
        <td>${escapeHtml(applicant.waitingNo ?? 'لم يصدر')}</td>
        <td>${escapeHtml(registrationSourceLabel(applicant.source))}</td>
        <td>${escapeHtml(scores.signLanguage)}</td>
        <td>${escapeHtml(scores.appearance)}</td>
        <td>${escapeHtml(scores.generalInfo)}</td>
        <td>${escapeHtml(scores.responseSpeed)}</td>
        <td>${escapeHtml(calculateScore(applicant))}</td>
        <td>${escapeHtml(scores.hasAssociatedDifficulty || 'لم يحدد')}</td>
        <td>${escapeHtml(scores.weakHearing || 'لم يحدد')}</td>
        <td>${escapeHtml(scores.knowsSignLanguage || 'لم يحدد')}</td>
        <td>${escapeHtml(scores.weakMentalAbilities || 'لم يحدد')}</td>
        <td>${escapeHtml(scores.distinguished || 'لم يحدد')}</td>
      </tr>
    `
  }).join('')

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
          .pdf-visuals { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; }
          .pdf-chart { border: 1px solid #d9e2ec; border-radius: 8px; padding: 12px; break-inside: avoid; }
          .pdf-chart h3 { margin: 0 0 10px; font-size: 16px; }
          .pdf-bar-row { display: grid; grid-template-columns: 120px 1fr 44px; gap: 8px; align-items: center; margin: 8px 0; font-size: 12px; }
          .pdf-bar-row div { height: 10px; border-radius: 999px; background: #edf3f7; overflow: hidden; }
          .pdf-bar-row i { display: block; height: 100%; border-radius: inherit; }
          .pdf-donut { display: flex; align-items: center; gap: 12px; }
          .pdf-donut svg { transform: rotate(-90deg); }
          .pdf-donut text { transform: rotate(90deg); transform-origin: center; fill: #182235; font-weight: 700; }
          .pdf-donut span { display: block; margin: 5px 0; font-size: 12px; }
          .pdf-donut i { display: inline-block; width: 9px; height: 9px; margin-inline-end: 5px; border-radius: 50%; }
          .pdf-yes-no { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid #edf3f7; font-size: 12px; }
          .empty { color: #667085; }
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
        <h2>الرسوم والمؤشرات</h2>
        <section class="pdf-visuals">${charts}</section>
        <table>
          <thead>
            <tr><th>رقم الطلب</th><th>المتقدم</th><th>رقم الهوية</th><th>الحالة</th><th>رقم المقابلة</th><th>المصدر</th><th>الإشارة /25</th><th>المظهر /5</th><th>معلومات عامة /15</th><th>سرعة الاستجابة /5</th><th>المجموع /50</th><th>إعاقة مصاحبة</th><th>ضعيف سمع</th><th>يتقن الإشارة</th><th>ضعف القدرات</th><th>متميز</th></tr>
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
  const searchParams = new URLSearchParams(window.location.search)
  const applicantOnly = searchParams.get('view') === 'applicant'
  const requestedRole = searchParams.get('role') as Role | null
  const initialRole = requestedRole && roleIds.includes(requestedRole) ? requestedRole : 'trainees'
  const [role, setRole] = useState<Role>(applicantOnly ? 'applicant' : initialRole)
  const [applicants, setApplicants] = useState<Applicant[]>(seedApplicants)
  const [selectedId, setSelectedId] = useState(seedApplicants[0].id)
  const [selectedManagerIndex, setSelectedManagerIndex] = useState(0)
  const [nationalId, setNationalId] = useState('')
  const [issuedApplicantId, setIssuedApplicantId] = useState('')
  const [applicantSubmitState, setApplicantSubmitState] = useState({ loading: false, message: '' })
  const [form, setForm] = useState<ApplicantForm>(emptyApplicantForm)
  const [capacityState, setCapacityState] = useState({ active: 0, max: maxConcurrentUsers, blocked: false })

  const selected = applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0] ?? seedApplicants[0]
  const stats = useMemo(() => {
    const approved = applicants.filter((item) => item.status === 'النتيجة معتمدة').length
    const pendingDocs = applicants.filter((item) => item.status.includes('مراجعة') || item.status.includes('استكمال')).length
    const interviewed = applicants.filter((item) => item.status === 'تم التقييم' || item.status === 'النتيجة معتمدة').length
    const scheduled = applicants.filter((item) => item.interviewAt).length
    return { total: applicants.length, approved, pendingDocs, interviewed, scheduled }
  }, [applicants])
  const activeRole = applicantOnly ? 'applicant' : role
  const selectedManager = collegeManagers[selectedManagerIndex] ?? collegeManagers[0]

  const refreshApplicants = async () => {
    const response = await apiFetch('/api/applicants')
    if (response.status === 429) {
      setCapacityState((current) => ({ ...current, blocked: true }))
      throw new Error('Platform capacity reached')
    }
    if (!response.ok) throw new Error('Unable to load applicants')
    const data = (await response.json()) as { applicants: Applicant[] }
    setApplicants(data.applicants)
    setSelectedId((current) => data.applicants.some((applicant) => applicant.id === current) ? current : data.applicants[0]?.id ?? seedApplicants[0].id)
  }

  useEffect(() => {
    const touchSession = async () => {
      const response = await apiFetch('/api/session', { method: 'POST' })
      if (response.status === 429) {
        setCapacityState({ active: maxConcurrentUsers, max: maxConcurrentUsers, blocked: true })
        return
      }
      if (response.ok) {
        const data = (await response.json()) as { active: number; max: number }
        setCapacityState({ active: data.active, max: data.max, blocked: false })
      }
    }
    touchSession().catch(() => undefined)
    const interval = window.setInterval(() => {
      touchSession().catch(() => undefined)
    }, 30000)
    refreshApplicants().catch(() => setApplicants(seedApplicants))
    return () => window.clearInterval(interval)
  }, [])

  const updateApplicant = async (id: string, patch: Partial<Applicant>, audit: string) => {
    const next = applicants.map((applicant) =>
      applicant.id === id
        ? { ...applicant, ...patch, audit: [audit, ...applicant.audit].slice(0, 8) }
        : applicant,
    )
    setApplicants(next)
    const response = await apiFetch(`/api/applicants/${id}`, {
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
    const evaluatedApplicant = applicants.find((applicant) => applicant.id === id) ?? selected
    const score = calculateScore(evaluatedApplicant)
    await updateApplicant(
      id,
      { status: 'النتيجة معتمدة', finalResult: score >= 35 ? 'مقبول' : 'احتياط' },
      `اعتماد تقييم المدرب والنتيجة النهائية بدرجة ${score} من 50`,
    )
  }

  const approveResult = async (id: string) => {
    await updateApplicant(id, { status: 'النتيجة معتمدة' }, 'اعتماد النتيجة النهائية من رئيس القسم')
  }

  const nextInterviewNumber = () => `INT-${String(applicants.filter((item) => item.waitingNo).length + 1).padStart(3, '0')}`

  const registerApplicant = async () => {
    const applicantNationalId = normalizeDigits(form.nationalId || nationalId).trim()
    if (!applicantNationalId) {
      setApplicantSubmitState({ loading: false, message: 'أدخل رقم الهوية أولًا.' })
      return
    }
    if (!form.name.trim()) {
      setApplicantSubmitState({ loading: false, message: 'أدخل الاسم الكامل قبل المتابعة.' })
      return
    }
    setApplicantSubmitState({ loading: true, message: 'جاري إصدار رقم الانتظار...' })
    const existing = applicants.find((applicant) => normalizeDigits(applicant.nationalId) === applicantNationalId)
    if (existing) {
      const interviewNo = existing.waitingNo ?? nextInterviewNumber()
      await updateApplicant(
        existing.id,
        {
          nationalId: applicantNationalId,
          name: form.name,
          nationality: form.nationality,
          age: flexibleNumber(form.age),
          certificateType: form.certificateType,
          graduationDate: form.graduationDate,
          phone: form.phone,
          extraPhone: form.extraPhone,
          qualification: form.certificateType,
          gpa: 0,
          waitingNo: interviewNo,
          status: 'تم إصدار رقم الانتظار',
        },
        `استكمال بيانات المتقدم وإصدار رقم مقابلة ${interviewNo}`,
      )
      setSelectedId(existing.id)
      setIssuedApplicantId(existing.id)
      setNationalId(applicantNationalId)
      setApplicantSubmitState({ loading: false, message: `تم إصدار رقم الانتظار ${interviewNo}` })
      return
    }
    try {
      const response = await apiFetch('/api/applicants', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nationalId: applicantNationalId,
          name: form.name,
          nationality: form.nationality,
          age: flexibleNumber(form.age),
          certificateType: form.certificateType,
          graduationDate: form.graduationDate,
          phone: form.phone,
          extraPhone: form.extraPhone,
          qualification: form.certificateType,
          gpa: 0,
        }),
      })
      if (response.status === 429) {
        setCapacityState({ active: maxConcurrentUsers, max: maxConcurrentUsers, blocked: true })
        throw new Error('Platform capacity reached')
      }
      if (!response.ok) throw new Error('Unable to register applicant')
      const data = (await response.json()) as { applicant: Applicant }
      setApplicants((current) => [data.applicant, ...current.filter((item) => item.id !== data.applicant.id)])
      setSelectedId(data.applicant.id)
      setIssuedApplicantId(data.applicant.id)
      setNationalId(data.applicant.nationalId)
      setApplicantSubmitState({ loading: false, message: `تم إصدار رقم الانتظار ${data.applicant.waitingNo ?? ''}` })
    } catch {
      setApplicantSubmitState({ loading: false, message: 'تعذر إصدار الرقم الآن. تأكد من الاتصال وحاول مرة أخرى.' })
    }
  }

  const setApplicantLookup = (value: string) => {
    setNationalId(value)
    setIssuedApplicantId('')
    setApplicantSubmitState({ loading: false, message: '' })
  }

  const resetDemo = async () => {
    await apiFetch('/api/reset', { method: 'POST' })
    setApplicants(seedApplicants)
    setSelectedId(seedApplicants[0].id)
  }

  const navigateRole = (nextRole: Role) => {
    setRole(nextRole)
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('view')
    nextUrl.searchParams.set('role', nextRole)
    window.history.replaceState(null, '', nextUrl)
  }

  return (
    <main className="app" dir="rtl">
      {capacityState.blocked && (
        <div className="capacity-banner" role="alert">
          المنصة وصلت للحد الأقصى {capacityState.max} مستخدم في نفس الوقت. حاول مرة أخرى بعد قليل.
        </div>
      )}
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
              <button className={role === item.id ? 'active' : ''} key={item.id} onClick={() => navigateRole(item.id)} type="button">
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
            <span className="institution-line">الحد الأقصى للاستخدام المتزامن: {capacityState.max} مستخدم</span>
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
            issuedApplicantId={issuedApplicantId}
            nationalId={nationalId}
            setNationalId={setApplicantLookup}
            form={form}
            setForm={setForm}
            registerApplicant={registerApplicant}
            submitState={applicantSubmitState}
          />
        )}
      </section>
    </main>
  )
}

function calculateScore(applicant: Applicant) {
  const scores = normalizeScores(applicant.scores)
  return scores.signLanguage + scores.appearance + scores.generalInfo + scores.responseSpeed
}

function chartDatum(label: string, value: number, index: number): ChartDatum {
  return { label, value, color: chartColors[index % chartColors.length] }
}

function countMatching(applicants: Applicant[], predicate: (applicant: Applicant) => boolean) {
  return applicants.filter(predicate).length
}

function averageScore(applicants: Applicant[], selector: (scores: ReturnType<typeof normalizeScores>, applicant: Applicant) => number) {
  if (applicants.length === 0) return 0
  const total = applicants.reduce((sum, applicant) => sum + selector(normalizeScores(applicant.scores), applicant), 0)
  return Math.round(total / applicants.length)
}

function yesNoCounts(applicants: Applicant[], selector: (scores: ReturnType<typeof normalizeScores>) => YesNo) {
  const answered = applicants
    .map((applicant) => selector(normalizeScores(applicant.scores)))
    .filter((value): value is 'نعم' | 'لا' => value === 'نعم' || value === 'لا')
  const yes = answered.filter((value) => value === 'نعم').length
  const no = answered.length - yes
  return { yes, no, total: answered.length }
}

export function computeVisualAnalytics(applicants: Applicant[]) {
  const statusLabels = Array.from(new Set(applicants.map((applicant) => applicant.status)))
  const resultLabels = ['مقبول', 'احتياط', 'غير مقبول', 'غير محدد']
  const committeeLabels = ['لجنة 1', 'لجنة 2', 'لجنة 3', 'غير موزع']
  return {
    status: statusLabels.map((label, index) => chartDatum(label, countMatching(applicants, (applicant) => applicant.status === label), index)),
    results: resultLabels.map((label, index) => chartDatum(label, countMatching(applicants, (applicant) => (applicant.finalResult ?? 'غير محدد') === label), index)),
    committees: committeeLabels.map((label, index) => chartDatum(label, countMatching(applicants, (applicant) => {
      const number = applicant.committeeNumber ?? committees.find((committee) => committee.id === applicant.committeeId)?.number
      return label === 'غير موزع' ? !number : label === `لجنة ${number}`
    }), index)),
    scores: [
      { label: 'الإشارة', value: averageScore(applicants, (scores) => scores.signLanguage), max: 25, color: chartColors[0] },
      { label: 'المظهر', value: averageScore(applicants, (scores) => scores.appearance), max: 5, color: chartColors[1] },
      { label: 'معلومات عامة', value: averageScore(applicants, (scores) => scores.generalInfo), max: 15, color: chartColors[2] },
      { label: 'سرعة الاستجابة', value: averageScore(applicants, (scores) => scores.responseSpeed), max: 5, color: chartColors[3] },
      { label: 'المجموع', value: averageScore(applicants, (_scores, applicant) => calculateScore(applicant)), max: 50, color: chartColors[4] },
    ],
    yesNo: [
      { label: 'إعاقة مصاحبة', ...yesNoCounts(applicants, (scores) => scores.hasAssociatedDifficulty) },
      { label: 'ضعيف سمع', ...yesNoCounts(applicants, (scores) => scores.weakHearing) },
      { label: 'يتقن الإشارة', ...yesNoCounts(applicants, (scores) => scores.knowsSignLanguage) },
      { label: 'ضعف القدرات', ...yesNoCounts(applicants, (scores) => scores.weakMentalAbilities) },
      { label: 'متميز', ...yesNoCounts(applicants, (scores) => scores.distinguished) },
    ],
  }
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

function VisualAnalyticsPanel({ applicants, mode = 'full' }: { applicants: Applicant[]; mode?: 'full' | 'operations' | 'head' | 'committee' }) {
  const analytics = computeVisualAnalytics(applicants)
  if (applicants.length === 0) return <EmptyChartCard />
  if (mode === 'operations') {
    return <section className="visual-grid"><BarChartCard title="توزيع حالات الطلبات" data={analytics.status} /></section>
  }
  if (mode === 'head') {
    return <section className="visual-grid"><BarChartCard title="توزيع المتقدمين على اللجان" data={analytics.committees} /><DonutChartCard title="توزيع النتائج" data={analytics.results} /></section>
  }
  if (mode === 'committee') {
    return <section className="visual-grid"><ScoreBarsCard title="متوسطات تقييم المقابلة" scores={analytics.scores} /><YesNoSummaryCard title="مؤشرات نعم / لا" items={analytics.yesNo} /></section>
  }
  return (
    <section className="visual-grid visual-grid-wide" aria-label="الرسوم والمؤشرات">
      <BarChartCard title="توزيع حالات الطلبات" data={analytics.status} />
      <DonutChartCard title="توزيع النتائج" data={analytics.results} />
      <BarChartCard title="توزيع اللجان" data={analytics.committees} />
      <ScoreBarsCard title="متوسطات التقييم" scores={analytics.scores} />
      <YesNoSummaryCard title="مؤشرات نعم / لا" items={analytics.yesNo} />
    </section>
  )
}

function EmptyChartCard() {
  return (
    <section className="visual-grid">
      <article className="chart-card empty-chart"><strong>لا توجد بيانات كافية</strong><span>ستظهر الرسوم بعد توفر بيانات المتقدمين.</span></article>
    </section>
  )
}

function BarChartCard({ title, data }: { title: string; data: ChartDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 0)
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      {max === 0 ? <p className="chart-empty">لا توجد بيانات كافية</p> : (
        <div className="bar-chart">
          {data.map((item) => (
            <div className="bar-row" key={item.label}>
              <span>{item.label}</span>
              <div><i style={{ background: item.color, width: `${Math.max(7, (item.value / max) * 100)}%` }} /></div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function DonutChartCard({ title, data }: { title: string; data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let offset = 0
  const radius = 45
  const circumference = 2 * Math.PI * radius
  return (
    <article className="chart-card donut-card">
      <h3>{title}</h3>
      {total === 0 ? <p className="chart-empty">لا توجد بيانات كافية</p> : (
        <div className="donut-layout">
          <svg aria-hidden="true" className="donut" viewBox="0 0 120 120">
            <circle cx="60" cy="60" fill="none" r={radius} stroke="#e7eef5" strokeWidth="18" />
            {data.filter((item) => item.value > 0).map((item) => {
              const dash = (item.value / total) * circumference
              const segment = <circle cx="60" cy="60" fill="none" key={item.label} r={radius} stroke={item.color} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" strokeWidth="18" />
              offset += dash
              return segment
            })}
            <text dominantBaseline="middle" textAnchor="middle" x="60" y="60">{total}</text>
          </svg>
          <div className="chart-legend">
            {data.map((item) => <span key={item.label}><i style={{ background: item.color }} /> {item.label}: {item.value}</span>)}
          </div>
        </div>
      )}
    </article>
  )
}

function ScoreBarsCard({ title, scores }: { title: string; scores: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <div className="score-bars">
        {scores.map((score) => (
          <div className="score-bar" key={score.label}>
            <span>{score.label}</span>
            <div><i style={{ background: score.color, width: `${score.max ? (score.value / score.max) * 100 : 0}%` }} /></div>
            <strong>{score.value}/{score.max}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}

function YesNoSummaryCard({ title, items }: { title: string; items: { label: string; yes: number; no: number; total: number }[] }) {
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <div className="yes-no-summary">
        {items.map((item) => {
          const yesPercent = item.total ? Math.round((item.yes / item.total) * 100) : 0
          return (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.total ? `${yesPercent}% نعم` : 'لا توجد بيانات'}</strong>
              <div><i style={{ width: `${yesPercent}%` }} /></div>
            </div>
          )
        })}
      </div>
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
            <th>المصدر</th>
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
              <td data-label="المصدر">{registrationSourceLabel(applicant.source)}</td>
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

function Details({ applicant, hideInterviewPageSections = false }: { applicant: Applicant; hideInterviewPageSections?: boolean }) {
  const committee = committees.find((item) => item.id === applicant.committeeId)
  const committeeNumber = applicant.committeeNumber ?? committee?.number
  const trainers = staffNames(applicant.committeeTrainerIds)
  const translator = translatorName(applicant.translatorId)
  const scores = normalizeScores(applicant.scores)
  return (
    <section className="details">
      <div className="profile-header">
        <div>
          <span className={`status ${statusTone(applicant.status)}`}>{applicant.status}</span>
          <h2>{applicant.name}</h2>
          <p><span>{applicant.requestNo}</span> · {registrationSourceLabel(applicant.source)}</p>
        </div>
        <strong>{applicant.waitingNo ? `رقم المقابلة ${applicant.waitingNo}` : 'بدون رقم مقابلة'}</strong>
      </div>
      <div className="detail-grid">
        <Info label="رقم الهوية" value={applicant.nationalId} />
        <Info label="الجنسية" value={applicant.nationality} />
        <Info label="العمر" value={`${applicant.age}`} />
        <Info label="نوع الشهادة" value={applicant.certificateType} />
        <Info label="تاريخ التخرج" value={applicant.graduationDate} />
        <Info label="رقم الجوال" value={applicant.phone} />
        <Info label="رقم جوال إضافي" value={applicant.extraPhone} />
        <Info label="المصدر" value={registrationSourceLabel(applicant.source)} />
        {applicant.admissionStatus && <Info label="حالة القبول" value={applicant.admissionStatus} />}
        {applicant.program && <Info label="البرنامج" value={applicant.program} />}
        <Info label="حالة الطلب" value={`الحالة الحالية: ${applicant.status}`} />
        <Info label="اللجنة" value={committeeNumber ? `لجنة ${committeeNumber}` : 'غير موزع'} />
        <Info label="المدربون" value={trainers || 'لم يتم الاختيار'} />
        <Info label="المترجم" value={translator ?? 'بدون مترجم'} />
        <Info label="موعد المقابلة" value={applicant.interviewAt ?? 'غير مجدول'} />
        <Info label="التقييم الشامل" value={`${calculateScore(applicant)} من 50`} />
        <Info label="الإشارة" value={`${scores.signLanguage} من 25`} />
        <Info label="المظهر العام" value={`${scores.appearance} من 5`} />
        <Info label="معلومات عامة" value={`${scores.generalInfo} من 15`} />
        <Info label="سرعة الاستجابة للتعليمات" value={`${scores.responseSpeed} من 5`} />
        <Info label="صعوبة أو إعاقة مصاحبة" value={scores.hasAssociatedDifficulty || 'لم يحدد'} />
        <Info label="ضعيف سمع" value={scores.weakHearing || 'لم يحدد'} />
        <Info label="يتقن لغة الإشارة" value={scores.knowsSignLanguage || 'لم يحدد'} />
        <Info label="ضعف عام بالقدرات العقلية والاستيعاب" value={scores.weakMentalAbilities || 'لم يحدد'} />
        <Info label="متقدم متميز" value={scores.distinguished || 'لم يحدد'} />
      </div>
      {!hideInterviewPageSections && (
        <>
          <h3>الوثائق</h3>
          <div className="docs">
            {applicant.documents.map((document) => (
              <span key={document.name}><FileCheck2 size={16} /> {document.name}: {document.status}</span>
            ))}
          </div>
          <InterviewQuestions applicant={applicant} />
        </>
      )}
      {applicant.notes && (
        <>
          <h3>ملاحظات المقابلة</h3>
          <p className="notes">{applicant.notes}</p>
        </>
      )}
      {!hideInterviewPageSections && (
        <>
          <h3>سجل التدقيق</h3>
          <ul className="audit">
            {applicant.audit.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
          </ul>
        </>
      )}
    </section>
  )
}

function InterviewQuestions({ applicant }: { applicant: Applicant }) {
  const questions = getApplicantQuestionSet(applicant)
  const scores = normalizeScores(applicant.scores)
  const mathQuestions = questions.filter((question) => question.category === 'رياضيات')
  const englishQuestions = questions.filter((question) => question.category === 'إنجليزي')
  return (
    <section className="question-card" aria-label="أسئلة المقابلة العامة">
      <div className="question-card-title">
        <h3>أسئلة المقابلة العامة</h3>
        <span>معلومات عامة: {scores.generalInfo} من 15</span>
      </div>
      <div className="question-groups">
        <div>
          <strong>رياضيات</strong>
          {mathQuestions.map((question, index) => (
            <span key={`${question.prompt}-${index}`}>{index + 1}. {question.prompt} <b>الإجابة: {question.answer}</b> <em>الدرجة: {scores.questionScores[index]} / 3</em></span>
          ))}
        </div>
        <div>
          <strong>إنجليزي</strong>
          {englishQuestions.map((question, index) => (
            <span key={`${question.prompt}-${index}`}>{index + 1}. {question.prompt} <b>الإجابة: {question.answer}</b> <em>الدرجة: {scores.questionScores[index + mathQuestions.length]} / 3</em></span>
          ))}
        </div>
      </div>
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
    <>
      <VisualAnalyticsPanel applicants={applicants} />
      <div className="grid two">
        <section className="panel">
          <div className="section-title"><h2>مراقبة سير العمل</h2><BarChart3 size={21} /></div>
          <div className="progress-list">
            <Progress label="استكمال التسجيل" value={stats.total ? Math.round((applicants.filter((a) => a.waitingNo).length / stats.total) * 100) : 0} />
            <Progress label="إنجاز المقابلات" value={stats.total ? Math.round((stats.interviewed / stats.total) * 100) : 0} />
            <Progress label="اعتماد النتائج" value={stats.total ? Math.round((stats.approved / stats.total) * 100) : 0} />
          </div>
        </section>
        <section className="panel">
          <div className="section-title"><h2>تقرير تنفيذي سريع</h2><ListChecks size={21} /></div>
          <ApplicantTable applicants={applicants} onSelect={() => undefined} />
        </section>
      </div>
    </>
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
        <VisualAnalyticsPanel applicants={applicants} mode="operations" />
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
        <VisualAnalyticsPanel applicants={applicants} mode="head" />
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
  const [editForm, setEditForm] = useState<ApplicantForm>(applicantToForm(selected))
  const [isChoosingApplicant, setIsChoosingApplicant] = useState(true)
  const selectedStaff = selectedStaffIds
    .map((id) => staffMembers.find((member) => member.id === id))
    .filter((member): member is StaffMember => Boolean(member))
  const assigned = applicants.filter((applicant) => {
    const applicantCommitteeNumber = applicant.committeeNumber ?? committees.find((committee) => committee.id === applicant.committeeId)?.number
    return committeeNumber ? applicantCommitteeNumber === committeeNumber : false
  })
  const currentApplicantVisible = applicants.some((applicant) => applicant.id === selected.id)
  const activeApplicant = selected
  const selectedScores = normalizeScores(activeApplicant.scores)
  const selectedQuestions = getApplicantQuestionSet(activeApplicant)
  const selectedTotalScore = calculateScore(activeApplicant)
  const analyticsApplicants = committeeNumber ? assigned : applicants

  useEffect(() => {
    setTranslatorId(committeeNumber ? activeApplicant.translatorId ?? '' : '')
    setSelectedStaffIds(committeeNumber ? activeApplicant.committeeTrainerIds ?? [] : [])
    setEditForm(applicantToForm(activeApplicant))
  }, [activeApplicant.id, activeApplicant.committeeTrainerIds, activeApplicant.translatorId, committeeNumber])

  const selectTranslator = (value: string) => {
    setTranslatorId(value)
    updateApplicant(activeApplicant.id, { translatorId: value || undefined }, value ? 'اختيار مترجم المقابلة' : 'إلغاء مترجم المقابلة')
  }

  const toggleStaff = (id: string) => {
    const next = selectedStaffIds.includes(id) ? selectedStaffIds.filter((item) => item !== id) : [...selectedStaffIds, id]
    setSelectedStaffIds(next)
    updateApplicant(activeApplicant.id, { committeeTrainerIds: next }, 'اختيار مدربي اللجنة')
  }

  const setScore = (key: keyof Pick<ReturnType<typeof normalizeScores>, 'signLanguage' | 'appearance' | 'responseSpeed'>, value: number) => {
    updateApplicant(activeApplicant.id, { scores: { ...selectedScores, [key]: value }, status: 'المقابلة جارية' }, 'حفظ تقييم مؤقت')
  }

  const setQuestionScore = (index: number, value: number) => {
    const nextScores = [...selectedScores.questionScores]
    nextScores[index] = Math.min(3, Math.max(0, value))
    updateApplicant(activeApplicant.id, { scores: { ...selectedScores, questionScores: nextScores, generalInfo: nextScores.reduce((total, score) => total + score, 0) }, status: 'المقابلة جارية' }, 'حفظ درجة سؤال المعلومات العامة')
  }

  const setYesNo = (key: keyof Pick<ReturnType<typeof normalizeScores>, 'hasAssociatedDifficulty' | 'weakHearing' | 'knowsSignLanguage' | 'weakMentalAbilities' | 'distinguished'>, value: YesNo) => {
    updateApplicant(activeApplicant.id, { scores: { ...selectedScores, [key]: value }, status: 'المقابلة جارية' }, 'حفظ بيانات ملاحظة المقابلة')
  }

  const saveApplicantData = () => {
    updateApplicant(activeApplicant.id, formToApplicantPatch(editForm), 'تعديل بيانات المتقدم من اللجنة')
  }

  const approveAndMoveNext = async () => {
    const nextApplicant =
      applicants.find((applicant) => applicant.id !== activeApplicant.id && applicant.status !== 'النتيجة معتمدة') ??
      applicants.find((applicant) => applicant.id !== activeApplicant.id)
    if (nextApplicant) {
      setSelectedId(nextApplicant.id)
    }
    await submitEvaluation(activeApplicant.id)
  }

  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>المقابلات المسندة</h2><UserCheck size={21} /></div>
        <VisualAnalyticsPanel applicants={analyticsApplicants} mode="committee" />
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
              setIsChoosingApplicant(true)
              const firstApplicant = applicants.find((applicant) => applicant.status !== 'النتيجة معتمدة') ?? applicants[0]
              if (firstApplicant) setSelectedId(firstApplicant.id)
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
            {isChoosingApplicant ? (
              <label className="list-select">
                اختيار المتقدم من قائمة الأسماء
                <select
                  aria-label="اختيار المتقدم للمقابلة"
                  disabled={applicants.length === 0}
                  value={currentApplicantVisible ? activeApplicant.id : ''}
                  onChange={(event) => {
                    setSelectedId(event.target.value)
                    setIsChoosingApplicant(false)
                  }}
                >
                  {applicants.length === 0 && <option value="">لا يوجد متقدمون</option>}
                  {applicants.map((applicant) => (
                    <option key={applicant.id} value={applicant.id}>
                      {applicant.name} - {applicant.waitingNo ?? applicant.requestNo}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="selected-applicant-card" aria-label="المتقدم المختار للمقابلة">
                <span>المتقدم المختار</span>
                <strong>{activeApplicant.name}</strong>
                <small>{activeApplicant.waitingNo ?? activeApplicant.requestNo}</small>
                <button onClick={() => setIsChoosingApplicant(true)} type="button">تغيير المتقدم</button>
              </div>
            )}
          </>
        )}
      </section>
      <section className="panel">
        <Details applicant={activeApplicant} hideInterviewPageSections />
        <section className="inline-editor" aria-label="تعديل بيانات المتقدم من اللجنة">
          <div className="section-title">
            <h2>تعديل بيانات المتقدم</h2>
            <FileText size={21} />
          </div>
          <div className="form-grid compact-form">
            <label>رقم الهوية<input value={editForm.nationalId} onChange={(event) => setEditForm({ ...editForm, nationalId: event.target.value })} /></label>
            <label>الاسم الكامل<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
            <label>الجنسية<input value={editForm.nationality} onChange={(event) => setEditForm({ ...editForm, nationality: event.target.value })} /></label>
            <label>العمر<input inputMode="numeric" value={editForm.age} onChange={(event) => setEditForm({ ...editForm, age: event.target.value })} /></label>
            <label>نوع الشهادة<input value={editForm.certificateType} onChange={(event) => setEditForm({ ...editForm, certificateType: event.target.value })} /></label>
            <label>تاريخ التخرج<input type="date" value={editForm.graduationDate} onChange={(event) => setEditForm({ ...editForm, graduationDate: event.target.value })} /></label>
            <label>رقم الجوال<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label>
            <label>رقم جوال إضافي<input value={editForm.extraPhone} onChange={(event) => setEditForm({ ...editForm, extraPhone: event.target.value })} /></label>
          </div>
          <div className="actions">
            <button onClick={saveApplicantData} type="button"><FileCheck2 size={17} /> حفظ تعديل البيانات</button>
          </div>
        </section>
        <div className="score-form">
          <div className="score-summary" aria-label="درجة المتقدم الحالية">
            <span>درجة المتقدم قبل الاعتماد</span>
            <strong>{selectedTotalScore} / 50</strong>
            <small>{activeApplicant.finalResult ? `تم اعتماد المدرب: ${activeApplicant.finalResult}` : 'راجع الدرجة ثم اضغط اعتماد التقييم للانتقال للمتقدم التالي'}</small>
          </div>
          <Range label="الإشارة" max={25} value={selectedScores.signLanguage} onChange={(value) => setScore('signLanguage', value)} />
          <Range label="المظهر العام" max={5} value={selectedScores.appearance} onChange={(value) => setScore('appearance', value)} />
          <div className="question-score-form">
            <div className="question-card-title">
              <h3>معلومات عامة</h3>
              <span>{selectedScores.generalInfo} من 15</span>
            </div>
            {selectedQuestions.map((question, index) => (
              <label className="question-score" key={`${question.prompt}-${index}`}>
                <span>{index + 1}. {question.prompt}</span>
                <input aria-label={`درجة السؤال ${index + 1}`} max="3" min="0" onChange={(event) => setQuestionScore(index, Number(event.target.value))} type="number" value={selectedScores.questionScores[index]} />
              </label>
            ))}
          </div>
          <Range label="سرعة الاستجابة للتعليمات" max={5} value={selectedScores.responseSpeed} onChange={(value) => setScore('responseSpeed', value)} />
          <div className="yes-no-grid">
            <YesNoField label="هل يوجد صعوبة او إعاقة مصاحبة قد تؤثر على التدريب" value={selectedScores.hasAssociatedDifficulty} onChange={(value) => setYesNo('hasAssociatedDifficulty', value)} />
            <YesNoField label="هل المتقدم ضعيف سمع" value={selectedScores.weakHearing} onChange={(value) => setYesNo('weakHearing', value)} />
            <YesNoField label="هل يتقن لغة الإشارة" value={selectedScores.knowsSignLanguage} onChange={(value) => setYesNo('knowsSignLanguage', value)} />
            <YesNoField label="هل لديه ضعف عام بالقدرات العقلية والاستيعاب" value={selectedScores.weakMentalAbilities} onChange={(value) => setYesNo('weakMentalAbilities', value)} />
            <YesNoField label="هل المتقدم متميز" value={selectedScores.distinguished} onChange={(value) => setYesNo('distinguished', value)} />
          </div>
          <textarea value={activeApplicant.notes} onChange={(event) => updateApplicant(activeApplicant.id, { notes: event.target.value }, 'تحديث ملاحظات المقابلة')} placeholder="ملاحظات المقيم" />
        </div>
        <div className="actions">
          <button onClick={approveAndMoveNext} type="button"><CheckCircle2 size={17} /> اعتماد تقييم المتقدم والانتقال للتالي</button>
        </div>
      </section>
    </div>
  )
}

function Range({ label, value, max = 100, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label className="range">
      <span>{label} <small>من {max}</small></span>
      <input aria-label={label} min="0" max={max} onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} />
      <strong>{value}</strong>
    </label>
  )
}

function YesNoField({ label, value, onChange }: { label: string; value: YesNo; onChange: (value: YesNo) => void }) {
  return (
    <fieldset className="yes-no-field">
      <legend>{label}</legend>
      <label><input checked={value === 'نعم'} onChange={() => onChange('نعم')} type="radio" /> نعم</label>
      <label><input checked={value === 'لا'} onChange={() => onChange('لا')} type="radio" /> لا</label>
    </fieldset>
  )
}

function ApplicantView({ applicants, issuedApplicantId, nationalId, setNationalId, form, setForm, registerApplicant, submitState }: {
  applicants: Applicant[]
  issuedApplicantId: string
  nationalId: string
  setNationalId: (value: string) => void
  form: { nationalId: string; name: string; nationality: string; age: string; certificateType: string; graduationDate: string; phone: string; extraPhone: string }
  setForm: (value: { nationalId: string; name: string; nationality: string; age: string; certificateType: string; graduationDate: string; phone: string; extraPhone: string }) => void
  registerApplicant: () => void
  submitState: { loading: boolean; message: string }
}) {
  const lookup = nationalId.trim()
  const normalizedLookup = normalizeDigits(lookup)
  const found = applicants.find((item) => normalizeDigits(item.nationalId) === normalizedLookup || (lookup.length > 1 && item.name.includes(lookup)))
  const issuedApplicant = applicants.find((item) => item.id === issuedApplicantId)
  const publicApplicant = issuedApplicant ?? (found?.waitingNo ? found : undefined)
  const showRegistrationForm = !publicApplicant

  useEffect(() => {
    if (!found) {
      setForm({
        ...form,
        nationalId: /^\d+$/.test(normalizedLookup) ? normalizedLookup : form.nationalId,
      })
      return
    }
    setForm({
      nationalId: found.nationalId,
      name: found.name,
      nationality: found.nationality || 'سعودي',
      age: found.age ? String(found.age) : '',
      certificateType: found.certificateType,
      graduationDate: found.graduationDate,
      phone: found.phone,
      extraPhone: found.extraPhone,
    })
  }, [found?.id, lookup])

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
        <label>رقم الهوية الوطنية أو الاسم<input value={nationalId} onChange={(event) => setNationalId(event.target.value)} placeholder="مثال: 1122595406 أو عماش" /></label>
        {publicApplicant && (
          <div className="found">
            <PublicApplicantStatus applicant={publicApplicant} />
          </div>
        )}
        {showRegistrationForm && (
          <div className="form-grid">
            <label>رقم الهوية<input value={form.nationalId} onChange={(event) => setForm({ ...form, nationalId: event.target.value })} /></label>
            <label>الاسم الكامل<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>الجنسية<input value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} /></label>
            <label>العمر<input inputMode="numeric" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} /></label>
            <label>نوع الشهادة<input value={form.certificateType} onChange={(event) => setForm({ ...form, certificateType: event.target.value })} /></label>
            <label>تاريخ التخرج<input type="date" value={form.graduationDate} onChange={(event) => setForm({ ...form, graduationDate: event.target.value })} /></label>
            <label>رقم الجوال<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>رقم جوال إضافي<input value={form.extraPhone} onChange={(event) => setForm({ ...form, extraPhone: event.target.value })} /></label>
            <button disabled={submitState.loading} onClick={registerApplicant} type="button">
              <UploadCloud size={17} />
              {submitState.loading ? 'جاري الإصدار...' : found ? 'متابعة وإصدار رقم الانتظار' : 'التحقق وإصدار رقم المقابلة'}
            </button>
            {submitState.message && <p className="form-message" role="status">{submitState.message}</p>}
          </div>
        )}
      </section>
    </div>
  )
}

function PublicApplicantStatus({ applicant }: { applicant: Applicant }) {
  return (
    <section className="public-status" aria-label="بيانات المتقدم بعد التقديم">
      <span>رقم الانتظار</span>
      <strong>{applicant.waitingNo ?? 'لم يصدر بعد'}</strong>
      <h2>{applicant.name}</h2>
      <p>{registrationSourceLabel(applicant.source)}</p>
    </section>
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
