import React from 'react';
import { ExecuteIcon } from './icons/Icons';

interface ActionConfirmationCardProps {
    functionCall: {
        name: string;
        args: any;
    };
    onConfirm: () => void;
    onCancel: () => void;
    disabled?: boolean;
}

const ActionConfirmationCard: React.FC<ActionConfirmationCardProps> = ({ functionCall, onConfirm, onCancel, disabled = false }) => {

    const getWarning = (functionName: string) => {
        switch(functionName) {
            case 'executeDbQuery':
            case 'writeFileContent':
            case 'deleteAsset':
            case 'installAsset':
                return { level: 'high', text: 'HIGH RISK: This action is potentially destructive and irreversible.' };
            case 'toggleAssetStatus':
                return { level: 'medium', text: 'Medium Risk: This will change the state of your site.' };
            default:
                return { level: 'low', text: 'Please review the action carefully before proceeding.'};
        }
    };

    const warning = getWarning(functionCall.name);
    const warningColor = warning.level === 'high' ? 'border-accent-red bg-accent-red/10' : warning.level === 'medium' ? 'border-accent-yellow bg-accent-yellow/10' : 'border-accent-blue bg-accent-blue/10';

    return (
        <div className={`mt-2 p-4 max-w-xl w-full border ${warningColor} rounded-lg`}>
            <h4 className="font-bold text-sm mb-2">Action Required: Confirm Execution</h4>
            <div className="bg-background p-2 rounded-md font-mono text-xs max-h-48 overflow-y-auto">
                <p><span className="text-accent-purple">{functionCall.name}</span>(</p>
                <div className="pl-4">
                    {Object.entries(functionCall.args).map(([key, value]) => {
                        let displayValue: string;
                        if (key === 'files' && Array.isArray(value)) {
                            displayValue = `[...array of ${value.length} files]`;
                        } else {
                            displayValue = String(value);
                        }
                        return (
                            <p key={key}>
                                <span className="text-accent-blue">{key}</span>: <span className="text-accent-green whitespace-pre-wrap break-all">"{displayValue.substring(0, 200)}{displayValue.length > 200 ? '...' : ''}"</span>
                            </p>
                        );
                    })}
                </div>
                <p>)</p>
            </div>
            <p className={`mt-3 text-xs ${warning.level === 'high' ? 'text-accent-red' : 'text-accent-yellow'}`}>{warning.text}</p>
            <div className="flex justify-end space-x-2 mt-3">
                <button onClick={onCancel} className="px-3 py-1 text-xs bg-background-secondary hover:bg-border-primary rounded">Cancel</button>
                <button 
                    onClick={onConfirm}
                    disabled={disabled}
                    className="px-3 py-1 text-xs bg-accent-green hover:bg-accent-green-hover text-white rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ExecuteIcon className="w-3 h-3 mr-1"/>
                    {disabled ? 'Connect to Site to Execute' : 'Execute'}
                </button>
            </div>
        </div>
    );
};

export default ActionConfirmationCard;