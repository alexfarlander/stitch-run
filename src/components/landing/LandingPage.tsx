'use client';

import Link from 'next/link';
import { 
  Play, 
  Zap, 
  Workflow, 
  Users, 
  Plug, 
  Sparkles,
  ArrowRight,
  Code2,
  Bot,
  Layers,
  MousePointerClick
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  canvasId: string;
}

export function LandingPage({ canvasId }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a0f1a] animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Stitch</span>
          </div>
          <Link href={`/canvas/${canvasId}`}>
            <Button className="bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm">
              <Play className="w-4 h-4 mr-2" />
              Launch Canvas
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>The Visual System Orchestrator</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-xs">Beta</span>
          </div>
          
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            <span className="text-white">Stitch Everything.</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              See Everything.
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-4 leading-relaxed">
            Connect your vibe-coded apps, APIs, and integrations into one 
            <span className="text-cyan-400"> living canvas</span>. 
            Watch your customers flow through your business in real-time.
          </p>
          
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
            No more hidden logic. No more mystery pipelines. 
            If it's not on the canvas, it doesn't exist.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href={`/canvas/${canvasId}`}>
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-8 py-6 text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all">
                <Play className="w-5 h-5 mr-2" />
                Try the Demo
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MousePointerClick className="w-4 h-4" />
              <span>Click Play, watch the magic</span>
            </div>
          </div>

          {/* Visual hint */}
          <div className="relative max-w-4xl mx-auto">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Animated flow visualization */}
                    <div className="w-16 h-16 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <Users className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />
                      <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                      <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-purple-500" />
                    </div>
                    <div className="w-16 h-16 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-transparent" />
                      <div className="w-3 h-3 rounded-full bg-purple-400 animate-ping" style={{ animationDelay: '0.5s' }} />
                      <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-green-500" />
                    </div>
                    <div className="w-16 h-16 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">Your business, visualized and alive</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Stitch */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What is <span className="text-cyan-400">Stitch</span>?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Think of it as a Business Model Canvas that actually runs. 
              Not a diagram. Not documentation. A living system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Layers className="w-6 h-6" />}
              title="Fractal Canvas"
              description="Zoom into any section. Every box is another canvas. Infinite depth, zero confusion."
              color="cyan"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Entity Tracking"
              description="Watch Monica sign up, see her move through Sales, land in Support. Real people, real-time."
              color="blue"
            />
            <FeatureCard
              icon={<Plug className="w-6 h-6" />}
              title="Universal Connector"
              description="Stripe, Supabase, your custom API, that thing you vibe-coded at 2am. All connected."
              color="purple"
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="AI-Native"
              description="Ask the canvas to build workflows. It understands your business because it IS your business."
              color="green"
            />
          </div>
        </div>
      </section>

      {/* The Philosophy */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
            <Code2 className="w-4 h-4" />
            <span>The Philosophy</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
            "If it's not on the canvas,
            <br />
            <span className="text-purple-400">it doesn't exist."</span>
          </h2>
          
          <p className="text-xl text-slate-400 mb-8 leading-relaxed">
            No hidden business logic. No mystery webhooks firing in the void. 
            No "I think that Zapier is supposed to do something here."
            <br /><br />
            Every workflow, every integration, every customer journey — 
            <span className="text-white"> visible, clickable, debuggable.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Tag>Visual-First</Tag>
            <Tag>Database as Truth</Tag>
            <Tag>Edge-Walking Execution</Tag>
            <Tag>Async Workers</Tag>
            <Tag>Real-time Updates</Tag>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to see your business come alive?
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Hit Play. Watch entities flow. Double-click to drill down. 
            It's more fun than it sounds.
          </p>
          <Link href={`/canvas/${canvasId}`}>
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white px-10 py-6 text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all">
              Launch the Canvas
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Workflow className="w-3 h-3 text-white" />
            </div>
            <span>Stitch</span>
          </div>
          <p className="text-slate-600">The Living Business Model Canvas</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: 'cyan' | 'blue' | 'purple' | 'green';
}) {
  const colors = {
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all hover:bg-slate-800/50 group">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm">
      {children}
    </span>
  );
}
