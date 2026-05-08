import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';

import OverviewPage from './pages/OverviewPage';
import TestAnalysisPage from './pages/TestAnalysisPage';
import AnalysisResultsPage from './pages/AnalysisResultsPage';

function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="text-on-surface bg-background min-h-screen font-body" dir="rtl">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      {children}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/upload" element={<TestAnalysisPage />} />
          <Route path="/analysis" element={<AnalysisResultsPage />} />
          
          {/* Placeholder routes for links in the sidebar */}
          <Route path="/plan" element={<main className="md:pr-72 pt-24 min-h-screen p-xl"><h1 className="text-2xl font-bold text-primary">הבריאות שלי - בקרוב</h1></main>} />
          <Route path="/settings" element={<main className="md:pr-72 pt-24 min-h-screen p-xl"><h1 className="text-2xl font-bold text-primary">הגדרות - בקרוב</h1></main>} />
          <Route path="/help" element={<main className="md:pr-72 pt-24 min-h-screen p-xl"><h1 className="text-2xl font-bold text-primary">עזרה ותמיכה - בקרוב</h1></main>} />
          <Route path="*" element={<main className="md:pr-72 pt-24 min-h-screen p-xl"><h1 className="text-2xl font-bold text-status-error">404 - עמוד לא נמצא</h1></main>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
