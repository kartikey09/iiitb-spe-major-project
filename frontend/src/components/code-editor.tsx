'use client';

import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChevronDown, RotateCcw, Settings, Maximize2 } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

const languages = ['python', 'javascript', 'java', 'cpp'];

const boilerplate = {
  python: `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Write your solution here
    pass`,
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your solution here
};`,
  java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[2];
    }
}`,
  cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};`,
};

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  const [language, setLanguage] = useState<'python' | 'javascript' | 'java' | 'cpp'>(() => {
    const saved = localStorage.getItem('saved-language');
    return (saved as any) || 'java';
  });
  
  useEffect(() => {
    localStorage.setItem('saved-language', language);
  }, [language]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [currentLine, setCurrentLine] = useState(1);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [gutterWidth, setGutterWidth] = useState(48); // 48px is w-12 equivalent
  const [fontSize, setFontSize] = useState(14);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [testCases, setTestCases] = useState<string[]>(() => {
    const saved = localStorage.getItem('saved-test-cases');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return ['[2, 7, 11, 15]\n9', '[3, 2, 4]\n6', '[3, 3]\n6'];
  });

  useEffect(() => {
    localStorage.setItem('saved-test-cases', JSON.stringify(testCases));
  }, [testCases]);
  const [activeOutputTab, setActiveOutputTab] = useState<'testcases' | 'result'>('testcases');
  const [testResults, setTestResults] = useState<string[] | null>(null);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const isDraggingGutterRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingGutterRef.current || !editorContainerRef.current) return;
      
      const containerRect = editorContainerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      
      if (newWidth > 32 && newWidth < 200) {
        setGutterWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isDraggingGutterRef.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleGutterMouseDown = () => {
    isDraggingGutterRef.current = true;
  };

  // Sync scroll between textarea and highlight
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Track current line for highlighting
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const text = e.target.value.substring(0, e.target.selectionStart);
    const lineNum = text.split('\n').length;
    setCurrentLine(lineNum);
  };

  const handleReset = () => {
    onChange(boilerplate[language as keyof typeof boilerplate]);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Insert 4 spaces for a tab
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);
      
      // Move cursor right after the newly inserted spaces
      // We use a small timeout to allow React state to update before setting selection
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();

      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Find the current line up to the cursor
      const lines = code.substring(0, start).split('\n');
      const currentLineStr = lines[lines.length - 1];
      
      // Extract leading whitespace
      const match = currentLineStr.match(/^\s*/);
      const indentation = match ? match[0] : '';
      
      // Insert newline + indentation
      const insertText = '\n' + indentation;
      const newCode = code.substring(0, start) + insertText + code.substring(end);
      onChange(newCode);
      
      // Move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + insertText.length;
        }
      }, 0);
    }
  };

  // Highlight code
  useEffect(() => {
    if (highlightRef.current) {
      const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
      highlightRef.current.innerHTML = highlighted;
    }
  }, [code, language]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setErrorLine(null);
    setOutput('Queuing submission...');
    setActiveOutputTab('result');
    
    const startTime = performance.now();
    try {
      // Step 1: Submit to queue — returns immediately with submission_id
      const submitResp = await fetch(API_BASE + '/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: code,
          language: language,
          test_cases: testCases,
        }),
      });

      const submitData = await submitResp.json();

      if (submitData.error) {
        setOutput(`Error: ${submitData.error}`);
        setIsRunning(false);
        return;
      }

      const submissionId = submitData.submission_id;
      setOutput(`Submission queued.\nID: ${submissionId}\n\nWaiting for judge...`);

      // Step 2: Poll /api/status/:id until done
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes total
      const poll = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          setOutput('Judge timed out. Please try again.');
          setIsRunning(false);
          return;
        }
        attempts++;

        const statusResp = await fetch(`${API_BASE}/api/status/${submissionId}`);
        const statusData = await statusResp.json();

        if (statusData.status === 'queued' || statusData.status === 'judging') {
          setOutput(`Submission queued.\nID: ${submissionId}\n\nStatus: ${statusData.status} (checking again in 2s...)`);
          setTimeout(poll, 2000);
          return;
        }

        // Done!
        const executionTime = Math.round(performance.now() - startTime);
        const verdict = statusData.verdict || 'Unknown';
        const testResults = statusData.test_results || null;

        if (verdict === 'Compilation Error' || verdict === 'Internal Error') {
          const errorDetails = testResults?.[0] || 'No details provided';
          setOutput(`Verdict: ${verdict}\nExecution Time: ${executionTime}ms\n\n${errorDetails}`);
          setTestResults(null);
        } else {
          setOutput(`Verdict: ${verdict}\nExecution Time: ${executionTime}ms`);
          setTestResults(testResults);
        }
        setActiveOutputTab('result');

        // Save to local history
        const savedSubs = JSON.parse(localStorage.getItem('saved-submissions') || '[]');
        savedSubs.unshift({
          timestamp: new Date().toLocaleString(),
          verdict,
          language,
          executionTime,
        });
        localStorage.setItem('saved-submissions', JSON.stringify(savedSubs));

        // Highlight compilation errors
        if (verdict === 'Compilation Error' && language === 'java') {
          const match = (testResults?.[0] || '').match(/Main\.java:(\d+):/);
          if (match) {
            const line = parseInt(match[1]) - 2;
            if (line > 0 && line <= code.split('\n').length) {
              setErrorLine(line);
            }
          }
        }

        setIsRunning(false);
      };

      setTimeout(poll, 2000);
    } catch (err: any) {
      setOutput(`Failed to connect to backend: ${err.message}`);
      setIsRunning(false);
    }
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-[64px] border-b border-border/50 gap-4 bg-secondary/20 shrink-0">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-secondary border border-border text-foreground text-sm font-medium hover:bg-secondary/80 transition"
          >
            {language.charAt(0).toUpperCase() + language.slice(1)}
            <ChevronDown size={16} />
          </button>

          {showLangMenu && (
            <div className="absolute top-full left-0 mt-2 w-40 bg-secondary border border-border rounded-lg shadow-lg z-50">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang as 'python' | 'javascript' | 'java' | 'cpp');
                    onChange(boilerplate[lang as keyof typeof boilerplate]);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    language === lang
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor Utilities */}
        <div className="flex items-center gap-4 text-muted-foreground ml-auto mr-4 relative">
          <button onClick={handleReset} className="hover:text-foreground transition" title="Reset Code">
            <RotateCcw size={16} />
          </button>
          
          <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="hover:text-foreground transition" title="Settings">
            <Settings size={16} />
          </button>
          
          {showSettingsMenu && (
            <div className="absolute top-full right-0 mt-2 w-32 bg-secondary border border-border rounded-lg shadow-lg z-50 p-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">Font Size</p>
              {[12, 14, 16, 18, 20].map((size) => (
                <button
                  key={size}
                  onClick={() => { setFontSize(size); setShowSettingsMenu(false); }}
                  className={`w-full text-left px-2 py-1.5 text-sm transition rounded ${fontSize === size ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-secondary/60'}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          )}

          <button onClick={handleFullscreen} className="hover:text-foreground transition" title="Fullscreen">
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border text-foreground hover:bg-secondary bg-secondary/30"
            onClick={handleRunCode}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </Button>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
            onClick={handleRunCode}
            disabled={isRunning}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Editor with Line Numbers */}
      <div 
        ref={editorContainerRef}
        className="flex-1 flex overflow-hidden relative"
        style={{ userSelect: isDraggingGutterRef.current ? 'none' : 'auto' }}
      >
        {/* Line Numbers */}
        <div 
          className="bg-secondary/30 flex-shrink-0 overflow-hidden pt-3 flex flex-col items-end pr-3 relative"
          style={{ width: `${gutterWidth}px` }}
        >
          <div className="font-mono text-xs text-muted-foreground/70 select-none flex flex-col">
            {lineNumbers.map((num) => (
              <div 
                key={num} 
                className={`h-[1.5rem] leading-[1.5rem] transition-all px-2 rounded-sm ${
                  num === currentLine ? 'text-accent font-semibold' : ''
                } ${num === errorLine ? 'bg-red-900/50 text-red-200 font-bold' : ''}`}
              >
                {num}
              </div>
            ))}
          </div>
          
          {/* Draggable Handle */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-2 flex items-center justify-end cursor-col-resize z-10 group"
            onMouseDown={handleGutterMouseDown}
          >
            <div className="w-[1px] h-full bg-border/80 group-hover:bg-accent transition-colors" />
          </div>
        </div>

        {/* Code Editor Container */}
        <div className="flex-1 relative overflow-hidden bg-card">
          {/* Active Line Highlight */}
          <div
            className="absolute left-0 right-0 bg-white/8 border-l-2 border-accent/50 pointer-events-none transition-all"
            style={{
              top: `calc(${(currentLine - 1) * 1.5}rem + 0.75rem)`,
              height: '1.5rem',
            }}
          />

          {/* Error Line Highlight */}
          {errorLine && errorLine <= code.split('\n').length && (
            <div
              className="absolute left-0 right-0 px-4 font-mono text-sm pointer-events-none transition-all z-10 whitespace-pre bg-[#EF4444]/10"
              style={{
                top: `calc(${(errorLine - 1) * 1.5}rem + 0.75rem)`,
                height: '1.5rem',
                lineHeight: '1.5rem',
              }}
            >
              <span 
                className="underline decoration-wavy decoration-2 underline-offset-4"
                style={{ color: 'transparent', textDecorationColor: '#EF4444' }}
              >
                {code.split('\n')[errorLine - 1].length > 0 ? code.split('\n')[errorLine - 1] : ' '}
              </span>
            </div>
          )}

          {/* Highlighted Code Background */}
          <pre
            ref={highlightRef}
            className="hljs absolute inset-0 pt-3 pb-4 px-4 font-mono overflow-hidden pointer-events-none whitespace-pre"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.5rem',
              wordWrap: 'normal',
              whiteSpace: 'pre',
              backgroundColor: 'transparent',
            }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            className="relative pt-3 pb-4 px-4 font-mono bg-transparent text-transparent resize-none focus:outline-none focus:ring-0 w-full h-full overflow-auto whitespace-pre"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.5rem',
              caretColor: '#d4af28',
              wordWrap: 'normal',
              whiteSpace: 'pre',
            }}
            spellCheck="false"
          />
        </div>
      </div>

      {/* Output Section */}
      <div className="border-t border-border bg-[#1A1A1A] flex flex-col shrink-0 min-h-[300px]">
        <div className="flex items-center gap-6 px-6 pt-2 border-b border-border/50">
          <button 
            className={`px-2 py-3 text-sm font-medium border-b-2 transition-all ${activeOutputTab === 'testcases' ? 'border-accent text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
            onClick={() => setActiveOutputTab('testcases')}
          >
            Testcases
          </button>
          <button 
            className={`px-2 py-3 text-sm font-medium border-b-2 transition-all ${activeOutputTab === 'result' ? 'border-accent text-white' : 'border-transparent text-muted-foreground hover:text-white'}`}
            onClick={() => setActiveOutputTab('result')}
          >
            Test Result
          </button>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {activeOutputTab === 'testcases' && (
             <div className="flex flex-col gap-4 h-full min-h-0">
               <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 border-b border-border/40">
                 {testCases.map((_, i) => (
                   <div key={i} className="relative group shrink-0">
                     <button 
                       onClick={() => setActiveTestCase(i)}
                       className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors ${activeTestCase === i ? 'bg-secondary text-white border-b-2 border-accent' : 'text-muted-foreground hover:text-white'}`}
                     >
                       Case {i + 1}
                     </button>
                     {testCases.length > 1 && (
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           const newTCs = testCases.filter((_, idx) => idx !== i);
                           setTestCases(newTCs);
                           if (activeTestCase >= newTCs.length) setActiveTestCase(newTCs.length - 1);
                           else if (activeTestCase > i) setActiveTestCase(activeTestCase - 1);
                         }}
                         className="absolute right-1 top-1 text-muted-foreground hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Delete test case"
                       >
                         &times;
                       </button>
                     )}
                   </div>
                 ))}
                 {testCases.length < 10 && (
                   <button 
                     onClick={() => { setTestCases([...testCases, '[ ]\n0']); setActiveTestCase(testCases.length); }}
                     className="px-3 py-1.5 text-sm text-accent font-medium hover:bg-accent/10 rounded-md transition-colors"
                   >
                     + Add
                   </button>
                 )}
               </div>
               <div className="flex-1 overflow-auto">
                 <p className="text-xs font-semibold text-muted-foreground mb-2">Input Data (Line 1: nums, Line 2: target)</p>
                 <textarea 
                   className="w-full min-h-[150px] bg-card border border-border rounded-lg p-4 font-mono text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                   value={testCases[activeTestCase] || ''}
                   onChange={(e) => {
                     const newTCs = [...testCases];
                     newTCs[activeTestCase] = e.target.value;
                     setTestCases(newTCs);
                   }}
                   spellCheck="false"
                 />
               </div>
             </div>
          )}

          {activeOutputTab === 'result' && (
            <div className="flex flex-col gap-6">
              {/* Overall Output block */}
              <div className="min-h-24 p-4 bg-card rounded-lg border border-border text-xs font-mono text-foreground flex flex-col">
                {output ? (
                  <>
                    {output.startsWith('Verdict: ') ? (
                      <>
                        <div className={`font-bold text-[15px] mb-3 flex justify-between items-center ${output.includes('Compilation Error') || output.includes('Error') || output.includes('Wrong Answer') ? 'text-[#EF4444]' : 'text-green-500'}`}>
                          <span>{output.split('\n')[0]}</span>
                          <span className="text-muted-foreground text-xs font-normal flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {output.split('\n')[1].replace('Execution Time: ', '')}
                          </span>
                        </div>
                        <div className="pl-3 border-l-2 border-border text-muted-foreground whitespace-pre-wrap">
                          {output.split('\n\n').slice(1).join('\n\n')}
                        </div>
                      </>
                    ) : (
                      <pre className="whitespace-pre-wrap">{output}</pre>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">Run your code to see the result here</p>
                )}
              </div>
              
              {/* Individual Test Cases Results */}
              {testResults && testResults.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Test Case Results</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {testResults.map((res, i) => {
                      const isError = res.includes('Runtime Error') || res.startsWith('FAIL');
                      const cleanRes = res.replace(/^PASS\n|^FAIL\n/, '');
                      
                      let expected = null;
                      let got = null;
                      if (res.startsWith('FAIL') && cleanRes.includes('Expected: ') && cleanRes.includes('\nGot: ')) {
                         const parts = cleanRes.split('\nGot: ');
                         expected = parts[0].replace('Expected: ', '');
                         got = parts[1];
                      }

                      return (
                        <div key={i} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                          <div className={`px-4 py-2 border-b border-border text-xs font-bold flex justify-between ${isError ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-green-500/10 text-green-500'}`}>
                            <span>CASE {i + 1}</span>
                            <span>{isError ? 'FAILED' : 'PASSED'}</span>
                          </div>
                          <div className="p-4 font-mono text-sm text-muted-foreground whitespace-pre-wrap">
                            {expected && got ? (
                               <div className="grid grid-cols-2 gap-4">
                                 <div>
                                   <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">Expected Output</div>
                                   <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2 rounded">{expected}</div>
                                 </div>
                                 <div>
                                   <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-wider">Your Output</div>
                                   <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded">{got}</div>
                                 </div>
                               </div>
                            ) : (
                               cleanRes || "No Output"
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
