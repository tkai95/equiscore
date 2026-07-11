/**
 * EquiScore shared UI primitives (Phase 1 of the consolidation pass).
 *
 * Feature screens should compose these rather than re-inventing card borders,
 * radii, shadows, buttons, status colours or heading sizes with arbitrary
 * Tailwind classes.
 */

export {
  Card,
  CardHeader,
  CardBody,
  Section,
  Divider,
  InsetPanel,
  InteractiveRow,
  MetricGroup,
  Metric,
  MetricCard,
} from './surfaces'
export { Button, buttonClasses, type ButtonProps, type ButtonVariant, type ButtonSize } from './button'
export { StatusPill, type StatusTone } from './status-pill'
export {
  Display,
  PageTitle,
  SectionTitle,
  CardTitle,
  Eyebrow,
  BodyText,
  SupportingText,
  MetricValue,
  MetricLabel,
} from './typography'
export { PageLayout, PageHeader, PageContent } from './page'
export { Drawer } from './drawer'
export { InfoTooltip } from './info-tooltip'
