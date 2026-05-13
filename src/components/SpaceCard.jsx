import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, Heart, Star } from 'lucide-react';

const SpaceCard = ({ id, title, location, price, image, features, rating = 4.9 }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="group relative flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-2xl mb-3 bg-gray-100">
        <Link to={`/space/${id}`}>
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        </Link>
        
        {/* Verification Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-brand-blue shadow-sm">
          <ShieldCheck size={12} className="text-brand-emerald" />
          VÉRIFIÉ
        </div>

        {/* Favorite Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-3 right-3 p-2 transition-transform active:scale-90"
        >
          <Heart 
            size={24} 
            className={`transition-colors drop-shadow-md ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white fill-black/20 hover:text-white'}`} 
          />
        </button>
      </div>

      {/* Info Container */}
      <Link to={`/space/${id}`} className="flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-base text-gray-900 truncate pr-4">{title}</h3>
          <div className="flex items-center gap-1 text-sm font-medium">
            <Star size={14} className="fill-black" />
            <span>{rating}</span>
          </div>
        </div>
        
        <p className="text-gray-500 text-sm flex items-center gap-1 mb-1">
          <MapPin size={14} /> {location}
        </p>
        
        <div className="flex items-center gap-2 mb-3">
          {features?.slice(0, 2).map((f, i) => (
            <span key={i} className="text-[11px] text-gray-400">
              • {f}
            </span>
          ))}
        </div>

        <div className="mt-auto">
          <p className="text-gray-900 font-semibold">
            {price}€ <span className="font-normal text-gray-500">/ jour</span>
          </p>
        </div>
      </Link>
    </div>
  );
};

export default SpaceCard;
