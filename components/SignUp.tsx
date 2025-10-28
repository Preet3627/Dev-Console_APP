
import React, { useState } from 'react';
import { PM_SHRI_Logo, GoogleIcon, HomeIcon } from './icons/Icons';
import { registerUser, signInWithGoogle } from '../services/wordpressService';
import { triggerSignIn } from '../services/googleAuthService';
import { AppSettings, SiteData } from '../types';

interface SignUpProps {
    onBackToLogin: () => void;
    onNavigateToVerification: (email: string) => void;
    onLogin: (userData: { email: string; token: string; isAdmin: boolean; settings: AppSettings, sites: SiteData[], displayName?: string, profilePictureUrl?: string | null, isNewUser?: boolean }) => void;
    // FIX: Add the onGoToLanding prop to match its usage in App.tsx.
    onGoToLanding: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onBackToLogin, onNavigateToVerification, onLogin, onGoToLanding }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await registerUser(email, password);
            // On success, navigate to verification. The backend will handle sending the email.
            // The backend now also handles cases where the user exists but isn't verified.
            if (response.success) {
                 onNavigateToVerification(email);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleSignUp = async () => {
        setError('');
        setIsLoading(true);
        try {
            const googleToken = await triggerSignIn();
            const userData = await signInWithGoogle(googleToken);
            onLogin(userData); // This will log the user in and switch the view
        } catch (err) {
            setError(typeof err === 'string' ? err : (err as Error).message);
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
                    <PM_SHRI_Logo className="w-24 h-24 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-text-primary tracking-wider">Create Account</h1>
                    <p className="mt-2 text-text-secondary">Start managing your sites with AI</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                     {error && <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-center text-accent-red/80">{error}</div>}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">Email address</label>
                        <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-text-primary mb-1">Password</label>
                        <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="•••••••• (8+ characters)" />
                    </div>
                     <div>
                        <label htmlFor="confirm-password"className="block text-sm font-medium text-text-primary mb-1">Confirm Password</label>
                        <input id="confirm-password" name="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full btn btn-primary">
                            {isLoading ? 'Creating Account...' : 'Sign Up with Email'}
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background-secondary text-text-secondary">Or</span>
                        </div>
                    </div>
                     <div>
                        <button type="button" onClick={handleGoogleSignUp} disabled={isLoading} className="w-full btn btn-secondary flex items-center justify-center">
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            {isLoading ? 'Processing...' : 'Sign up with Google'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center text-text-secondary">
                    <p>
                        Already have an account?{' '}
                        <button type="button" onClick={onBackToLogin} className="font-medium text-accent-blue hover:text-accent-blue-hover underline focus:outline-none">
                            Sign in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
