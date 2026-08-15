import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { seedApplicants } from './App'

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
        source: 'direct' as const,
        status: 'تم إصدار رقم الانتظار' as const,
        documents: [
          { name: 'الهوية الوطنية', status: 'بانتظار المراجعة' as const },
          { name: 'الشهادة الدراسية', status: 'بانتظار المراجعة' as const },
          { name: 'نموذج الإقرار', status: 'معتمد' as const },
        ],
        scores: { technical: 0, communication: 0, motivation: 0 },
        notes: '',
        audit: [`إنشاء طلب جديد وإصدار رقم مقابلة ${waitingNo}`],
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

  it('registers a direct applicant from the applicant portal', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), '1099999999')
    await user.type(screen.getByLabelText('الاسم الكامل'), 'مازن صالح القحطاني')
    await user.clear(screen.getByLabelText('الجنسية'))
    await user.type(screen.getByLabelText('الجنسية'), 'سعودي')
    await user.type(screen.getByLabelText('العمر'), '21')
    await user.type(screen.getByLabelText('نوع الشهادة'), 'ثانوية عامة')
    await user.type(screen.getByLabelText('تاريخ التخرج'), '2026-06-20')
    await user.type(screen.getByLabelText('رقم الجوال'), '0557778888')
    await user.type(screen.getByLabelText('رقم جوال إضافي'), '0557779999')
    await user.click(screen.getByRole('button', { name: /التحقق وإصدار رقم المقابلة/ }))

    expect(await screen.findByText('مازن صالح القحطاني')).toBeTruthy()
    expect(screen.getByText('REQ-2026-0034')).toBeTruthy()
    expect(screen.getByText('0557779999')).toBeTruthy()
    expect(screen.getAllByText(/INT-003/).length).toBeGreaterThan(0)
    expect(screen.getByText('تم إصدار رقم الانتظار')).toBeTruthy()
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

  it('exports applicants and college identity to an Excel-compatible CSV file', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:interview-3-export')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'إدارة الكلية' }))
    await user.selectOptions(screen.getByLabelText('مسؤول إدارة الكلية'), '2')
    await user.click(screen.getByRole('button', { name: /تصدير Excel/ }))

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
    await user.click(screen.getByRole('button', { name: /تقرير PDF/ }))

    expect(window.open).toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith(expect.stringContaining('تقرير interview 3'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('الكلية التقنية للاتصالات والمعلومات'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('قسم التقنية الخاصة للصم وضعاف السمع'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('وكيل التدريب: أحمد الطلحي'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('محمد الرميح'))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('حسام الدين عثمان مسملي'))
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
    await user.type(screen.getByLabelText('تاريخ التخرج'), '2026-05-30')
    await user.type(screen.getByLabelText('رقم الجوال'), '0551112222')
    await user.type(screen.getByLabelText('رقم جوال إضافي'), '0551113333')
    await user.click(screen.getByRole('button', { name: /التحقق وإصدار رقم المقابلة/ }))

    expect(await screen.findByText('تركي ناصر الحربي')).toBeTruthy()
    expect(screen.getByText('REQ-2026-0034')).toBeTruthy()
    expect(screen.getAllByText(/INT-003/).length).toBeGreaterThan(0)

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

  it('prevents duplicate applicant registration by national ID', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية أو الاسم'), '1012345678')

    expect(screen.getAllByText('عبدالله محمد الزهراني').length).toBeGreaterThan(0)
    expect(screen.getByText('REQ-2026-0001')).toBeTruthy()
    expect(screen.getByLabelText('الاسم الكامل')).toBeTruthy()
  })

  it('approves documents and issues a waiting number from trainee affairs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('سلمان فهد المطيري'))
    await user.click(screen.getByRole('button', { name: /اعتماد الوثائق/ }))

    expect(screen.getAllByText('تم إصدار رقم الانتظار').length).toBeGreaterThan(0)
    expect(screen.getByText('W-017')).toBeTruthy()
  })

  it('assigns a committee and schedules an applicant by department head', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    await user.click(screen.getByText('سلمان فهد المطيري'))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة'), '2')
    await user.click(screen.getByLabelText(/خالد عبدالعزيز المديفر/))
    await user.click(screen.getByLabelText(/حسين صالح آل سنان/))
    await user.selectOptions(screen.getByLabelText('اختيار مترجم اختياري'), 's10')
    await user.click(screen.getByRole('button', { name: 'تثبيت اللجنة والمدربين' }))

    expect(screen.getAllByText('لجنة 2').length).toBeGreaterThan(0)
    expect(screen.getByText('خالد عبدالعزيز المديفر، حسين صالح آل سنان')).toBeTruthy()
    expect(screen.getByText('عبدالله محمد الفيفي')).toBeTruthy()
    expect(screen.getByText('2026-08-18 11:00')).toBeTruthy()
    expect(screen.getAllByText('بانتظار المقابلة').length).toBeGreaterThan(0)
  })

  it('records committee scores and department approval flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    expect(screen.getByLabelText(/خالد عبدالعزيز المديفر/)).toBeTruthy()
    await user.click(screen.getByLabelText(/خالد عبدالعزيز المديفر/))
    await user.selectOptions(screen.getByLabelText('اختيار مترجم المقابلة اختياري'), 's10')
    expect(screen.getByText('سالم سعيد الشمري')).toBeTruthy()
    expect(screen.getByText('خالد عبدالعزيز المديفر')).toBeTruthy()
    expect(screen.getByText('27548')).toBeTruthy()
    expect(screen.getAllByText(/31067/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('لجنة 1').length).toBeGreaterThan(0)
    expect(screen.getByText('عبدالله محمد الفيفي')).toBeTruthy()
    await user.click(screen.getAllByText('عبدالله محمد الزهراني')[0])

    fireEvent.change(screen.getByLabelText('الإشارة'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('المظهر العام'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('سرعة الاستجابة للتعليمات'), { target: { value: '4' } })
    for (const input of screen.getAllByLabelText(/درجة السؤال/)) {
      fireEvent.change(input, { target: { value: '3' } })
    }
    await user.click(screen.getAllByRole('radio', { name: 'لا' })[0])
    await user.click(screen.getAllByRole('radio', { name: 'نعم' })[2])
    await user.type(screen.getByPlaceholderText('ملاحظات المقيم'), 'مرشح مناسب للقسم.')
    await user.click(screen.getByRole('button', { name: /اعتماد تقييم المتقدم/ }))

    expect(screen.getAllByText('بانتظار اعتماد رئيس القسم').length).toBeGreaterThan(0)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    const detailsPanel = screen.getByRole('heading', { level: 2, name: 'عبدالله محمد الزهراني' }).closest('.panel')
    expect(detailsPanel).toBeTruthy()
    expect(within(detailsPanel as HTMLElement).getByText('مرشح مناسب للقسم.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /اعتماد النتيجة النهائية/ }))

    expect(screen.getAllByText('النتيجة معتمدة').length).toBeGreaterThan(0)
  })

  it('shows fixed math and English interview questions for the selected applicant', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.selectOptions(screen.getByLabelText('اختيار اللجنة في المقابلات'), '1')
    await user.click(screen.getAllByText('عبدالله محمد الزهراني')[0])

    const questions = screen.getByLabelText('أسئلة المقابلة العامة')
    expect(within(questions).getByText(/معلومات عامة:/)).toBeTruthy()
    expect(within(questions).getAllByText(/رياضيات/).length).toBeGreaterThan(0)
    expect(within(questions).getAllByText(/إنجليزي/).length).toBeGreaterThan(0)
    expect(within(questions).getByText(/ما هو الحرف الكبير/)).toBeTruthy()
    expect(within(questions).getAllByText(/الإجابة:/)).toHaveLength(5)
  })
})
