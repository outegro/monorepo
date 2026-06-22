import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn helper. Combine class names with tailwind-merge for clean overrides. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
