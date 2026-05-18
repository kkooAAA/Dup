import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractApiError(err: any, fallback = 'An error occurred'): string {
  const data = err.response?.data;
  if (!data) return err.message || fallback;
  if (typeof data.error === 'string') return data.error;
  if (data.error?.error_user_msg) return data.error.error_user_msg;
  if (data.error?.message) return data.error.message;
  if (data.message) return data.message;
  return fallback;
}
