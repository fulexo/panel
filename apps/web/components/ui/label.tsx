import * as React from "react"

const Label = React.forwardRef<
  React.ElementRef<"label">,
  React.ComponentPropsWithoutRef<"label">
>(({ className = "", ...props }, ref) => (
  <label
    ref={ref}
    className={["text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className].filter(Boolean).join(" ")}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }