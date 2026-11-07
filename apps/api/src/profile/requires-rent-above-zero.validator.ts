import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator'
import { isRentAboveZero } from '@equiscore/shared'

// Onboarding only stores a rental record when rent is above 0, so a rental detail
// sent without rent would be silently discarded. Reject it instead. An empty string
// counts as not provided, because the onboarding form can send one for a blank field.
export function RequiresRentAboveZero(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'requiresRentAboveZero',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string' || value.trim() === '') return true
          const { monthlyRentDeclared } = args.object as { monthlyRentDeclared?: unknown }
          return isRentAboveZero(monthlyRentDeclared)
        },
        defaultMessage: (args) =>
          `${args?.property} can only be provided with a monthly rent above 0`,
      },
    })
  }
}
