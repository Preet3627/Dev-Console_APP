import React from 'react';
import { GenerateIcon, CoPilotIcon, ShieldIcon, SpeedIcon, ConnectIcon } from './icons/Icons';

interface DashboardProps {
    onStartChat: (prompt: string) => void;
    isConnected: boolean;
    onConnect: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartChat, isConnected, onConnect }) => {
    
    const quickActions = [
        {
            title: 'Generate a Plugin',
            description: 'Create a new plugin from a text description.',
            icon: GenerateIcon,
            prompt: 'Help me create a new WordPress plugin.',
            color: 'violet'
        },
        {
            title: 'Scan for Vulnerabilities',
            description: 'Check your site for common security issues.',
            icon: ShieldIcon,
            prompt: 'Scan my website for security vulnerabilities.',
            color: 'red'
        },
        {
            title: 'Optimize Site Speed',
            description: 'Get recommendations to improve performance.',
            icon: SpeedIcon,
            prompt: 'How can I optimize the performance of my website?',
            color: 'green'
        },
        {
            title: 'Ask Co-Pilot Anything',
            description: 'Open-ended chat with the AI assistant.',
            icon: CoPilotIcon,
            prompt: '',
            color: 'cyan'
        }
    ];

    const colorMap: { [key: string]: { icon: string; border: string, shadow: string } } = {
        violet: { icon: 'text-accent-violet', border: 'hover:border-accent-violet', shadow: 'hover:shadow-glow-violet' },
        red: { icon: 'text-accent-red', border: 'hover:border-accent-red', shadow: 'hover:shadow-glow-red' },
        green: { icon: 'text-accent-green', border: 'hover:border-accent-green', shadow: 'hover:shadow-glow-green' },
        cyan: { icon: 'text-accent-cyan', border: 'hover:border-accent-cyan', shadow: 'hover:shadow-glow-cyan' },
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-2">Dev-Console Co-Pilot</h1>
            <p className="text-text-secondary text-lg mb-8">Your AI-powered WordPress management suite.</p>
            
            {!isConnected && (
                 <div className="mb-8 p-6 glass-card border-accent-red/50 flex items-center justify-between">
                     <div>
                         <h2 className="text-xl font-semibold text-accent-red">Site Not Connected</h2>
                         <p className="text-text-secondary mt-1">Connect to your WordPress site to manage plugins, themes, and more.</p>
                     </div>
                     <button onClick={onConnect} className="btn btn-primary flex items-center space-x-2">
                         <ConnectIcon className="w-4 h-4" />
                         <span>Connect Now</span>
                     </button>
                 </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action) => {
                    const classes = colorMap[action.color] || colorMap['cyan'];
                    return (
                        <button
                            key={action.title}
                            onClick={() => onStartChat(action.prompt)}
                            className={`group glass-card p-6 text-left transition-all duration-300 transform hover:-translate-y-1 ${classes.border} ${classes.shadow}`}
                        >
                            <div className={`p-3 rounded-lg bg-background inline-block mb-4 transition-transform duration-300 group-hover:scale-110`}>
                                <action.icon className={`w-8 h-8 ${classes.icon}`} />
                            </div>
                            <h2 className="text-lg font-semibold text-text-primary mb-2">{action.title}</h2>
                            <p className="text-sm text-text-secondary">
                                {action.description}
                            </p>
                        </button>
                    )
                })}
            </div>

             <div className="mt-12 p-6 glass-card">
                 <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
                 <ul className="list-disc list-inside space-y-2 text-text-secondary">
                     <li>Use the sidebar to navigate between different management tools.</li>
                     <li>Connect to your WordPress site via the "Connect" button in the header.</li>
                     <li>Use the AI Generator to create new plugins or themes from scratch.</li>
                     <li>The Co-Pilot chat is always available for questions or to perform actions.</li>
                 </ul>
             </div>
        </div>
    );
};

export default Dashboard;