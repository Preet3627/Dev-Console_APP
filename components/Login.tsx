import React, { useState } from 'react';
import { PM_SHRI_Logo, GoogleIcon } from './icons/Icons';
import { loginUser, signInWithGoogle } from '../services/wordpressService';
import { triggerSignIn } from '../services/googleAuthService';
import { AppSettings, SiteData } from '../types';

interface LoginProps {
    onLogin: (userData: { email: string, token: string, isAdmin: boolean, settings: AppSettings, siteData?: SiteData | null }) => void;
    onNavigateToSignUp: () => void;
    onNavigateToForgotPassword: () => void;
    onNavigateToVerification: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigateToSignUp, onNavigateToForgotPassword, onNavigateToVerification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const userData = await loginUser(email, password);
            onLogin(userData);
        } catch (err) {
            if ((err as any).cause === 'NOT_VERIFIED') {
                setError((err as Error).message);
                setTimeout(() => {
                    onNavigateToVerification(email);
                }, 3000);
            } else {
                setError((err as Error).message);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        try {
            const googleToken = await triggerSignIn();
            const userData = await signInWithGoogle(googleToken);
            onLogin(userData);
        } catch (err) {
            setError(typeof err === 'string' ? err : (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen login-gradient-bg">
            <div className="w-full max-w-md p-8 space-y-6 glass-card">
                <div className="text-center">
                    <PM_SHRI_Logo className="w-24 h-24 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-text-primary tracking-wider">Dev-Console</h1>
                    <p className="mt-2 text-text-secondary">Sign in to continue</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                     {error && <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-center text-accent-red/80">{error}</div>}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">Email address</label>
                        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="password"className="block text-sm font-medium text-text-primary mb-1">Password</label>
                            <div className="text-sm">
                                <button type="button" onClick={onNavigateToForgotPassword} className="font-medium text-accent-blue hover:text-accent-blue-hover focus:outline-none">
                                    Forgot password?
                                </button>
                            </div>
                        </div>
                        <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full btn btn-primary">
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background-secondary text-text-secondary">Or continue with</span>
                        </div>
                    </div>
                     <div>
                        <button type="button" onClick={handleGoogleSignIn} disabled={isLoading} className="w-full btn btn-secondary flex items-center justify-center">
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            {isLoading ? 'Signing in...' : 'Sign in with Google'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center text-text-secondary">
                    <p>
                        Don't have an account?{' '}
                        <button type="button" onClick={onNavigateToSignUp} className="font-medium text-accent-blue hover:text-accent-blue-hover underline focus:outline-none">
                            Sign up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;