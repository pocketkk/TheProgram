import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg hover:from-cosmic-500 hover:to-cosmic-400 hover:shadow-xl hover:glow-purple',
        secondary:
          'bg-cosmic-800 text-white border border-cosmic-600 hover:bg-cosmic-700 hover:border-cosmic-500 hover:glow-purple',
        outline:
          'border-2 border-cosmic-500 text-cosmic-200 bg-transparent hover:bg-cosmic-900 hover:text-white hover:glow-purple',
        ghost: 'text-cosmic-200 hover:bg-cosmic-800 hover:text-white',
        danger:
          'bg-red-600 text-white shadow-lg hover:bg-red-500 hover:shadow-xl hover:shadow-red-500/50',
        celestial:
          'bg-gradient-to-r from-celestial-gold via-celestial-pink to-celestial-cyan text-cosmic-950 font-semibold shadow-lg hover:shadow-xl hover:scale-105',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-6 text-sm',
        lg: 'h-13 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'size'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  noAnimation?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, noAnimation = false, children, disabled, ...props }, ref) => {
    const content = loading ? (
      <>
        <div className="spinner h-4 w-4 border-2" />
        <span>Loading...</span>
      </>
    ) : (
      children
    )

    const motionProps = noAnimation ? {} : { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } }

    if (asChild) {
      // Extract only standard HTML button props for Slot (motion props are incompatible)
      const { onClick, onMouseEnter, onMouseLeave, onFocus, onBlur, id, 'aria-label': ariaLabel, 'aria-disabled': ariaDisabled, tabIndex, title } = props as any
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          id={id}
          aria-label={ariaLabel}
          aria-disabled={ariaDisabled || disabled}
          tabIndex={tabIndex}
          title={title}
        >
          {content as React.ReactNode}
        </Slot>
      )
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...motionProps}
        {...props}
      >
        {content}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
