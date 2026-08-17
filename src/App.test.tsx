import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { computeVisualAnalytics, seedApplicants } from './App'

let apiApplicants = structuredClone(seedApplicants)

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  window.history.pushState({}, '', '/')
  apiApplicants = structuredClone(seedApplicants)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const method = init?.method ?? 'GET'
    if (url === '/api/applicants' && method === 'GET') {
      return jsonResponse({ applicants: apiApplicants })
    }
    if (url === '/api/applicants' && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      const existing = apiApplicants.find((applicant) => applicant.nationalId === body.nationalId)
      if (existing) return jsonResponse({ applicant: existing, duplicate: true })
      const waitingNo = `INT-${String(apiApplicants.filter((applicant) => applicant.waitingNo).length + 1).padStart(3, '0')}`
      const applicant = {
        id: `test-${body.nationalId}`,
        nationalId: body.nationalId,
        requestNo: `REQ-2026-${String(apiApplicants.length + 1).padStart(4, '0')}`,
        waitingNo,
        name: body.name,
        nationality: body.nationality,
        age: Number(body.age),
        certificateType: body.certificateType,
        graduationDate: body.graduationDate,
        phone: body.phone,
        extraPhone: body.extraPhone,
        qualification: body.qualification || body.certificateType,
        gpa: Number(body.gpa || 0),
        source: body.source === 'qobool' ? 'qobool' as const : 'direct' as const,
        status: 'غير محدد' as const,
        documents: [],
        scores: {},
        notes: '',
        audit: [],
      }
      apiApplicants = [applicant, ...apiApplicants]
      return jsonResponse({ applicant }, 201)
    }
    const match = String(url).match(/^\/api\/applicants\/([^/]+)$/)
    if (match && method === 'PATCH') {
      const body = JSON.parse(String(init?.body))
      let updated = apiApplicants.find((applicant) => applicant.id === match[1])
      if (!updated) return jsonResponse({ error: 'not found' }, 404)
      updated = { ...updated, ...body.patch, audit: [body.audit, ...updated.audit].slice(0, 8) }
      apiApplicants = apiApplicants.map((applicant) => applicant.id === updated?.id ? updated : applicant)
      return jsonResponse({ applicant: updated })
    }
    if (url === '/api/reset' && method === 'POST') {
      apiApplicants = structuredClone(seedApplicants)
      return jsonResponse({ applicants: apiApplicants })
    }
    return jsonResponse({ error: 'not found' }, 404)
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Interview management system', () => {
  it('shows the operational dashboard with seeded applicants', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'شؤون المتدربين' })).toBeTruthy()
    expect(screen.getByText('الكلية التقنية للاتصالات والمعلومات · قسم التقنية الخاصة للصم وضعاف السمع')).toBeTruthy()
    expect(screen.getAllByText('عبدالله محمد الزهراني').length).toBeGreaterThan(0)
    expect(screen.getAllByText('REQ-2026-0001').length).toBeGreaterThan(0)
    expect(screen.getByText('W-014')).toBeTruthy()
  })

  it('registers an applicant from the applicant portal', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), '1099999999')
    await user.type(screen.getByLabelText('الاسم الكامل'), 'مازن صالح القحطاني')
    await user.clear(screen.getByLabelText('الجنسية'))
    await user.type(screen.getByLabelText('الجنسية'), 'سعودي')
    await user.type(screen.getByLabelText('العمر'), '٢١ سنة')
    await user.type(screen.getByLabelText('نوع الشهادة'), 'High school / ثانوية عامة')
    await user.type(screen.getByLabelText('سنة التخرج'), '2026')
    await user.type(screen.getByLabelText('رقم الجوال'), '٠٥٥7778888')
    await user.type(screen.getByLabelText('رقم جوال إضافي'), '0557779999')
    await user.click(screen.getByRole('button', { name: /التحقق وإصدار رقم المقابلة/ }))

    expect(await screen.findByText('مازن صالح القحطاني')).toBeTruthy()
    expect(screen.getAllByText(/INT-003/).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('بيانات المتقدم بعد التقديم')).toBeTruthy()
    expect(screen.getByText('مسجل من البوابة')).toBeTruthy()
    expect(screen.queryByText('0557779999')).toBeNull()
    expect(screen.queryByLabelText('أسئلة المقابلة العامة')).toBeNull()
  })

  it('accepts Arabic numerals when issuing a waiting number', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), '١٠٩٩٩٩٩٩٩٨')
    await user.type(screen.getByLabelText('الاسم الكامل'), 'فيصل سالم العتيبي')
    await user.clear(screen.getByLabelText('الجنسية'))
    await user.type(screen.getByLabelText('الجنسية'), 'سعودي')
    await user.type(screen.getByLabelText('العمر'), '21')
    await user.type(screen.getByLabelText('نوع الشهادة'), 'ثانوية عامة')
    await user.type(screen.getByLabelText('سنة التخرج'), '2026')
    await user.type(screen.getByLabelText('رقم الجوال'), '0557778888')
    await user.click(screen.getByRole('button', { name: /التحقق وإصدار رقم المقابلة/ }))

    expect(await screen.findByLabelText('بيانات المتقدم بعد التقديم')).toBeTruthy()
    expect(screen.getByText('فيصل سالم العتيبي')).toBeTruthy()
    expect(screen.getAllByText(/INT-003/).length).toBeGreaterThan(0)
  })

  it('lets an imported applicant continue registration and then shows the waiting card', async () => {
    const user = userEvent.setup()
    const importedApplicant = seedApplicants.find((applicant) => applicant.id.startsWith('accepted-') && !applicant.waitingNo)
    expect(importedApplicant).toBeTruthy()
    window.history.pushState({}, '', '/?view=applicant')
    render(<App />)

    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), importedApplicant?.nationalId ?? '')

    expect(await screen.findByRole('button', { name: /متابعة وإصدار رقم الانتظار/ })).toBeTruthy()
    expect((screen.getByLabelText('الاسم الكامل') as HTMLInputElement).value).toBe(importedApplicant?.name)
    expect(screen.queryByLabelText('بيانات المتقدم بعد التقديم')).toBeNull()

    await user.clear(screen.getByLabelText('العمر'))
    await user.type(screen.getByLabelText('العمر'), '21')
    await user.type(screen.getByLabelText('سنة التخرج'), '2026')
    await user.type(screen.getByLabelText('رقم جوال إضافي'), '0557770000')
    await user.click(screen.getByRole('button', { name: /متابعة وإصدار رقم الانتظار/ }))

    expect(await screen.findByLabelText('بيانات المتقدم بعد التقديم')).toBeTruthy()
    expect(screen.getByText(importedApplicant?.name ?? '')).toBeTruthy()
    expect(screen.getAllByText(/INT-003/).length).toBeGreaterThan(0)
    expect(screen.getByText('مسجل من البوابة')).toBeTruthy()
    expect(screen.queryByLabelText('الاسم الكامل')).toBeNull()
    expect(screen.queryByText('0557770000')).toBeNull()
  })

  it('opens the applicant portal directly from a dedicated link', () => {
    window.history.pushState({}, '', '/?view=applicant')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'بوابة المتقدمين' })).toBeTruthy()
    expect(screen.getByLabelText('رقم الهوية الوطنية أو الاسم')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'شؤون المتدربين' })).toBeNull()
  })

  it('opens internal pages directly from the role query parameter', () => {
    window.history.pushState({}, '', '/?role=head')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'رئيس القسم' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'رئيس القسم' }).className).toContain('active')
  })

  it('shows visual analytics in the college dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'إدارة الكلية' }))

    expect(screen.getByLabelText('الرسوم والمؤشرات')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'توزيع حالات الطلبات' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'توزيع النتائج' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'متوسطات التقييم' })).toBeTruthy()
  })

  it('computes visual analytics distributions and score averages', () => {
    const analytics = computeVisualAnalytics(seedApplicants)

    expect(analytics.status.reduce((total, item) => total + item.value, 0)).toBe(seedApplicants.length)
    expect(analytics.results.reduce((total, item) => total + item.value, 0)).toBe(seedApplicants.length)
    expect(analytics.committees.reduce((total, item) => total + item.value, 0)).toBe(seedApplicants.length)
    expect(analytics.scores.find((item) => item.label === 'المجموع')?.max).toBe(50)
  })

  it('starts applicants without grades, evaluations, or workflow statuses', () => {
    for (const applicant of seedApplicants) {
      expect(applicant.status).toBe('غير محدد')
      expect(applicant.finalResult).toBeUndefined()
      expect(applicant.notes).toBe('')
      expect(applicant.documents).toHaveLength(0)
      expect(applicant.audit).toHaveLength(0)
      expect(Object.values(applicant.scores).every((value) => {
        if (Array.isArray(value)) return value.every((score) => score === 0)
        return value === 0 || value === ''
      })).toBe(true)
    }
  })

  it('exports applicants and college identity to a CSV file', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:interview-3-export')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'إدارة الكلية' }))
    await user.selectOptions(screen.getByLabelText('مسؤول إدارة الكلية'), '2')
    expect(screen.getByRole('button', { name: 'XLSX' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PPTX' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'PDF' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'CSV' }))

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    const blob = createObjectUrl.mock.calls.at(0)?.at(0) as unknown as Blob
    const csv = await blob.text()
    expect(csv).toContain('الكلية التقنية للاتصالات والمعلومات')
    expect(csv).toContain('قسم التقنية الخاصة للصم وضعاف السمع')
    expect(csv).toContain('وكيل الجودة: عبدالرحمن المالكي')
    expect(csv).toContain('محمد الرميح')
    expect(csv).toContain('رئيس القسم / رئيس اللجنة')
    expect(csv).toContain('رائد الغفيلي')
    expect(csv).toContain('30487')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:interview-3-export')
  })

  it('exports applicants and college identity to a real XLSX file', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:interview-3-xlsx')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'إدارة الكلية' }))
    await user.click(screen.getByRole('button', { name: 'XLSX' }))

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    const blob = createObjectUrl.mock.calls.at(0)?.at(0) as unknown as Blob
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:interview-3-xlsx')
  })

  it('opens a printable PDF report with college identity and selected manager', async () => {
    const user = userEvent.setup()
    const write = vi.fn()
    const close = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close },
    } as unknown as Window)
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'إدارة الكلية' }))
    await user.selectOptions(screen.getByLabelText('مسؤول إدارة الكلية'), '1')
    await user.click(screen.getByRole('button', { name: 'PDF' }))

    expect(window.open).toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith(expect.stringContaining('تقرير interview 3'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('الرسوم والمؤشرات'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('توزيع حالات الطلبات'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('متوسطات التقييم'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('الكلية التقنية للاتصالات والمعلومات'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('قسم التقنية الخاصة للصم وضعاف السمع'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('وكيل التدريب: أحمد الطلحي'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('محمد الرميح'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('موسى عبدالرحيم الأنصاري'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('المنصة الإلكترونية للفرز'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('عبدالله محمد الزهراني'))
    expect(close).toHaveBeenCalled()
  })

  it('persists applicant portal registration into the internal pages', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?view=applicant')
    const { unmount } = render(<App />)

    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), '1088888888')
    await user.type(screen.getByLabelText('الاسم الكامل'), 'تركي ناصر الحربي')
    await user.clear(screen.getByLabelText('الجنسية'))
    await user.type(screen.getByLabelText('الجنسية'), 'سعودي')
    await user.type(screen.getByLabelText('العمر'), '20')
    await user.type(screen.getByLabelText('نوع الشهادة'), 'ثانوية عامة')
    await user.type(screen.getByLabelText('سنة التخرج'), '2026')
    await user.type(screen.getByLabelText('رقم الجوال'), '0551112222')
    await user.type(screen.getByLabelText('رقم جوال إضافي'), '0551113333')
    await user.click(screen.getByRole('button', { name: /التحقق وإصدار رقم المقابلة/ }))

    expect(await screen.findByText('تركي ناصر الحربي')).toBeTruthy()
    expect(screen.getAllByText(/INT-003/).length).toBeGreaterThan(0)
    expect(screen.getByText('مسجل من البوابة')).toBeTruthy()
    expect(screen.getByLabelText('بيانات المتقدم بعد التقديم')).toBeTruthy()
    expect(screen.queryByText('0551113333')).toBeNull()

    unmount()
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'شؤون المتدربين' })).toBeTruthy()
    expect(await screen.findByText('تركي ناصر الحربي')).toBeTruthy()
    expect(screen.getByText('REQ-2026-0034')).toBeTruthy()

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'إدارة الكلية' }))
    expect(screen.getByText('تركي ناصر الحربي')).toBeTruthy()

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    expect(screen.getByText('تركي ناصر الحربي')).toBeTruthy()
  })

  it('does not show public visual analytics in the applicant-only page', () => {
    window.history.pushState({}, '', '/?view=applicant')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'بوابة المتقدمين' })).toBeTruthy()
    expect(screen.queryByLabelText('الرسوم والمؤشرات')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'توزيع حالات الطلبات' })).toBeNull()
  })

  it('accepts a free-form applicant identity from the lookup field', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/?view=applicant')
    render(<App />)

    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), 'ID-ABC-١٢٣')
    expect((screen.getByLabelText('رقم الهوية') as HTMLInputElement).value).toBe('ID-ABC-123')
  })

  it('prevents duplicate applicant registration by national ID', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), '1012345678')

    expect(screen.getAllByText('عبدالله محمد الزهراني').length).toBeGreaterThan(0)
    expect(screen.getByText('W-014')).toBeTruthy()
    expect(screen.getByText('مسجل من البوابة')).toBeTruthy()
    expect(screen.getByLabelText('بيانات المتقدم بعد التقديم')).toBeTruthy()
    expect(screen.queryByText('REQ-2026-0001')).toBeNull()
    expect(screen.queryByLabelText('الاسم الكامل')).toBeNull()
  })

  it('approves documents and issues a waiting number from trainee affairs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('سلمان فهد المطيري'))
    await user.click(screen.getByRole('button', { name: /اعتماد الوثائق/ }))

    expect(screen.getAllByText('تم إصدار رقم الانتظار').length).toBeGreaterThan(0)
    expect(screen.getByText('W-017')).toBeTruthy()
  })

  it('shows a dedicated report for portal applicants who did not attend interviews', async () => {
    const user = userEvent.setup()
    const write = vi.fn()
    const close = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close },
    } as unknown as Window)
    const portalApplicant = seedApplicants.find((applicant) => applicant.source === 'qobool')
    expect(portalApplicant).toBeTruthy()
    render(<App />)

    await user.click(screen.getAllByText(portalApplicant?.name ?? '')[0])
    await user.click(screen.getByRole('button', { name: /تسجيل لم يحضر/ }))
    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لم يحضروا المقابلة' }))

    expect(screen.getByRole('heading', { name: 'تقرير المسجلين من البوابة ولم يحضروا' })).toBeTruthy()
    expect(screen.getByText(portalApplicant?.name ?? '')).toBeTruthy()
    expect(screen.getByText('يعرض هذا التقرير فقط المتقدمين المسجلين من البوابة وحالتهم: معتذر أو لم يحضر.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'XLSX' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'CSV' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'PPTX' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'PDF' }).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: 'PDF' }).at(-1) as HTMLElement)

    expect(window.open).toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith(expect.stringContaining('تقرير المسجلين من البوابة ولم يحضروا المقابلة'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining(portalApplicant?.name ?? ''))
    expect(close).toHaveBeenCalled()
  })

  it('assigns a committee and schedules an applicant by department head', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    await user.click(screen.getByText('سلمان فهد المطيري'))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة'), '2')
    expect(screen.getByLabelText(/موسى عبدالرحيم الأنصاري/)).toBeTruthy()
    expect(screen.getByLabelText(/عبدالله محمد الفيفي/)).toBeTruthy()
    await user.click(screen.getByLabelText(/خالد عبدالعزيز المديفر/))
    await user.click(screen.getByLabelText(/حسين صالح آل سنان/))
    await user.selectOptions(screen.getByLabelText('اختيار مترجم اختياري'), 's10')
    await user.click(screen.getByRole('button', { name: 'تثبيت اللجنة والمدربين' }))

    expect(screen.getAllByText('لجنة 2').length).toBeGreaterThan(0)
    expect(screen.getByText('خالد عبدالعزيز المديفر، حسين صالح آل سنان')).toBeTruthy()
    expect(screen.getAllByText('عبدالله محمد الفيفي').length).toBeGreaterThan(0)
    expect(screen.getByText('2026-08-18 11:00')).toBeTruthy()
    expect(screen.getAllByText('بانتظار المقابلة').length).toBeGreaterThan(0)
  })

  it('records committee scores, approves immediately, and moves to the next applicant', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    const applicantSelect = screen.getByLabelText('اختيار المتقدم للمقابلة')
    expect(applicantSelect).toBeTruthy()
    expect(within(applicantSelect).getByRole('option', { name: /رائد علي الشهري/ })).toBeTruthy()
    expect(within(applicantSelect).getByRole('option', { name: /سلمان فهد المطيري/ })).toBeTruthy()
    expect(screen.getByLabelText(/خالد عبدالعزيز المديفر/)).toBeTruthy()
    await user.click(screen.getByLabelText(/خالد عبدالعزيز المديفر/))
    await user.selectOptions(screen.getByLabelText('اختيار مترجم المقابلة اختياري'), 's10')
    expect(screen.getByText('سالم سعيد الشمري')).toBeTruthy()
    expect(screen.getAllByText('خالد عبدالعزيز المديفر').length).toBeGreaterThan(0)
    expect(screen.getByText('27548')).toBeTruthy()
    expect(screen.getAllByText(/31067/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('لجنة 1').length).toBeGreaterThan(0)
    await user.selectOptions(applicantSelect, 'a1')
    expect(screen.getByLabelText('المتقدم المختار للمقابلة')).toBeTruthy()
    expect(screen.queryByText('سلمان فهد المطيري')).toBeNull()
    expect(screen.getByText('عبدالله محمد الفيفي')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('الإشارة'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('المظهر العام'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('سرعة الاستجابة للتعليمات'), { target: { value: '4' } })
    let questionInputs = screen.getAllByLabelText(/درجة السؤال/) as HTMLInputElement[]
    expect(questionInputs[1].disabled).toBe(true)
    fireEvent.change(questionInputs[0], { target: { value: '3' } })
    questionInputs = screen.getAllByLabelText(/درجة السؤال/) as HTMLInputElement[]
    expect(questionInputs[1].disabled).toBe(false)
    for (const input of questionInputs.slice(1)) {
      fireEvent.change(input, { target: { value: '3' } })
    }
    await user.click(screen.getAllByRole('radio', { name: 'لا' })[0])
    await user.click(screen.getAllByRole('radio', { name: 'نعم' })[2])
    expect(within(screen.getByRole('group', { name: 'هل يوجد صعوبة او إعاقة مصاحبة قد تؤثر على التدريب' })).getByRole('radio', { name: 'لا' })).toHaveProperty('checked', true)
    expect(within(screen.getByRole('group', { name: 'هل يتقن لغة الإشارة' })).getByRole('radio', { name: 'نعم' })).toHaveProperty('checked', true)
    fireEvent.change(screen.getByPlaceholderText('ملاحظات المقيم'), { target: { value: 'مرشح مناسب للقسم.' } })
    expect(within(screen.getByRole('group', { name: 'هل يوجد صعوبة او إعاقة مصاحبة قد تؤثر على التدريب' })).getByRole('radio', { name: 'لا' })).toHaveProperty('checked', true)
    expect(within(screen.getByRole('group', { name: 'هل يتقن لغة الإشارة' })).getByRole('radio', { name: 'نعم' })).toHaveProperty('checked', true)
    expect(within(screen.getByLabelText('درجة المتقدم الحالية')).getByText('45 / 50')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /عرض الدرجة للمراجعة قبل الانتقال/ }))
    expect(screen.getByText('الدرجة جاهزة للمراجعة: 45 من 50')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /تأكيد الاعتماد والانتقال للمتقدم التالي/ }))

    expect(screen.queryByRole('heading', { level: 2, name: 'عبدالله محمد الزهراني' })).toBeNull()
    expect(await screen.findByText('تم حفظ التقييم النهائي بنجاح.')).toBeTruthy()
    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    await user.click(screen.getAllByText('عبدالله محمد الزهراني')[0])
    const detailsPanel = screen.getByRole('heading', { level: 2, name: 'عبدالله محمد الزهراني' }).closest('.panel')
    expect(detailsPanel).toBeTruthy()
    expect(within(detailsPanel as HTMLElement).getByText('النتيجة معتمدة')).toBeTruthy()
    expect(within(detailsPanel as HTMLElement).getByText('مرشح مناسب للقسم.')).toBeTruthy()
    expect(within(detailsPanel as HTMLElement).getByText('45 من 50')).toBeTruthy()
  })

  it('moves to the next applicant without waiting for the final save response', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    await user.selectOptions(screen.getByLabelText('اختيار المتقدم للمقابلة'), 'a1')
    fireEvent.change(screen.getByLabelText('الإشارة'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('المظهر العام'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('سرعة الاستجابة للتعليمات'), { target: { value: '4' } })
    for (const input of screen.getAllByLabelText(/درجة السؤال/)) {
      fireEvent.change(input, { target: { value: '3' } })
    }
    await user.click(screen.getByRole('button', { name: /عرض الدرجة للمراجعة قبل الانتقال/ }))

    const fetchMock = vi.mocked(fetch)
    const fallbackFetch = fetchMock.getMockImplementation()
    fetchMock.mockImplementation(async (input, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      if (init?.method === 'PATCH' && String(body.audit ?? '').includes('اعتماد تقييم المدرب')) {
        return new Promise<Response>(() => undefined)
      }
      if (!fallbackFetch) throw new Error('fetch mock missing')
      return fallbackFetch(input, init)
    })

    await user.click(screen.getByRole('button', { name: /تأكيد الاعتماد والانتقال للمتقدم التالي/ }))

    expect(screen.getByLabelText('المتقدم المختار للمقابلة').textContent).not.toContain('عبدالله محمد الزهراني')
    expect(screen.getByText('تم الانتقال للمتقدم التالي، وجارٍ حفظ التقييم النهائي...')).toBeTruthy()
  })

  it('blocks interview approval until question scores are complete', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    await user.selectOptions(screen.getByLabelText('اختيار المتقدم للمقابلة'), 'a1')
    fireEvent.change(screen.getByLabelText('الإشارة'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('المظهر العام'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('سرعة الاستجابة للتعليمات'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('درجة السؤال 1'), { target: { value: '3' } })

    await user.click(screen.getByRole('button', { name: /عرض الدرجة للمراجعة قبل الانتقال/ }))

    expect(await screen.findByText(/سجل درجة السؤال/)).toBeTruthy()
    expect(screen.getByLabelText('المتقدم المختار للمقابلة').textContent).toContain('عبدالله محمد الزهراني')
    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    await user.click(screen.getAllByText('عبدالله محمد الزهراني')[0])
    const detailsPanel = screen.getByRole('heading', { level: 2, name: 'عبدالله محمد الزهراني' }).closest('.panel')
    expect(detailsPanel).toBeTruthy()
    expect(within(detailsPanel as HTMLElement).queryByText('النتيجة معتمدة')).toBeNull()
  })

  it('lets the committee edit applicant data before approving', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    await user.selectOptions(screen.getByLabelText('اختيار المتقدم للمقابلة'), 'a1')
    const editor = screen.getByLabelText('تعديل بيانات المتقدم من اللجنة')

    await user.clear(within(editor).getByLabelText('الاسم الكامل'))
    await user.type(within(editor).getByLabelText('الاسم الكامل'), 'عبدالله محمد الزهراني المعدل')
    await user.clear(within(editor).getByLabelText('رقم الجوال'))
    await user.type(within(editor).getByLabelText('رقم الجوال'), '0550001111')
    await user.click(screen.getByRole('button', { name: /حفظ تعديل البيانات/ }))

    expect(await screen.findByRole('heading', { level: 2, name: 'عبدالله محمد الزهراني المعدل' })).toBeTruthy()
    expect(screen.getByText('0550001111')).toBeTruthy()
  })

  it('shows plain score inputs and hides document, answer, and audit blocks in the interview page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    await user.selectOptions(screen.getByLabelText('اختيار المتقدم للمقابلة'), 'a1')

    expect(screen.queryByRole('heading', { name: 'الوثائق' })).toBeNull()
    expect(screen.queryByLabelText('أسئلة المقابلة العامة')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'سجل التدقيق' })).toBeNull()
    expect(screen.queryByText(/الإجابة:/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'معلومات عامة' })).toBeTruthy()
    expect(screen.getByText(/ما هو الحرف الكبير/)).toBeTruthy()
    expect(screen.getAllByLabelText(/درجة السؤال/)).toHaveLength(5)
  })
})
