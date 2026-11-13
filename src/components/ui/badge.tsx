import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center max-w-full rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 truncate",
  {
    variants: {
      variant: {
        default:
          "border-blue-200 bg-blue-50 text-blue-700",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700",
        destructive:
          "border-red-200 bg-red-50 text-red-700",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800",
        outline: "border-slate-200 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/** A strong background such as bg-green-600, which needs light text on it. */
const SOLID_BG = /(?:^|\s)bg-[a-z]+-(?:[5-9]00|950)(?:\s|$)/
/** A text colour (not a size such as text-xs or text-[10px]). */
const TEXT_COLOUR = /(?:^|\s)text-(?:white|black|[a-z]+-\d{2,3})(?:\s|$)/

function Badge({ className, variant, ...props }: BadgeProps) {
  // Many screens pass a solid colour (e.g. "bg-green-600") and rely on the
  // badge giving white text, as the original solid default variant did.
  const solid =
    typeof className === "string" && SOLID_BG.test(className) && !TEXT_COLOUR.test(className)
  return (
    <div
      className={cn(badgeVariants({ variant }), solid && "border-transparent text-white", className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
