import type { UseFormReturn } from 'react-hook-form'
import type { Step2Data } from '@equiscore/shared'

interface Props {
  form: UseFormReturn<Step2Data>
}

const inputClass =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

const RESIDENCY_OPTIONS = [
  { value: 'british_citizen', label: 'British citizen' },
  { value: 'settled_status', label: 'Settled status (ILR / EU settled)' },
  { value: 'pre_settled_status', label: 'Pre-settled status' },
  { value: 'student_visa', label: 'Student visa' },
  { value: 'work_visa', label: 'Work visa (Skilled Worker / other)' },
  { value: 'refugee', label: 'Refugee status' },
  { value: 'asylum_seeker', label: 'Asylum seeker' },
  { value: 'other', label: 'Other' },
]

export function Step2Address({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Your UK status and address</h2>
        <p className="text-sm text-content-secondary">
          This helps us understand your situation and tailor your profile.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">UK residency status</label>
        <select
          {...register('residencyStatus')}
          className={inputClass}
        >
          <option value="">Select your status</option>
          {RESIDENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {errors.residencyStatus && (
          <p className="mt-1 text-xs text-danger-strong">{errors.residencyStatus.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">
          When did you move to the UK? <span className="text-content-muted">(optional)</span>
        </label>
        <input
          {...register('ukMoveDate')}
          type="month"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">Address line 1</label>
        <input
          {...register('addressLine1')}
          placeholder="e.g. 42 Highfield Road"
          className={inputClass}
        />
        {errors.addressLine1 && (
          <p className="mt-1 text-xs text-danger-strong">{errors.addressLine1.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">
          Address line 2 <span className="text-content-muted">(optional)</span>
        </label>
        <input
          {...register('addressLine2')}
          placeholder="Flat / apartment number"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-content">City</label>
          <input
            {...register('city')}
            placeholder="e.g. London"
            className={inputClass}
          />
          {errors.city && <p className="mt-1 text-xs text-danger-strong">{errors.city.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-content">Postcode</label>
          <input
            {...register('postcode')}
            placeholder="e.g. E1 6AN"
            className={`${inputClass} uppercase`}
          />
          {errors.postcode && <p className="mt-1 text-xs text-danger-strong">{errors.postcode.message}</p>}
        </div>
      </div>
    </div>
  )
}
