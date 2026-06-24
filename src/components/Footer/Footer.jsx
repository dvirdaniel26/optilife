export default function Footer() {
  return (
    <footer className="md:pr-72 border-t border-outline-variant/30 bg-surface py-6 print:hidden" dir="rtl">
      <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center shadow-sm shadow-primary/20">
            <span className="material-symbols-outlined text-sm font-bold">favorite</span>
          </div>
          <span className="text-lg font-black font-heading text-primary tracking-tight">OptiLife</span>
        </div>

        {/* Copyright */}
        <p className="text-on-surface-variant text-[11px] font-semibold" dir="ltr">
          © 2026 OptiLife Wellness Hub. All rights reserved
        </p>

        {/* Spacer (keeps copyright centered on desktop) */}
        <div className="hidden md:block w-[120px]" />
      </div>
    </footer>
  );
}

