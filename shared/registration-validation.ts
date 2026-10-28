import { passwordRecoveryValidation } from "./password-recovery";

export type RegistrationField = "firstName" | "email" | "password";
export type RegistrationCode = "NAME_REQUIRED" | "NAME_INVALID" | "EMAIL_REQUIRED" | "EMAIL_INVALID" | "EMAIL_REGISTERED" | "PASSWORD_REQUIRED" | "PASSWORD_SHORT" | "PASSWORD_TOO_LONG";
export type RegistrationErrors = Partial<Record<RegistrationField, RegistrationCode>>;

export function registrationErrors(input: { firstName?: unknown; email?: unknown; password?: unknown }): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (typeof input.firstName !== "string" || !input.firstName.trim()) errors.firstName = "NAME_REQUIRED";
  else if (input.firstName.length > 100 || /[\s\p{C}]/u.test(input.firstName)) errors.firstName = "NAME_INVALID";
  if (typeof input.email !== "string" || !input.email.trim()) errors.email = "EMAIL_REQUIRED";
  else if (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "EMAIL_INVALID";
  if (typeof input.password !== "string" || !input.password.length) errors.password = "PASSWORD_REQUIRED";
  else {
    const issue = passwordRecoveryValidation(input.password);
    if (issue) errors.password = issue === "INVALID_PASSWORD" ? "PASSWORD_SHORT" : issue;
  }
  return errors;
}

export function registrationResponseErrors(data: unknown): RegistrationErrors {
  if (!data || typeof data !== "object") return {};
  const source = data as { fieldErrors?: unknown; code?: unknown; error?: unknown };
  const allowed: Record<RegistrationField, RegistrationCode[]> = {
    firstName: ["NAME_REQUIRED", "NAME_INVALID"],
    email: ["EMAIL_REQUIRED", "EMAIL_INVALID", "EMAIL_REGISTERED"],
    password: ["PASSWORD_REQUIRED", "PASSWORD_SHORT", "PASSWORD_TOO_LONG"],
  };
  const result: RegistrationErrors = {};
  if (source.fieldErrors && typeof source.fieldErrors === "object") {
    for (const field of Object.keys(allowed) as RegistrationField[]) {
      const code = (source.fieldErrors as Record<string, unknown>)[field];
      if (allowed[field].includes(code as RegistrationCode)) result[field] = code as RegistrationCode;
    }
  }
  // Compatibility while the published server still uses the old response.
  if (source.code === "PASSWORD_TOO_LONG") result.password = "PASSWORD_TOO_LONG";
  if (source.error === "Email already registered") result.email = "EMAIL_REGISTERED";
  return result;
}
