import React, { useEffect } from 'react';
import { PM_SHRI_Logo, GenerateIcon, CoPilotIcon, ShieldIcon, SpeedIcon, FileIcon, DatabaseIcon } from './icons/Icons';

// Helper for dynamic class names
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface LandingPageProps {
  onEnterApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
    
    useEffect(() => {
        document.body.classList.add('landing-body');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        const targets = document.querySelectorAll('.animate-on-scroll');
        targets.forEach(target => observer.observe(target));

        return () => {
            document.body.classList.remove('landing-body');
            targets.forEach(target => observer.unobserve(target));
        };
    }, []);

    const features = [
      {
        Icon: GenerateIcon,
        title: "AI Code Generation",
        description: "From idea to plugin in minutes. Describe the functionality, and our AI assistant will generate clean, secure, and ready-to-install WordPress plugins and themes.",
        color: "cyan",
      },
      {
        Icon: CoPilotIcon,
        title: "Intelligent Co-Pilot",
        description: "Your AI partner for WordPress. Use natural language to manage your site, troubleshoot errors, write code, or execute complex tasks.",
        color: "violet",
      },
      {
        Icon: FileIcon,
        title: "Unified Management",
        description: "A single, elegant dashboard to manage plugins, themes, and core files. A built-in code editor means no more juggling FTP clients.",
        color: "green",
      },
      {
        Icon: DatabaseIcon,
        title: "Safe Database Interaction",
        description: "Browse database tables and use the AI assistant to query data with safe, pre-defined commands, preventing accidental destructive queries.",
        color: "red",
      },
      {
        Icon: SpeedIcon,
        title: "Diagnostics & Optimization",
        description: "Run Google PageSpeed audits, scan for security vulnerabilities, and get AI analysis on your debug logs to resolve issues faster.",
        color: "yellow",
      },
      {
        Icon: ShieldIcon,
        title: "Secure & Multi-User",
        description: "Built with security in mind, featuring JWT authentication, Google Sign-In, and an admin panel for user management.",
        color: "blue",
      }
    ];

    const colorMap: { [key: string]: string } = {
        cyan: 'text-accent-cyan',
        violet: 'text-accent-violet',
        green: 'text-accent-green',
        red: 'text-accent-red',
        yellow: 'text-accent-yellow',
        blue: 'text-accent-blue',
    };

    return (
        <div className="relative">
             <header className="landing-header">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                            <PM_SHRI_Logo className="h-8 w-8" />
                            <span className="text-xl font-bold tracking-wider">Dev-Console</span>
                        </div>
                        <div className="flex items-center">
                            <button onClick={onEnterApp} className="btn-primary-landing">Launch Console</button>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="overflow-x-hidden">
                <section className="relative pt-48 pb-20 lg:pt-64 lg:pb-24 text-center">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="animate-on-scroll fade-in-up hero-glow-text text-5xl md:text-7xl font-extrabold leading-tight mb-6" style={{ animationDelay: '0.1s' }}>
                            The Command Center for Modern <span className="wordpress-gradient-text">WordPress</span> Development
                        </h1>
                        <p className="animate-on-scroll fade-in-up max-w-3xl mx-auto text-lg md:text-xl text-text-secondary mb-10" style={{ animationDelay: '0.2s' }}>
                           Dev-Console is an advanced, AI-powered suite that streamlines how you build, debug, and manage WordPress sites. Go from concept to deployment faster than ever before.
                        </p>
                        <div className="animate-on-scroll fade-in-up flex justify-center" style={{ animationDelay: '0.3s' }}>
                            <button onClick={onEnterApp} className="btn-primary-landing !px-8 !py-4 !text-lg">Get Started Now</button>
                        </div>
                    </div>
                </section>
                
                <section id="features" className="py-20 lg:py-32">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="animate-on-scroll fade-in-up text-4xl md:text-5xl font-bold">A Toolkit for Peak Performance</h2>
                            <p className="animate-on-scroll fade-in-up text-lg text-text-secondary mt-4" style={{ animationDelay: '0.1s' }}>Every feature is designed to eliminate friction and accelerate your creative process.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                           {features.map((feature, i) => (
                                <div key={feature.title} className="animate-on-scroll fade-in-up glass-card-landing p-8 flex flex-col items-start" style={{ transitionDelay: `${(i * 0.1) + 0.1}s` }}>
                                    <div className="p-3 rounded-lg bg-background inline-block mb-4">
                                        <feature.Icon className={cn("w-8 h-8", colorMap[feature.color])} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                    <p className="text-text-secondary text-sm">{feature.description}</p>
                                </div>
                           ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="py-20 lg:py-32">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="animate-on-scroll fade-in-up text-4xl md:text-5xl font-bold">Three Steps to a Faster Workflow</h2>
                        </div>
                        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 hidden md:block"></div>
                            <div className="animate-on-scroll fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <div className="relative inline-block">
                                    <div className="w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center text-accent-cyan text-2xl font-bold">1</div>
                                </div>
                                <h3 className="text-xl font-bold mt-6 mb-2">Connect Securely</h3>
                                <p className="text-text-secondary">Install our lightweight connector plugin on your WordPress site to establish a secure, authenticated link with the console.</p>
                            </div>
                            <div className="animate-on-scroll fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className="relative inline-block">
                                    <div className="w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center text-accent-violet text-2xl font-bold">2</div>
                                </div>
                                <h3 className="text-xl font-bold mt-6 mb-2">Manage &amp; Analyze</h3>
                                <p className="text-text-secondary">Use the unified dashboard to manage assets, edit files, and run diagnostics. Let the Co-Pilot handle complex tasks for you.</p>
                            </div>
                             <div className="animate-on-scroll fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <div className="relative inline-block">
                                    <div className="w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center text-accent-green text-2xl font-bold">3</div>
                                </div>
                                <h3 className="text-xl font-bold mt-6 mb-2">Generate with AI</h3>
                                <p className="text-text-secondary">Describe your next plugin or theme. The AI generates the code, and you can install it directly to your site with a single click.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="testimonial" className="py-20 lg:py-32">
                     <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="animate-on-scroll zoom-in glass-card-landing p-10 md:p-16 text-center">
                            <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Testimonial author" className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-accent-violet/50 shadow-lg"/>
                            <p className="text-2xl font-medium leading-relaxed italic text-text-primary mb-6">"This tool has fundamentally changed how we approach WordPress projects. What used to take days now takes minutes. The AI Co-Pilot is like having a senior developer on call 24/7."</p>
                            <div>
                                <h4 className="font-bold text-lg text-text-primary">Alex Johnson</h4>
                                <p className="text-text-secondary">Lead Developer, Digital Agency</p>
                            </div>
                         </div>
                    </div>
                </section>
                
                <section className="py-20 lg:py-32">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="animate-on-scroll fade-in-up">
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 hero-glow-text">Ready to Revolutionize Your Workflow?</h2>
                            <p className="text-text-secondary mb-8 max-w-xl mx-auto text-lg">Stop wrestling with repetitive tasks and start creating. Launch the Dev-Console and experience the future of WordPress management.</p>
                            <button onClick={onEnterApp} className="btn-primary-landing !px-10 !py-4 !text-lg">Launch The Console</button>
                        </div>
                    </div>
                </section>
                
                 <footer className="py-16 border-t border-white/10 mt-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-secondary">
                        <p>&copy; {new Date().getFullYear()} Dev-Console. All rights reserved.</p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default LandingPage;