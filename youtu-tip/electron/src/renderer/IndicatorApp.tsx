export function IndicatorApp() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      <div className="relative h-11 w-11">
        <div className="absolute inset-0 rounded-full bg-white/25 blur-[1px]" />
        <div className="absolute inset-[2px] rounded-full border-[2px] border-white/55" />
        <div className="absolute inset-[2px] animate-spin rounded-full border-[3px] border-transparent border-t-purple-400 border-l-purple-300 drop-shadow-[0_0_16px_rgba(123,92,255,0.7)]" />
      </div>
    </div>
  )
}
