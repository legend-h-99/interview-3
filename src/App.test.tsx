import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Interview management system', () => {
  it('shows the operational dashboard with seeded applicants', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'شؤون المتدربين' })).toBeTruthy()
    expect(screen.getAllByText('عبدالله محمد الزهراني').length).toBeGreaterThan(0)
    expect(screen.getAllByText('REQ-2026-0001').length).toBeGreaterThan(0)
    expect(screen.getByText('W-014')).toBeTruthy()
  })

  it('registers a direct applicant from the applicant portal', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية'), '1099999999')
    await user.type(screen.getByLabelText('الاسم الكامل'), 'مازن صالح القحطاني')
    await user.type(screen.getByLabelText('رقم الجوال'), '0557778888')
    await user.type(screen.getByLabelText('المؤهل'), 'ثانوية عامة')
    await user.clear(screen.getByLabelText('المعدل'))
    await user.type(screen.getByLabelText('المعدل'), '96')
    await user.click(screen.getByRole('button', { name: /رفع الوثائق/ }))

    expect(screen.getByText('مازن صالح القحطاني')).toBeTruthy()
    expect(screen.getByText('REQ-2026-0004')).toBeTruthy()
    expect(screen.getByText('بانتظار مراجعة شؤون المتدربين')).toBeTruthy()
  })

  it('prevents duplicate applicant registration by national ID', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'واجهة المتقدم' }))
    await user.type(screen.getByLabelText('رقم الهوية الوطنية'), '1012345678')

    expect(screen.getAllByText('عبدالله محمد الزهراني').length).toBeGreaterThan(0)
    expect(screen.getByText('REQ-2026-0001')).toBeTruthy()
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

  it('assigns a committee and schedules an applicant by department head', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'رئيس القسم' }))
    await user.click(screen.getByText('سلمان فهد المطيري'))
    await user.click(screen.getByRole('button', { name: /لجنة المقابلات الثانية/ }))

    expect(screen.getAllByText('لجنة المقابلات الثانية').length).toBeGreaterThan(0)
    expect(screen.getByText('2026-08-18 11:00')).toBeTruthy()
    expect(screen.getAllByText('بانتظار المقابلة').length).toBeGreaterThan(0)
  })

  it('records committee scores and department approval flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('navigation', { name: 'واجهات النظام' })).getByRole('button', { name: 'لجان المقابلات' }))
    await user.click(screen.getAllByText('عبدالله محمد الزهراني')[0])

    const technical = screen.getByLabelText('المهارة التقنية')
    const communication = screen.getByLabelText('التواصل')
    const motivation = screen.getByLabelText('الدافعية والانضباط')
    fireEvent.change(technical, { target: { value: '90' } })
    fireEvent.change(communication, { target: { value: '80' } })
    fireEvent.change(motivation, { target: { value: '85' } })
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
})
