import { Badge } from "@/components/ui/badge";
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';

interface Problem {
  id: string;
  slug: string;
  title: string;
  points: number;
  statement: string;
  input_format: string;
  output_format: string;
  constraints: string;
}

interface ProblemPanelProps {
  problem: Problem;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acceptanceRate: number;
}

export function ProblemPanel({ problem, difficulty, acceptanceRate }: ProblemPanelProps) {
  const difficultyColor = {
    Easy: 'bg-green-900 text-green-200',
    Medium: 'bg-yellow-900 text-yellow-200',
    Hard: 'bg-red-900 text-red-200',
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 h-[64px] border-b border-border flex items-center shrink-0">
        <div className="flex items-center justify-start gap-4 w-full">
          <h1 className="text-xl font-bold text-white">{problem.title}</h1>
          <div className="flex items-center gap-3">
            <Badge className={difficultyColor[difficulty]}>
              {difficulty}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              Acceptance: {acceptanceRate}%
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-6 pt-3 pb-0 bg-transparent border-b border-border/30 w-auto flex justify-start gap-8">
          <TabsTrigger value="description" className="px-0 py-2 text-sm font-medium transition-all border-b-2 rounded-none data-[state=active]:border-accent data-[state=active]:text-white data-[state=inactive]:border-transparent data-[state=inactive]:text-foreground/70 hover:text-white">
            Description
          </TabsTrigger>
          <TabsTrigger value="editorial" className="px-0 py-2 text-sm font-medium transition-all border-b-2 rounded-none data-[state=active]:border-accent data-[state=active]:text-white data-[state=inactive]:border-transparent data-[state=inactive]:text-foreground/70 hover:text-white">
            Editorial
          </TabsTrigger>
          <TabsTrigger value="submissions" className="px-0 py-2 text-sm font-medium transition-all border-b-2 rounded-none data-[state=active]:border-accent data-[state=active]:text-white data-[state=inactive]:border-transparent data-[state=inactive]:text-foreground/70 hover:text-white">
            Submissions
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="description" className="p-8 space-y-6 mt-0">
            <div className="prose prose-invert max-w-none text-sm leading-[1.6] text-foreground">
              <ReactMarkdown>{problem.statement}</ReactMarkdown>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-4">Example 1:</h3>
              <div className="bg-secondary p-6 rounded text-sm font-mono text-foreground border border-border">
                <p>Input: nums = [2,7,11,15], target = 9</p>
                <p className="mt-2">Output: [0,1]</p>
                <p className="mt-2">Explanation: nums[0] + nums[1] == 9, return [0, 1].</p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-4">Example 2:</h3>
              <div className="bg-secondary p-6 rounded text-sm font-mono text-foreground border border-border">
                <p>Input: nums = [3,2,4], target = 6</p>
                <p className="mt-2">Output: [1,2]</p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-4">Constraints:</h3>
              <ul className="text-sm space-y-3 text-foreground list-disc list-inside">
                <li><code className="font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-gray-300">2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
                <li><code className="font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-gray-300">-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
                <li><code className="font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-gray-300">-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="editorial" className="p-8 mt-0">
            <p className="text-sm text-muted-foreground">
              Editorial solutions coming soon...
            </p>
          </TabsContent>

          <TabsContent value="submissions" className="p-8 mt-0 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-white mb-4">Submission History</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              {(() => {
                const subs = JSON.parse(localStorage.getItem('saved-submissions') || '[]');
                if (subs.length === 0) {
                  return <p className="text-sm text-muted-foreground italic">No submissions yet.</p>;
                }
                return (
                  <div className="space-y-3">
                    {subs.map((sub: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-bold ${sub.verdict === 'Accepted' ? 'text-green-500' : 'text-[#EF4444]'}`}>
                            {sub.verdict}
                          </span>
                          <span className="text-xs text-muted-foreground">{sub.timestamp}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs text-muted-foreground uppercase">{sub.language}</Badge>
                          {sub.executionTime !== undefined && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              {sub.executionTime}ms
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
