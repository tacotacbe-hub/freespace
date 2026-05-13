import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, CheckCircle, ArrowRight, Loader2, Github, AlertCircle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendEmailVerification 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login', 'signup-email', 'signup-code', 'signup-password', 'signup-profile'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'guest'
  });

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || ''
        }));
        setMode('signup-profile');
      } else {
        onAuthSuccess(userDoc.data());
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send Verification Code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Mock code generation
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      
      // In a real app, this would call a server/cloud function
      console.log(`[DEV] Verification code for ${formData.email}: ${code}`);
      
      // Artificial delay to simulate sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMode('signup-code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (userEnteredCode === generatedCode) {
      setMode('signup-password');
    } else {
      setError('Code incorrect. Veuillez réessayer.');
    }
  };

  // Step 3: Create Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      // Success, move to profile
      setMode('signup-profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Finalize Profile
  const handleProfileComplete = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non authentifié");

      const profileData = {
        uid: user.uid,
        email: user.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: formData.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photoURL: user.photoURL || null
      };
      
      await setDoc(doc(db, 'users', user.uid), profileData);
      onAuthSuccess(profileData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        setMode('signup-profile');
      } else {
        onAuthSuccess(userDoc.data());
        onClose();
      }
    } catch (err) {
      setError('Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-blue/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-brand-blue transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-10">
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-8">
                  <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-blue/20">
                    <span className="text-white font-bold text-2xl">FS</span>
                  </div>
                  <h2 className="text-3xl font-bold text-brand-blue mb-2">Bon retour !</h2>
                  <p className="text-gray-500 font-medium">Connectez-vous pour accéder à vos espaces.</p>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-3.5 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all mb-6 disabled:opacity-50"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Continuer avec Google
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-gray-400 font-bold tracking-widest">ou par email</span></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="email" required placeholder="Email"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="password" required placeholder="Mot de passe"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>

                  {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}

                  <button 
                    type="submit" disabled={loading}
                    className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Se connecter'}
                  </button>
                </form>

                <p className="mt-8 text-center text-gray-500 font-medium">
                  Nouveau sur FreeSpace ?
                  <button onClick={() => setMode('signup-email')} className="ml-2 text-brand-emerald font-bold hover:underline">S'inscrire</button>
                </p>
              </motion.div>
            )}

            {/* SIGNUP STEP 1: EMAIL */}
            {mode === 'signup-email' && (
              <motion.div
                key="signup-email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-brand-blue mb-2">S'inscrire</h2>
                  <p className="text-gray-500 font-medium">Commençons par votre adresse email.</p>
                </div>

                <form onSubmit={handleSendCode} className="space-y-6">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="email" required placeholder="Email"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit" disabled={loading}
                    className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Continuer'}
                  </button>

                  <button type="button" onClick={() => setMode('login')} className="w-full text-gray-400 font-bold py-2">Retour</button>
                </form>
              </motion.div>
            )}

            {/* SIGNUP STEP 2: CODE */}
            {mode === 'signup-code' && (
              <motion.div
                key="signup-code"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-brand-emerald/10 text-brand-emerald rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-brand-blue mb-2">Code envoyé !</h2>
                  <p className="text-gray-500 font-medium">Saisissez le code de vérification envoyé à <br/><span className="text-brand-blue font-bold">{formData.email}</span></p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <input 
                    type="text" required placeholder="123456" maxLength={6}
                    className="w-full text-center text-3xl tracking-[1em] font-bold py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all"
                    value={userEnteredCode}
                    onChange={(e) => setUserEnteredCode(e.target.value)}
                  />

                  {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">{error}</div>}

                  <button 
                    type="submit"
                    className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all"
                  >
                    Vérifier le code
                  </button>

                  <button type="button" onClick={() => setMode('signup-email')} className="w-full text-gray-400 font-bold py-2">Changer d'email</button>
                </form>
              </motion.div>
            )}

            {/* SIGNUP STEP 3: PASSWORD */}
            {mode === 'signup-password' && (
              <motion.div
                key="signup-password"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-brand-blue mb-2">Sécurisez votre compte</h2>
                  <p className="text-gray-500 font-medium">Choisissez un mot de passe robuste.</p>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-6">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="password" required placeholder="Mot de passe" minLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit" disabled={loading}
                    className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Suivant'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* SIGNUP STEP 4: PROFILE */}
            {mode === 'signup-profile' && (
              <motion.div
                key="signup-profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-brand-blue mb-2">Dernière étape !</h2>
                  <p className="text-gray-500 font-medium">Finalisez votre profil public.</p>
                </div>

                <form onSubmit={handleProfileComplete} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        required placeholder="Prénom"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <input 
                        required placeholder="Nom"
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      required placeholder="Téléphone"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-brand-emerald focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Type de profil</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'guest', label: 'Client' },
                        { id: 'host', label: 'Hôte' },
                        { id: 'both', label: 'Les deux' }
                      ].map((r) => (
                        <button
                          key={r.id} type="button"
                          onClick={() => setFormData({...formData, role: r.id})}
                          className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                            formData.role === r.id 
                            ? 'border-brand-emerald bg-brand-emerald/5 text-brand-emerald' 
                            : 'border-gray-100 text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={loading}
                    className="w-full bg-brand-emerald text-brand-blue py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Créer mon compte'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
