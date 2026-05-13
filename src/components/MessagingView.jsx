import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Send, Paperclip, ArrowRight, User } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';

export const MessageModal = ({ isOpen, onClose, space, user, userProfile }) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setLoading(true);
    try {
      const participants = [user.uid, space.hostId || 'system'].sort();
      const conversationId = `${participants[0]}_${participants[1]}_${space.id}`;
      const convRef = doc(db, 'conversations', conversationId);
      
      const userName = userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : user.email.split('@')[0];

      await setDoc(convRef, {
        lastMessage: message,
        updatedAt: serverTimestamp(),
        lastSenderId: user.uid,
        participants,
        spaceTitle: space.title,
        spaceId: space.id,
        hostId: space.hostId || 'system',
        hostName: space.host,
        userName: userName
      }, { merge: true });

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });

      setMessage("");
      onClose();
      alert("Message envoyé ! Retrouvez vos conversations dans votre tableau de bord.");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi du message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-blue/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Contacter l'hôte</h2>
        <p className="text-gray-500 mb-6 text-sm">Votre message concerne l'espace : <strong>{space.title}</strong></p>
        
        <form onSubmit={handleSend} className="space-y-4">
          <textarea 
            required
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 ring-brand-blue/10 min-h-[150px] resize-none"
            placeholder="Décrivez votre besoin, demandez une visite..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? "Envoi..." : "Envoyer le message"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export const MessagingPanel = ({ user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversations(data.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="p-12 text-center text-gray-400">Chargement des messages...</div>;

  return (
    <div className="flex h-[600px] bg-white rounded-3xl overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-100 overflow-y-auto bg-gray-50/50">
        <div className="p-6 border-b border-gray-100 bg-white">
          <h3 className="font-bold text-brand-blue flex items-center gap-2">
            <Mail size={18} /> Messages
          </h3>
        </div>
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucune conversation.</div>
        ) : (
          conversations.map(conv => (
            <button 
              key={conv.id}
              onClick={() => setSelectedConv(conv)}
              className={`w-full p-6 text-left border-b border-gray-50 transition-all relative ${selectedConv?.id === conv.id ? 'bg-white shadow-inner' : 'hover:bg-white'}`}
            >
              {conv.lastSenderId !== user.uid && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-emerald rounded-full shadow-[0_0_10px_rgba(80,200,120,0.6)]" />
              )}
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-brand-blue truncate">
                  {conv.hostId === user.uid ? conv.userName : conv.hostName}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  {conv.updatedAt?.toDate()?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-xs font-bold text-brand-emerald mb-2 truncate uppercase tracking-wider">{conv.spaceTitle}</p>
              <p className={`text-xs truncate ${conv.lastSenderId !== user.uid ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                {conv.lastMessage}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <ChatWindow conversation={selectedConv} user={user} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 bg-gray-50/20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Mail size={40} className="opacity-20" />
            </div>
            <p className="text-sm font-bold text-brand-blue/40 uppercase tracking-widest">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatWindow = ({ conversation, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'conversations', conversation.id, 'messages'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
      
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, [conversation.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msgData = {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), msgData);
      
      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
        lastSenderId: user.uid
      });

      setNewMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (max 5Mo).");
      return;
    }

    try {
      const storageRef = ref(storage, `attachments/${conversation.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const msgData = {
        text: `Fichier attaché : ${file.name}`,
        attachmentUrl: downloadURL,
        attachmentName: file.name,
        attachmentType: file.type,
        senderId: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), msgData);
      
      await updateDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: `📎 ${file.name}`,
        updatedAt: serverTimestamp(),
        lastSenderId: user.uid
      });

    } catch (err) {
      console.error("File upload error:", err);
      alert("Erreur lors de l'envoi du fichier.");
    }
  };

  return (
    <>
      <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-blue/20">
            {(conversation.hostId === user.uid ? conversation.userName : conversation.hostName).charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-brand-blue">
              {conversation.hostId === user.uid ? conversation.userName : conversation.hostName}
            </h4>
            <p className="text-xs text-brand-emerald font-bold uppercase tracking-wider">{conversation.spaceTitle}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
        {messages.map((msg, i) => (
          <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-sm relative
              ${msg.senderId === user.uid 
                ? 'bg-brand-blue text-white rounded-br-none' 
                : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'}`}
            >
              {msg.attachmentUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-black/10 rounded-lg">
                    <Paperclip size={16} className="text-brand-emerald" />
                    <span className="truncate font-medium">{msg.attachmentName}</span>
                  </div>
                  {msg.attachmentType?.startsWith('image/') ? (
                    <img src={msg.attachmentUrl} className="max-w-full rounded-lg max-h-64 object-cover" alt="attachment" />
                  ) : (
                    <a 
                      href={msg.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block text-xs font-bold underline hover:text-brand-emerald"
                    >
                      Télécharger le fichier
                    </a>
                  )}
                </div>
              ) : (
                <p className="leading-relaxed">{msg.text}</p>
              )}
              <div className={`text-[9px] mt-2 opacity-60 font-bold uppercase flex justify-end`}>
                {msg.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-6 bg-white border-t border-gray-100 flex gap-4 items-center">
        <label className="p-3 text-gray-400 hover:text-brand-blue transition-all cursor-pointer bg-gray-50 rounded-xl" title="Joindre un fichier">
          <input type="file" className="hidden" onChange={handleFileUpload} />
          <Paperclip size={20} />
        </label>
        <div className="flex-1 relative">
          <input 
            type="text"
            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 ring-brand-blue/10 transition-all font-medium"
            placeholder="Tapez votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
        </div>
        <button 
          type="submit" 
          className="bg-brand-blue text-white p-4 rounded-2xl hover:bg-opacity-90 transition-all shadow-lg shadow-brand-blue/20"
        >
          <Send size={20} />
        </button>
      </form>
    </>
  );
};
