// Trigger Vercel rebuild - 2026-05-13
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Link, useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, CheckCircle, Leaf, Euro, Zap, Menu, User, Filter, ShieldCheck, ArrowLeft, ArrowRight, Share2, Heart, Info, Clock, Building2, Users, X, Map as MapIcon, Grid, LogOut, Mail, Lock, Columns, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import jsPDF from 'jspdf';
import 'leaflet/dist/leaflet.css';
import { SPACES as MOCK_SPACES } from './data';
import { auth, db, storage, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  query, 
  where, 
  serverTimestamp,
  getDocs,
  setDoc 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

import SpaceCard from './components/SpaceCard';
import SplitView from './components/SplitView';
import ImageModal from './components/ImageModal';
import CTAAddSpace from './components/CTAAddSpace';
import DatePickerModal from './components/DatePickerModal';
import { MessageModal, MessagingPanel } from './components/MessagingView';
import AuthModal from './components/AuthModal';

// Fix Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- UTILS ---

const generateConventionPDF = (space, date) => {
  const doc = new jsPDF();
  const dateStr = date ? `le ${date}` : "prochainement";
  
  doc.setFontSize(22);
  doc.setTextColor(2, 62, 138); // Brand Blue
  doc.text("CONVENTION D'OCCUPATION PRÉCAIRE", 105, 40, { align: "center" });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Réf: FS-${space.id.toUpperCase()}-2024`, 105, 50, { align: "center" });
  
  doc.setDrawColor(16, 185, 129); // Brand Emerald
  doc.setLineWidth(1);
  doc.line(20, 60, 190, 60);
  
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("1. PARTIES", 20, 80);
  doc.setFont("helvetica", "normal");
  doc.text(`Propriétaire : ${space.host}`, 25, 90);
  doc.text(`Occupant : Utilisateur FreeSpace`, 25, 100);
  
  doc.setFont("helvetica", "bold");
  doc.text("2. OBJET", 20, 120);
  doc.setFont("helvetica", "normal");
  doc.text(`Mise à disposition de l'espace : ${space.title}`, 25, 130);
  doc.text(`Localisation : ${space.location}`, 25, 140);
  
  doc.setFont("helvetica", "bold");
  doc.text("3. DURÉE ET PRIX", 20, 160);
  doc.setFont("helvetica", "normal");
  doc.text(`Date d'occupation : ${dateStr}`, 25, 170);
  doc.text(`Redevance : ${space.price} EUR HTVA / jour`, 25, 180);
  
  doc.setFontSize(10);
  doc.setTextColor(150);
  const terms = "Cette convention est établie dans le cadre d'une occupation précaire visant à l'optimisation des ressources immobilières circulaires. Elle ne constitue en aucun cas un bail commercial.";
  doc.text(doc.splitTextToSize(terms, 170), 20, 210);
  
  doc.save(`Convention_FreeSpace_${space.id}.pdf`);
};

// --- SHARED COMPONENTS ---

const Header = ({ onOpenAuth, user, userProfile, unreadCount }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex items-center justify-between border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">FS</span>
          </div>
          <span className="text-2xl font-bold text-brand-blue tracking-tight">FreeSpace</span>
        </Link>
      </div>
      
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
        <Link to="/" className="hover:text-brand-blue transition-colors">Accueil</Link>
        <Link to="/concept" className="hover:text-brand-blue transition-colors">Concept</Link>
      </nav>
      
      <div className="flex items-center gap-4">
        {!user && (
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard"
              className="hidden sm:flex items-center gap-2 text-brand-blue font-bold text-sm px-4 py-2 rounded-full border-2 border-brand-blue/10 hover:bg-brand-blue/5 transition-all"
            >
              <Building2 size={16} />
              Ajouter un espace
            </Link>
            <button 
              onClick={onOpenAuth}
              className="bg-brand-blue text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-brand-blue/20"
            >
              Connexion
            </button>
          </div>
        )}
        {user && (
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 hover:border-brand-blue/20 transition-all group relative">
              <div className="relative">
                <div className="w-8 h-8 bg-brand-emerald rounded-full flex items-center justify-center text-brand-blue font-bold text-xs overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    (userProfile?.firstName?.charAt(0) || user.email.charAt(0)).toUpperCase()
                  )}
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-bold text-brand-blue text-sm">
                {userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : (user.displayName || user.email.split('@')[0])}
              </span>
            </Link>
          </div>
        )}
        <button className="md:hidden">
          <Menu />
        </button>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="bg-gray-900 text-white py-20 px-6 mt-auto">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-brand-emerald rounded-xl flex items-center justify-center">
            <span className="text-brand-blue font-bold text-xl">FS</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">FreeSpace</span>
        </div>
        <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
          La marketplace de référence pour l'optimisation des actifs immobiliers professionnels en Brabant Wallon.
        </p>
      </div>
      
      <div>
        <h4 className="font-bold mb-6">Plateforme</h4>
        <ul className="space-y-4 text-gray-400 text-sm">
          <li><Link to="/" className="hover:text-brand-emerald transition-colors">Trouver un espace</Link></li>
          <li><Link to="/" className="hover:text-brand-emerald transition-colors">Proposer un espace</Link></li>
          <li><Link to="/" className="hover:text-brand-emerald transition-colors">Charte de Confiance</Link></li>\n          <li><Link to="/help" className="hover:text-brand-emerald transition-colors">Centre d'aide</Link></li>
        </ul>
      </div>
      
      <div>
        <h4 className="font-bold mb-6">Légal</h4>
        <ul className="space-y-4 text-gray-400 text-sm">
          <li><a href="#" className="hover:text-brand-emerald transition-colors">Mentions Légales</a></li>
          <li><Link to="/contact" className="hover:text-brand-emerald transition-colors">Contact</Link></li>
        </ul>
      </div>
    </div>
  </footer>
);

// --- HOME PAGE COMPONENTS ---

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const HomePage = ({ spaces }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchType = searchParams.get('type') || '';
  const searchLoc = searchParams.get('loc') || '';
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'map', or 'split'
  const [mapSearch, setMapSearch] = useState('');
  const [mapCenter, setMapCenter] = useState([50.65, 4.45]);
  const [mapZoom, setMapZoom] = useState(10);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const updateSearchParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleMapSearch = async (e) => {
    e.preventDefault();
    if (!mapSearch.trim()) return;
    setIsSearchingMap(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}&limit=1&countrycodes=be`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const filteredSpaces = useMemo(() => {
    return spaces.filter(s => {
      const spaceTypes = Array.isArray(s.type) ? s.type : [s.type];
      const matchesType = searchType === '' || spaceTypes.some(t => t.toLowerCase().includes(searchType.toLowerCase()));
      const matchesLoc = s.location.toLowerCase().includes(searchLoc.toLowerCase());
      return matchesType && matchesLoc;
    });
  }, [searchType, searchLoc, spaces]);

  return (
    <div className="bg-white min-h-screen flex flex-col pt-[73px]">
      {/* Fixed Sub-Header for Search */}
      <div className="sticky top-[73px] left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-full shadow-md hover:shadow-lg transition-shadow border border-gray-200 p-1 flex items-center"
          >
            <div className="flex-1 flex items-center gap-3 px-6 py-2 border-r border-gray-100">
              <Search className="text-brand-blue" size={18} />
              <input 
                id="search-type"
                list="types-list"
                type="text" 
                placeholder="Quel type d'espace ?" 
                className="w-full bg-transparent outline-none text-sm font-medium"
                value={searchType}
                onChange={(e) => updateSearchParam('type', e.target.value)}
              />
              <datalist id="types-list">
                <option value="Réunion" />
                <option value="Stockage" />
                <option value="Atelier" />
                <option value="Bureau" />
                <option value="Entrepôt" />
                <option value="Coworking" />
              </datalist>
            </div>
            <div className="flex-1 flex items-center gap-3 px-6 py-2">
              <MapPin className="text-gray-400" size={18} />
              <input 
                id="search-loc"
                list="locations-list"
                type="text" 
                placeholder="Où ça ?" 
                className="w-full bg-transparent outline-none text-sm font-medium"
                value={searchLoc}
                onChange={(e) => updateSearchParam('loc', e.target.value)}
              />
              <datalist id="locations-list">
                <option value="Nivelles" />
                <option value="Wavre" />
                <option value="Genappe" />
                <option value="Braine-l'Alleud" />
                <option value="Ottignies-Louvain-la-Neuve" />
                <option value="Waterloo" />
              </datalist>
            </div>
            <button 
              onClick={() => document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-brand-blue text-white p-3 rounded-full hover:scale-105 transition-transform"
            >
              <Search size={18} />
            </button>
          </motion.div>
        </div>


      </div>

      {/* Marketplace */}
      <main id="marketplace" className="flex-grow pt-12 pb-24 px-6 bg-white">
        <div className="max-w-[1600px] mx-auto">


          <AnimatePresence mode="wait">
            {viewMode === 'grid' && (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10"
              >
                {filteredSpaces.map((space) => (
                  <SpaceCard key={space.id} {...space} />
                ))}
                {filteredSpaces.length === 0 && (
                  <div className="col-span-full py-40 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                      <Search size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Aucun résultat</h3>
                    <p className="text-gray-500 mt-2">Essayez d'ajuster vos filtres ou votre recherche.</p>
                  </div>
                )}
              </motion.div>
            )}
            
            {viewMode === 'split' && (
              <motion.div 
                key="split"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-200px)] rounded-3xl overflow-hidden shadow-sm border border-gray-100"
              >
                 <SplitView 
                   filteredSpaces={filteredSpaces} 
                   mapCenter={mapCenter} 
                   mapZoom={mapZoom} 
                   MapController={MapController} 
                 />
              </motion.div>
            )}

            {viewMode === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-250px)] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative z-0"
              >
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
                  <form onSubmit={handleMapSearch} className="relative group">
                    <div className="relative flex items-center bg-white rounded-2xl shadow-2xl border border-gray-100 p-1">
                      <div className="flex-1 flex items-center gap-3 px-4 py-2">
                        <MapPin className={isSearchingMap ? "text-brand-emerald animate-pulse" : "text-gray-400"} size={18} />
                        <input 
                          type="text" 
                          placeholder="Chercher une ville..." 
                          className="w-full bg-transparent outline-none text-sm"
                          value={mapSearch}
                          onChange={(e) => setMapSearch(e.target.value)}
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={isSearchingMap}
                        className="bg-brand-blue text-white px-6 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-all text-xs disabled:opacity-50"
                      >
                        Aller
                      </button>
                    </div>
                  </form>
                </div>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating View Toggle (Airbnb Style) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setViewMode(viewMode === 'map' ? 'grid' : 'map')}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          {viewMode === 'map' ? (
            <>
              <Grid size={18} />
              <span>Afficher la liste</span>
            </>
          ) : (
            <>
              <MapIcon size={18} />
              <span>Afficher la carte</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const ConceptPage = () => (
  <div className="bg-white pt-32 pb-20">
    <div className="max-w-4xl mx-auto px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-emerald/10 text-brand-emerald rounded-full mb-6 font-semibold text-sm">
          <Leaf size={16} /> Économie Circulaire
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-brand-blue mb-6">Le Manifeste FreeSpace</h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          Parce que l'espace le plus écologique est celui qui est déjà construit.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-brand-blue">Notre Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            FreeSpace est né d'un constat simple : des milliers de mètres carrés de bureaux, d'ateliers et d'entrepôts restent vides 70% du temps en Brabant Wallon. Parallèlement, des entrepreneurs, des artisans et des porteurs de projets peinent à trouver des espaces abordables et flexibles.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Nous avons créé cette marketplace pour connecter ces deux mondes. Notre objectif est de transformer les "actifs dormants" en ressources partagées, favorisant ainsi une croissance économique locale et durable.
          </p>
        </div>
        <div className="bg-brand-blue/5 p-8 rounded-[2rem] border border-brand-blue/10 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-emerald">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="font-bold text-brand-blue">Optimisation</h4>
              <p className="text-sm text-gray-500">Réduire le gaspillage spatial</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-blue">
              <Users size={24} />
            </div>
            <div>
              <h4 className="font-bold text-brand-blue">Proximité</h4>
              <p className="text-sm text-gray-500">Renforcer le tissu local</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-emerald">
              <Leaf size={24} />
            </div>
            <div>
              <h4 className="font-bold text-brand-blue">Durabilité</h4>
              <p className="text-sm text-gray-500">Minimiser l'empreinte carbone</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-white p-12 rounded-[3rem] text-center">
        <h2 className="text-3xl font-bold mb-6">Prêt à libérer votre espace ?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Rejoignez le mouvement de l'immobilier circulaire et générez des revenus tout en aidant les entrepreneurs de votre région.
        </p>
        <Link to="/dashboard" className="inline-block bg-brand-emerald text-brand-blue px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform">
          Proposer mon espace
        </Link>
      </div>
    </div>
  </div>
);

// --- DETAIL PAGE ---

const SpaceDetailPage = ({ spaces, user, onBook, onOpenAuth }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const space = spaces.find(s => s.id === id);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'bookings'), 
      where('spaceId', '==', id),
      where('status', '==', 'confirmed')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.data().date);
      setBookedDates(dates);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!space) return <div className="pt-32 text-center h-screen">Espace non trouvé.</div>;

  return (
    <div className="bg-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Navigation / Actions */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-brand-blue font-semibold hover:underline"
          >
            <ArrowLeft size={20} /> Retour aux espaces
          </button>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600">
              <Share2 size={20} />
            </button>
            <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600">
              <Heart size={20} />
            </button>
          </div>
        </div>

        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-bold text-brand-blue mb-4"
        >
          {space.title}
        </motion.h1>
        <p className="flex items-center gap-1 text-gray-500 mb-8 font-medium">
          <MapPin size={18} /> {space.location}
        </p>

        {/* Gallery Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12"
        >
          <div className="md:col-span-2 md:row-span-2 overflow-hidden rounded-l-3xl relative cursor-pointer group" onClick={() => setSelectedImage(space.images[0])}>
            <img src={space.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="View 1" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
            </div>
          </div>
          <div className="overflow-hidden relative cursor-pointer group" onClick={() => setSelectedImage(space.images[1] || space.image)}>
            <img src={space.images[1] || space.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="View 2" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
            </div>
          </div>
          <div className="overflow-hidden rounded-tr-3xl relative cursor-pointer group" onClick={() => setSelectedImage(space.images[2] || space.image)}>
            <img src={space.images[2] || space.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="View 3" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
            </div>
          </div>
          <div className="overflow-hidden relative cursor-pointer group" onClick={() => setSelectedImage(space.image)}>
            <img src={space.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="View 4" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
            </div>
          </div>
          <div className="overflow-hidden rounded-br-3xl relative cursor-pointer group" onClick={() => setSelectedImage(space.image)}>
            <img src={space.image} className="w-full h-full object-cover blur-[2px] opacity-60 group-hover:scale-105 transition-all duration-700" alt="More" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center flex-col">
              <div className="text-brand-blue font-bold text-lg group-hover:text-brand-emerald transition-colors">
                Voir toutes les photos
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-8 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-brand-blue mb-2">Proposé par {space.host}</h2>
                <div className="flex gap-4 text-gray-500 text-sm">
                  <span className="flex items-center gap-1"><Building2 size={16}/> {space.type}</span>
                  <span className="flex items-center gap-1"><Users size={16}/> {space.capacity}</span>
                  <span className="flex items-center gap-1"><Zap size={16}/> {space.area}</span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-2 border-brand-emerald">
                <Building2 size={32} className="text-brand-blue" />
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-xl font-bold text-brand-blue mb-4">À propos de cet espace</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {space.description}
              </p>
            </div>

            <div className="mb-12">
              <h3 className="text-xl font-bold text-brand-blue mb-6">Équipements et services</h3>
              <div className="grid grid-cols-2 gap-y-4">
                {space.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="text-brand-emerald" size={20} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact Dashboard */}
            <div className="mb-12 bg-gradient-to-br from-brand-blue to-blue-900 rounded-[2.5rem] p-10 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-emerald/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Leaf className="text-brand-emerald" />
                  <span className="uppercase tracking-widest text-xs font-bold opacity-80">Score d'Impact Circulaire</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="text-4xl font-bold flex items-baseline gap-1">
                      {parseInt(space.area) > 50 ? 'A' : 'A'}
                      <span className="text-brand-emerald text-sm">+</span>
                    </div>
                    <p className="text-sm opacity-60">Indice de circularité</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-emerald h-full w-[94%]" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{(parseInt(space.area) * 0.25).toFixed(1)}kg</div>
                    <p className="text-sm opacity-60">CO2 évité / jour</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-emerald h-full w-[88%]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-3xl font-bold">100%</div>
                    <p className="text-sm opacity-60">Local & Circulaire</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-emerald h-full w-full" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 text-sm opacity-80 leading-relaxed">
                  En occupant cet espace existant plutôt qu'en louant un espace dédié neuf, vous contribuez directement à la réduction de l'artificialisation des sols en Brabant Wallon.
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-xl font-bold text-brand-blue mb-6">Localisation</h3>
              <div className="h-[300px] rounded-[2rem] overflow-hidden border border-gray-100 shadow-lg relative z-0">
                <MapContainer center={[space.lat || 50.65, space.lng || 4.45]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[space.lat || 50.65, space.lng || 4.45]}>
                    <Popup>{space.title}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>

          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-3xl font-bold text-brand-blue">{space.price}€</span>
                  <span className="text-gray-500 ml-1">/ jour</span>
                </div>
                <div className="text-brand-emerald flex items-center gap-1 text-sm font-bold bg-brand-emerald/10 px-3 py-1 rounded-full">
                  <Zap size={14} /> Réservation instantanée
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Période</label>
                  <button 
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-full border border-gray-200 rounded-2xl p-5 flex items-center justify-between group hover:border-brand-blue/50 transition-all bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="text-brand-blue" size={20} />
                      <span className="text-sm font-bold text-brand-blue">
                        {selectedDate ? (Array.isArray(selectedDate) ? `${selectedDate.length} jours` : selectedDate) : "Choisir une date"}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Usage prévu</label>
                  <div className="w-full border border-gray-200 rounded-2xl p-5 flex items-center gap-3 bg-gray-50/50">
                    <Zap className="text-brand-emerald" size={20} />
                    <span className="text-sm font-bold text-gray-700">{space.type}</span>
                  </div>
                </div>

                <DatePickerModal 
                  isOpen={isDatePickerOpen}
                  onClose={() => setIsDatePickerOpen(false)}
                  onSelect={(dateDisplay, dates) => setSelectedDate(dates)}
                  bookedDates={bookedDates}
                  multiSelect={true}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if(!selectedDate) return alert("Veuillez sélectionner une date.");
                    onBook(space, selectedDate);
                  }}
                  disabled={!selectedDate}
                  className={`w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-xl 
                    ${selectedDate ? 'bg-brand-blue text-white hover:bg-opacity-90 shadow-brand-blue/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                >
                  Réserver l'espace
                </button>
                
                <button 
                  onClick={() => {
                    if (!auth.currentUser) {
                      onOpenAuth();
                      return;
                    }
                    setIsMessageModalOpen(true);
                  }}
                  className="w-full py-4 rounded-2xl font-bold text-brand-blue border-2 border-brand-blue/10 hover:bg-brand-blue/5 transition-all flex items-center justify-center gap-2"
                >
                  <Mail size={18} /> Contacter l'hôte
                </button>
              </div>

              <MessageModal 
                isOpen={isMessageModalOpen} 
                onClose={() => setIsMessageModalOpen(false)} 
                space={space}
                user={user}
              />

              <p className="text-center text-sm text-gray-400 my-6">
                Vous ne serez débité qu'après validation de l'hôte.
              </p>

              <div className="border-t border-gray-100 pt-8 space-y-4">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Tarif journalier</span>
                  <span>{space.price}€</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Frais de service</span>
                  <span>12€</span>
                </div>
                <div className="flex justify-between text-brand-blue font-bold text-xl pt-4 border-t border-gray-50">
                  <span>Total estimé</span>
                  <span>{space.price + 12}€</span>
                </div>
              </div>

              <button 
                onClick={() => generateConventionPDF(space, selectedDate)}
                className="w-full mt-8 flex items-center justify-center gap-2 text-xs font-bold text-brand-emerald bg-brand-emerald/5 py-3 rounded-xl hover:bg-brand-emerald/10 transition-all border border-brand-emerald/20"
              >
                <ShieldCheck size={16} /> Convention légale incluse (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>
      <ImageModal 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        imageUrl={selectedImage} 
        title={space.title} 
      />
    </div>
  );
};

// --- HOST DASHBOARD ---

const UserDashboard = ({ user, userProfile }) => {
  const [receivedBookings, setReceivedBookings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [mySpaces, setMySpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [activeTab, setActiveTab] = useState('guest');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Profile states
  const [profileFirstName, setProfileFirstName] = useState(userProfile?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(userProfile?.lastName || '');
  const [profileBio, setProfileBio] = useState(userProfile?.bio || '');
  const [profileRole, setProfileRole] = useState(userProfile?.role || 'guest');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userProfile) {
      setProfileFirstName(userProfile.firstName || '');
      setProfileLastName(userProfile.lastName || '');
      setProfileBio(userProfile.bio || '');
      setProfileRole(userProfile.role || 'guest');
    }
  }, [userProfile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    setIsSaving(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      await setDoc(doc(db, 'users', user.uid), {
        photoURL: url,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      alert("Photo de profil mise à jour !");
      window.location.reload(); // To refresh the header and local state
    } catch (err) {
      console.error("Error uploading photo:", err);
      alert("Erreur lors de l'upload de la photo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        firstName: profileFirstName,
        lastName: profileLastName,
        bio: profileBio,
        role: profileRole,
        email: user.email,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Profil mis à jour avec succès !");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Erreur lors de la mise à jour du profil.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Bookings received as a host
    const qHost = query(collection(db, 'bookings'), where('hostId', '==', user.uid)); 
    const unsubscribeHost = onSnapshot(qHost, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReceivedBookings(data);
    });

    // Bookings made as a guest
    const qGuest = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsubscribeGuest = onSnapshot(qGuest, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyBookings(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });

    const qSpaces = query(collection(db, 'spaces'), where('hostId', '==', user.uid));
    const unsubscribeSpaces = onSnapshot(qSpaces, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMySpaces(data);
    });

    return () => {
      unsubscribeHost();
      unsubscribeGuest();
      unsubscribeSpaces();
    };
  }, [user]);

  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet espace ? Cette action est irréversible.")) return;
    try {
      await deleteDoc(doc(db, 'spaces', spaceId));
      alert("Espace supprimé.");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    }
  };

  // Auto-repair missing coordinates for host spaces
  useEffect(() => {
    if (activeTab === 'host' && mySpaces.length > 0) {
      mySpaces.forEach(async (space) => {
        if (!space.lat || !space.lng) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(space.location + ", Belgique")}&limit=1&countrycodes=be`);
            const data = await res.json();
            if (data && data.length > 0) {
              await updateDoc(doc(db, 'spaces', space.id), {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
              });
            }
          } catch (e) {
            console.error("Repair geocoding failed", e);
          }
        }
      });
    }
  }, [activeTab, mySpaces]);

  const handleConfirm = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed'
      });
    } catch (err) {
      console.error("Error confirming booking:", err);
      alert("Erreur lors de la confirmation.");
    }
  };

  const handleDecline = async (bookingId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir refuser cette réservation ?")) return;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'declined'
      });
    } catch (err) {
      console.error("Error declining booking:", err);
      alert("Erreur lors du refus.");
    }
  };

  if (!user) return (
    <div className="pt-32 pb-20 px-6 text-center h-screen">
      <h2 className="text-2xl font-bold text-brand-blue mb-4">Accès restreint</h2>
      <p className="text-gray-500 mb-8">Veuillez vous connecter pour accéder à votre espace personnel.</p>
    </div>
  );

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-blue mb-2">Mon Espace FreeSpace</h1>
          <p className="text-gray-500 font-medium">
            Bonjour, {userProfile?.firstName ? userProfile.firstName : user.email.split('@')[0]}
          </p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button 
            onClick={() => setActiveTab('guest')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'guest' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-brand-blue'}`}
          >
            Mes Réservations
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-brand-blue'}`}
          >
            Messages
          </button>
          {userProfile?.role === 'host' && (
            <button 
              onClick={() => setActiveTab('host')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'host' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-brand-blue'}`}
            >
              Espace Hôte
            </button>
          )}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-brand-blue'}`}
          >
            Profil
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par espace ou date..." 
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 ring-brand-blue/5 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none shadow-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="declined">Refusé</option>
          </select>
        </div>
      </div>

      <AddSpaceModal isOpen={isAddModalOpen || !!editingSpace} onClose={() => { setIsAddModalOpen(false); setEditingSpace(null); }} user={user} userProfile={userProfile} editSpace={editingSpace} />

      {activeTab === 'profile' ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-brand-blue mb-8">Mon Profil</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden border-2 border-brand-blue/5">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} />
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                className="hidden" 
                accept="image/*"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-bold text-brand-blue hover:underline"
              >
                Changer la photo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Prénom</label>
                <input 
                  type="text"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all"
                  placeholder="Votre prénom"
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Nom</label>
                <input 
                  type="text"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all"
                  placeholder="Votre nom"
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Bio / Description</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all resize-none"
                rows="4"
                placeholder="Dites-en plus sur vous..."
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Rôle principal</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${profileRole === 'guest' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-500 border-gray-100 hover:border-brand-blue/30'}`}
                  onClick={() => setProfileRole('guest')}
                >
                  Guest
                </button>
                <button 
                  type="button"
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${profileRole === 'host' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-500 border-gray-100 hover:border-brand-blue/30'}`}
                  onClick={() => setProfileRole('host')}
                >
                  Hôte
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic">
                * Le rôle 'Hôte' vous permet de publier vos propres espaces et de gérer les réservations reçues.
              </p>
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full bg-brand-blue text-white py-5 rounded-2xl font-bold mt-4 hover:opacity-90 transition-all shadow-xl shadow-brand-blue/20 disabled:opacity-50"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      ) : activeTab === 'host' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-gray-400 text-sm font-bold uppercase mb-2">Revenus total</div>
              <div className="text-3xl font-bold text-brand-blue">
                {receivedBookings.filter(b => b.status === 'confirmed').reduce((acc, b) => acc + (b.amount || 0), 0)} €
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-gray-400 text-sm font-bold uppercase mb-2">Mes espaces</div>
              <div className="text-3xl font-bold text-brand-blue">{mySpaces.length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-gray-400 text-sm font-bold uppercase mb-2">À confirmer</div>
              <div className="text-3xl font-bold text-brand-emerald">
                {receivedBookings.filter(b => b.status === 'pending').length}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-12">
            <div className="p-6 border-b border-gray-50 font-bold text-brand-blue flex items-center justify-between">
              <span>Gestion de mes espaces</span>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="text-sm bg-brand-blue text-white px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <Building2 size={16} /> Ajouter un espace
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySpaces.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400">Vous n'avez pas encore publié d'espace.</div>
              ) : (
                mySpaces.map(space => (
                  <div key={space.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <img src={space.image} className="w-full h-32 object-cover rounded-xl mb-4" />
                    <h4 className="font-bold text-brand-blue mb-1">{space.title}</h4>
                    <p className="text-xs text-gray-500 mb-4">{space.location}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingSpace(space)}
                        className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all"
                      >
                        Modifier
                      </button>
                      <button 
                        onClick={() => handleDeleteSpace(space.id)}
                        className="flex-1 bg-red-50 text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 font-bold text-brand-blue flex items-center justify-between">
              <span>Réservations de mes espaces</span>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="text-sm bg-brand-blue text-white px-4 py-2 rounded-xl"
              >
                + Ajouter un espace
              </button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-gray-400 font-medium">Chargement...</div>
              ) : receivedBookings.filter(b => 
                  (b.spaceTitle.toLowerCase().includes(searchTerm.toLowerCase()) || b.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  (filterStatus === 'all' || b.status === filterStatus)
                ).length === 0 ? (
                <div className="p-12 text-center text-gray-400">Aucune réservation trouvée.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="px-6 py-4">Espace</th>
                      <th className="px-6 py-4">Guest</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {receivedBookings.filter(b => 
                      (b.spaceTitle.toLowerCase().includes(searchTerm.toLowerCase()) || b.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) &&
                      (filterStatus === 'all' || b.status === filterStatus)
                    ).map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 font-bold text-brand-blue">{booking.spaceTitle}</td>
                        <td className="px-6 py-4 text-gray-600">{booking.userEmail}</td>
                        <td className="px-6 py-4 text-gray-500">{booking.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase 
                            ${booking.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                              booking.status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-brand-emerald/10 text-brand-emerald'}`}>
                            {booking.status === 'pending' ? 'En attente' : booking.status === 'declined' ? 'Refusé' : 'Confirmé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex gap-2 justify-end">
                          {booking.status === 'pending' && (
                            <>
                              <button onClick={() => handleConfirm(booking.id)} className="bg-brand-emerald text-white px-3 py-1 rounded text-[10px] font-bold uppercase">Confirmer</button>
                              <button onClick={() => handleDecline(booking.id)} className="bg-red-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase">Refuser</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          {activeTab === 'messages' ? (
            <MessagingPanel user={user} />
          ) : (
            <>
              <div className="p-6 border-b border-gray-50 font-bold text-brand-blue">Mes demandes de réservation</div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center text-gray-400 font-medium">Chargement...</div>
                ) : myBookings.filter(b => 
                    b.spaceTitle.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    (filterStatus === 'all' || b.status === filterStatus)
                  ).length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    Aucune réservation trouvée. 
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">Espace</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Montant</th>
                        <th className="px-6 py-4 text-right">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myBookings.filter(b => 
                        b.spaceTitle.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        (filterStatus === 'all' || b.status === filterStatus)
                      ).map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 font-bold text-brand-blue">{booking.spaceTitle}</td>
                          <td className="px-6 py-4 text-gray-500">{booking.date}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase 
                              ${booking.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                                booking.status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-brand-emerald/10 text-brand-emerald'}`}>
                              {booking.status === 'pending' ? 'En attente' : booking.status === 'declined' ? 'Refusé' : 'Confirmé'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold">{booking.amount} €</td>
                          <td className="px-6 py-4 text-right">
                            {booking.status === 'confirmed' && (
                              <button 
                                onClick={() => generateConventionPDF({ title: booking.spaceTitle, id: booking.spaceId, host: 'Hôte FreeSpace', price: booking.amount - 12 }, booking.date)}
                                className="text-brand-emerald hover:underline text-xs font-bold"
                              >
                                Télécharger PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};


// --- ADD SPACE MODAL ---

const AddSpaceModal = ({ isOpen, onClose, user, userProfile, editSpace = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    price: '',
    type: [], // Now an array
    description: '',
    area: '',
    capacity: ''
  });
  const [imageFiles, setImageFiles] = useState([]); // Multiple files
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);

  const handleTypeToggle = (type) => {
    setFormData(prev => {
      const currentTypes = prev.type;
      if (currentTypes.includes(type)) {
        return { ...prev, type: currentTypes.filter(t => t !== type) };
      }
      if (currentTypes.length >= 3) {
        alert("Maximum 3 types d'espace autorisés.");
        return prev;
      }
      return { ...prev, type: [...currentTypes, type] };
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 6) {
      alert("Maximum 6 images autorisées.");
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    
    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.type.length === 0) return alert("Sélectionnez au moins un type d'espace.");
    if (imageFiles.length === 0) return alert("Ajoutez au moins une image.");

    setLoading(true);
    try {
      const imageUrls = [];
      
      // Upload all images
      for (const file of imageFiles) {
        const storageRef = ref(storage, `spaces/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      const spaceId = formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString().slice(-4);
      
      await setDoc(doc(db, 'spaces', spaceId), {
        ...formData,
        id: spaceId,
        price: Number(formData.price),
        host: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : user.email.split('@')[0],
        hostEmail: user.email,
        hostId: user.uid,
        image: imageUrls[0], // Primary image
        images: imageUrls,
        features: ["WiFi", "Électricité", "Accès sécurisé"],
        createdAt: serverTimestamp()
      });

      onClose();
      alert("Espace publié avec succès !");
      // Reset form
      setFormData({ title: '', location: '', price: '', type: [], description: '', area: '', capacity: '' });
      setImageFiles([]);
      setPreviews([]);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la publication.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-blue/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[2.5rem] max-w-2xl w-full p-10 shadow-2xl my-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <h2 className="text-3xl font-bold text-brand-blue mb-8">Proposer un espace</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Titre de l'espace</label>
            <input 
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Bureau lumineux plein centre"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Localité</label>
            <input 
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Ville"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Prix par jour (€)</label>
            <input 
              required
              type="number"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Types d'espace (max 3)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Réunion', 'Stockage', 'Atelier', 'Bureau', 'Entrepôt', 'Autre'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeToggle(t)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    formData.type.includes(t) 
                      ? 'bg-brand-blue text-white border-brand-blue' 
                      : 'bg-white text-gray-500 border-gray-100 hover:border-brand-blue/30'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Surface (m²)</label>
            <input 
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              placeholder="Ex: 25m²"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
            <textarea 
              required
              rows="3"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-brand-blue/30 transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Images de l'espace (max 6)</label>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={src} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {previews.length < 6 && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-blue/30 bg-gray-50 transition-all">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-blue">
                    <Grid size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Ajouter</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="md:col-span-2 bg-brand-blue text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform shadow-xl shadow-brand-blue/20 disabled:opacity-50"
          >
            {loading ? 'Publication...' : 'Publier mon espace'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};


const ContactPage = () => {
  const [status, setStatus] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('success');
    // In a real app, we would send the email here
  };

  return (
    <div className="bg-white pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/5 text-brand-blue rounded-full mb-8 font-semibold text-sm">
              <Mail size={16} /> Contactez-nous
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-brand-blue mb-8 leading-tight">
              Une question ?<br />
              <span className="text-brand-emerald">On vous répond.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Que vous soyez un hôte avec des m² disponibles ou un entrepreneur en quête de flexibilité, 
              notre équipe est là pour vous accompagner dans votre transition vers l'immobilier circulaire.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-blue mb-1">Bureau</h4>
                  <p className="text-gray-500">Nivelles, Brabant Wallon, Belgique</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-emerald/10 rounded-2xl flex items-center justify-center text-brand-emerald shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-blue mb-1">Email</h4>
                  <p className="text-gray-500">contact@freespace.be</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-brand-blue mb-1">Support</h4>
                  <p className="text-gray-500">Disponible du lundi au vendredi, 9h - 18h</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-gray-100"
          >
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-brand-emerald/10 text-brand-emerald rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold text-brand-blue mb-2">Message envoyé !</h3>
                <p className="text-gray-500">Merci de nous avoir contactés. Nous reviendrons vers vous très prochainement.</p>
                <button 
                  onClick={() => setStatus(null)}
                  className="mt-8 text-brand-blue font-bold hover:underline"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-blue ml-2">Nom complet</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Jean Dupont"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-emerald/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-blue ml-2">Email</label>
                    <input 
                      required
                      type="email" 
                      placeholder="jean@exemple.be"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-emerald/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-blue ml-2">Sujet</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-emerald/20 transition-all appearance-none">
                    <option>Proposer un espace</option>
                    <option>Chercher un espace</option>
                    <option>Partenariat</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-blue ml-2">Message</label>
                  <textarea 
                    required
                    rows="4"
                    placeholder="Comment pouvons-nous vous aider ?"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-emerald/20 transition-all"
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-blue text-white py-5 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2"
                >
                  Envoyer le message
                  <ArrowRight size={20} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [spaces, setSpaces] = useState(MOCK_SPACES);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auth & Profile Listener
  useEffect(() => {
    let unsubscribeProfile = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Listen to user profile in real-time
        unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            setUserProfile(null);
          }
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Notifications Listener
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.lastSenderId !== user.uid;
      }).length;
      setUnreadCount(count);
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Spaces Sync
  useEffect(() => {
    const q = collection(db, 'spaces');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setSpaces(data);
    });
    return () => unsubscribe();
  }, []);

  const handleBook = async (space, date) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    try {
      // Check for availability again just in case
      const q = query(
        collection(db, 'bookings'), 
        where('spaceId', '==', space.id),
        where('date', '==', date),
        where('status', '==', 'confirmed')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert("Désolé, cet espace a été réservé entre-temps.");
        return;
      }

      await addDoc(collection(db, 'bookings'), {
        spaceId: space.id,
        spaceTitle: space.title,
        userId: user.uid,
        userEmail: user.email,
        hostId: space.hostId || 'system',
        date: date, // array of dates
        status: 'pending',
        amount: space.price * (Array.isArray(date) ? date.length : 1) + 12,
        createdAt: serverTimestamp()
      });
      setBookingDetails({ space, date });
      setBookingConfirmed(true);
    } catch (err) {
      console.error("Booking error:", err);
      alert("Erreur lors de la réservation.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <Header onOpenAuth={() => setIsAuthOpen(true)} user={user} userProfile={userProfile} unreadCount={unreadCount} />
      
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage spaces={spaces} />} />
          <Route path="/concept" element={<ConceptPage />} />
          <Route path="/space/:id" element={<SpaceDetailPage spaces={spaces} user={user} onBook={handleBook} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/dashboard" element={<UserDashboard user={user} userProfile={userProfile} />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onAuthSuccess={(profile) => setUserProfile(profile)}
      />
      
      <Footer />
      
      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {bookingConfirmed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-blue/60 backdrop-blur-md" 
              onClick={() => setBookingConfirmed(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] max-w-lg w-full p-12 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-brand-emerald/10 text-brand-emerald rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-bold text-brand-blue mb-4">Demande envoyée !</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                L'hôte de <strong>{bookingDetails?.space?.title}</strong> a été notifié pour le <strong>{bookingDetails?.date}</strong>.
                Il vous répondra sous 24h.
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => generateConventionPDF(bookingDetails.space, bookingDetails.date)}
                  className="bg-brand-emerald text-brand-blue py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} /> Télécharger ma Convention
                </button>
                <button 
                  onClick={() => setBookingConfirmed(false)}
                  className="bg-brand-blue text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;
