import { readFile, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('../data/accepted-applicants.md', import.meta.url)
const outputUrl = new URL('../src/data/acceptedApplicants.json', import.meta.url)

const markdown = await readFile(sourceUrl, 'utf8')
const rows = markdown
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('رقم الهوية'))

const applicants = rows.map((row) => {
  const cells = row
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean)

  const [
    nationalId,
    name,
    phone,
    organization,
    major,
    program,
    preferenceNo,
    admissionStatus,
  ] = cells

  return {
    nationalId,
    name,
    phone,
    organization,
    major,
    program,
    preferenceNo,
    admissionStatus,
  }
})

if (applicants.length === 0) {
  throw new Error('No accepted applicants were parsed from data/accepted-applicants.md')
}

const invalidRows = applicants.filter((item) => !item.nationalId || !item.name || !item.phone)
if (invalidRows.length > 0) {
  throw new Error(`Invalid accepted applicant rows: ${invalidRows.length}`)
}

await writeFile(outputUrl, `${JSON.stringify(applicants, null, 2)}\n`)
console.log(`Imported ${applicants.length} accepted applicants into src/data/acceptedApplicants.json`)
