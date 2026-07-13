import { cn } from '@/lib/utils'

// The Argos eye — the hundred-eyed watchman, reduced to one calm iris.
export function ArgosMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('size-7', className)}
    >
      <path
        d="M16 7C9.5 7 4.8 12.2 3 16c1.8 3.8 6.5 9 13 9s11.2-5.2 13-9c-1.8-3.8-6.5-9-13-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </svg>
  )
}
