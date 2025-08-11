import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Github, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { User as UserType } from '../types';

interface SignUpProps {
  onSignUp: (user: UserType) => void;
  onSwitchToSignIn: () => void;
  onBack: () => void;
}

export function SignUp({ onSignUp, onSwitchToSignIn, onBack }: SignUpProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      setIsLoading(false);
      return;
    }

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const user = {
        id: '1',
        name,
        email,
        settings: {
          theme: 'system' as const,
          language: 'English',
          notifications: true,
          autoTranslate: false,
          saveHistory: true,
          voiceSettings: {
            speed: 1.0,
            pitch: 1.0,
            voice: 'alloy'
          }
        }
      };
      onSignUp(user);
    } catch {
      setError('Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = (provider: string) => {
    setIsLoading(true);
    
    setTimeout(() => {
      const user = {
        id: '1',
        name: `User from ${provider}`,
        email: `user@${provider.toLowerCase()}.com`,
        settings: {
          theme: 'system' as const,
          language: 'English',
          notifications: true,
          autoTranslate: false,
          saveHistory: true,
          voiceSettings: {
            speed: 1.0,
            pitch: 1.0,
            voice: 'alloy'
          }
        }
      };
      onSignUp(user);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        {/* Header */}
        <motion.div
          className="flex items-center mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white/80 hover:text-white mr-4"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-light text-white">Create account</h1>
            <p className="text-white/70 mt-1">Join Verbio and start translating</p>
          </div>
        </motion.div>

        {/* Sign Up Form */}
        <motion.div
          className="bg-white/20 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="name" className="text-white/90 font-medium">
                Full Name
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="pl-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 rounded-2xl h-14 focus:bg-white/15 focus:border-white/50"
                  required
                />
              </div>
            </motion.div>

            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label htmlFor="email" className="text-white/90 font-medium">
                Email
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 rounded-2xl h-14 focus:bg-white/15 focus:border-white/50"
                  required
                />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label htmlFor="password" className="text-white/90 font-medium">
                Password
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="pl-12 pr-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 rounded-2xl h-14 focus:bg-white/15 focus:border-white/50"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Label htmlFor="confirmPassword" className="text-white/90 font-medium">
                Confirm Password
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-12 pr-12 bg-white/10 border-white/30 text-white placeholder:text-white/60 rounded-2xl h-14 focus:bg-white/15 focus:border-white/50"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </motion.div>

            {/* Terms and Conditions */}
            <motion.div
              className="flex items-start space-x-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
              />
              <Label htmlFor="terms" className="text-white/80 text-sm leading-5">
                I agree to the{' '}
                <button type="button" className="text-white underline hover:text-white/80">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-white underline hover:text-white/80">
                  Privacy Policy
                </button>
              </Label>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-300 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign Up Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 rounded-2xl shadow-lg disabled:opacity-50 h-14"
              >
                {isLoading ? (
                  <motion.div
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  'Create Account'
                )}
              </Button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div
            className="flex items-center my-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="px-4 text-white/60 text-sm">or</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </motion.div>

          {/* Social Sign Up */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialSignUp('Google')}
              disabled={isLoading}
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/15 hover:border-white/50 font-medium py-3 rounded-2xl h-12"
            >
              <Chrome className="h-5 w-5 mr-3" />
              Continue with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialSignUp('GitHub')}
              disabled={isLoading}
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/15 hover:border-white/50 font-medium py-3 rounded-2xl h-12"
            >
              <Github className="h-5 w-5 mr-3" />
              Continue with GitHub
            </Button>
          </motion.div>

          {/* Sign In Link */}
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <p className="text-white/70">
              Already have an account?{' '}
              <Button
                type="button"
                variant="ghost"
                onClick={onSwitchToSignIn}
                className="text-white hover:text-white/80 font-medium p-0 h-auto underline"
              >
                Sign in
              </Button>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}