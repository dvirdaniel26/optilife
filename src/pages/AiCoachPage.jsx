import { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Send, Sparkles, Lock, Brain, ShieldAlert, ChevronLeft, 
  Apple, TrendingUp, Pill, Loader2, User, MessageSquare, Plus, Menu, X, Trash2
} from 'lucide-react';

export default function AiCoachPage() {
  const { session, profile } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const navigate = useNavigate();
  const isSubscriber = profile?.subscription_tier === 'ai_ultimate';

  const renderMessageText = (text, isAiSender) => {
    if (!text) return '';
    const parts = text.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong 
            key={index} 
            className={`font-extrabold ${isAiSender ? 'text-primary' : 'text-white'}`}
          >
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  // State for loading DB tests
  const [dbLoading, setDbLoading] = useState(true);
  const [latestTestInfo, setLatestTestInfo] = useState(null);
  const [abnormalMarkers, setAbnormalMarkers] = useState([]); // All abnormal markers from all time
  
  // Chat History State
  const [chatsList, setChatsList] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef(null);

  const generateWelcomeText = (latestTest, abnormalList) => {
    const name = profile?.first_name || 'אורח/ת';
    let welcomeText = `שלום ${name}! אני מאמן הבריאות ה-AI האישי שלך. 🤖\n\n`;

    if (!latestTest) {
      welcomeText += `נכון לעכשיו, לא מצאתי בדיקות דם במערכת. בינתיים, אשמח לענות על שאלות כלליות בנושאי בריאות. במה נתחיל?`;
    } else {
      welcomeText += `קראתי ולמדתי את כל בדיקות הדם שלך, כולל הבדיקה האחרונה מ-${latestTest.test_date}.\n\n`;

      if (abnormalList.length > 0) {
        welcomeText += `זיהיתי לאורך הזמן חריגות במדדים כמו: ${[...new Set(abnormalList.map(m => m.marker_name))].join(', ')}.\n\n`;
        welcomeText += `אני כאן כדי לעזור לך לאזן אותם עם תזונה, תוספים וכושר. במה תרצה/י להתמקד היום?`;
      } else {
        welcomeText += `כל המדדים שלך נראים מצוין! במה נרצה להתמקד היום כדי לשמור על האנרגיה והבריאות?`;
      }
    }
    return welcomeText;
  };

  const loadChatsAndCurrent = async (latestTest, abnormalList, specificChatId = null) => {
    try {
      // Fetch all chats
      const { data: allChats } = await supabase
        .from('coach_chats')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });
        
      setChatsList(allChats || []);

      let currentChatId = specificChatId;
      
      if (!currentChatId && allChats && allChats.length > 0) {
        currentChatId = allChats[0].id; // load latest by default
      }
      
      setChatId(currentChatId);

      if (currentChatId) {
        // Load messages for this chat
        const { data: msgs } = await supabase
          .from('coach_messages')
          .select('*')
          .eq('chat_id', currentChatId)
          .order('created_at', { ascending: true });
        
        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m => ({
            id: m.id,
            sender: m.sender === 'user' ? 'user' : 'ai',
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          })));
        } else {
          setMessages([]);
        }
      } else {
        // No chats exist at all
        const welcomeText = generateWelcomeText(latestTest, abnormalList);
        setMessages([{
           id: 'welcome',
           sender: 'ai',
           text: welcomeText,
           time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      
      setShowMobileHistory(false); // Close mobile menu if it was open
    } catch (e) {
      console.error("Error loading chat history:", e);
    }
  };

  // Load all tests and results
  useEffect(() => {
    if (!session?.user?.id || !isSubscriber) {
      setDbLoading(false);
      return;
    }

    const fetchAllData = async () => {
      try {
        setDbLoading(true);
        // 1. Get ALL tests for this user with their lab_results
        const { data: tests, error: testsError } = await supabase
          .from('medical_tests')
          .select('*, lab_results(*)')
          .eq('user_id', session.user.id)
          .order('test_date', { ascending: false });

        if (testsError) throw testsError;

        let allAbnormal = [];
        let latest = null;

        if (tests && tests.length > 0) {
          latest = tests[0];
          setLatestTestInfo(latest);

          tests.forEach(test => {
            if (test.lab_results && Array.isArray(test.lab_results)) {
              const testAbnormal = test.lab_results
                .filter(r => r.is_abnormal)
                .map(r => ({
                  ...r,
                  test_date: test.test_date
                }));
              allAbnormal = [...allAbnormal, ...testAbnormal];
            }
          });
          setAbnormalMarkers(allAbnormal);
        }

        await loadChatsAndCurrent(latest, allAbnormal);
      } catch (err) {
        console.error("Error loading test details for AI Coach:", err);
        await loadChatsAndCurrent(null, []);
      } finally {
        setDbLoading(false);
      }
    };

    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, isSubscriber]);

  // Scroll to bottom on new messages inside the container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);



  const startNewChat = () => {
    setChatId(null);
    const welcomeText = generateWelcomeText(latestTestInfo, abnormalMarkers);
    setMessages([{
       id: 'welcome',
       sender: 'ai',
       text: welcomeText,
       time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowMobileHistory(false);
  };

  const handleDeleteChat = async (e, idToDelete) => {
    e.stopPropagation();
    if (!window.confirm('האם אתה בטוח שברצונך למחוק שיחה זו?')) return;
    
    try {
      await supabase.from('coach_chats').delete().eq('id', idToDelete);
      setChatsList(prev => prev.filter(c => c.id !== idToDelete));
      
      if (chatId === idToDelete) {
         startNewChat();
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    const userMsgLocal = {
      id: 'msg_local_' + Date.now(),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsgLocal]);
    setInputText('');
    setIsTyping(true);

    try {
      let activeChatId = chatId;
      
      // If this is a new chat, create the thread first
      if (!activeChatId) {
        const title = "שיחה חדשה..."; // temporary title, to be updated by AI
        const { data: newChat } = await supabase
          .from('coach_chats')
          .insert([{ user_id: session.user.id, title }])
          .select().single();
          
        if (newChat) {
           activeChatId = newChat.id;
           setChatId(activeChatId);
           setChatsList(prev => [newChat, ...prev]);
           
           // Also save the welcome message that was just local
           const welcomeMsg = messages.find(m => m.id === 'welcome');
           if (welcomeMsg) {
             await supabase.from('coach_messages').insert([{
               chat_id: activeChatId,
               user_id: session.user.id,
               sender: 'ai',
               text: welcomeMsg.text
             }]);
           }
        }
      }

      if (activeChatId) {
        await supabase.from('coach_messages').insert([{
           chat_id: activeChatId,
           user_id: session.user.id,
           sender: 'user',
           text: userText
        }]);
      }

      const response = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          profile: profile,
          abnormalMarkers: abnormalMarkers, // Now passing ALL abnormal markers across all time
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.reply) {
        const aiMsgLocal = {
          id: 'msg_local_' + Date.now(),
          sender: 'ai',
          text: data.reply,
          time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsgLocal]);

        if (activeChatId) {
          await supabase.from('coach_messages').insert([{
             chat_id: activeChatId,
             user_id: session.user.id,
             sender: 'ai',
             text: data.reply
          }]);
          
          // Update chat title if AI generated one
          if (data.title) {
             await supabase.from('coach_chats').update({ title: data.title }).eq('id', activeChatId);
             setChatsList(prev => prev.map(c => c.id === activeChatId ? { ...c, title: data.title } : c));
          }
        }
      }

    } catch (error) {
       console.error("Chat error:", error);
       addNotification({ type: 'error', title: 'שגיאה', message: 'לא הצלחנו להתחבר לשרת ה-AI. נסה שוב.' });
       
       const errorMsgLocal = {
         id: 'msg_error_' + Date.now(),
         sender: 'ai',
         text: '⚠️ מצטערים, יש עומס חריג כרגע על שרתי ה-AI (שגיאת חיבור). נסה לשלוח את ההודעה שוב בעוד מספר רגעים.',
         time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
       };
       setMessages(prev => [...prev, errorMsgLocal]);
    } finally {
      setIsTyping(false);
    }
  };

  const selectQuickPrompt = (text) => {
    setInputText(text);
  };

  return (
    <main className="md:pr-72 pt-24 min-h-screen bg-background font-body transition-all text-right" dir="rtl">
      
      {/* 🔒 PAYWALL LOCK SCREEN FOR NON-SUBSCRIBERS */}
      {!isSubscriber ? (
        <div className="p-sm md:p-md lg:p-xl max-w-4xl mx-auto space-y-md">
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl md:text-4xl text-primary font-bold mb-2">מאמן בריאות AI אישי 🤖</h2>
            <p className="text-on-surface-variant text-sm md:text-base">שירות פרימיום בלעדי מבוסס בינה מלאכותית המחובר ישירות למדדים שלך.</p>
          </div>

          <div className="backdrop-blur-md bg-white/70 border border-secondary/20 rounded-3xl p-6 md:p-10 custom-shadow text-center relative overflow-hidden flex flex-col items-center gap-md">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-secondary to-amber-500 text-white flex items-center justify-center shadow-lg shadow-secondary/10 relative">
              <Brain className="w-9 h-9" />
              <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-white">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>

            <div className="max-w-xl">
              <h3 className="font-heading text-xl md:text-2xl text-primary font-bold mb-2">פתחי/י ליווי AI מותאם אישית</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                מנוע מאמן הבריאות של OptiLife AI סורק ומנתח את בדיקות הדם שלך ומעניק לך ייעוץ אקטיבי 24/7. שדרג למסלול <strong className="font-bold text-secondary">AI Ultimate</strong> כדי להתחיל להתכתב איתו ולשאול שאלות המשך.
              </p>
            </div>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm w-full max-w-2xl text-right mt-sm">
              <div className="p-sm bg-white/50 border border-slate-100 rounded-2xl flex gap-xs items-start">
                <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-[2px]">שיחה חופשית 24/7</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">התכתבות חופשית, שאילת שאלות המשך וייעוץ על מדדים בכל זמן.</p>
                </div>
              </div>

              <div className="p-sm bg-white/50 border border-slate-100 rounded-2xl flex gap-xs items-start">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Apple className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-[2px]">מחולל תפריטים מותאמים</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">בניית תפריט תזונה יומי ומתכונים מדויקים לתיקון החוסרים שלך.</p>
                </div>
              </div>

              <div className="p-sm bg-white/50 border border-slate-100 rounded-2xl flex gap-xs items-start">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-[2px]">מנוע חיזוי ומגמות</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">זיהוי מוקדם של מגמות עתידיות בדם (כמו סוכר) ומניעת חריגות.</p>
                </div>
              </div>

              <div className="p-sm bg-white/50 border border-slate-100 rounded-2xl flex gap-xs items-start">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-[2px]">מנתח שילובי תוספים</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">בדיקת אינטראקציות, סינרגיות ונטילה נכונה של תוספי תזונה.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-sm w-full max-w-md mt-sm justify-center">
              <button 
                onClick={() => navigate('/checkout', { state: { plan: 'ai_ultimate' } })}
                className="px-xl py-3 bg-gradient-to-r from-secondary to-amber-500 text-white font-bold rounded-xl text-xs transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-xs cursor-pointer border-0 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 fill-current text-white animate-pulse" />
                <span>שדרג ל-AI Ultimate (₪49/חודש)</span>
              </button>
              <button 
                onClick={() => navigate('/pricing')}
                className="px-xl py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-xs cursor-pointer border-0 w-full sm:w-auto"
              >
                <span>צפה בכל החבילות</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 💬 ACTIVE CHAT SCREEN FOR AI ULTIMATE SUBSCRIBERS */
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 flex-1 min-h-0 overflow-hidden" dir="rtl">
          
          {/* Header */}
          <div className="flex justify-between items-center pb-xs border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <button 
                className="lg:hidden p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 active:scale-95 transition-colors border-0 cursor-pointer"
                onClick={() => setShowMobileHistory(!showMobileHistory)}
              >
                {showMobileHistory ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="font-heading text-2xl md:text-3xl text-primary font-bold flex items-center gap-sm">
                  <Brain className="w-7 h-7 md:w-8 md:h-8 text-secondary shrink-0" />
                  מאמן בריאות AI
                </h2>
                <p className="font-body text-[10px] md:text-xs text-on-surface-variant mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                  <span>מחובר • מנתח את כל היסטוריית המדדים</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0 overflow-hidden relative">
            
            {/* MOBILE OVERLAY FOR CHAT HISTORY */}
            {showMobileHistory && (
              <div className="absolute inset-0 bg-white z-10 lg:hidden flex flex-col rounded-3xl custom-shadow overflow-hidden p-4">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-primary flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-secondary" />
                    היסטוריית שיחות
                  </h3>
                  <button 
                    onClick={startNewChat}
                    className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-bold active:scale-95 transition-all border-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    שיחה חדשה
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 flex flex-col gap-2">
                  {chatsList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">אין שיחות קודמות</p>
                  ) : (
                    chatsList.map(c => (
                      <button
                        key={c.id}
                        onClick={() => loadChatsAndCurrent(latestTestInfo, abnormalMarkers, c.id)}
                        className={`text-right p-3 rounded-xl text-sm transition-colors border-0 cursor-pointer ${chatId === c.id ? 'bg-secondary/10 border-l-4 border-l-secondary text-secondary font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <div className="truncate mb-1">{c.title || 'שיחה ללא כותרת'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(c.created_at).toLocaleDateString('he-IL')}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: Interactive Chat Area */}
            <div className={`lg:col-span-8 bg-white border border-outline/10 rounded-3xl p-4 md:p-6 lg:p-8 flex flex-col gap-4 custom-shadow h-[600px] md:h-[700px] relative ${showMobileHistory ? 'hidden lg:flex' : 'flex'}`}>
              
              {/* Chat Container */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
              >
                {dbLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs gap-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                    <span>טוען נתונים בריאותיים מתוך התיק הרפואי שלך...</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAi = msg.sender === 'ai';
                    return (
                      <div 
                        key={msg.id}
                        className={`flex gap-3 md:gap-4 items-start max-w-[95%] md:max-w-[85%] ${!isAi ? 'self-end flex-row-reverse text-left' : 'self-start text-right animate-fadeIn'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isAi ? 'bg-gradient-to-br from-secondary to-teal-500 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {isAi ? <Brain className="w-5 h-5 md:w-6 md:h-6" /> : <User className="w-5 h-5 md:w-6 md:h-6" />}
                        </div>

                        {/* Bubble */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className={`text-xs font-bold ${!isAi ? 'text-slate-500 text-left pl-1' : 'text-primary pr-1'}`}>
                            {isAi ? 'AI Health Coach' : (profile?.first_name || 'אני')}
                          </span>
                          <div className={`px-5 py-4 rounded-[28px] text-sm md:text-base leading-relaxed shadow-sm whitespace-pre-line ${!isAi ? 'bg-secondary text-white rounded-tl-sm text-left shadow-secondary/20' : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tr-sm'}`}>
                            {renderMessageText(msg.text, isAi)}
                          </div>
                          <span className={`text-[10px] text-slate-400 font-semibold mt-0.5 ${!isAi ? 'self-end pl-1' : 'self-start pr-1'}`}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="self-start flex gap-sm items-center text-right animate-pulse">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-secondary/15 text-secondary border-secondary/20">
                      <Brain className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-slate-500">AI Health Coach</span>
                      <div className="px-sm py-2 rounded-2xl text-xs bg-slate-100 text-slate-500 rounded-tr-none flex items-center gap-1.5 border border-slate-200/50">
                        <span>מחשב תשובה...</span>
                        <span className="flex gap-[3px]">
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompts Panel */}
              {!dbLoading && messages.length <= 1 && (
                <div className="flex flex-nowrap gap-2 pt-4 pb-2 border-t border-outline/10 overflow-x-auto scrollbar-none">
                  <button 
                    onClick={() => selectQuickPrompt('האם חל שיפור במצב הבריאותי שלי מהבדיקות הקודמות?')}
                    className="px-4 py-2 bg-slate-50 hover:bg-secondary/5 text-slate-600 hover:text-secondary rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-secondary/30 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    📈 מה המגמה של המדדים שלי?
                  </button>
                  <button 
                    onClick={() => selectQuickPrompt('איך מומלץ לאזן את רמת הסוכר והגלוקוז שלי?')}
                    className="px-4 py-2 bg-slate-50 hover:bg-secondary/5 text-slate-600 hover:text-secondary rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-secondary/30 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    🍭 מדדי סוכר וגלוקוז
                  </button>
                  <button 
                    onClick={() => selectQuickPrompt('מה לקחת ואיך נכון לספוג תוספי תזונה וויטמין D?')}
                    className="px-4 py-2 bg-slate-50 hover:bg-secondary/5 text-slate-600 hover:text-secondary rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-secondary/30 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    💊 ויטמינים ותוספי תזונה
                  </button>
                </div>
              )}

              {/* Chat Input Field */}
              <form onSubmit={handleSendMessage} className="flex gap-3 items-end bg-slate-50 p-2 md:p-3 rounded-[28px] border border-slate-200 focus-within:border-secondary/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-secondary/10 transition-all shadow-inner">
                <textarea 
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="שאל את ה-AI על כל המצב הבריאותי שלך, תפריט מומלץ או חריגות בדם..."
                  required
                  disabled={dbLoading || isTyping}
                  className="flex-1 px-4 py-3 md:py-3.5 bg-transparent text-sm focus:outline-none transition-all leading-relaxed resize-none disabled:opacity-50 text-right font-body min-h-[44px] max-h-[120px]" dir="rtl"
                />
                <button 
                  type="submit"
                  disabled={dbLoading || isTyping || !inputText.trim()}
                  className="bg-secondary text-white font-bold rounded-2xl transition-all duration-200 flex items-center justify-center shrink-0 hover:shadow-lg hover:scale-105 active:scale-95 disabled:bg-slate-300 disabled:text-white disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none shadow-md cursor-pointer h-12 w-12 border-0"
                >
                  <Send className="w-4 h-4 transform rotate-180" />
                </button>
              </form>
            </div>

            {/* LEFT COLUMN: Health Coach Stats Card & Desktop History */}
            <div className={`lg:col-span-4 flex flex-col gap-6 ${showMobileHistory ? 'hidden lg:flex' : 'hidden lg:flex'}`}>
              
              {/* Desktop Chat History Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-md custom-shadow flex flex-col gap-3 max-h-[300px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-heading text-sm text-primary font-bold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    היסטוריית שיחות
                  </h3>
                  <button 
                    onClick={startNewChat}
                    className="flex items-center gap-1 px-2 py-1 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg text-xs font-bold transition-colors cursor-pointer border-0"
                  >
                    <Plus className="w-3 h-3" />
                    שיחה חדשה
                  </button>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  {chatsList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">אין שיחות קודמות</p>
                  ) : (
                    chatsList.map(c => (
                      <div
                        key={c.id}
                        onClick={() => loadChatsAndCurrent(latestTestInfo, abnormalMarkers, c.id)}
                        className={`group flex items-center justify-between text-right p-3 rounded-xl text-xs transition-colors cursor-pointer ${chatId === c.id ? 'bg-secondary/10 border-r-2 border-secondary text-secondary font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <div className="min-w-0 flex-1 pl-2">
                          <div className="truncate mb-1">{c.title || 'שיחה ללא כותרת'}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {new Date(c.created_at).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteChat(e, c.id)}
                          className="text-slate-300 hover:text-status-error opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-transparent border-0 p-1 shrink-0"
                          title="מחק שיחה"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Scientific Disclaimer Card */}
              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-md text-right space-y-xs flex flex-col">
                <div className="flex gap-xs items-center text-amber-800">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="text-xs font-bold">הערה מדעית ובטיחותית</h4>
                </div>
                <p className="text-[9px] text-amber-900 leading-relaxed">
                  המאמן ה-AI של OptiLife משתמש במודלים מורחבים של רפואה מניעתית, תזונה וכושר כדי להנגיש ידע. הייעוץ הוא הסברתי וחינוכי ואינו מהווה תחליף לרופא משפחה או החלטה קלינית.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}
    </main>
  );
}
