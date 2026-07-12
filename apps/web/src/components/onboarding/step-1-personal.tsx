import type { UseFormReturn } from 'react-hook-form'
import type { Step1Data } from '@equiscore/shared'

interface Props {
  form: UseFormReturn<Step1Data>
}

const inputClass =
  'w-full rounded-lg border border-line px-3 py-2.5 text-sm text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

export function Step1Personal({ form }: Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Tell us about yourself</h2>
        <p className="text-sm text-content-secondary">Basic personal details to start your profile.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">Full legal name</label>
        <input
          {...register('fullName')}
          placeholder="e.g. Amara Johnson"
          className={inputClass}
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-danger-strong">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">Date of birth</label>
        <input
          {...register('dob')}
          type="date"
          className={inputClass}
        />
        {errors.dob && (
          <p className="mt-1 text-xs text-danger-strong">{errors.dob.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-content">Nationality</label>
        <input
          {...register('nationality')}
          placeholder="e.g. Nigerian, Indian, French"
          className={inputClass}
        />
        {errors.nationality && (
          <p className="mt-1 text-xs text-danger-strong">{errors.nationality.message}</p>
        )}
      </div>
    </div>
  )
}
