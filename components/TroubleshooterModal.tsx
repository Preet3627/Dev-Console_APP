import React from 'react';
import CoPilot from './CoPilot';
import { SiteData } from '../types';

interface TroubleshooterModalProps {
    onClose: () => void;
    siteData: SiteData | null;
    modalBgColor?: string;
}

const TroubleshooterModal: React.FC<TroubleshooterModalProps> = ({ onClose, siteData, modalBgColor }) => {
    // This component reuses the CoPilot component with a specific initial prompt
    // for troubleshooting, demonstrating component reuse.
    const initialPrompt = "I'm having an issue with my WordPress site. Can you help me troubleshoot it?";

    return (
        <CoPilot
            onClose={onClose}
            siteData={siteData}
            initialPrompt={initialPrompt}
            modalBgColor={modalBgColor}
        />
    );
};

export default TroubleshooterModal;
