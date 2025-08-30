import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    let baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    let variantClasses = ""
    if (variant === "default") variantClasses = "bg-blue-600 text-white hover:bg-blue-700"
    else if (variant === "outline") variantClasses = "border border-gray-300 bg-white hover:bg-gray-50"
    else if (variant === "secondary") variantClasses = "bg-gray-100 text-gray-900 hover:bg-gray-200"
    else if (variant === "ghost") variantClasses = "hover:bg-gray-100"
    
    let sizeClasses = ""
    if (size === "default") sizeClasses = "h-10 px-4 py-2"
    else if (size === "sm") sizeClasses = "h-9 px-3"
    else if (size === "lg") sizeClasses = "h-11 px-8"
    
    return (
      <button
        className={[baseClasses, variantClasses, sizeClasses, className].filter(Boolean).join(" ")}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }