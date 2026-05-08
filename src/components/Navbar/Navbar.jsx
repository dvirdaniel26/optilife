export default function Header() {
  return (
    <header className="h-20 w-full fixed top-0 left-0 z-30 bg-background/80 backdrop-blur-md flex justify-between items-center pr-80 pl-xl">
      <div className="flex items-center gap-md flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input className="w-full bg-white border-transparent custom-shadow rounded-xl pr-10 pl-md py-xs text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary" placeholder="חיפוש בדיקות קודמות..." type="text"/>
        </div>
      </div>
      <div className="flex items-center gap-md">
        <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors">notifications</button>
        <div className="h-8 w-[1px] bg-outline-variant mx-xs"></div>
        <div className="flex items-center gap-sm">
          <div className="text-left">
            <p className="text-sm font-bold text-primary">מאיה כהן</p>
            <p className="text-[10px] text-secondary font-medium uppercase tracking-wider">משתמשת Premium</p>
          </div>
          <img alt="User Profile" className="h-10 w-10 rounded-full custom-shadow border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBC9jkXRldxZMKJUtSAUBbsZ3jsS9F-Lf2UyaVhmNfyXiEUx3saZhuzHRFhRy_peo4c83UblrbKgCylju2ESE7BVesN1GQL0VB4J23dQsq1UF8ey2wiwjm7ZpQ84SLBJxctm7qakDOvfTcke88K6u99vEGGQrfFpD2PQ1pCEVu2A71XAHI84Im6j736yhoxja1gIEUkU-DJC7xc47yL6Mku-X1OlhEXgiBrPCEbzJATtfY59P1xb7rKu7ejHKueOnOxLrKq-qBwP1E"/>
        </div>
      </div>
    </header>
  );
}
