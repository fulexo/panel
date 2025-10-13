import { useForm, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export function useFormValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: Partial<T>
): UseFormReturn<T> {
  return useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange',
  }) as UseFormReturn<T>;
}

export function getFieldError<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: Path<T>
): string | undefined {
  const error = form.formState.errors[fieldName];
  return error?.message as string | undefined;
}

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  required: z.string().min(1, 'Bu alan zorunludur'),
  phone: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Geçerli bir telefon numarası giriniz'),
  url: z.string().url('Geçerli bir URL giriniz'),
  positiveNumber: z.number().min(0, 'Pozitif bir sayı giriniz'),
  currency: z.number().min(0, 'Geçerli bir para birimi değeri giriniz'),
  date: z.string().min(1, 'Geçerli bir tarih seçiniz'),
};
