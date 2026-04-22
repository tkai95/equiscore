import type { UseFormReturn } from 'react-hook-form'
import type { Step4Data } from '@equiscore/shared'

interface Props {
  form: UseFormReturn<Step4Data>
}

const REASON_OPTIONS = [
  { value: 'rental_application', label: 'Rental application — to show a landlord' },
  { value: 'financial_product', label: 'Financial product — loan, credit card, or BNPL' },
  { value: 'employment_check', label: 'Employment check' },
  { value: 'identity_verification', label: 'Identity verification' },
  { value: 'other', label: 'Other' },
]

export function Step4Rental({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Housing and purpose</h2>
        <p className="text-sm text-gray-500">
          Almost done. Help us understand your current housing situation.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Monthly rent <span className="text-gray-400">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
          <input
            {...register('monthlyRentDeclared', { valueAsNumber: true })}
            type="number"
            min="0"
            step="50"
            placeholder="0"
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Landlord or letting agent name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          {...register('landlordName')}
          placeholder="e.g. Foxtons, or individual landlord name"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Tenancy start date <span className="text-gray-400">(optional)</span>
        </label>
        <input
          {...register('tenancyStartDate')}
          type="month"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Why are you using Equiscore? <span className="text-gray-400">(optional)</span>
        </label>
        <select
          {...register('reasonForUsingEquiscore')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Select a reason</option>
          {REASON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        You can improve your profile at any time by connecting a bank account and uploading
        supporting documents. Your score improves as we verify more information.
      </div>
    </div>
  )
}
