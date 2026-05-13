import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';

const DatePickerModal = ({ isOpen, onClose, onSelect, bookedDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month, 1).getDay(); // 0 is Sunday
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const isoDate = date.toISOString().split('T')[0];

    if (bookedDates.includes(isoDate)) return;
    if (date < new Date().setHours(0,0,0,0)) return;

    setSelectedDate(date);
    onSelect(dateStr, isoDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-brand-blue transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-emerald/10 text-brand-emerald rounded-xl flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <h2 className="text-2xl font-bold text-brand-blue">Choisir une date</h2>
          </div>
          <p className="text-gray-500 text-sm">Sélectionnez le jour de votre occupation.</p>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-brand-blue">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-bold text-brand-blue capitalize">{monthName}</h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-brand-blue">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 mb-2">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: (firstDayOfMonth + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isoDate = date.toISOString().split('T')[0];
            const isBooked = bookedDates.includes(isoDate);
            const isPast = date < new Date().setHours(0,0,0,0);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();

            return (
              <button
                key={day}
                disabled={isBooked || isPast}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative group
                  ${isBooked ? 'bg-red-50 text-red-300 cursor-not-allowed opacity-50' : 
                    isPast ? 'text-gray-200 cursor-not-allowed' : 
                    isSelected ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' :
                    isToday ? 'bg-brand-emerald/10 text-brand-emerald font-bold' :
                    'text-gray-600 hover:bg-gray-50 hover:text-brand-blue'}
                `}
              >
                <span className="text-sm font-bold">{day}</span>
                {isBooked && <span className="text-[8px] absolute bottom-1">Complet</span>}
                {isSelected && <Check size={10} className="absolute top-1 right-1" />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-emerald/20 rounded-full" /> Aujourd'hui
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 rounded-full" /> Complet
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-blue rounded-full" /> Sélection
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DatePickerModal;
