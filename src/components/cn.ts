import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name joiner with Tailwind conflict resolution.
 *
 * Lives in `src/components/` rather than `src/lib/` on purpose: TASKS.md
 * assigns `src/lib/**` to Abhijit, and Rule 2 says stub against the contract
 * rather than write into another owner's directory. When `src/lib/cn.ts`
 * appears, this should become a re-export and nothing else should change.
 *
 * `twMerge` is load-bearing, not decoration: without it a caller passing
 * `className="p-2"` cannot override a component's built-in `p-4`, and every
 * primitive would need variant maps instead of a documented escape hatch.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
