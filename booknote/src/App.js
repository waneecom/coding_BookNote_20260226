import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, Folder, ChevronRight, Search, CheckCircle, Video, 
  ArrowLeft, Plus, MoreVertical, Moon, Sun, BookOpen, 
  Layout, PanelRightClose, PanelRightOpen, Check, Edit3, Trash2,
  FileText, Users, Info, Save, ExternalLink, ArrowDown, Award, Sparkles
} from 'lucide-react';
import { supabase } from './supabase'; // 🌟 Supabase 연결 불러오기

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function App() {
  // --- 상태 관리 ---
  const [isAppLoading, setIsAppLoading] = useState(true); // 클라우드 로딩 상태
  const [databases, setDatabases] = useState(null);
  const [currentLibrary, setCurrentLibrary] = useState('');
  
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [details, setDetails] = useState([]);
  const [customGenres, setCustomGenres] = useState([]);
  
  const [viewMode, setViewMode] = useState('shelf');
  const [theme, setTheme] = useState('sepia');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('search');
  const [contextMenu, setContextMenu] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  
  const [spellTargetName, setSpellTargetName] = useState('');
  const [spellCorrection, setSpellCorrection] = useState(''); 
  const [spellMessage, setSpellMessage] = useState('');
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  
  const [localCategory, setLocalCategory] = useState(''); 
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [setupName, setSetupName] = useState('');
  const [showAddGenre, setShowAddGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverGenre, setDragOverGenre] = useState(null);

  const themeStyles = {
    light: { bg: 'bg-gray-50', text: 'text-gray-900', panel: 'bg-white', border: 'border-gray-200', primary: 'text-blue-600', primaryBg: 'bg-blue-600', primaryLight: 'bg-blue-50' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', panel: 'bg-gray-800', border: 'border-gray-700', primary: 'text-blue-400', primaryBg: 'bg-blue-500', primaryLight: 'bg-gray-800' },
    sepia: { bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', panel: 'bg-[#fdf6e3]', border: 'border-[#e5d5b5]', primary: 'text-[#d35400]', primaryBg: 'bg-[#d35400]', primaryLight: 'bg-[#f9f1df]' }
  };
  const currentTheme = themeStyles[theme];

  // 🌟 클라우드(Supabase)에서 데이터 불러오기
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const { data, error } = await supabase
          .from('booknote_saves')
          .select('data')
          .eq('id', 'main_save')
          .single();

        if (data && data.data) {
          setDatabases(data.data);
          const firstLib = Object.keys(data.data)[0];
          setCurrentLibrary(firstLib);
          setBooks(data.data[firstLib].books || []);
          setChapters(data.data[firstLib].chapters || []);
          setDetails(data.data[firstLib].details || []);
          setCustomGenres(data.data[firstLib].customGenres || []);
        } else {
          setDatabases(null);
        }
      } catch (err) {
        console.error("데이터 불러오기 실패:", err);
      } finally {
        setIsAppLoading(false);
      }
    };
    fetchCloudData();
  }, []);

  // --- 로직 ---

  const handleInitialSetup = async () => {
    if (!setupName.trim()) return alert("이름을 입력해주세요!");
    const name = setupName.trim();
    const newDb = { [name]: { books: [], chapters: [], details: [], customGenres: [] } };
    
    setDatabases(newDb);
    setCurrentLibrary(name);
    
    // 클라우드 저장
    await supabase.from('booknote_saves').upsert({ id: 'main_save', data: newDb });
  };

  const saveData = async () => {
    if (!databases) return;
    setIsSaved('saving');
    const updatedDb = { ...databases, [currentLibrary]: { books, chapters, details, customGenres } };
    setDatabases(updatedDb);
    
    // 🌟 클라우드(Supabase) 저장
    const { error } = await supabase.from('booknote_saves').upsert({ id: 'main_save', data: updatedDb });
    
    if (!error) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    } else {
      alert("클라우드 저장에 실패했습니다.");
      setIsSaved(false);
    }
  };

  const loadLibrary = (owner) => {
    setDatabases(prev => ({ ...prev, [currentLibrary]: { books, chapters, details, customGenres } }));
    const targetData = databases[owner];
    setCurrentLibrary(owner);
    setBooks(targetData.books || []);
    setChapters(targetData.chapters || []);
    setDetails(targetData.details || []);
    setCustomGenres(targetData.customGenres || []);
    setViewMode('shelf');
    setSelectedBook(null);
  };

  const confirmAddUser = () => {
    const name = newUserName.trim();
    if (!name) return setShowAddUser(false);
    if (databases[name]) return alert("이미 존재하는 이름입니다.");
    setDatabases(prev => ({ ...prev, [currentLibrary]: { books, chapters, details, customGenres }, [name]: { books: [], chapters: [], details: [], customGenres: [] } }));
    setCurrentLibrary(name);
    setBooks([]); setChapters([]); setDetails([]); setCustomGenres([]);
    setViewMode('shelf');
    setNewUserName(''); setShowAddUser(false);
  };

  const confirmAddGenre = () => {
    const gName = newGenreName.trim();
    if (gName && !customGenres.includes(gName)) {
      setCustomGenres([...customGenres, gName]);
    }
    setNewGenreName(''); setShowAddGenre(false);
  };

  useEffect(() => {
    if (!searchQuery.trim()) return setSearchResults([]);
    const q = searchQuery.toLowerCase();
    const results = [];
    books.forEach(b => { if (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) results.push({ type: '책', title: b.title, desc: b.author, id: b.id, target: 'book' }); });
    chapters.forEach(c => { if (c.title.toLowerCase().includes(q)) results.push({ type: '챕터', title: c.title, desc: '소속 불명', id: c.id, bookId: c.bookId, target: 'chapter' }); });
    details.forEach(d => { if (d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)) results.push({ type: '노트', title: d.title, desc: '위치 불명', id: d.id, chapterId: d.chapterId, target: 'detail' }); });
    setSearchResults(results);
  }, [searchQuery, books, chapters, details]);

  const handleSearchResultClick = (result) => {
    if (result.target === 'book') { setSelectedBook(books.find(b=>b.id===result.id)); setViewMode('chapters'); }
    else if (result.target === 'chapter') { setSelectedBook(books.find(b=>b.id===result.bookId)); setSelectedChapter(chapters.find(c=>c.id===result.id)); setViewMode('details'); }
    else if (result.target === 'detail') { 
      const detail = details.find(d=>d.id===result.id);
      const chapter = chapters.find(c=>c.id===detail.chapterId);
      const book = books.find(b=>b.id===chapter.bookId);
      setSelectedBook(book); setSelectedChapter(chapter); setSelectedDetail(detail); setViewMode('editor');
    }
  };

  const getSpellCheckTarget = () => {
    if (viewMode === 'editor' && selectedDetail) return { obj: selectedDetail, type: 'detail' };
    if (spellTargetName.trim()) {
      const targetDetail = details.find(d => d.title === spellTargetName.trim());
      if (targetDetail) return { obj: targetDetail, type: 'detail' };
    }
    return null;
  };

  useEffect(() => {
    if (sidebarTab === 'spell') {
      const targetData = getSpellCheckTarget();
      if (targetData && targetData.obj) setSpellCorrection(targetData.obj.content || '');
      else setSpellCorrection('');
    }
  }, [selectedDetail?.id, sidebarTab, viewMode]);

  const handleRunSpellCheck = () => {
    if (!selectedDetail || !selectedDetail.content) return;
    setIsCheckingSpelling(true);
    setSpellMessage('');
    setTimeout(() => {
      let correctedText = selectedDetail.content;
      correctedText = correctedText.replace(/움지이고/g, '움직이고').replace(/재밋다/g, '재밌다').replace(/똑같에/g, '똑같애').replace(/바뀌내용/g, '바뀐 내용').replace(/않돼/g, '안 돼').replace(/않해/g, '안 해').replace(/어떡해/g, '어떻게 해');
      if (correctedText === selectedDetail.content) setSpellMessage('✅ 오타가 발견되지 않았습니다.');
      else setSpellMessage('✨ 오타를 수정했습니다! 확인 후 적용하세요.');
      setSpellCorrection(correctedText);
      setIsCheckingSpelling(false);
    }, 1000);
  };

  const applySpellCorrection = () => {
    if (!selectedDetail || viewMode !== 'editor') return;
    const newObj = { ...selectedDetail, content: spellCorrection };
    setDetails(details.map(d => d.id === newObj.id ? newObj : d));
    setSelectedDetail(newObj);
    setSpellMessage(`✅ 적용 완료!`);
    setTimeout(() => setSpellMessage(''), 3000);
  };

  const handleVideoUpdate = (url) => { if(viewMode === 'editor' && selectedDetail) { const newObj = { ...selectedDetail, videoUrl: url }; setSelectedDetail(newObj); setDetails(details.map(d=>d.id===newObj.id?newObj:d)); } };
  
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => { if (selectedBook) setLocalCategory(Array.isArray(selectedBook.category) ? selectedBook.category.join(', ') : (selectedBook.category || '')); }, [selectedBook?.id, selectedBook?.category]);
  const calculateProgress = (bookId) => { const book = books.find(b => b.id === bookId); if (!book || book.totalPages <= 0) return 0; const bookChapterIds = chapters.filter(c => c.bookId === bookId).map(c => c.id); const bookDetails = details.filter(d => bookChapterIds.includes(d.chapterId) && d.content.trim().length > 0); const writtenPages = bookDetails.reduce((sum, d) => sum + (d.endPage - d.startPage + 1), 0); return Math.min(Math.round((writtenPages / book.totalPages) * 100), 100); };
  const handleContextMenu = (e, book) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, book }); };
  const updateBook = (id, updates) => { setBooks(books.map(b => b.id === id ? { ...b, ...updates } : b)); if (selectedBook?.id === id) setSelectedBook({ ...selectedBook, ...updates }); };
  const handleAddBook = () => { const newBook = { id: Date.now(), title: '새로운 책', author: '', totalPages: 300, status: '대기 중', category: [], coverUrl: '', videoUrl: '' }; setBooks([...books, newBook]); setEditingBookId(newBook.id); };
  const handleAddChapter = () => { if (!selectedBook) return; const next = chapters.filter(c => c.bookId === selectedBook.id).length + 1; setChapters([...chapters, { id: Date.now(), bookId: selectedBook.id, index: next.toString(), title: `새로운 챕터 ${next}`, videoUrl: '' }]); };
  const handleAddDetail = () => { if (!selectedChapter) return; const next = details.filter(d => d.chapterId === selectedChapter.id).length + 1; setDetails([...details, { id: Date.now(), chapterId: selectedChapter.id, index: next.toString(), title: `세부 항목 ${next}`, startPage: 1, endPage: 10, content: '', videoUrl: '' }]); };
  const handleRename = (id, newName) => { setBooks(books.map(b => b.id === id ? { ...b, title: newName } : b)); setEditingBookId(null); };
  const handleDeleteBook = (id) => { setBooks(books.filter(b => b.id !== id)); setContextMenu(null); setViewMode('shelf'); };
  const usedGenres = [...new Set([...customGenres, ...books.flatMap(b => Array.isArray(b.category) ? b.category : [b.category])])].filter(g => g && g !== '');
  const handleDragStart = (e, bookId) => { setDraggedBookId(bookId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, genre) => { e.preventDefault(); if (dragOverGenre !== genre) setDragOverGenre(genre); };
  const handleDrop = (e, targetGenre) => { e.preventDefault(); setDragOverGenre(null); if (draggedBookId) { updateBook(draggedBookId, { category: [targetGenre] }); setDraggedBookId(null); } };


  // --- 렌더링 ---
  
  if (isAppLoading) {
    return <div className={`flex items-center justify-center h-screen w-full ${currentTheme.bg} ${currentTheme.text} font-sans`}><div className="animate-pulse flex flex-col items-center"><BookOpen size={48} className="mb-4 text-blue-500" />클라우드 데이터 동기화 중...</div></div>;
  }

  if (!databases) {
    return (
      <div className={`flex items-center justify-center h-screen w-full ${currentTheme.bg} ${currentTheme.text} font-sans`}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`p-10 rounded-3xl shadow-2xl ${currentTheme.panel} border ${currentTheme.border} text-center max-w-md w-full`}>
          <BookOpen size={64} className={`mx-auto mb-6 ${currentTheme.primary}`} />
          <h1 className="text-3xl font-black mb-2">BookNote</h1>
          <input autoFocus value={setupName} onChange={(e) => setSetupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInitialSetup()} placeholder="서재 이름 입력 (예: 홍길동)" className="w-full p-4 rounded-xl border-2 mt-6 outline-none text-center bg-transparent" />
          <button onClick={handleInitialSetup} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold mt-4 shadow-lg hover:bg-blue-700 transition">클라우드 서재 생성하기</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-500 font-sans ${currentTheme.bg} ${currentTheme.text}`} onClick={() => setContextMenu(null)}>
      {/* Left Sidebar */}
      <aside className={`w-64 border-r ${currentTheme.border} ${currentTheme.panel} flex flex-col z-20 shadow-sm shrink-0 h-full`}>
        <div className={`p-5 border-b ${currentTheme.border} flex flex-col gap-4`}>
          <div className="flex justify-between items-center">
            <h1 className={`text-xl font-black tracking-tighter flex items-center gap-2 ${currentTheme.primary}`}><BookOpen size={24} /> BookNote</h1>
            <button onClick={saveData} disabled={isSaved === 'saving'} className={`flex items-center gap-1 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all duration-300 ${isSaved === true ? 'bg-green-500' : isSaved === 'saving' ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSaved === true ? <><Check size={14}/> 클라우드 저장됨</> : isSaved === 'saving' ? <span className="animate-pulse">저장 중...</span> : <><Save size={14}/> 저장</>}
            </button>
          </div>
          <div className="bg-black/5 p-3 rounded-xl border border-black/10">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><Users size={12}/> 서재</label>
              <button onClick={() => setShowAddUser(true)} className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold hover:bg-blue-200">+ 추가</button>
            </div>
            {showAddUser ? (
              <div className="flex gap-1"><input autoFocus value={newUserName} onChange={e=>setNewUserName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmAddUser()} className="text-xs p-1 rounded w-full"/><button onClick={confirmAddUser} className="text-xs bg-blue-500 text-white px-2 rounded">OK</button></div>
            ) : (
              <select value={currentLibrary} onChange={(e) => loadLibrary(e.target.value)} className={`w-full bg-transparent font-bold outline-none cursor-pointer ${currentTheme.primary}`}>
                {Object.keys(databases).map(owner => <option key={owner} value={owner} className="text-gray-900">{owner}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          {usedGenres.map(genre => (
            <div key={genre} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(e, genre)} className="mb-4">
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg font-medium opacity-80 mb-1"><Folder size={18} className={currentTheme.primary} /> {genre}</div>
              <div className="space-y-1">
                {books.filter(b => Array.isArray(b.category) && b.category.includes(genre)).map(book => (
                  <div key={book.id} draggable onDragStart={(e)=>handleDragStart(e, book.id)} onClick={() => { setSelectedBook(book); setViewMode('chapters'); }} className={`flex items-center gap-2 px-2 py-2 ml-4 rounded-lg cursor-pointer hover:bg-black/5 text-sm ${selectedBook?.id===book.id ? 'font-bold '+currentTheme.primaryLight : ''}`}>
                    <Book size={16} /> <span className="truncate flex-1">{book.title}</span>
                    {calculateProgress(book.id) === 100 && <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1 rounded-full whitespace-nowrap">완독</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 px-2">
            {showAddGenre ? (
              <div className="flex gap-1"><input autoFocus value={newGenreName} onChange={e=>setNewGenreName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmAddGenre()} className="text-xs p-1 rounded border w-full"/><button onClick={confirmAddGenre} className="bg-green-500 text-white text-xs px-2 rounded">V</button></div>
            ) : (
              <button onClick={() => setShowAddGenre(true)} className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 w-full p-2"><Plus size={14}/> 장르 추가</button>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex justify-between bg-black/5 mx-4 mb-4 rounded-full">
          <button onClick={() => setTheme('light')}><Sun size={14}/></button>
          <button onClick={() => setTheme('sepia')}><Layout size={14}/></button>
          <button onClick={() => setTheme('dark')}><Moon size={14}/></button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative z-0 min-w-0">
        <header className={`h-16 border-b ${currentTheme.border} ${currentTheme.panel} flex items-center px-6 z-10 shadow-sm shrink-0`}>
          <div className="flex items-center gap-2 text-sm font-medium opacity-60">
            <button onClick={() => {setViewMode('shelf'); setSelectedBook(null);}} className="hover:opacity-100 flex items-center gap-1"><Folder size={16}/> 서재</button>
            {selectedBook && <><ChevronRight size={14}/><button onClick={() => {setViewMode('chapters'); setSelectedChapter(null);}} className="hover:opacity-100">{selectedBook.title}</button></>}
            {selectedChapter && <><ChevronRight size={14}/><span className="font-bold">{selectedChapter.title}</span></>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 fade-in">
          {viewMode === 'shelf' && (
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-black mb-8">{currentLibrary}의 도서</h2>
              <div className="grid grid-cols-3 gap-6">
                {books.map(book => (
                  <div key={book.id} onClick={() => { setSelectedBook(book); setViewMode('chapters'); }} onContextMenu={e => {e.preventDefault(); setContextMenu({x:e.pageX, y:e.pageY, book})}} className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.panel} shadow hover:shadow-xl cursor-pointer h-64 flex flex-col`}>
                    <div className="flex justify-between mb-4"><span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">{book.status}</span><MoreVertical size={16} className="opacity-50"/></div>
                    <h3 className="text-2xl font-black flex-1">{book.title}</h3>
                    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-4"><div style={{width: `${calculateProgress(book.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}></div></div>
                  </div>
                ))}
                <button onClick={handleAddBook} className={`h-64 rounded-3xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center opacity-50 hover:opacity-100 hover:border-blue-500 hover:text-blue-500`}><Plus size={32}/><span className="font-bold">책 추가</span></button>
              </div>
            </div>
          )}

          {viewMode === 'chapters' && selectedBook && (
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-8 mb-8">
                <div className={`w-32 h-44 rounded-xl border-2 border-dashed flex items-center justify-center bg-black/5 ${currentTheme.border}`}>{selectedBook.coverUrl?<img src={selectedBook.coverUrl} className="w-full h-full object-cover"/>:<span className="text-xs">표지 없음</span>}</div>
                <div className="flex-1">
                  <h2 className="text-4xl font-black mb-2">{selectedBook.title}</h2>
                  <div className="flex items-center gap-3"><div className="w-full h-3 bg-black/10 rounded-full"><div style={{width:`${calculateProgress(selectedBook.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}></div></div><span className="font-bold">{calculateProgress(selectedBook.id)}%</span></div>
                  {calculateProgress(selectedBook.id) === 100 && <div className="mt-2 text-yellow-600 font-bold flex items-center gap-1"><Award size={16}/> 완독 축하합니다!</div>}
                </div>
              </div>
              <div className="space-y-3">
                {chapters.filter(c => c.bookId === selectedBook.id).map(chapter => (
                  <div key={chapter.id} onClick={() => { setSelectedChapter(chapter); setViewMode('details'); }} className={`p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-lg cursor-pointer flex justify-between`}>
                    <span className="font-bold text-lg">{chapter.title}</span><ChevronRight size={20} className="opacity-30"/>
                  </div>
                ))}
                <button onClick={handleAddChapter} className={`w-full p-4 rounded-2xl border-2 border-dashed ${currentTheme.border} font-bold opacity-50 hover:opacity-100`}>+ 챕터 추가</button>
              </div>
            </div>
          )}

          {viewMode === 'details' && selectedChapter && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black mb-6">{selectedChapter.title}</h2>
              <div className="space-y-3">
                {details.filter(d=>d.chapterId===selectedChapter.id).map(detail=>(
                  <div key={detail.id} onClick={()=>{setSelectedDetail(detail);setViewMode('editor')}} className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-md cursor-pointer flex justify-between`}>
                    <span className="font-bold">{detail.title}</span>
                  </div>
                ))}
                <button onClick={handleAddDetail} className={`w-full p-4 rounded-xl border-2 border-dashed ${currentTheme.border} font-bold opacity-50 hover:opacity-100`}>+ 세부 노트 추가</button>
              </div>
            </div>
          )}

          {viewMode === 'editor' && selectedDetail && (
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <div className={`flex-1 rounded-3xl border ${currentTheme.border} ${currentTheme.panel} p-8 flex flex-col gap-4 shadow-sm`}>
                <div className={`flex gap-4 text-sm items-center bg-black/5 p-2 rounded-lg w-fit ${theme==='dark'?'text-white':''}`}>
                  <span className="font-bold opacity-50">PAGE:</span>
                  <input value={selectedDetail.startPage} onChange={e=>{const v=parseInt(e.target.value)||0;setSelectedDetail({...selectedDetail,startPage:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,startPage:v}:d))}} className={`w-12 text-center rounded border ${theme==='dark'?'bg-gray-700 text-white border-gray-600':'bg-white text-black'}`}/> ~
                  <input value={selectedDetail.endPage} onChange={e=>{const v=parseInt(e.target.value)||0;setSelectedDetail({...selectedDetail,endPage:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,endPage:v}:d))}} className={`w-12 text-center rounded border ${theme==='dark'?'bg-gray-700 text-white border-gray-600':'bg-white text-black'}`}/>
                </div>
                <input value={selectedDetail.title} onChange={e=>{const v=e.target.value;setSelectedDetail({...selectedDetail,title:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,title:v}:d))}} className="text-2xl font-black bg-transparent outline-none border-b border-transparent focus:border-gray-300 pb-2"/>
                <textarea value={selectedDetail.content} onChange={e=>{const v=e.target.value;setSelectedDetail({...selectedDetail,content:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,content:v}:d))}} className="flex-1 bg-transparent outline-none resize-none text-lg" placeholder="내용 입력..."/>
                {selectedDetail.videoUrl && getYoutubeId(selectedDetail.videoUrl) && (
                  <div className="mt-4 border-t pt-4"><iframe width="100%" height="300" src={`https://www.youtube.com/embed/${getYoutubeId(selectedDetail.videoUrl)}`} frameBorder="0" allowFullScreen></iframe></div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar (Utility) */}
      <aside className={`w-80 border-l ${currentTheme.border} ${currentTheme.panel} flex flex-col z-20 shadow-lg`}>
        <div className="flex border-b">
          <button onClick={()=>setSidebarTab('search')} className={`flex-1 p-3 ${sidebarTab==='search'?'border-b-2 border-blue-500':''}`}><Search/></button>
          <button onClick={()=>setSidebarTab('spell')} className={`flex-1 p-3 ${sidebarTab==='spell'?'border-b-2 border-blue-500':''}`}><CheckCircle/></button>
          <button onClick={()=>setSidebarTab('video')} className={`flex-1 p-3 ${sidebarTab==='video'?'border-b-2 border-blue-500':''}`}><Video/></button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {sidebarTab==='search' && (
            <div>
              <h3 className="font-bold flex gap-2 mb-4"><Search/> 검색</h3>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="검색어..." className="w-full p-2 border rounded"/>
              <div className="mt-2 space-y-2">
                {searchResults.map((res,i)=><div key={i} onClick={()=>handleSearchResultClick(res)} className="p-2 border rounded cursor-pointer hover:bg-black/5 text-sm">{res.title}</div>)}
              </div>
            </div>
          )}
          {sidebarTab==='spell' && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold flex gap-2"><CheckCircle/> 맞춤법 검사</h3>
              {spellMessage && <div className="bg-green-100 text-green-800 p-2 rounded text-xs">{spellMessage}</div>}
              {viewMode === 'editor' && selectedDetail ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs opacity-50">원본</span>
                    <div className="bg-black/5 p-2 rounded text-sm max-h-32 overflow-y-auto text-gray-500">{selectedDetail.content}</div>
                  </div>
                  <div className="flex justify-center"><ArrowDown size={16}/></div>
                  <div className="flex justify-center"><button onClick={handleRunSpellCheck} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200">{isCheckingSpelling?'분석 중...':'✨ 자동 검사 실행'}</button></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs opacity-50 text-blue-600">수정본</span>
                    <textarea value={spellCorrection} onChange={e=>setSpellCorrection(e.target.value)} className="w-full h-32 p-2 border text-sm text-black rounded" placeholder="수정 내용..."></textarea>
                  </div>
                  <button onClick={applySpellCorrection} className="w-full bg-blue-600 text-white py-2 rounded text-sm font-bold">적용하기</button>
                </>
              ) : <p className="text-center text-xs opacity-50 py-10">에디터에서 실행하세요.</p>}
            </div>
          )}
          {sidebarTab==='video' && (
            <div>
              <h3 className="font-bold flex gap-2 mb-4"><Video/> 동영상 링크</h3>
              {viewMode==='editor' && selectedDetail ? (
                <>
                  <input value={selectedDetail.videoUrl || ''} onChange={e=>handleVideoUpdate(e.target.value)} placeholder="YouTube URL..." className="w-full p-2 border rounded text-xs"/>
                  {selectedDetail.videoUrl && <div className="mt-2 aspect-video bg-black rounded"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(selectedDetail.videoUrl)}`} frameBorder="0"></iframe></div>}
                </>
              ) : <p className="text-center text-xs opacity-50 py-10">대상을 선택하세요.</p>}
            </div>
          )}
        </div>
      </aside>
      {contextMenu && <div className="fixed bg-white border rounded shadow-xl py-1 z-50" style={{top:contextMenu.y, left:contextMenu.x}}><button className="block w-full text-left px-4 py-1 hover:bg-gray-100 text-red-500 text-sm" onClick={()=>handleDeleteBook(contextMenu.book.id)}>삭제</button></div>}
    </div>
  );
}
