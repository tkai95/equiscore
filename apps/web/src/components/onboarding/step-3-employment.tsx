import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import type { Step3Data } from '@equiscore/shared'

interface Props {
  form: UseFormReturn<Step3Data>
}

const EMPLOYMENT_OPTIONS = [
  { value: 'employed_full_time', label: 'Employed full-time' },
  { value: 'employed_part_time', label: 'Employed part-time' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'gig_worker', label: 'Gig / platform worker' },
  { value: 'student', label: 'Student' },
  { value: 'graduate', label: 'Recent graduate' },
  { value: 'unemployed', label: 'Currently not employed' },
  { value: 'other', label: 'Other' },
]

export function Step3Employment({ form }: Props) {
  const { register, control, formState: { errors } } = form
  const employmentType = useWatch({ control, name: 'employmentType' })
  const showEmployerFields = ['employed_full_time', 'employed_part_time'].includes(employmentType ?? '')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Work and income</h2>
        <p className="text-sm text-gray-500">
          Tell us how you earn. All types of income are welcome.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Employment type</label>
        <select
          {...register('employmentType')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Select your situation</option>
          {EMPLOYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {errors.employmentType && (
          <p className="mt-1 text-xs text-red-600">{errors.employmentType.message}</p>
        )}
      </div>

      {showEmployerFields && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Employer name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('employerName')}
              placeholder="e.g. Acme Ltd"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Job title <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('jobTitle')}
              placeholder="e.g. Software Engineer"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Monthly income (take-home) <span className="text-gray-400">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
          <input
            {...register('monthlyIncomeDeclared', { valueAsNumber: true })}
            type="number"
            min="0"
            step="100"
            placeholder="0"
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          This is self-declared and will be verified against your bank data later.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Pay frequency <span className="text-gray-400">(optional)</span>
        </label>
        <select
          {...register('payFrequency')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Select frequency</option>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="irregular">Irregular</option>
        </select>
      </div>
    </div>
  )
}
