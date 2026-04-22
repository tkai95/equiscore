import type { UseFormReturn } from 'react-hook-form'
import type { Step2Data } from '@equiscore/shared'

interface Props {
  form: UseFormReturn<Step2Data>
}

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
        <h2 className="text-lg font-semibold text-gray-900">Your UK status and address</h2>
        <p className="text-sm text-gray-500">
          This helps us understand your situation and tailor your profile.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">UK residency status</label>
        <select
          {...register('residencyStatus')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Select your status</option>
          {RESIDENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {errors.residencyStatus && (
          <p className="mt-1 text-xs text-red-600">{errors.residencyStatus.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          When did you move to the UK? <span className="text-gray-400">(optional)</span>
        </label>
        <input
          {...register('ukMoveDate')}
          type="month"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Address line 1</label>
        <input
          {...register('addressLine1')}
          placeholder="e.g. 42 Highfield Road"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {errors.addressLine1 && (
          <p className="mt-1 text-xs text-red-600">{errors.addressLine1.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Address line 2 <span className="text-gray-400">(optional)</span>
        </label>
        <input
          {...register('addressLine2')}
          placeholder="Flat / apartment number"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
          <input
            {...register('city')}
            placeholder="e.g. London"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Postcode</label>
          <input
            {...register('postcode')}
            placeholder="e.g. E1 6AN"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.postcode && <p className="mt-1 text-xs text-red-600">{errors.postcode.message}</p>}
        </div>
      </div>
    </div>
  )
}
