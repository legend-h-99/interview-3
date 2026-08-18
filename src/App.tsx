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
import { strToU8, zipSync } from 'fflate'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import acceptedApplicantsData from './data/acceptedApplicants.json'

type Role = 'college' | 'trainees' | 'head' | 'committee' | 'inquiry' | 'sourceReport' | 'qobooliReport' | 'absent' | 'applicant'
type Source = 'qobool' | 'direct'
type Status =
  | 'غير محدد'
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
  { id: 'inquiry', label: 'استعلام عن متقدم', icon: Search },
  { id: 'sourceReport', label: 'تقرير المصدر', icon: BarChart3 },
  { id: 'qobooliReport', label: 'تقرير منصة قبولي', icon: FileText },
  { id: 'absent', label: 'لم يحضروا المقابلة', icon: Clock3 },
  { id: 'applicant', label: 'واجهة المتقدم', icon: QrCode },
]
const roleIds = roles.map((item) => item.id)

const roleDescriptions: Record<Role, string> = {
  college: 'نظرة تنفيذية على سير المقابلات، نسب الإنجاز، والنتائج المعتمدة.',
  trainees: 'مراجعة الطلبات والوثائق وإصدار أرقام الانتظار للمتقدمين.',
  head: 'توزيع المتقدمين على اللجان واعتماد النتائج النهائية.',
  committee: 'إدارة جلسات المقابلة وتسجيل الدرجات والملاحظات.',
  inquiry: 'استعلام مستقل عن بيانات متقدم بالاسم أو الهوية أو رقم الانتظار.',
  sourceReport: 'تقرير منفصل يوضح مصدر التسجيل وحضور المقابلة.',
  qobooliReport: 'تقرير مستقل لسجلات منصة قبولي فقط مع مطابقة الاسم ورقم الهوية.',
  absent: 'تقرير خاص بالمسجلين من البوابة ولم يحضروا المقابلة.',
  applicant: 'تسجيل طلب جديد أو متابعة حالة الطلب برقم الهوية.',
}

const staffMembers: StaffMember[] = [
  { id: 's1', name: 'رائد الغفيلي', computerNo: '30487', task: 'رئيس القسم / رئيس اللجنة' },
  { id: 's2', name: 'موسى عبدالرحيم الأنصاري', computerNo: '30004', task: 'المنصة الإلكترونية للفرز' },
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

const extraCommitteeTrainerIds = new Set(['s2', 's10'])
const trainerMembers = staffMembers.filter((member) => member.task.startsWith('لجنة ') || extraCommitteeTrainerIds.has(member.id))
const translatorMembers = staffMembers.filter((member) => member.task === 'التنظيم والترجمة')
const acceptedApplicants = acceptedApplicantsData as AcceptedApplicant[]
const neutralStatus: Status = 'غير محدد'

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

function graduationYearOnly(value: string) {
  return normalizeDigits(value).replace(/\D/g, '').slice(0, 4)
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
const noShowStatus: Status = 'معتذر أو لم يحضر'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const apiUrl = (path: string) => `${API_BASE}${path}`
const fullInterviewScore = 50
const exportHeaders = ['الاسم', 'رقم الهوية', 'الجنسية', 'العمر', 'نوع الشهادة', 'سنة التخرج', 'رقم الجوال', 'رقم جوال إضافي', 'حالة القبول', 'المصدر', 'الحالة', 'رقم المقابلة', 'موعد المقابلة', 'النتيجة', 'الإشارة من 25', 'المظهر العام من 5', 'معلومات عامة من 15', 'سرعة الاستجابة من 5', 'الدرجة الكاملة', 'المجموع', 'عدد المسجلين من البوابة وحضروا المقابلة', 'عدد الذين لم يحضروا المقابلة', 'عدد المسجلين بشكل مباشر', 'صعوبة أو إعاقة مصاحبة', 'ضعيف سمع', 'يتقن لغة الإشارة', 'ضعف عام بالقدرات العقلية والاستيعاب', 'متقدم متميز', 'أسئلة الرياضيات', 'أسئلة الإنجليزي', 'ملاحظات']
const qobooliReportHeaders = ['رقم الهوية', 'الاسم في منصة قبولي', 'الاسم في النظام', 'حالة المطابقة', 'حالة الحضور', 'رقم الجوال', 'التخصص', 'رقم الرغبة', 'حالة القبول', 'الحالة في النظام', 'رقم الانتظار', 'الدرجة الكاملة', 'الدرجة', 'الملاحظات', 'المصدر']
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

type ReportCell = string | number | undefined

function csvCell(value: ReportCell) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function reportFileName(fileLabel: string, extension: string) {
  return `interview-3-${fileLabel}-${new Date().toISOString().slice(0, 10)}.${extension}`
}

function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement('a')
  const href = URL.createObjectURL(blob)
  link.href = href
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(href)
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

function normalizeMatchText(value: string) {
  return normalizeDigits(value).replace(/\s+/g, ' ').trim().toLowerCase()
}

function qobooliSourceLabel() {
  return 'منصة قبولي'
}

function getPortalNoShowApplicants(applicants: Applicant[]) {
  return applicants.filter((applicant) => applicant.source === 'qobool' && applicant.status === noShowStatus)
}

function hasAttendedInterview(applicant: Applicant) {
  return ['المقابلة جارية', 'تم التقييم', 'بانتظار اعتماد رئيس القسم', 'النتيجة معتمدة'].includes(applicant.status)
}

function getSourceStats(applicants: Applicant[]) {
  const portalApplicants = applicants.filter((applicant) => applicant.source === 'qobool')
  const portalAttended = portalApplicants.filter(hasAttendedInterview).length
  const portalNoShows = getPortalNoShowApplicants(applicants).length
  const directApplicants = applicants.filter((applicant) => applicant.source === 'direct').length
  return {
    portalApplicants: portalApplicants.length,
    portalAttended,
    portalNoShows,
    directApplicants,
  }
}

function buildQobooliMatches(applicants: Applicant[]) {
  return acceptedApplicants.map((accepted) => {
    const systemApplicant = applicants.find((applicant) => applicant.nationalId === accepted.nationalId)
    const nameMatches = systemApplicant ? normalizeMatchText(systemApplicant.name) === normalizeMatchText(accepted.name) : false
    const matchStatus = !systemApplicant ? 'غير موجود في النظام' : nameMatches ? 'مطابق بالهوية والاسم' : 'مطابق بالهوية مع اختلاف الاسم'
    const hasWaitingNo = Boolean(systemApplicant?.waitingNo)
    const isEvaluated = Boolean(systemApplicant && ['تم التقييم', 'بانتظار اعتماد رئيس القسم', 'النتيجة معتمدة'].includes(systemApplicant.status))
    const isPresent = hasWaitingNo && isEvaluated
    const isAbsent = !hasWaitingNo && !isEvaluated
    const attendanceStatus = isPresent ? 'حاضر' : isAbsent ? 'غير حاضر' : 'بانتظار اكتمال الحضور والتقييم'
    return { accepted, systemApplicant, matchStatus, attendanceStatus, isEvaluated, isPresent }
  })
}

function getQobooliReportStats(applicants: Applicant[]) {
  const matches = buildQobooliMatches(applicants)
  const exactMatches = matches.filter((item) => item.matchStatus === 'مطابق بالهوية والاسم').length
  const idOnlyMatches = matches.filter((item) => item.matchStatus === 'مطابق بالهوية مع اختلاف الاسم').length
  const missing = matches.filter((item) => item.matchStatus === 'غير موجود في النظام').length
  const attended = matches.filter((item) => item.isPresent).length
  const noShows = matches.filter((item) => item.attendanceStatus === 'غير حاضر').length
  return { total: acceptedApplicants.length, exactMatches, idOnlyMatches, missing, attended, noShows }
}

function buildQobooliReportRows(applicants: Applicant[], _selectedManager: CollegeManager) {
  return buildQobooliMatches(applicants).map(({ accepted, systemApplicant, matchStatus, attendanceStatus, isPresent }) => [
    accepted.nationalId,
    accepted.name,
    systemApplicant?.name ?? '',
    matchStatus,
    attendanceStatus,
    normalizeImportedPhone(accepted.phone),
    accepted.major,
    accepted.preferenceNo,
    accepted.admissionStatus,
    systemApplicant?.status ?? 'غير موجود',
    systemApplicant?.waitingNo ?? '',
    fullInterviewScore,
    systemApplicant && isPresent ? calculateScore(systemApplicant) : '',
    systemApplicant && isPresent ? systemApplicant.notes : '',
    qobooliSourceLabel(),
  ])
}

function applicantToForm(applicant: Applicant): ApplicantForm {
  return {
    nationalId: applicant.nationalId,
    name: applicant.name,
    nationality: applicant.nationality || 'سعودي',
    age: applicant.age ? String(applicant.age) : '',
    certificateType: applicant.certificateType,
    graduationDate: graduationYearOnly(applicant.graduationDate),
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
    graduationDate: graduationYearOnly(form.graduationDate),
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

function buildApplicantReportRows(applicants: Applicant[], _selectedManager: CollegeManager) {
  const sourceStats = getSourceStats(applicants)
  const rows = applicants.map((applicant) => {
    const scores = normalizeScores(applicant.scores)
    return [
      applicant.name,
      applicant.nationalId,
      applicant.nationality,
      applicant.age,
      applicant.certificateType,
      graduationYearOnly(applicant.graduationDate),
      applicant.phone,
      applicant.extraPhone,
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
      fullInterviewScore,
      calculateScore(applicant),
      sourceStats.portalAttended,
      sourceStats.portalNoShows,
      sourceStats.directApplicants,
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
  return { rows }
}

function buildApplicantCsv(applicants: Applicant[], selectedManager: CollegeManager) {
  const { rows } = buildApplicantReportRows(applicants, selectedManager)
  return [
    'بيانات المتقدمين',
    [exportHeaders, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'),
  ].join('\n')
}

function exportApplicantsCsv(applicants: Applicant[], selectedManager: CollegeManager, fileLabel = 'applicants') {
  const csv = buildApplicantCsv(applicants, selectedManager)
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), reportFileName(fileLabel, 'csv'))
}

function exportApplicantsXlsx(applicants: Applicant[], selectedManager: CollegeManager, fileLabel = 'applicants') {
  const { rows } = buildApplicantReportRows(applicants, selectedManager)
  downloadBlob(
    buildXlsxBlob([
      { name: 'بيانات المتقدمين', rows: [exportHeaders, ...rows] },
    ]),
    reportFileName(fileLabel, 'xlsx'),
  )
}

function buildXlsxBlob(sheets: { name: string; rows: ReportCell[][] }[]) {
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')
  const workbookRels = sheets.map((_sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')
  const overrides = sheets.map((_sheet, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  const worksheetFiles = Object.fromEntries(sheets.map((sheet, sheetIndex) => {
    const rowsXml = sheet.rows.map((row, rowIndex) => {
      const cells = row.map((cell, cellIndex) => {
        const ref = `${columnName(cellIndex)}${rowIndex + 1}`
        if (typeof cell === 'number' && Number.isFinite(cell)) return `<c r="${ref}"><v>${cell}</v></c>`
        return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`
      }).join('')
      return `<row r="${rowIndex + 1}">${cells}</row>`
    }).join('')
    return [`xl/worksheets/sheet${sheetIndex + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetData>${rowsXml}</sheetData></worksheet>`]
  }))
  return zippedOfficeBlob({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>interview 3 report</dc:title><dc:creator>interview 3</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>interview 3</Application></Properties>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookViews><workbookView/></workbookViews><sheets>${workbookSheets}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    ...worksheetFiles,
  }, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

function exportApplicantsPptx(applicants: Applicant[], _selectedManager: CollegeManager, fileLabel = 'applicants') {
  const analytics = computeVisualAnalytics(applicants)
  const title = fileLabel === 'portal-no-shows' ? 'تقرير عدم حضور مقابلات البوابة' : 'تقرير منصة interview 3'
  const totalPortal = applicants.filter((item) => item.source === 'qobool').length
  const noShows = getPortalNoShowApplicants(applicants).length
  const sourceStats = getSourceStats(applicants)
  const metricLines = [
    `إجمالي المتقدمين: ${applicants.length}`,
    `المسجلون من البوابة: ${totalPortal}`,
    `من البوابة وحضروا المقابلة: ${sourceStats.portalAttended}`,
    `لم يحضروا المقابلة: ${noShows}`,
    `المسجلون بشكل مباشر: ${sourceStats.directApplicants}`,
    `الدرجة الكاملة: ${fullInterviewScore}`,
    `متوسط المجموع: ${averageScore(applicants, (_scores, applicant) => calculateScore(applicant))}`,
    `نتائج معتمدة: ${applicants.filter((item) => item.status === 'النتيجة معتمدة').length}`,
  ]
  const statusLines = analytics.status.slice(0, 7).map((item) => `${item.label}: ${item.value}`)
  const sampleLines = applicants.slice(0, 10).map((applicant, index) => `${index + 1}. ${applicant.name} - ${applicant.waitingNo ?? 'لم يصدر'} - ${applicant.status}`)
  downloadBlob(
    buildPptxBlob([
      { text: title, x: 500000, y: 300000, w: 11300000, h: 500000, size: 2600, bold: true, color: '182235' },
      { text: metricLines.join('\n'), x: 6900000, y: 1500000, w: 5200000, h: 1500000, size: 1500, bold: true, color: '0F6B8F', fill: 'FFFFFF' },
      { text: `توزيع الحالات\n${statusLines.join('\n')}`, x: 6900000, y: 3300000, w: 5200000, h: 2400000, size: 1300, color: '334155', fill: 'FFFFFF' },
      { text: `أول الأسماء في التقرير\n${sampleLines.join('\n') || 'لا توجد بيانات مطابقة'}`, x: 700000, y: 1500000, w: 5600000, h: 4200000, size: 1250, color: '182235', fill: 'FFFFFF' },
    ]),
    reportFileName(fileLabel, 'pptx'),
  )
}

function exportPortalNoShowCsv(applicants: Applicant[], selectedManager: CollegeManager) {
  exportApplicantsCsv(getPortalNoShowApplicants(applicants), selectedManager, 'portal-no-shows')
}

function exportPortalNoShowXlsx(applicants: Applicant[], selectedManager: CollegeManager) {
  exportApplicantsXlsx(getPortalNoShowApplicants(applicants), selectedManager, 'portal-no-shows')
}

function exportPortalNoShowPptx(applicants: Applicant[], selectedManager: CollegeManager) {
  return exportApplicantsPptx(getPortalNoShowApplicants(applicants), selectedManager, 'portal-no-shows')
}

function exportQobooliCsv(applicants: Applicant[], selectedManager: CollegeManager) {
  const rows = buildQobooliReportRows(applicants, selectedManager)
  const csv = [
    'تقرير منصة قبولي',
    [qobooliReportHeaders, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'),
  ].join('\n')
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), reportFileName('qobooli-report', 'csv'))
}

function exportQobooliXlsx(applicants: Applicant[], selectedManager: CollegeManager) {
  const rows = buildQobooliReportRows(applicants, selectedManager)
  downloadBlob(
    buildXlsxBlob([{ name: 'تقرير منصة قبولي', rows: [qobooliReportHeaders, ...rows] }]),
    reportFileName('qobooli-report', 'xlsx'),
  )
}

function exportQobooliPptx(applicants: Applicant[], _selectedManager: CollegeManager) {
  const stats = getQobooliReportStats(applicants)
  const sampleLines = buildQobooliMatches(applicants).slice(0, 10).map((item, index) => `${index + 1}. ${item.accepted.name} - ${item.accepted.nationalId} - ${item.matchStatus}`)
  const metricLines = [
    `إجمالي سجلات منصة قبولي: ${stats.total}`,
    `مطابق بالهوية والاسم: ${stats.exactMatches}`,
    `مطابق بالهوية مع اختلاف الاسم: ${stats.idOnlyMatches}`,
    `غير موجود في النظام: ${stats.missing}`,
    `حاضر: ${stats.attended}`,
    `لم يحضروا المقابلة: ${stats.noShows}`,
  ]
  downloadBlob(
    buildPptxBlob([
      { text: 'تقرير منصة قبولي', x: 500000, y: 300000, w: 11300000, h: 500000, size: 2600, bold: true, color: '182235' },
      { text: metricLines.join('\n'), x: 6900000, y: 1500000, w: 5200000, h: 2200000, size: 1450, bold: true, color: '0F6B8F', fill: 'FFFFFF' },
      { text: `أول سجلات المطابقة\n${sampleLines.join('\n')}`, x: 700000, y: 1500000, w: 5600000, h: 4400000, size: 1200, color: '182235', fill: 'FFFFFF' },
    ]),
    reportFileName('qobooli-report', 'pptx'),
  )
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeXml(value: ReportCell) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function columnName(index: number) {
  let column = ''
  let next = index + 1
  while (next > 0) {
    const remainder = (next - 1) % 26
    column = String.fromCharCode(65 + remainder) + column
    next = Math.floor((next - 1) / 26)
  }
  return column
}

function zippedOfficeBlob(files: Record<string, string>, type: string) {
  const zipped = zipSync(Object.fromEntries(
    Object.entries(files).map(([path, content]) => [path, strToU8(content)]),
  ))
  return new Blob([zipped], { type })
}

function pptTextShape({ text, x, y, w, h, size, bold = false, color, fill }: {
  text: string
  x: number
  y: number
  w: number
  h: number
  size: number
  bold?: boolean
  color: string
  fill?: string
}, index: number) {
  const fillXml = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'
  const paragraphs = text.split('\n').map((line) => `
    <a:p>
      <a:pPr algn="r" rtl="1"/>
      <a:r>
        <a:rPr lang="ar-SA" sz="${size}"${bold ? ' b="1"' : ''}>
          <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
        </a:rPr>
        <a:t>${escapeXml(line)}</a:t>
      </a:r>
    </a:p>
  `).join('')
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${index}" name="Text ${index}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>
        <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
        ${fillXml}
        <a:ln><a:solidFill><a:srgbClr val="D9E2EC"/></a:solidFill></a:ln>
      </p:spPr>
      <p:txBody><a:bodyPr rtlCol="1" anchor="t"/><a:lstStyle/>${paragraphs}</p:txBody>
    </p:sp>
  `
}

function buildPptxBlob(shapes: Parameters<typeof pptTextShape>[0][]) {
  const shapeXml = shapes.map((shape, index) => pptTextShape(shape, index + 2)).join('')
  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FBFD"/></a:solidFill></p:bgPr></p:bg>
        <p:spTree>
          <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
          <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
          ${shapeXml}
        </p:spTree>
      </p:cSld>
      <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
    </p:sld>`
  return zippedOfficeBlob({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>interview 3 presentation</dc:title><dc:creator>interview 3</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
    'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>interview 3</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>1</Slides></Properties>`,
    'ppt/presentation.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`,
    'ppt/slides/slide1.xml': slideXml,
    'ppt/slides/_rels/slide1.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    'ppt/theme/theme1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="interview 3"><a:themeElements><a:clrScheme name="interview 3"><a:dk1><a:srgbClr val="182235"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FBFD"/></a:lt2><a:accent1><a:srgbClr val="0F6B8F"/></a:accent1><a:accent2><a:srgbClr val="0F766E"/></a:accent2><a:accent3><a:srgbClr val="B7791F"/></a:accent3><a:accent4><a:srgbClr val="64748B"/></a:accent4><a:accent5><a:srgbClr val="8B5CF6"/></a:accent5><a:accent6><a:srgbClr val="DC2626"/></a:accent6><a:hlink><a:srgbClr val="0F6B8F"/></a:hlink><a:folHlink><a:srgbClr val="64748B"/></a:folHlink></a:clrScheme><a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="interview 3"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
  }, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
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

function pdfSourceSummary(applicants: Applicant[]) {
  const sourceStats = getSourceStats(applicants)
  return `
    <section class="source-summary">
      <h2>تقرير المصدر والحضور</h2>
      <table>
        <thead>
          <tr><th>المؤشر</th><th>العدد</th></tr>
        </thead>
        <tbody>
          <tr><td>المسجلون من البوابة</td><td>${sourceStats.portalApplicants}</td></tr>
          <tr><td>المسجلون من البوابة وحضروا المقابلة</td><td>${sourceStats.portalAttended}</td></tr>
          <tr><td>الذين لم يحضروا المقابلة</td><td>${sourceStats.portalNoShows}</td></tr>
          <tr><td>المسجلون بشكل مباشر</td><td>${sourceStats.directApplicants}</td></tr>
        </tbody>
      </table>
    </section>
  `
}

function openPortalNoShowPdfReport(applicants: Applicant[], _selectedManager: CollegeManager) {
  const noShows = getPortalNoShowApplicants(applicants)
  const sourceStats = getSourceStats(applicants)
  const report = window.open('', '_blank', 'width=1024,height=720')
  if (!report) return
  const rows = noShows.map((applicant, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(applicant.name)}</td>
      <td>${escapeHtml(applicant.nationalId)}</td>
      <td>${escapeHtml(applicant.phone)}</td>
      <td>${escapeHtml(applicant.waitingNo ?? 'لم يصدر')}</td>
      <td>${escapeHtml(applicant.interviewAt ?? 'غير مجدول')}</td>
      <td>${escapeHtml(applicant.status)}</td>
      <td>${fullInterviewScore}</td>
      <td>${escapeHtml(calculateScore(applicant))}</td>
    </tr>
  `).join('')
  report.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>تقرير المسجلين من البوابة ولم يحضروا</title>
        <style>
          body { margin: 0; padding: 32px; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #182235; }
          header { border-bottom: 3px solid #0f6b8f; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0; color: #667085; }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
          .metric { border: 1px solid #d9e2ec; border-radius: 8px; padding: 12px; background: #fafdff; }
          span { display: block; color: #667085; font-size: 12px; }
          strong { display: block; margin-top: 5px; font-size: 16px; }
          .metric strong { font-size: 28px; color: #991b1b; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #d9e2ec; padding: 10px; text-align: right; font-size: 13px; }
          th { background: #fafdff; color: #667085; }
          .empty { padding: 18px; border: 1px solid #d9e2ec; border-radius: 8px; color: #667085; background: #fafdff; }
          @media print { body { padding: 18px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>تقرير المسجلين من البوابة ولم يحضروا المقابلة</h1>
          <p>interview 3 - ${escapeHtml(new Date().toLocaleDateString('ar-SA'))}</p>
        </header>
        <section class="metrics">
          <div class="metric"><span>إجمالي المسجلين من البوابة</span><strong>${applicants.filter((item) => item.source === 'qobool').length}</strong></div>
          <div class="metric"><span>من البوابة وحضروا المقابلة</span><strong>${sourceStats.portalAttended}</strong></div>
          <div class="metric"><span>لم يحضروا المقابلة</span><strong>${noShows.length}</strong></div>
          <div class="metric"><span>المسجلون بشكل مباشر</span><strong>${sourceStats.directApplicants}</strong></div>
          <div class="metric"><span>نسبة عدم الحضور من البوابة</span><strong>${applicants.filter((item) => item.source === 'qobool').length ? Math.round((noShows.length / applicants.filter((item) => item.source === 'qobool').length) * 100) : 0}%</strong></div>
        </section>
        ${noShows.length === 0 ? '<div class="empty">لا يوجد مسجلون من البوابة بحالة لم يحضروا المقابلة.</div>' : `
          <table>
            <thead>
              <tr><th>#</th><th>الاسم</th><th>رقم الهوية</th><th>رقم الجوال</th><th>رقم الانتظار</th><th>موعد المقابلة</th><th>الحالة</th><th>الدرجة الكاملة</th><th>المجموع</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `}
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `)
  report.document.close()
}

function openApplicantsPdfReport(applicants: Applicant[], stats: { total: number; approved: number; pendingDocs: number; scheduled: number }, _selectedManager: CollegeManager) {
  const report = window.open('', '_blank', 'width=1024,height=720')
  if (!report) return
  const analytics = computeVisualAnalytics(applicants)
  const sourceSummary = pdfSourceSummary(applicants)
  const charts = [
    pdfBarChart('توزيع حالات الطلبات', analytics.status),
    pdfDonutChart('توزيع النتائج', analytics.results),
    pdfBarChart('توزيع اللجان', analytics.committees),
    pdfScoreBars(analytics.scores),
    pdfYesNoSummary(analytics.yesNo),
  ].join('')

  const rows = applicants.map((applicant) => {
    const scores = normalizeScores(applicant.scores)
    const sourceStats = getSourceStats(applicants)
    return `
      <tr>
        <td>${escapeHtml(applicant.name)}</td>
        <td>${escapeHtml(applicant.nationalId)}</td>
        <td>${escapeHtml(applicant.status)}</td>
        <td>${escapeHtml(applicant.waitingNo ?? 'لم يصدر')}</td>
        <td>${escapeHtml(registrationSourceLabel(applicant.source))}</td>
        <td>${escapeHtml(scores.signLanguage)}</td>
        <td>${escapeHtml(scores.appearance)}</td>
        <td>${escapeHtml(scores.generalInfo)}</td>
        <td>${escapeHtml(scores.responseSpeed)}</td>
        <td>${fullInterviewScore}</td>
        <td>${escapeHtml(calculateScore(applicant))}</td>
        <td>${sourceStats.portalAttended}</td>
        <td>${sourceStats.portalNoShows}</td>
        <td>${sourceStats.directApplicants}</td>
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
        <section class="metrics">
          <div class="metric"><span>إجمالي المتقدمين</span><strong>${stats.total}</strong></div>
          <div class="metric"><span>طلبات قيد المراجعة</span><strong>${stats.pendingDocs}</strong></div>
          <div class="metric"><span>مواعيد مجدولة</span><strong>${stats.scheduled}</strong></div>
          <div class="metric"><span>نتائج معتمدة</span><strong>${stats.approved}</strong></div>
        </section>
        <h2>الرسوم والمؤشرات</h2>
        <section class="pdf-visuals">${charts}</section>
        ${sourceSummary}
        <table>
          <thead>
            <tr><th>المتقدم</th><th>رقم الهوية</th><th>الحالة</th><th>رقم المقابلة</th><th>المصدر</th><th>الإشارة /25</th><th>المظهر /5</th><th>معلومات عامة /15</th><th>سرعة الاستجابة /5</th><th>الدرجة الكاملة</th><th>المجموع</th><th>من البوابة وحضروا</th><th>لم يحضروا</th><th>مباشر</th><th>إعاقة مصاحبة</th><th>ضعيف سمع</th><th>يتقن الإشارة</th><th>ضعف القدرات</th><th>متميز</th></tr>
          </thead>
          <tbody>${rows}</tbody>
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
  const updateSequenceRef = useRef<Record<string, number>>({})

  const selected = applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0] ?? seedApplicants[0]
  const stats = useMemo(() => {
    const approved = applicants.filter((item) => item.status === 'النتيجة معتمدة').length
    const pendingDocs = applicants.filter((item) => item.status.includes('مراجعة') || item.status.includes('استكمال')).length
    const interviewed = applicants.filter((item) => item.status === 'تم التقييم' || item.status === 'النتيجة معتمدة').length
    const scheduled = applicants.filter((item) => item.interviewAt).length
    const sourceStats = getSourceStats(applicants)
    return { total: applicants.length, approved, pendingDocs, interviewed, scheduled, portalRegistered: sourceStats.portalApplicants, portalAttended: sourceStats.portalAttended, portalNoShows: sourceStats.portalNoShows, directApplicants: sourceStats.directApplicants }
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

  const updateApplicant = async (id: string, patch: Partial<Applicant>, audit?: string) => {
    const sequence = (updateSequenceRef.current[id] ?? 0) + 1
    updateSequenceRef.current[id] = sequence
    const next = applicants.map((applicant) =>
      applicant.id === id
        ? { ...applicant, ...patch, audit: audit ? [audit, ...applicant.audit].slice(0, 8) : (patch.audit ?? applicant.audit) }
        : applicant,
    )
    setApplicants(next)
    const response = await apiFetch(`/api/applicants/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(audit ? { patch, audit } : { patch }),
    })
    if (response.ok) {
      const data = (await response.json()) as { applicant: Applicant }
      if (updateSequenceRef.current[id] === sequence) {
        setApplicants((current) => current.map((applicant) => applicant.id === id ? data.applicant : applicant))
      }
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

  const submitEvaluation = async (id: string, finalPatch: Partial<Applicant> = {}) => {
    const evaluatedApplicant = applicants.find((applicant) => applicant.id === id) ?? selected
    const score = calculateScore({ ...evaluatedApplicant, ...finalPatch })
    await updateApplicant(
      id,
      { ...finalPatch, status: 'النتيجة معتمدة', finalResult: score >= 35 ? 'مقبول' : 'احتياط' },
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
          graduationDate: graduationYearOnly(form.graduationDate),
          phone: form.phone,
          extraPhone: form.extraPhone,
          qualification: form.certificateType,
          gpa: 0,
          waitingNo: interviewNo,
          status: neutralStatus,
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
          graduationDate: graduationYearOnly(form.graduationDate),
          phone: form.phone,
          extraPhone: form.extraPhone,
          qualification: form.certificateType,
          gpa: 0,
          source: 'qobool',
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
            <button onClick={() => exportApplicantsXlsx(applicants, selectedManager)} type="button"><Download size={17} /> XLSX</button>
            <button onClick={() => exportApplicantsCsv(applicants, selectedManager)} type="button"><Download size={17} /> CSV</button>
            <button onClick={() => void exportApplicantsPptx(applicants, selectedManager)} type="button"><BarChart3 size={17} /> PPTX</button>
            <button onClick={() => openApplicantsPdfReport(applicants, stats, selectedManager)} type="button"><FileText size={17} /> PDF</button>
            <button onClick={() => refreshApplicants()} type="button"><RefreshCcw size={17} /> مزامنة البيانات</button>
          </div>}
        </header>

        {!applicantOnly && role !== 'applicant' && (
          <>
            <section className="metrics" aria-label="مؤشرات النظام">
              <Metric icon={Users} label="إجمالي المتقدمين" value={stats.total} tone="blue" />
              <Metric icon={FileCheck2} label="طلبات قيد المراجعة" value={stats.pendingDocs} tone="amber" />
              <Metric icon={CalendarDays} label="مواعيد مجدولة" value={stats.scheduled} tone="teal" />
              <Metric icon={CheckCircle2} label="نتائج معتمدة" value={stats.approved} tone="green" />
              <Metric icon={UserCheck} label="من البوابة وحضروا" value={stats.portalAttended} tone="green" />
              <Metric icon={Clock3} label="من البوابة ولم يحضروا" value={stats.portalNoShows} tone="danger" />
              <Metric icon={QrCode} label="مسجل مباشر" value={stats.directApplicants} tone="blue" />
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
          <HeadView applicants={applicants} selected={selected} setSelectedId={setSelectedId} assignCommittee={assignCommittee} approveResult={approveResult} updateApplicant={updateApplicant} />
        )}
        {role === 'committee' && <CommitteeView applicants={applicants} selected={selected} setSelectedId={setSelectedId} updateApplicant={updateApplicant} submitEvaluation={submitEvaluation} />}
        {role === 'inquiry' && <ApplicantInquiryView applicants={applicants} selectedId={selected.id} setSelectedId={setSelectedId} />}
        {role === 'sourceReport' && <SourceReportView applicants={applicants} selectedManager={selectedManager} stats={stats} />}
        {role === 'qobooliReport' && <QobooliReportView applicants={applicants} selectedManager={selectedManager} />}
        {role === 'absent' && <PortalNoShowView applicants={applicants} selectedManager={selectedManager} stats={stats} />}
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

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'blue' | 'amber' | 'teal' | 'green' | 'danger' }) {
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
          {applicants.length === 0 && (
            <tr>
              <td className="empty-table" colSpan={8}>لا توجد بيانات مطابقة.</td>
            </tr>
          )}
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
  if (status.includes('استكمال') || status.includes('تصحيح') || status.includes('لم يحضر') || status.includes('مستبعد')) return 'danger'
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
        <Info label="سنة التخرج" value={graduationYearOnly(applicant.graduationDate)} />
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

function ApplicantInquiryView({ applicants, selectedId, setSelectedId }: {
  applicants: Applicant[]
  selectedId: string
  setSelectedId: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const normalizedQuery = normalizeDigits(query).trim().toLowerCase()
  const results = normalizedQuery
    ? applicants.filter((applicant) => [
      applicant.name,
      applicant.nationalId,
      applicant.requestNo,
      applicant.waitingNo ?? '',
      applicant.phone,
    ].some((value) => normalizeDigits(value).toLowerCase().includes(normalizedQuery)))
    : []
  const selectedInquiry = applicants.find((applicant) => applicant.id === selectedId)
  return (
    <div className="grid split">
      <section className="panel">
        <div className="section-title"><h2>استعلام عن متقدم</h2><Search size={21} /></div>
        <label className="list-select">
          البحث بالاسم أو الهوية أو رقم الانتظار
          <input
            aria-label="بحث مستقل عن متقدم"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثال: رقم الهوية، الاسم، INT-001"
            value={query}
          />
        </label>
        <ApplicantTable applicants={results} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
      <section className="panel">
        {selectedInquiry ? <Details applicant={selectedInquiry} /> : <p className="report-note">اختر متقدمًا من نتائج البحث لعرض بياناته.</p>}
      </section>
    </div>
  )
}

function SourceReportView({ applicants, selectedManager, stats }: {
  applicants: Applicant[]
  selectedManager: CollegeManager
  stats: { portalRegistered: number; portalAttended: number; portalNoShows: number; directApplicants: number }
}) {
  const sourceRows = [
    { label: 'المسجلون من البوابة', count: stats.portalRegistered, applicants: applicants.filter((item) => item.source === 'qobool') },
    { label: 'المسجلون من البوابة وحضروا المقابلة', count: stats.portalAttended, applicants: applicants.filter((item) => item.source === 'qobool' && hasAttendedInterview(item)) },
    { label: 'الذين لم يحضروا المقابلة', count: stats.portalNoShows, applicants: getPortalNoShowApplicants(applicants) },
    { label: 'المسجلون بشكل مباشر', count: stats.directApplicants, applicants: applicants.filter((item) => item.source === 'direct') },
  ]
  return (
    <div className="grid two">
      <section className="panel">
        <div className="section-title"><h2>تقرير المصدر</h2><BarChart3 size={21} /></div>
        <div className="metrics compact-metrics">
          <Metric icon={QrCode} label="من البوابة" value={stats.portalRegistered} tone="blue" />
          <Metric icon={UserCheck} label="من البوابة وحضروا" value={stats.portalAttended} tone="green" />
          <Metric icon={Clock3} label="لم يحضروا" value={stats.portalNoShows} tone="danger" />
          <Metric icon={Users} label="مباشر" value={stats.directApplicants} tone="teal" />
        </div>
        <div className="actions">
          <button onClick={() => exportApplicantsXlsx(applicants, selectedManager, 'source-report')} type="button"><Download size={17} /> XLSX</button>
          <button onClick={() => exportApplicantsCsv(applicants, selectedManager, 'source-report')} type="button"><Download size={17} /> CSV</button>
          <button onClick={() => void exportApplicantsPptx(applicants, selectedManager, 'source-report')} type="button"><BarChart3 size={17} /> PPTX</button>
          <button onClick={() => openSourcePdfReport(applicants, selectedManager)} type="button"><FileText size={17} /> PDF</button>
        </div>
      </section>
      <section className="panel">
        <div className="section-title"><h2>جدول أعداد المصدر</h2><ListChecks size={21} /></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>المؤشر</th><th>العدد</th><th>أول الأسماء</th></tr>
            </thead>
            <tbody>
              {sourceRows.map((row) => (
                <tr key={row.label}>
                  <td data-label="المؤشر">{row.label}</td>
                  <td data-label="العدد">{row.count}</td>
                  <td data-label="أول الأسماء">{row.applicants.slice(0, 4).map((item) => item.name).join('، ') || 'لا يوجد'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function QobooliReportView({ applicants, selectedManager }: {
  applicants: Applicant[]
  selectedManager: CollegeManager
}) {
  const matches = buildQobooliMatches(applicants)
  const stats = getQobooliReportStats(applicants)
  return (
    <div className="grid two">
      <section className="panel">
        <div className="section-title"><h2>تقرير منصة قبولي</h2><FileText size={21} /></div>
        <p className="report-note">تقرير مستقل يعرض سجلات مصدر منصة قبولي فقط، ويطابق الاسم ورقم الهوية مع بيانات النظام.</p>
        <div className="metrics compact-metrics">
          <Metric icon={QrCode} label="سجلات قبولي" value={stats.total} tone="blue" />
          <Metric icon={CheckCircle2} label="مطابق بالاسم والهوية" value={stats.exactMatches} tone="green" />
          <Metric icon={Search} label="اختلاف اسم" value={stats.idOnlyMatches} tone="amber" />
          <Metric icon={Clock3} label="غير موجود" value={stats.missing} tone="danger" />
          <Metric icon={UserCheck} label="حاضر" value={stats.attended} tone="teal" />
          <Metric icon={Clock3} label="لم يحضروا" value={stats.noShows} tone="danger" />
        </div>
        <div className="actions">
          <button onClick={() => exportQobooliXlsx(applicants, selectedManager)} type="button"><Download size={17} /> XLSX</button>
          <button onClick={() => exportQobooliCsv(applicants, selectedManager)} type="button"><Download size={17} /> CSV</button>
          <button onClick={() => exportQobooliPptx(applicants, selectedManager)} type="button"><BarChart3 size={17} /> PPTX</button>
          <button onClick={() => openQobooliPdfReport(applicants, selectedManager)} type="button"><FileText size={17} /> PDF</button>
        </div>
      </section>
      <section className="panel">
        <div className="section-title"><h2>مطابقة بيانات قبولي</h2><ListChecks size={21} /></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>رقم الهوية</th><th>الاسم في قبولي</th><th>الاسم في النظام</th><th>حالة المطابقة</th><th>حالة الحضور</th><th>حالة النظام</th><th>رقم الانتظار</th><th>الدرجة</th><th>الملاحظات</th><th>المصدر</th></tr>
            </thead>
            <tbody>
              {matches.map(({ accepted, systemApplicant, matchStatus, attendanceStatus, isPresent }) => (
                <tr key={accepted.nationalId}>
                  <td data-label="رقم الهوية">{accepted.nationalId}</td>
                  <td data-label="الاسم في قبولي">{accepted.name}</td>
                  <td data-label="الاسم في النظام">{systemApplicant?.name ?? 'غير موجود'}</td>
                  <td data-label="حالة المطابقة"><span className={`status ${matchStatus === 'مطابق بالهوية والاسم' ? 'success' : matchStatus === 'غير موجود في النظام' ? 'danger' : 'warning'}`}>{matchStatus}</span></td>
                  <td data-label="حالة الحضور"><span className={`status ${attendanceStatus === 'حاضر' ? 'success' : attendanceStatus === 'غير حاضر' ? 'danger' : 'warning'}`}>{attendanceStatus}</span></td>
                  <td data-label="حالة النظام">{systemApplicant?.status ?? 'غير موجود'}</td>
                  <td data-label="رقم الانتظار">{systemApplicant?.waitingNo ?? 'لم يصدر'}</td>
                  <td data-label="الدرجة">{systemApplicant && isPresent ? `${calculateScore(systemApplicant)} من ${fullInterviewScore}` : ''}</td>
                  <td data-label="الملاحظات">{systemApplicant && isPresent ? systemApplicant.notes : ''}</td>
                  <td data-label="المصدر">{qobooliSourceLabel()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function openSourcePdfReport(applicants: Applicant[], _selectedManager: CollegeManager) {
  const report = window.open('', '_blank', 'width=1024,height=720')
  if (!report) return
  const sourceStats = getSourceStats(applicants)
  report.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>تقرير المصدر</title>
        <style>
          body { margin: 0; padding: 32px; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #182235; }
          header { border-bottom: 3px solid #0f6b8f; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0; color: #667085; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #d9e2ec; padding: 10px; text-align: right; font-size: 13px; }
          th { background: #fafdff; color: #667085; }
          @media print { body { padding: 18px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>تقرير المصدر</h1>
          <p>interview 3 - ${escapeHtml(new Date().toLocaleDateString('ar-SA'))}</p>
        </header>
        <table>
          <thead><tr><th>المؤشر</th><th>العدد</th></tr></thead>
          <tbody>
            <tr><td>المسجلون من البوابة</td><td>${sourceStats.portalApplicants}</td></tr>
            <tr><td>المسجلون من البوابة وحضروا المقابلة</td><td>${sourceStats.portalAttended}</td></tr>
            <tr><td>الذين لم يحضروا المقابلة</td><td>${sourceStats.portalNoShows}</td></tr>
            <tr><td>المسجلون بشكل مباشر</td><td>${sourceStats.directApplicants}</td></tr>
          </tbody>
        </table>
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `)
  report.document.close()
}

function openQobooliPdfReport(applicants: Applicant[], _selectedManager: CollegeManager) {
  const report = window.open('', '_blank', 'width=1024,height=720')
  if (!report) return
  const stats = getQobooliReportStats(applicants)
  const rows = buildQobooliMatches(applicants).map(({ accepted, systemApplicant, matchStatus, attendanceStatus, isPresent }, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(accepted.nationalId)}</td>
      <td>${escapeHtml(accepted.name)}</td>
      <td>${escapeHtml(systemApplicant?.name ?? 'غير موجود')}</td>
      <td>${escapeHtml(matchStatus)}</td>
      <td>${escapeHtml(attendanceStatus)}</td>
      <td>${escapeHtml(normalizeImportedPhone(accepted.phone))}</td>
      <td>${escapeHtml(accepted.major)}</td>
      <td>${escapeHtml(accepted.preferenceNo)}</td>
      <td>${escapeHtml(accepted.admissionStatus)}</td>
      <td>${escapeHtml(systemApplicant?.status ?? 'غير موجود')}</td>
      <td>${escapeHtml(systemApplicant?.waitingNo ?? 'لم يصدر')}</td>
      <td>${fullInterviewScore}</td>
      <td>${systemApplicant && isPresent ? escapeHtml(calculateScore(systemApplicant)) : ''}</td>
      <td>${systemApplicant && isPresent ? escapeHtml(systemApplicant.notes) : ''}</td>
      <td>${escapeHtml(qobooliSourceLabel())}</td>
    </tr>
  `).join('')
  report.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>تقرير منصة قبولي</title>
        <style>
          body { margin: 0; padding: 32px; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #182235; }
          header { border-bottom: 3px solid #0f6b8f; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { margin: 0; color: #667085; }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
          .metric { border: 1px solid #d9e2ec; border-radius: 8px; padding: 12px; background: #fafdff; }
          span { display: block; color: #667085; font-size: 12px; }
          strong { display: block; margin-top: 5px; font-size: 16px; }
          .metric strong { font-size: 28px; color: #0f6b8f; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #d9e2ec; padding: 9px; text-align: right; font-size: 12px; }
          th { background: #fafdff; color: #667085; }
          @media print { body { padding: 18px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>تقرير منصة قبولي</h1>
          <p>تقرير مستقل لمطابقة الاسم ورقم الهوية - ${escapeHtml(new Date().toLocaleDateString('ar-SA'))}</p>
        </header>
        <section class="metrics">
          <div class="metric"><span>إجمالي سجلات قبولي</span><strong>${stats.total}</strong></div>
          <div class="metric"><span>مطابق بالهوية والاسم</span><strong>${stats.exactMatches}</strong></div>
          <div class="metric"><span>مطابق بالهوية مع اختلاف الاسم</span><strong>${stats.idOnlyMatches}</strong></div>
          <div class="metric"><span>غير موجود في النظام</span><strong>${stats.missing}</strong></div>
          <div class="metric"><span>حاضر</span><strong>${stats.attended}</strong></div>
          <div class="metric"><span>لم يحضروا المقابلة</span><strong>${stats.noShows}</strong></div>
        </section>
        <table>
          <thead>
            <tr><th>#</th><th>رقم الهوية</th><th>الاسم في قبولي</th><th>الاسم في النظام</th><th>حالة المطابقة</th><th>حالة الحضور</th><th>رقم الجوال</th><th>التخصص</th><th>رقم الرغبة</th><th>حالة القبول</th><th>حالة النظام</th><th>رقم الانتظار</th><th>الدرجة الكاملة</th><th>الدرجة</th><th>الملاحظات</th><th>المصدر</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `)
  report.document.close()
}

function PortalNoShowView({ applicants, selectedManager, stats }: {
  applicants: Applicant[]
  selectedManager: CollegeManager
  stats: { portalRegistered: number; portalAttended: number; portalNoShows: number; directApplicants: number }
}) {
  const noShows = getPortalNoShowApplicants(applicants)
  const noShowPercent = stats.portalRegistered ? Math.round((stats.portalNoShows / stats.portalRegistered) * 100) : 0
  return (
    <div className="grid two">
      <section className="panel">
        <div className="section-title"><h2>تقرير المسجلين من البوابة ولم يحضروا</h2><Clock3 size={21} /></div>
        <div className="metrics compact-metrics">
          <Metric icon={QrCode} label="إجمالي المسجلين من البوابة" value={stats.portalRegistered} tone="blue" />
          <Metric icon={UserCheck} label="من البوابة وحضروا" value={stats.portalAttended} tone="green" />
          <Metric icon={Clock3} label="لم يحضروا المقابلة" value={stats.portalNoShows} tone="danger" />
          <Metric icon={Users} label="مسجل مباشر" value={stats.directApplicants} tone="teal" />
          <Metric icon={BarChart3} label="نسبة عدم الحضور" value={noShowPercent} tone="amber" />
        </div>
        <div className="actions">
          <button onClick={() => exportPortalNoShowXlsx(applicants, selectedManager)} type="button"><Download size={17} /> XLSX</button>
          <button onClick={() => exportPortalNoShowCsv(applicants, selectedManager)} type="button"><Download size={17} /> CSV</button>
          <button onClick={() => void exportPortalNoShowPptx(applicants, selectedManager)} type="button"><BarChart3 size={17} /> PPTX</button>
          <button onClick={() => openPortalNoShowPdfReport(applicants, selectedManager)} type="button"><FileText size={17} /> PDF</button>
        </div>
      </section>
      <section className="panel">
        <div className="section-title"><h2>قائمة عدم الحضور</h2><ListChecks size={21} /></div>
        <p className="report-note">يعرض هذا التقرير فقط المتقدمين المسجلين من البوابة وحالتهم: {noShowStatus}.</p>
        <ApplicantTable applicants={noShows} onSelect={() => undefined} />
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
          <button onClick={() => updateApplicant(selected.id, { status: noShowStatus }, 'تسجيل المتقدم بأنه لم يحضر المقابلة')} type="button"><Clock3 size={17} /> تسجيل لم يحضر</button>
        </div>
      </section>
    </div>
  )
}

function HeadView({ applicants, selected, setSelectedId, assignCommittee, approveResult, updateApplicant }: {
  applicants: Applicant[]
  selected: Applicant
  setSelectedId: (id: string) => void
  assignCommittee: (id: string, committeeNumber: string, committeeTrainerIds: string[], translatorId: string) => void
  approveResult: (id: string) => void
  updateApplicant: (id: string, patch: Partial<Applicant>, audit: string) => void
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
          <button onClick={() => updateApplicant(selected.id, { status: noShowStatus }, 'تسجيل المتقدم بأنه لم يحضر المقابلة')} type="button"><Clock3 size={17} /> تسجيل لم يحضر</button>
        </div>
      </section>
    </div>
  )
}

function CommitteeView({ applicants, selected, setSelectedId, updateApplicant, submitEvaluation }: {
  applicants: Applicant[]
  selected: Applicant
  setSelectedId: (id: string) => void
  updateApplicant: (id: string, patch: Partial<Applicant>, audit?: string) => void
  submitEvaluation: (id: string, finalPatch?: Partial<Applicant>) => Promise<void>
}) {
  const [committeeNumber, setCommitteeNumber] = useState('')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(selected.committeeTrainerIds ?? [])
  const [translatorId, setTranslatorId] = useState(selected.translatorId ?? '')
  const [editForm, setEditForm] = useState<ApplicantForm>(applicantToForm(selected))
  const [isChoosingApplicant, setIsChoosingApplicant] = useState(true)
  const [questionScoreDrafts, setQuestionScoreDrafts] = useState<string[]>([])
  const [touchedQuestionScores, setTouchedQuestionScores] = useState<boolean[]>([])
  const [notesDraft, setNotesDraft] = useState(selected.notes)
  const [yesNoDrafts, setYesNoDrafts] = useState<Pick<ReturnType<typeof normalizeScores>, 'hasAssociatedDifficulty' | 'weakHearing' | 'knowsSignLanguage' | 'weakMentalAbilities' | 'distinguished'>>({
    hasAssociatedDifficulty: '',
    weakHearing: '',
    knowsSignLanguage: '',
    weakMentalAbilities: '',
    distinguished: '',
  })
  const [reviewReady, setReviewReady] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [saveNotice, setSaveNotice] = useState<{ kind: 'pending' | 'success' | 'error'; message: string } | null>(null)
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
  const questionDraftTotal = questionScoreDrafts.reduce((total, score) => total + (score === '' ? 0 : Number(score)), 0)
  const selectedTotalScore = selectedScores.signLanguage + selectedScores.appearance + selectedScores.responseSpeed + questionDraftTotal
  const questionProgress = touchedQuestionScores.filter(Boolean).length
  const firstUnscoredQuestionIndex = touchedQuestionScores.findIndex((touched) => !touched)
  const questionScoresComplete = touchedQuestionScores.length === selectedQuestions.length && firstUnscoredQuestionIndex === -1
  const analyticsApplicants = committeeNumber ? assigned : applicants

  useEffect(() => {
    setTranslatorId(committeeNumber ? activeApplicant.translatorId ?? '' : '')
    setSelectedStaffIds(committeeNumber ? activeApplicant.committeeTrainerIds ?? [] : [])
    setEditForm(applicantToForm(activeApplicant))
    setNotesDraft(activeApplicant.notes)
    setYesNoDrafts({
      hasAssociatedDifficulty: selectedScores.hasAssociatedDifficulty,
      weakHearing: selectedScores.weakHearing,
      knowsSignLanguage: selectedScores.knowsSignLanguage,
      weakMentalAbilities: selectedScores.weakMentalAbilities,
      distinguished: selectedScores.distinguished,
    })
    setReviewReady(false)
    setValidationMessage('')
    const storedQuestionScores = activeApplicant.scores.questionScores
    setQuestionScoreDrafts(selectedQuestions.map((_question, index) => (
      storedQuestionScores && storedQuestionScores[index] !== undefined ? String(storedQuestionScores[index]) : ''
    )))
    setTouchedQuestionScores(selectedQuestions.map((_question, index) => Boolean(storedQuestionScores && storedQuestionScores[index] !== undefined)))
  }, [activeApplicant.id, committeeNumber])

  const selectTranslator = (value: string) => {
    setTranslatorId(value)
    updateApplicant(activeApplicant.id, { translatorId: value || undefined })
  }

  const toggleStaff = (id: string) => {
    const next = selectedStaffIds.includes(id) ? selectedStaffIds.filter((item) => item !== id) : [...selectedStaffIds, id]
    setSelectedStaffIds(next)
    updateApplicant(activeApplicant.id, { committeeTrainerIds: next })
  }

  const setScore = (key: keyof Pick<ReturnType<typeof normalizeScores>, 'signLanguage' | 'appearance' | 'responseSpeed'>, value: number) => {
    setReviewReady(false)
    setValidationMessage('')
    setSaveNotice(null)
    updateApplicant(activeApplicant.id, { scores: { ...selectedScores, [key]: value }, status: 'المقابلة جارية' }, 'حفظ تقييم مؤقت')
  }

  const setNotes = (value: string) => {
    setNotesDraft(value)
    setReviewReady(false)
    setValidationMessage('')
    setSaveNotice(null)
    updateApplicant(activeApplicant.id, { notes: value }, 'تحديث ملاحظات المقابلة')
  }

  const setQuestionScore = (index: number, rawValue: string) => {
    setReviewReady(false)
    setValidationMessage('')
    setSaveNotice(null)
    const nextDrafts = [...questionScoreDrafts]
    nextDrafts[index] = rawValue
    setQuestionScoreDrafts(nextDrafts)
    const nextTouched = [...touchedQuestionScores]
    nextTouched[index] = rawValue !== ''
    setTouchedQuestionScores(nextTouched)
    if (rawValue === '') return
    const value = Number(rawValue)
    const nextScores = [...selectedScores.questionScores]
    nextScores[index] = Math.min(3, Math.max(0, value))
    updateApplicant(activeApplicant.id, { scores: { ...selectedScores, questionScores: nextScores, generalInfo: nextScores.reduce((total, score) => total + score, 0) }, status: 'المقابلة جارية' }, 'حفظ درجة سؤال المعلومات العامة')
  }

  const setYesNo = (key: keyof Pick<ReturnType<typeof normalizeScores>, 'hasAssociatedDifficulty' | 'weakHearing' | 'knowsSignLanguage' | 'weakMentalAbilities' | 'distinguished'>, value: YesNo) => {
    const nextDrafts = { ...yesNoDrafts, [key]: value }
    setYesNoDrafts(nextDrafts)
    setReviewReady(false)
    setValidationMessage('')
    setSaveNotice(null)
    updateApplicant(activeApplicant.id, { scores: { ...selectedScores, ...nextDrafts }, status: 'المقابلة جارية' }, 'حفظ بيانات ملاحظة المقابلة')
  }

  const saveApplicantData = () => {
    updateApplicant(activeApplicant.id, formToApplicantPatch(editForm), 'تعديل بيانات المتقدم من اللجنة')
  }

  const approveAndMoveNext = async () => {
    if (!questionScoresComplete) {
      const nextQuestion = firstUnscoredQuestionIndex + 1
      setValidationMessage(`سجل درجة السؤال ${nextQuestion} قبل المتابعة.`)
      setReviewReady(false)
      return
    }
    if (!reviewReady) {
      setReviewReady(true)
      setValidationMessage('راجع الدرجة الظاهرة ثم اضغط تأكيد الاعتماد والانتقال.')
      return
    }
    setValidationMessage('')
    setSaveNotice({ kind: 'pending', message: 'تم الانتقال للمتقدم التالي، وجارٍ حفظ التقييم النهائي...' })
    const finalScores = {
      ...selectedScores,
      ...yesNoDrafts,
      questionScores: questionScoreDrafts.map((score) => Number(score)),
      generalInfo: questionDraftTotal,
    }
    const nextApplicant =
      applicants.find((applicant) => applicant.id !== activeApplicant.id && applicant.status !== 'النتيجة معتمدة') ??
      applicants.find((applicant) => applicant.id !== activeApplicant.id)
    void submitEvaluation(activeApplicant.id, { scores: finalScores, notes: notesDraft })
      .then(() => {
        setSaveNotice({ kind: 'success', message: 'تم حفظ التقييم النهائي بنجاح.' })
      })
      .catch(() => {
        setSaveNotice({ kind: 'error', message: 'تم الانتقال، لكن تعذر حفظ التقييم النهائي. تحقق من الاتصال وأعد المحاولة عند الحاجة.' })
      })
    if (nextApplicant) {
      setSelectedId(nextApplicant.id)
    }
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
            <label>سنة التخرج<input inputMode="numeric" maxLength={4} pattern="[0-9٠-٩۰-۹]{4}" placeholder="مثال: 2026 أو 1447" value={editForm.graduationDate} onChange={(event) => setEditForm({ ...editForm, graduationDate: graduationYearOnly(event.target.value) })} /></label>
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
            <small>{activeApplicant.finalResult ? `تم اعتماد المدرب: ${activeApplicant.finalResult}` : `تم تسجيل ${questionProgress} من ${selectedQuestions.length} درجات أسئلة`}</small>
            {reviewReady && <b className="review-confirm">الدرجة جاهزة للمراجعة: {selectedTotalScore} من 50</b>}
            {validationMessage && <em className="validation-message">{validationMessage}</em>}
            {saveNotice && <em className={`save-notice ${saveNotice.kind}`}>{saveNotice.message}</em>}
          </div>
          <ScoreInput label="الإشارة" max={25} value={selectedScores.signLanguage} onChange={(value) => setScore('signLanguage', value)} />
          <ScoreInput label="المظهر العام" max={5} value={selectedScores.appearance} onChange={(value) => setScore('appearance', value)} />
          <div className="question-score-form">
            <div className="question-card-title">
              <h3>معلومات عامة</h3>
              <span>{selectedScores.generalInfo} من 15</span>
            </div>
            {selectedQuestions.map((question, index) => (
              <label className="question-score" key={`${question.prompt}-${index}`}>
                <span>{index + 1}. {question.prompt}</span>
                <input
                  aria-label={`درجة السؤال ${index + 1}`}
                  disabled={firstUnscoredQuestionIndex !== -1 && index > firstUnscoredQuestionIndex}
                  max="3"
                  min="0"
                  onChange={(event) => setQuestionScore(index, event.target.value)}
                  placeholder="--"
                  type="number"
                  value={questionScoreDrafts[index] ?? ''}
                />
              </label>
            ))}
          </div>
          <ScoreInput label="سرعة الاستجابة للتعليمات" max={5} value={selectedScores.responseSpeed} onChange={(value) => setScore('responseSpeed', value)} />
          <div className="yes-no-grid">
            <YesNoField label="هل يوجد صعوبة او إعاقة مصاحبة قد تؤثر على التدريب" name="has-associated-difficulty" value={yesNoDrafts.hasAssociatedDifficulty} onChange={(value) => setYesNo('hasAssociatedDifficulty', value)} />
            <YesNoField label="هل المتقدم ضعيف سمع" name="weak-hearing" value={yesNoDrafts.weakHearing} onChange={(value) => setYesNo('weakHearing', value)} />
            <YesNoField label="هل يتقن لغة الإشارة" name="knows-sign-language" value={yesNoDrafts.knowsSignLanguage} onChange={(value) => setYesNo('knowsSignLanguage', value)} />
            <YesNoField label="هل لديه ضعف عام بالقدرات العقلية والاستيعاب" name="weak-mental-abilities" value={yesNoDrafts.weakMentalAbilities} onChange={(value) => setYesNo('weakMentalAbilities', value)} />
            <YesNoField label="هل المتقدم متميز" name="distinguished" value={yesNoDrafts.distinguished} onChange={(value) => setYesNo('distinguished', value)} />
          </div>
          <textarea value={notesDraft} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات المقيم" />
        </div>
        <div className="actions">
          <button onClick={approveAndMoveNext} type="button"><CheckCircle2 size={17} /> {reviewReady ? 'تأكيد الاعتماد والانتقال للمتقدم التالي' : 'عرض الدرجة للمراجعة قبل الانتقال'}</button>
        </div>
      </section>
    </div>
  )
}

function ScoreInput({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="score-input">
      <span>{label} <small>من {max}</small></span>
      <input aria-label={label} inputMode="numeric" min="0" max={max} onChange={(event) => onChange(Math.min(max, Math.max(0, Number(event.target.value))))} type="number" value={value} />
    </label>
  )
}

function YesNoField({ label, name, value, onChange }: { label: string; name: string; value: YesNo; onChange: (value: YesNo) => void }) {
  return (
    <fieldset className="yes-no-field">
      <legend>{label}</legend>
      <label><input checked={value === 'نعم'} name={name} onChange={() => onChange('نعم')} type="radio" /> نعم</label>
      <label><input checked={value === 'لا'} name={name} onChange={() => onChange('لا')} type="radio" /> لا</label>
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
        nationalId: normalizedLookup || form.nationalId,
      })
      return
    }
    setForm({
      nationalId: found.nationalId,
      name: found.name,
      nationality: found.nationality || 'سعودي',
      age: found.age ? String(found.age) : '',
      certificateType: found.certificateType,
      graduationDate: graduationYearOnly(found.graduationDate),
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
            <label>سنة التخرج<input inputMode="numeric" maxLength={4} pattern="[0-9٠-٩۰-۹]{4}" placeholder="مثال: 2026 أو 1447" value={form.graduationDate} onChange={(event) => setForm({ ...form, graduationDate: graduationYearOnly(event.target.value) })} /></label>
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
