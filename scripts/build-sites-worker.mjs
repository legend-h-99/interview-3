import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
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
const workerSource = `
const files = new Map(${JSON.stringify(files.map((file) => [file.path, file]))});

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
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
