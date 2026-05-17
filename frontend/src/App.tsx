import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import { Login } from '@/components/login';
import { ProblemList } from '@/components/problem-list';
import { IDE } from '@/components/ide';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('student-auth');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('student-auth');
    localStorage.removeItem('student-username');
    localStorage.removeItem('student-id');
    setIsLoggedIn(false);
    navigate('/');
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => {
      setIsLoggedIn(true);
      navigate('/problem-set');
    }} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card h-16 flex items-center shrink-0">
        <div className="max-w-full w-full mx-auto px-6 flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-accent rounded flex items-center justify-center flex-shrink-0">
              <span className="text-accent-foreground font-bold text-xs">LC</span>
            </div>
            <Link to="/problem-set" className="text-lg font-bold text-accent hover:text-accent/80 transition-colors">CheatCode</Link>
          </div>
          <div className="flex items-center gap-6 h-full mr-4">
            <nav className="flex items-center gap-8 h-full">
              <Link
                to="/problem-set"
                className="text-sm font-medium transition h-full flex items-center text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-amber-500"
              >
                Problems
              </Link>
            </nav>
            <div className="h-6 w-px bg-border mx-2"></div>
            <button onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex overflow-hidden p-0 m-0">
        <Routes>
          <Route path="/" element={<Navigate to="/problem-set" replace />} />
          <Route path="/problem-set" element={<ProblemList onSelectProblem={(id) => navigate(`/problems/${id}`)} />} />
          <Route path="/problems/:id" element={<div className="h-full w-full flex overflow-hidden px-4 py-6"><IDE /></div>} />
          <Route path="*" element={<Navigate to="/problem-set" replace />} />
        </Routes>
      </main>
    </div>
  );
}
