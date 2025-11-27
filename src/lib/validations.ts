import { z } from 'zod';

// Authentication validation schemas
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Ugyldig e-postadresse' })
    .max(255, { message: 'E-postadressen er for lang' }),
  password: z
    .string()
    .min(6, { message: 'Passord må være minst 6 tegn' })
    .max(100, { message: 'Passordet er for langt' }),
});

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Ugyldig e-postadresse' })
    .max(255, { message: 'E-postadressen er for lang' }),
  password: z
    .string()
    .min(8, { message: 'Passord må være minst 8 tegn' })
    .max(100, { message: 'Passordet er for langt' })
    .regex(/[a-z]/, { message: 'Passord må inneholde minst én liten bokstav' })
    .regex(/[A-Z]/, { message: 'Passord må inneholde minst én stor bokstav' })
    .regex(/[0-9]/, { message: 'Passord må inneholde minst ett tall' }),
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Navn må være minst 2 tegn' })
    .max(100, { message: 'Navn kan ikke være lengre enn 100 tegn' })
    .regex(/^[a-zA-ZæøåÆØÅ\s\-']+$/, { message: 'Navn kan kun inneholde bokstaver, mellomrom, bindestrek og apostrof' }),
});

// Child management validation
export const childSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Navn må være minst 2 tegn' })
    .max(100, { message: 'Navn kan ikke være lengre enn 100 tegn' })
    .regex(/^[a-zA-ZæøåÆØÅ\s\-']+$/, { message: 'Navn kan kun inneholde bokstaver' }),
  birthDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Ugyldig dato' }),
  notes: z
    .string()
    .max(500, { message: 'Notater kan ikke være lengre enn 500 tegn' })
    .optional(),
});

// Authorized pickup validation
export const authorizedPickupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Navn må være minst 2 tegn' })
    .max(100, { message: 'Navn kan ikke være lengre enn 100 tegn' })
    .regex(/^[a-zA-ZæøåÆØÅ\s\-']+$/, { message: 'Navn kan kun inneholde bokstaver' }),
  relationship: z
    .string()
    .trim()
    .min(2, { message: 'Relasjon må være minst 2 tegn' })
    .max(50, { message: 'Relasjon kan ikke være lengre enn 50 tegn' }),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s\-()]+$/, { message: 'Ugyldig telefonnummer' })
    .min(8, { message: 'Telefonnummer må være minst 8 tall' })
    .max(20, { message: 'Telefonnummer kan ikke være lengre enn 20 tegn' })
    .optional(),
});

// Chat message validation
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { message: 'Meldingen kan ikke være tom' })
    .max(1000, { message: 'Meldingen kan ikke være lengre enn 1000 tegn' }),
  childId: z.string().uuid({ message: 'Ugyldig barn-ID' }),
});

// Type exports
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ChildFormData = z.infer<typeof childSchema>;
export type AuthorizedPickupFormData = z.infer<typeof authorizedPickupSchema>;
export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;
