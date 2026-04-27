import type { UseFormReturn } from 'react-hook-form'
import type { Step1Data } from '@equiscore/shared'

interface Props {
  form: UseFormReturn<Step1Data>
}

export function Step1Personal({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Tell us about yourself</h2>
        <p className="text-sm text-gray-500">Basic personal details to start your profile.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Full legal name</label>
        <input
          {...register('fullName')}
          placeholder="e.g. Amara Johnson"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of birth</label>
        <input
          {...register('dob')}
          type="date"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {errors.dob && (
          <p className="mt-1 text-xs text-red-600">{errors.dob.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Nationality</label>
        <input
          {...register('nationality')}
          placeholder="e.g. Nigerian, Indian, French"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {errors.nationality && (
          <p className="mt-1 text-xs text-red-600">{errors.nationality.message}</p>
        )}
      </div>
    </div>
  )
}
