import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import { ProblemPanel } from './problem-panel';
import { CodeEditor } from './code-editor';

const initialCode = `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Write your solution here
    pass`;

export function IDE() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<any>(null);
  const [loadingProblem, setLoadingProblem] = useState(true);

  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('saved-code');
    return saved !== null ? saved : initialCode;
  });

  useEffect(() => {
    setLoadingProblem(true);
    fetch(`${API_BASE}/api/problem?id=${id}`)
      .then(res => res.json())
      .then(data => {
        setProblem(data);
        setLoadingProblem(false);
      })
      .catch(err => {
        console.error("Failed to fetch problem details", err);
        setLoadingProblem(false);
      });
  }, [id]);

  useEffect(() => {
    localStorage.setItem('saved-code', code);
  }, [code]);
  
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth > 30 && newWidth < 70) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (loadingProblem) {
    return <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading Problem...</div>;
  }

  if (!problem || problem.error) {
    return <div className="w-full h-full flex items-center justify-center text-red-500">Failed to load problem.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full gap-4"
      style={{ userSelect: isDraggingRef.current ? 'none' : 'auto' }}
    >
      {/* Problem Panel */}
      <div style={{ width: `${leftWidth}%` }} className="overflow-hidden">
        <ProblemPanel 
          problem={problem}
          difficulty="Medium"
          acceptanceRate={47.3}
        />
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className="w-2 flex items-center justify-center cursor-col-resize flex-shrink-0 group relative z-10"
      >
        <div className="w-[1px] h-full bg-[#333333] transition-colors" />
        <div className="absolute w-[2px] h-8 bg-accent/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Code Editor */}
      <div style={{ width: `${100 - leftWidth}%` }} className="overflow-hidden">
        <CodeEditor code={code} onChange={setCode} />
      </div>
    </div>
  );
}
