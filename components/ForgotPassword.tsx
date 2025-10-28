import React, { useState } from 'react';
import { requestPasswordReset } from '../services/wordpressService';
import { HomeIcon } from './icons/Icons';

interface ForgotPasswordProps {
    onBackToLogin: () => void;
    onGoToLanding: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin, onGoToLanding }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const response = await requestPasswordReset(email);
            setMessage(response.message);
            setEmail('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen login-gradient-bg">
            <button onClick={onGoToLanding} className="absolute top-4 left-4 btn btn-secondary flex items-center space-x-2">
                <HomeIcon className="w-4 h-4" />
                <span>Back to Homepage</span>
            </button>
            <div className="w-full max-w-md p-8 space-y-8 glass-card">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-text-primary">Reset Password</h1>
                    <p className="mt-2 text-text-secondary">Enter your email to receive a reset link</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                     {error && <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-center text-accent-red/80">{error}</div>}
                     {message && <div className="p-3 bg-accent-green/20 border border-border rounded-md text-sm text-center text-accent-green">{message}</div>}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">Email address</label>
                        <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full btn btn-primary">
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center text-text-secondary">
                    <p>
                        <button type="button" onClick={onBackToLogin} className="font-medium text-text-secondary hover:text-text-primary focus:outline-none">
                           &larr; Back to Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;