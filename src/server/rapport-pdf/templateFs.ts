import fs from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'

import { type PublicationFile } from './types'

type TemplatesRoots = {
  templatesRoot: string
  publicRoot: string
}

function firstExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // ignore
    }
  }
  return null
}

export function resolveTemplatesRoots(): TemplatesRoots {
  const cwd = process.cwd()

  const templatesRoot = firstExistingPath([
    path.join(cwd, 'apps', 'quiz', 'public', 'report-templates'),
    path.join(cwd, 'public', 'report-templates'),
  ])

  const publicRoot = firstExistingPath([
    path.join(cwd, 'apps', 'quiz', 'public'),
    path.join(cwd, 'public'),
  ])

  if (!templatesRoot || !publicRoot) {
    throw new Error(
      `[RAPPORT_PDF_TEMPLATES_ROOT_NOT_FOUND] Could not locate templates/public folders. ` +
        `Tried templatesRoot=[apps/quiz/public/report-templates, public/report-templates] and publicRoot=[apps/quiz/public, public]. cwd=${cwd}`
    )
  }

  return { templatesRoot, publicRoot }
}

export function getProfileTemplateHtmlDir(profileCode: string): string {
  const { templatesRoot } = resolveTemplatesRoots()
  return path.join(templatesRoot, profileCode, 'publication-web-resources', 'html')
}

export function getProfileTemplateCssPath(profileCode: string): string {
  const { templatesRoot } = resolveTemplatesRoots()
  return path.join(
    templatesRoot,
    profileCode,
    'publication-web-resources',
    'css',
    'idGeneratedStyles.css'
  )
}

export async function readProfileTemplateCss(profileCode: string): Promise<{ css: string; cssPath: string }> {
  const cssPath = getProfileTemplateCssPath(profileCode)
  const css = await readFile(cssPath, 'utf8')
  return { css, cssPath }
}

export function getProfilePublicationFilePath(profileCode: string, file: PublicationFile): string {
  return path.join(getProfileTemplateHtmlDir(profileCode), file)
}

export async function readProfilePublicationFile(
  profileCode: string,
  file: PublicationFile
): Promise<{ html: string; htmlPath: string }> {
  const htmlPath = getProfilePublicationFilePath(profileCode, file)
  const html = await readFile(htmlPath, 'utf8')
  return { html, htmlPath }
}

export async function readReportPrintCss(): Promise<{ css: string; cssPath: string }> {
  const { publicRoot } = resolveTemplatesRoots()
  const cssPath = path.join(publicRoot, 'report-print.css')
  const css = await readFile(cssPath, 'utf8')
  return { css, cssPath }
}

export function resolvePublicAssetPath(publicPathname: string): string {
  const { publicRoot } = resolveTemplatesRoots()
  const stripped = publicPathname.replace(/^\//, '')
  return path.join(publicRoot, stripped)
}
