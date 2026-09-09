"use client"

import { cva } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "../../lib/utils"

const morphingSquareVariants = cva("flex gap-3 items-center justify-center", {
  variants: {
    messagePlacement: {
      bottom: "flex-col",
      top: "flex-col-reverse",
      right: "flex-row",
      left: "flex-row-reverse",
    },
  },
  defaultVariants: {
    messagePlacement: "bottom",
  },
})

export interface MorphingSquareProps {
  message?: string
  /**
   * Position of the message relative to the spinner.
   * @default bottom
   */
  messagePlacement?: "top" | "bottom" | "left" | "right"
}

export function MorphingSquare({
  className,
  message,
  messagePlacement = "bottom",
  ...props
}: HTMLMotionProps<"div"> & MorphingSquareProps) {
  return (
    <div className={cn(morphingSquareVariants({ messagePlacement }), "text-center text-white")}>
      <motion.div
        className={cn("h-10 w-10 bg-foreground", className)}
        animate={{
          borderRadius: ["6%", "50%", "6%"],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        {...props}
      />
      {message && <div className="text-sm font-medium tracking-[0.015em] text-white/70">{message}</div>}
    </div>
  )
}
