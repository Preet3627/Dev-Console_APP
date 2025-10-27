
import React, { useEffect } from 'react';
import { PM_SHRI_Logo, GenerateIcon, CoPilotIcon, ShieldIcon, SpeedIcon, FileIcon, DatabaseIcon } from './icons/Icons';

// FIX: Add a global declaration for 'window.hljs' to inform TypeScript about the Highlight.js library.
declare global {
  interface Window {
    hljs?: {
      highlightAll: () => void;
    };
  }
}


// Helper for dynamic class names
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface LandingPageProps {
  onEnterApp: () => void;
}

const sampleCode = `
<?php
/**
 * Plugin Name: Simple Contact Form
 * Description: Adds a contact form using a shortcode.
 * Version: 1.0
 * Author: AI Assistant
 */

function simple_contact_form_shortcode() {
    ob_start();
    ?>
    <form action="" method="post">
        <p>Your Name (required) <br/>
        <input type="text" name="cf-name" size="40" required /></p>
        <p>Your Email (required) <br/>
        <input type="email" name="cf-email" size="40" required /></p>
        <p>Message <br/>
        <textarea rows="10" cols="35" name="cf-message"></textarea></p>
        <p><input type="submit" name="cf-submitted" value="Send"/></p>
    </form>
    <?php
    return ob_get_clean();
}
add_shortcode('simple_contact_form', 'simple_contact_form_shortcode');
`.trim();

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
    
    useEffect(() => {
        document.body.classList.add('landing-body');
        
        // Initialize highlight.js
        if (window.hljs) {
            window.hljs.highlightAll();
        }

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
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                            <PM_SHRI_Logo className="h-8 w-8" />
                            <span className="text-xl font-bold tracking-wider">Dev-Console</span>
                        </div>
                        <div className="flex items-center">
                            <button onClick={onEnterApp} className="btn-primary-landing !py-2 !px-6 text-sm">Launch Console</button>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="overflow-x-hidden">
                <section className="relative flex items-center justify-center min-h-screen text-center">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="animate-on-scroll fade-in-up text-5xl md:text-7xl font-extrabold leading-tight mb-6" style={{ animationDelay: '0.1s' }}>
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
                
                <section className="relative py-20 lg:py-32">
                    <div className="text-center max-w-3xl mx-auto mb-12 animate-on-scroll fade-in-up">
                        <h2 className="text-4xl md:text-5xl font-bold">Dev-Console Dashboard</h2>
                        <p className="mt-4 text-lg text-text-secondary">Your entire WordPress workflow, beautifully unified in a single, elegant interface.</p>
                    </div>
                    <div className="animate-on-scroll zoom-in" style={{ animationDelay: '0.2s' }}>
                        <div className="relative max-w-7xl mx-auto" style={{ width: '95%' }}>
                           <img src="https://ponsrischool.in/wp-content/uploads/2025/10/dev.ponsrischool.in_S26-Ultra-scaled.png" alt="Dev-Console Dashboard" className="w-full h-auto shadow-2xl rounded-2xl" />
                        </div>
                    </div>
                </section>
                
                <section id="features" className="py-20 lg:py-32">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="animate-on-scroll fade-in-up text-4xl md:text-5xl font-bold">A Toolkit for Peak Performance</h2>
                            <p className="animate-on-scroll fade-in-up text-lg text-text-secondary mt-4" style={{ animationDelay: '0.1s' }}>Every feature is designed to eliminate friction and accelerate your creative process.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
                           {features.map((feature, i) => (
                                <div key={feature.title} className="animate-on-scroll fade-in-up glass-card-landing p-6 flex flex-col items-start" style={{ transitionDelay: `${(i * 0.1) + 0.1}s` }}>
                                    <div className="p-3 rounded-lg bg-background inline-block mb-4">
                                        <feature.Icon className={cn("w-8 h-8", colorMap[feature.color])} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
                                </div>
                           ))}
                        </div>
                    </div>
                </section>

                <section id="ai-demo" className="py-20 lg:py-32">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-center gap-12">
                            <div className="animate-on-scroll fade-in-up">
                                <h2 className="text-4xl md:text-5xl font-bold mb-4">Live AI in Action</h2>
                                <p className="text-lg text-text-secondary mb-6">Simply describe what you need. The AI understands your request, follows best practices, and generates fully functional code, complete with necessary headers and comments.</p>
                                <div className="glass-card-landing p-6">
                                    <p className="font-mono text-sm text-accent-cyan">"Generate a simple WordPress plugin that adds a contact form to a page using the shortcode [simple_contact_form]."</p>
                                </div>
                            </div>
                            <div className="animate-on-scroll zoom-in code-block-container" style={{ animationDelay: '0.2s' }}>
                                <pre><code className="language-php">{sampleCode}</code></pre>
                            </div>
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
