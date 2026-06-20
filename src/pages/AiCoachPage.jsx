import { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../App';
import { NotificationsContext } from '../context/NotificationsContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Send, Sparkles, Lock, Brain, ShieldAlert, ArrowLeft, Check, 
  Activity, Apple, Calendar, TrendingUp, Pill, ChevronLeft, 
  Loader2, User, HelpCircle, MessageSquare
} from 'lucide-react';

export default function AiCoachPage() {
  const { session, profile, setProfile } = useContext(UserContext);
  const { addNotification } = useContext(NotificationsContext);
  const navigate = useNavigate();
  const isFemale = profile?.gender === 'female';
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
  const [abnormalMarkers, setAbnormalMarkers] = useState([]);
  const [chatId, setChatId] = useState(null);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Load latest test results to customize AI response
  useEffect(() => {
    if (!session?.user?.id || !isSubscriber) {
      setDbLoading(false);
      return;
    }

    const fetchLatestBloodTest = async () => {
      try {
        setDbLoading(true);
        // 1. Get latest test metadata
        const { data: tests, error: testsError } = await supabase
          .from('medical_tests')
          .select('*')
          .eq('user_id', session.user.id)
          .order('test_date', { ascending: false });

        if (testsError) throw testsError;

        if (tests && tests.length > 0) {
          const latest = tests[0];
          setLatestTestInfo(latest);

          // 2. Fetch results for this test
          const { data: results, error: resultsError } = await supabase
            .from('lab_results')
            .select('*')
            .eq('test_id', latest.id);

          if (resultsError) throw resultsError;

          if (results && results.length > 0) {
            const abnormal = results.filter(r => r.is_abnormal);
            setAbnormalMarkers(abnormal);

            await loadOrCreateChat(latest, abnormal);
          } else {
            await loadOrCreateChat(latest, []);
          }
        } else {
          // No tests at all
          await loadOrCreateChat(null, []);
        }
      } catch (err) {
        console.error("Error loading test details for AI Coach:", err);
        await loadOrCreateChat(null, []);
      } finally {
        setDbLoading(false);
      }
    };

    fetchLatestBloodTest();
  }, [session?.user?.id, isSubscriber]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateWelcomeText = (latestTest, abnormalList) => {
    const name = profile?.first_name || 'אורח/ת';
    let welcomeText = `שלום ${name}! אני מאמן הבריאות ה-AI האישי שלך. 🤖🧬\n\n`;

    if (!latestTest) {
      welcomeText += `נכון לעכשיו, לא מצאתי בדיקות דם פעילות שהעלית למערכת. על מנת שאוכל לתת לך הנחיות מדויקות, מומלץ להעלות בדיקה חדשה בדף 'ניתוח בדיקות'.\n\nבינתיים, אשמח לענות על כל שאלה בנושאי תזונה, ספורט ואורח חיים בריא! במה נרצה להתחיל?`;
    } else {
      welcomeText += `ניתחתי את בדיקת הדם האחרונה שלך מתאריך **${latestTest.test_date}**.\n\n`;

      if (abnormalList.length > 0) {
        const markersNames = abnormalList.map(m => `**${m.marker_name}** (${m.measured_value} ${m.unit || ''})`).join(', ');
        welcomeText += `שמתי לב למספר מדדים שחרגו מטווח הנורמה הרפואי: ${markersNames}.\n\nאני כאן כדי לעזור לך לאזן את המדדים הללו באמצעות המלצות תזונה, תוספים נכונים ואימונים מותאמים. במה תרצה/י להתמקד היום?`;
      } else {
        welcomeText += `כל הכבוד! כל המדדים המרכזיים שנסקרו בבדיקה שלך נמצאו מאוזנים ובטווח הנורמה. 🏆\n\nאנחנו יכולים להתמקד בשימור המצב הבריאותי המצוין, שיפור רמות האנרגיה או בבניית תפריט כושר מותאם. במה תרצה/י שנתמקד?`;
      }
    }
    return welcomeText;
  };

  const loadOrCreateChat = async (latestTest, abnormalList) => {
    try {
      const { data: chatThread } = await supabase
        .from('coach_chats')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let currentChatId = null;
      let loadedMessages = [];

      if (chatThread) {
        currentChatId = chatThread.id;
        const { data: msgs } = await supabase
          .from('coach_messages')
          .select('*')
          .eq('chat_id', currentChatId)
          .order('created_at', { ascending: true });
        
        if (msgs && msgs.length > 0) {
          loadedMessages = msgs.map(m => ({
            id: m.id,
            sender: m.sender_role === 'user' ? 'user' : 'ai',
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          }));
        }
      } else {
        const { data: newChat } = await supabase
          .from('coach_chats')
          .insert([{ user_id: session.user.id }])
          .select()
          .single();
          
        if (newChat) {
          currentChatId = newChat.id;
        }
      }
      
      setChatId(currentChatId);

      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
      } else {
        const welcomeText = generateWelcomeText(latestTest, abnormalList);
        if (currentChatId) {
          await supabase.from('coach_messages').insert([{
             chat_id: currentChatId,
             sender_role: 'ai',
             content: welcomeText
          }]);
        }
        setMessages([{
           id: 'welcome',
           sender: 'ai',
           text: welcomeText,
           time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
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
      if (chatId) {
        await supabase.from('coach_messages').insert([{
           chat_id: chatId,
           sender_role: 'user',
           content: userText
        }]);
      }

      const response = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          profile: profile,
          abnormalMarkers: abnormalMarkers,
          history: messages
        })
      });

      const data = await response.json();
      const aiReply = data.reply || 'מצטער, נתקלתי בבעיה קטנה בעיבוד התשובה. תוכל לנסח שוב?';

      if (chatId) {
        await supabase.from('coach_messages').insert([{
           chat_id: chatId,
           sender_role: 'ai',
           content: aiReply
        }]);
      }

      const aiMsgLocal = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: aiReply,
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsgLocal]);

    } catch (error) {
       console.error("Chat error:", error);
       addNotification({ type: 'error', title: 'שגיאה', message: 'לא הצלחנו להתחבר לשרת ה-AI. נסה שוב.' });
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm pb-xs border-b border-outline-variant">
            <div>
              <h2 className="font-heading text-3xl text-primary font-bold flex items-center gap-sm">
                <Brain className="w-8 h-8 text-secondary shrink-0" />
                מאמן בריאות AI אישי
              </h2>
              <p className="font-body text-xs text-on-surface-variant mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                <span>מחובר • מנתח בדיקות דם מהמערכת</span>
              </p>
            </div>
            {latestTestInfo && (
              <div className="text-left text-[10px] text-slate-400 bg-white/60 border border-slate-100 rounded-xl px-3 py-1.5 self-start sm:self-center">
                בדיקה אחרונה בשימוש: <span className="font-bold text-secondary">{latestTestInfo.test_date}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0 overflow-hidden">
            
            {/* RIGHT COLUMN: Interactive Chat Area */}
            <div className="lg:col-span-8 bg-white border border-outline/10 rounded-3xl p-4 md:p-6 lg:p-8 flex flex-col gap-4 custom-shadow h-[600px] md:h-[700px] relative">
              
              {/* Messages History */}
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
                        <span>מחשב המלצות מדדים</span>
                        <span className="flex gap-[3px]">
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Panel */}
              {!dbLoading && (
                <div className="flex flex-nowrap gap-2 pt-4 pb-2 border-t border-outline/10 overflow-x-auto scrollbar-none">
                  <button 
                    onClick={() => selectQuickPrompt('מה לאכול כדי לשפר את בדיקות הדם שלי?')}
                    className="px-4 py-2 bg-slate-50 hover:bg-secondary/5 text-slate-600 hover:text-secondary rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-secondary/30 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    🍎 המלץ לי על ארוחת בוקר
                  </button>
                  <button 
                    onClick={() => selectQuickPrompt('איך מומלץ לאזן את רמת הסוכר והגלוקוז שלי?')}
                    className="px-4 py-2 bg-slate-50 hover:bg-secondary/5 text-slate-600 hover:text-secondary rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-secondary/30 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    🍭 מדדי סוכר וגלוקוז
                  </button>
                  <button 
                    onClick={() => selectQuickPrompt('איך לאזן כולסטרול וכולסטרול LDL?')}
                    className="px-4 py-2 bg-slate-50 hover:bg-secondary/5 text-slate-600 hover:text-secondary rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-secondary/30 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    🥩 הפחתת כולסטרול
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
                  placeholder="שאל את ה-AI על בדיקות הדם, תפריט מומלץ או תוספי תזונה..."
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

            {/* LEFT COLUMN: Health Coach Stats Card */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* AI Assistant Bio Card */}
              <div className="backdrop-blur-md bg-white/70 border border-white/20 rounded-3xl p-md custom-shadow flex flex-col gap-sm text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-xs">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="font-heading text-base text-primary font-bold">איך ה-AI מסייע לך?</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed text-right">
                  מאמן הבריאות של OptiLife AI תוכנת ללמוד את בדיקות הדם שלך ולתרגם אותן להמלצות יומיות מעשיות.
                </p>
                <div className="border-t border-slate-100 my-xs pt-xs text-right space-y-xs text-[10px] text-slate-650">
                  <div className="flex justify-between">
                    <span className="font-bold text-primary">ניתוח בדיקה אחרונה:</span>
                    <span>{latestTestInfo ? latestTestInfo.test_date : 'אין נתונים'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-primary">חריגות שזוהו:</span>
                    <span className={abnormalMarkers.length > 0 ? 'text-status-error font-extrabold' : 'text-status-success font-extrabold'}>
                      {abnormalMarkers.length > 0 ? `${abnormalMarkers.length} מדדים` : 'מאוזן'}
                    </span>
                  </div>
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
