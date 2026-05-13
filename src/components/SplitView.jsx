import React from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import SpaceCard from './SpaceCard';
import CTAAddSpace from './CTAAddSpace';
import { MapPin } from 'lucide-react';

const SplitView = ({ filteredSpaces, mapCenter, mapZoom, MapController }) => {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] lg:h-[800px] gap-0 rounded-3xl overflow-hidden border border-gray-100 shadow-2xl bg-white">
      {/* Left List Pane */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full overflow-y-auto p-6 lg:p-8 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSpaces.map((space) => (
            <SpaceCard key={space.id} {...space} />
          ))}
          {filteredSpaces.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 font-medium">
              Aucun espace ne correspond à votre recherche.
            </div>
          )}
        </div>
        
        {/* CTA inside split view list */}
        <div className="mt-12 mb-8">
           <CTAAddSpace />
        </div>
      </div>

      {/* Right Map Pane */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full relative z-0">
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <MapController center={mapCenter} zoom={mapZoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredSpaces.map(space => (
            <Marker key={space.id} position={[space.lat, space.lng]}>
              <Popup className="custom-popup">
                <div className="p-2 w-48">
                  <img src={space.image} className="w-full h-24 object-cover rounded-lg mb-2" />
                  <h3 className="font-bold text-brand-blue text-sm">{space.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{space.price}€ / jour</p>
                  <Link to={`/space/${space.id}`} className="text-xs font-bold text-brand-emerald hover:underline">
                    Voir les détails
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default SplitView;
