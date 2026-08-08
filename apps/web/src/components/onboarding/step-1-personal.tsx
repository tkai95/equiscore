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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-content">First name</label>
          <input
            {...register('firstName')}
            placeholder="e.g. Amara"
            className={inputClass}
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-danger-strong">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-content">Last name</label>
          <input
            {...register('lastName')}
            placeholder="e.g. Johnson"
            className={inputClass}
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-danger-strong">{errors.lastName.message}</p>
          )}
        </div>
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
    </div>
  )
}
