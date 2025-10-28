import React from 'react';
import { ExecuteIcon } from './icons/Icons';

interface ActionConfirmationModalProps {
    functionCall: {
        name: string;
        args: any;
    };
    onConfirm: () => void;
    onCancel: () => void;
    disabled?: boolean;
}

const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({ functionCall, onConfirm, onCancel, disabled = false }) => {

    const getWarning = (functionName: string) => {
        switch(functionName) {
            case 'executeArbitraryDbQuery':
            case 'writeFileContent':
            case 'deleteAsset':
            case 'installAsset':
                return { level: 'high', text: 'HIGH RISK: This action modifies your site files or database and may be irreversible.' };
            case 'toggleAssetStatus':
                return { level: 'medium', text: 'Medium Risk: This will change the state of your site.' };
            default:
                return { level: 'low', text: 'Please review the action carefully before proceeding.'};
        }
    };

    const warning = getWarning(functionCall.name);
    const warningColor = warning.level === 'high' ? 'border-accent-red' : warning.level === 'medium' ? 'border-accent-yellow' : 'border-accent-blue';

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-60 p-4">
            <div className={`bg-background-secondary rounded-lg shadow-2xl w-full max-w-2xl border ${warningColor} p-6 modal-content-animation`}>
                 <h2 className="text-2xl font-bold text-text-primary">Confirm AI Action</h2>
                 <p className="mt-2 text-text-secondary">The AI Co-Pilot wants to perform the following action. Please review it before confirming.</p>
                <div className={`mt-4 p-4 border ${warningColor} rounded-lg bg-background`}>
                    <div className="font-mono text-sm max-h-64 overflow-y-auto">
                        <p><span className="text-accent-purple">{functionCall.name}</span>(</p>
                        <div className="pl-4">
                            {Object.entries(functionCall.args).map(([key, value]) => {
                                let displayValue: string;
                                if (key === 'files' && Array.isArray(value)) {
                                    displayValue = `[...array of ${value.length} files]`;
                                } else if (typeof value === 'string') {
                                    displayValue = `"${value.substring(0, 300)}${value.length > 300 ? '...' : ''}"`;
                                } else {
                                    displayValue = JSON.stringify(value);
                                }
                                return (
                                    <p key={key}>
                                        <span className="text-accent-cyan">{key}</span>: <span className="text-accent-green whitespace-pre-wrap break-all">{displayValue}</span>
                                    </p>
                                );
                            })}
                        </div>
                        <p>)</p>
                    </div>
                    <p className={`mt-3 text-sm ${warning.level === 'high' ? 'text-accent-red' : 'text-accent-yellow'}`}>{warning.text}</p>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
                    <button 
                        onClick={onConfirm}
                        disabled={disabled}
                        className="btn btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ExecuteIcon className="w-4 h-4 mr-2"/>
                        {disabled ? 'Connect to Site to Execute' : 'Confirm & Execute'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionConfirmationModal;