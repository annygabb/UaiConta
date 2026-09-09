import React from "react"

import { MorphingSquare } from "./ui/morphing-square"

interface PostAuthLoaderProps {
  message?: string
}

export default function PostAuthLoader({ message = "Abrindo seu painel..." }: PostAuthLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[2147482990] grid min-h-[100dvh] place-items-center overflow-hidden bg-[#070509] px-6 text-white"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(126,66,154,0.22),transparent_30%),radial-gradient(circle_at_42%_60%,rgba(91,67,143,0.10),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="relative flex min-h-44 items-center justify-center">
        <MorphingSquare
          message={message}
          className="!h-12 !w-12 !bg-[#a86ad3] shadow-[0_0_34px_rgba(168,106,211,0.34)]"
        />
      </div>
    </div>
  )
}
