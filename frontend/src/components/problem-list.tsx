import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

type Problem = {
  id: string;
  slug: string;
  title: string;
  points: number;
};

export function ProblemList({ onSelectProblem }: { onSelectProblem: (id: string) => void }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_BASE + '/api/problems')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProblems(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch problems", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 w-full overflow-y-auto p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-white tracking-tight">Problem Set</h2>
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="animate-spin h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="grid gap-4">
            {problems.map((prob, idx) => (
              <div 
                key={prob.id} 
                onClick={() => onSelectProblem(prob.id)}
                className="group relative flex items-center justify-between p-6 bg-[#1a1a1a] border border-white/10 rounded-2xl cursor-pointer hover:border-amber-500/50 hover:bg-[#222] transition-all overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-6">
                  <div className="text-xl font-bold text-gray-500 w-8">{idx + 1}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-200 group-hover:text-amber-400 transition-colors">{prob.title}</h3>
                    <div className="text-sm text-gray-500 mt-1 uppercase tracking-wider font-semibold">Points: {prob.points}</div>
                  </div>
                </div>
                <div>
                  <button className="px-4 py-2 text-sm font-bold bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-black transition-colors">
                    Solve
                  </button>
                </div>
              </div>
            ))}
            {problems.length === 0 && (
              <div className="text-center text-gray-500 py-12 bg-[#1a1a1a] rounded-2xl border border-white/5">
                No problems found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
