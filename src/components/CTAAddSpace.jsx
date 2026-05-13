import React from 'react';
import { motion } from 'framer-motion';
import { Building2, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTAAddSpace = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-20 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-brand-blue to-blue-900 p-8 md:p-16 text-white shadow-2xl shadow-brand-blue/20"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-emerald/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -ml-32 -mb-32" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6 text-brand-emerald font-bold text-sm backdrop-blur-md border border-white/5">
            <Zap size={16} /> Immobilier Circulaire
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Vous avez un espace à proposer ?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Ne laissez plus vos mètres carrés dormir. Rejoignez des centaines de propriétaires qui optimisent leurs revenus tout en dynamisant l'économie locale.
          </p>
        </div>
        
        <Link 
          to="/dashboard"
          className="group relative flex items-center gap-4 bg-white text-brand-blue px-10 py-6 rounded-3xl font-bold text-xl hover:scale-105 transition-all shadow-xl hover:shadow-2xl whitespace-nowrap"
        >
          <Building2 size={24} />
          <span>Ajouter mon espace</span>
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default CTAAddSpace;
