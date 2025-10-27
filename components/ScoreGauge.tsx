import React from 'react';

interface ScoreGaugeProps {
    score: number;
    title: string;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, title }) => {
    const percentage = Math.round(score * 100);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = (value: number) => {
        if (value >= 90) return 'text-accent-green';
        if (value >= 50) return 'text-accent-yellow';
        return 'text-accent-red';
    };

    const colorClass = getColor(percentage);

    return (
        <div className="flex flex-col items-center p-4 bg-background-secondary rounded-lg border border-border-primary">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                        className="text-border-primary"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                    />
                    <circle
                        className={`${colorClass} transition-all duration-1000 ease-in-out`}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                        transform="rotate(-90 60 60)"
                    />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${colorClass}`}>
                    {percentage}
                </span>
            </div>
            <p className="mt-2 text-sm font-semibold">{title}</p>
        </div>
    );
};

export default ScoreGauge;