import React from 'react';

interface DeleteConfirmationModalProps {
    assetName: string;
    assetType: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ assetName, assetType, onConfirm, onCancel, isLoading }) => {
    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-secondary rounded-lg shadow-2xl w-full max-w-lg border border-accent-red p-6">
                <h2 className="text-2xl font-bold text-accent-red">Confirm Deletion</h2>
                <p className="mt-4 text-text-primary">
                    Are you sure you want to permanently delete the {assetType} "<strong>{assetName}</strong>"? This action is irreversible and will remove all associated files from your WordPress site.
                </p>
                <div className="mt-6 flex justify-end space-x-4">
                    <button 
                        onClick={onCancel} 
                        disabled={isLoading}
                        className="px-6 py-2 bg-background hover:bg-border-primary rounded-md disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-6 py-2 bg-accent-red hover:opacity-90 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;