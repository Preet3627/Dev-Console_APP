import React, { useState, useRef, useEffect } from 'react';
import { verifyUser, resendVerificationCode } from '../services/wordpressService';

interface VerificationProps {
    email: string;
    onVerificationSuccess: () => void;
    onBackToLogin: () => void;
}

const Verification: React.FC<VerificationProps> = ({ email, onVerificationSuccess, onBackToLogin }) => {
    const [code, setCode] = useState<string[]>(Array(6).fill(''));
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        // Allow only single digits
        if (/^[0-9]$/.test(value) || value === '') {
            const newCode = [...code];
            newCode[index] = value;
            setCode(newCode);

            // Move focus to the next input if a digit was entered
            if (value !== '' && index < 5) {
                inputsRef.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        // Move focus to the previous input on backspace if current is empty
        if (e.key === 'Backspace' && code[index] === '' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        if (/^[0-9]{6}$/.test(paste)) {
            const newCode = paste.split('');
            setCode(newCode);
            inputsRef.current[5]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResendMessage('');
        
        const verificationCode = code.join('');
        if (verificationCode.length !== 6) {
            setError('Please enter the complete 6-digit code.');
            return;
        }

        setIsLoading(true);
        
        try {
            await verifyUser(email, verificationCode);
            onVerificationSuccess();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResendCode = async () => {
        setResendMessage('');
        setError('');
        try {
            const response = await resendVerificationCode(email);
            setResendMessage(response.message);
            setCode(Array(6).fill(''));
            inputsRef.current[0]?.focus();
            setTimeout(() => setResendMessage(''), 5000);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen login-gradient-bg">
            <div className="w-full max-w-md p-8 space-y-8 glass-card">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-text-primary">Check your email</h1>
                    <p className="mt-2 text-text-secondary">We've sent a 6-digit code to <br/><strong className="text-text-primary">{email || 'your email address'}</strong></p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-center text-accent-red/80">{error}</div>}
                    {resendMessage && <div className="p-3 bg-accent-green/10 border border-accent-green/30 rounded-md text-sm text-center text-accent-green/80">{resendMessage}</div>}
                    
                    <div className="flex justify-center space-x-2" onPaste={handlePaste}>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                // FIX: Correct the ref callback function signature to not return a value.
                                ref={(el: HTMLInputElement | null) => { inputsRef.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                className="w-12 h-12 text-center text-2xl font-bold bg-background border border-border-primary rounded-md focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
                            />
                        ))}
                    </div>
                    
                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full btn btn-primary">
                            {isLoading ? 'Verifying...' : 'Verify Account'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center text-text-secondary">
                    <p>
                        Didn't receive the code?{' '}
                        <button type="button" onClick={handleResendCode} className="font-medium text-accent-blue hover:text-accent-blue-hover underline focus:outline-none">
                            Resend Code
                        </button>
                    </p>
                    <p className="mt-4">
                        <button type="button" onClick={onBackToLogin} className="font-medium text-text-secondary hover:text-text-primary focus:outline-none">
                           &larr; Back to Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Verification;