import { lazy, type ComponentType } from 'react'
import type { TemplateStyleId } from '@/entities/theme/theme'
import type { TemplateProps } from './types'

/**
 * The page templates, by style id. Each is its own chunk: a public menu downloads the one template its owner chose, and the
 * Design gallery the rest when it opens. A template exports `Template` from `./<id>/Template`.
 */
export const TEMPLATES: Readonly<Record<TemplateStyleId, ComponentType<TemplateProps>>> = {
  daybreak: lazy(() => import('./daybreak/Template').then((module) => ({ default: module.Template }))),
  beanhouse: lazy(() => import('./beanhouse/Template').then((module) => ({ default: module.Template }))),
  marmalade: lazy(() => import('./marmalade/Template').then((module) => ({ default: module.Template }))),
  sandstone: lazy(() => import('./sandstone/Template').then((module) => ({ default: module.Template }))),
  drip: lazy(() => import('./drip/Template').then((module) => ({ default: module.Template }))),
  nightglass: lazy(() => import('./nightglass/Template').then((module) => ({ default: module.Template }))),
  lightbox: lazy(() => import('./lightbox/Template').then((module) => ({ default: module.Template }))),
}
