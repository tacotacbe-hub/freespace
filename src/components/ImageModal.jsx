import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';

const ImageModal = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-blue/90 backdrop-blur-xl cursor-zoom-out"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center pointer-events-none"
        >
          <button
            onClick={onClose}
            className="absolute top-0 right-0 md:-top-12 md:-right-12 p-3 text-white/70 hover:text-white transition-colors pointer-events-auto bg-white/10 hover:bg-white/20 rounded-full"
          >
            <X size={32} />
          </button>
          
          <div className="relative group pointer-events-auto">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="absolute bottom-6 left-6 right-6">
               <div className="bg-black/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                  <h3 className="text-white font-bold text-xl">{title}</h3>
               </div>
            </div>
          </div>
          
          <p className="mt-8 text-white/50 text-sm font-medium">
            Cliquez n'importe où pour fermer
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ImageModal;
