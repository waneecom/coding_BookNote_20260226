import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, Folder, ChevronRight, Search, CheckCircle, Video, 
  ArrowLeft, Plus, MoreVertical, Moon, Sun, BookOpen, 
  Layout, PanelRightClose, PanelRightOpen, Check, Edit3, Trash2,
  FileText, Users, Info, Save, ExternalLink, ArrowDown, Award, Sparkles
} from 'lucide-react';

// 유튜브 ID 추출 유틸리티
const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function App() {
  // --- 상태 관리 ---
  
  // 1. 데이터베이스 (수동 저장 버전)
  const [databases, setDatabases] = useState(() => {
    const saved = localStorage.getItem('booknote_web_final');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  });
  
  const [currentLibrary, setCurrentLibrary] = useState(databases ? Object.keys(databases)[0] : '');
  
  const libData = databases && currentLibrary ? databases[currentLibrary] : { books: [], chapters: [], details: [], customGenres: [] };
  const [books, setBooks] = useState(libData.books);
  const [chapters, setChapters] = useState(libData.chapters);
  const [details, setDetails] = useState(libData.details);
  const [customGenres, setCustomGenres] = useState(libData.customGenres || []);
  
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
  const [isSaved, setIsSaved] = useState(false); // 저장 피드백 상태
  
  // 맞춤법 상태
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

  // --- 로직 ---

  const handleInitialSetup = () => {
    if (!setupName.trim()) return alert("이름을 입력해주세요!");
    const name = setupName.trim();
    const newDb = { [name]: { books: [], chapters: [], details: [], customGenres: [] } };
    setDatabases(newDb);
    setCurrentLibrary(name);
    setBooks([]); setChapters([]); setDetails([]); setCustomGenres([]);
    localStorage.setItem('booknote_web_final', JSON.stringify(newDb));
  };

  const saveData = () => {
    if (!databases) return;
    const updatedDb = { ...databases, [currentLibrary]: { books, chapters, details, customGenres } };
    setDatabases(updatedDb);
    localStorage.setItem('booknote_web_final', JSON.stringify(updatedDb));
    
    // 저장 피드백 (1초)
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 1000);
  };

  const loadLibrary = (owner) => {
    // 전환 전, 현재 서재 상태를 메모리(state)에는 반영해두지만 로컬스토리지 저장은 안 함(수동 저장 원칙)
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

  // --- 검색 및 이동 ---
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

  // --- 맞춤법 검사기 (UI 개선판) ---
  const getSpellCheckTarget = () => {
    if (viewMode === 'editor' && selectedDetail) return { obj: selectedDetail, type: 'detail' };
    if (spellTargetName.trim()) {
      const targetDetail = details.find(d => d.title === spellTargetName.trim());
      if (targetDetail) return { obj: targetDetail, type: 'detail' };
    }
    return null;
  };

  // 탭 열거나 대상 변경 시 내용 동기화
  useEffect(() => {
    if (sidebarTab === 'spell') {
      const targetData = getSpellCheckTarget();
      if (targetData && targetData.obj) {
        setSpellCorrection(targetData.obj.content || '');
      } else {
        setSpellCorrection('');
      }
    }
  }, [selectedDetail?.id, sidebarTab, viewMode]);

  const handleRunSpellCheck = () => {
    if (!selectedDetail || !selectedDetail.content) return;
    setIsCheckingSpelling(true);
    setSpellMessage('');

    setTimeout(() => {
      let correctedText = selectedDetail.content;
      correctedText = correctedText.replace(/움지이고/g, '움직이고');
      correctedText = correctedText.replace(/재밋다/g, '재밌다');
      correctedText = correctedText.replace(/똑같에/g, '똑같애');
      correctedText = correctedText.replace(/바뀌내용/g, '바뀐 내용');
      correctedText = correctedText.replace(/않돼/g, '안 돼');
      correctedText = correctedText.replace(/않해/g, '안 해');
      correctedText = correctedText.replace(/어떡해/g, '어떻게 해');
      
      if (correctedText === selectedDetail.content) {
        setSpellMessage('✅ 분석 완료: 발견된 오타가 없습니다!');
      } else {
        setSpellMessage('✨ 오타를 수정했습니다! 아래에서 확인 후 적용하세요.');
      }
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

  // --- 비디오 업데이트 ---
  const handleVideoUpdate = (url) => {
    let target = null;
    if (viewMode === 'editor') target = { obj: selectedDetail, setter: setSelectedDetail, listSetter: setDetails, list: details };
    else if (viewMode === 'details') target = { obj: selectedChapter, setter: setSelectedChapter, listSetter: setChapters, list: chapters };
    else if (viewMode === 'chapters') target = { obj: selectedBook, setter: setSelectedBook, listSetter: setBooks, list: books };
    
    if (!target || !target.obj) return;
    const newObj = { ...target.obj, videoUrl: url };
    target.setter(newObj);
    target.listSetter(target.list.map(item => item.id === newObj.id ? newObj : item));
  };


  // --- 기본 핸들러들 ---
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedBook) {
      setLocalCategory(Array.isArray(selectedBook.category) ? selectedBook.category.join(', ') : (selectedBook.category || ''));
    }
  }, [selectedBook?.id, selectedBook?.category]);

  const calculateProgress = (bookId) => {
    const book = books.find(b => b.id === bookId);
    if (!book || book.totalPages <= 0) return 0;
    const bookChapterIds = chapters.filter(c => c.bookId === bookId).map(c => c.id);
    const bookDetails = details.filter(d => bookChapterIds.includes(d.chapterId) && d.content.trim().length > 0);
    const writtenPages = bookDetails.reduce((sum, d) => sum + (d.endPage - d.startPage + 1), 0);
    const progress = Math.min(Math.round((writtenPages / book.totalPages) * 100), 100);
    return isNaN(progress) ? 0 : progress;
  };

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

  if (!databases) {
    return (
      <div className={`flex items-center justify-center h-screen w-full ${currentTheme.bg} ${currentTheme.text} font-sans`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className={`p-10 rounded-3xl shadow-2xl ${currentTheme.panel} border ${currentTheme.border} text-center max-w-md w-full`}
        >
          <BookOpen size={64} className={`mx-auto mb-6 ${currentTheme.primary}`} />
          <h1 className="text-3xl font-black mb-2">BookNote</h1>
          <input autoFocus value={setupName} onChange={(e) => setSetupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInitialSetup()} placeholder="서재 이름 입력 (예: 홍길동)" className="w-full p-4 rounded-xl border-2 mt-6 outline-none text-center bg-transparent" />
          <button onClick={handleInitialSetup} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold mt-4 shadow-lg hover:bg-blue-700 transition">생성하기</button>
        </motion.div>
      </div>
    );
  }

  // --- Left Sidebar ---
  const renderLeftNav = () => (
    <aside className={`w-64 border-r ${currentTheme.border} ${currentTheme.panel} flex flex-col z-20 shadow-sm shrink-0 h-full`}>
      <div className={`p-5 border-b ${currentTheme.border} flex flex-col gap-4`}>
        <div className="flex justify-between items-center">
          <h1 className={`text-xl font-black tracking-tighter flex items-center gap-2 ${currentTheme.primary}`}><BookOpen size={24} /> BookNote</h1>
          {/* 수동 저장 버튼 */}
          <button 
            onClick={saveData} 
            className={`flex items-center gap-1 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all duration-300 ${isSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isSaved ? <><Check size={14}/> 저장됨</> : <><Save size={14}/> 저장</>}
          </button>
        </div>
        <div className="bg-black/5 p-3 rounded-xl border border-black/10">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-1"><Users size={12}/> 서재</label>
            <button onClick={() => { setShowAddUser(true); setNewUserName(''); }} className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold hover:bg-blue-200">+ 추가</button>
          </div>
          {showAddUser ? (
            <div className="flex flex-col gap-2">
              <input autoFocus value={newUserName} onChange={e=>setNewUserName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmAddUser()} className="text-xs p-1.5 rounded border w-full" placeholder="이름"/>
              <div className="flex gap-1"><button onClick={confirmAddUser} className="flex-1 bg-blue-500 text-white text-xs py-1 rounded">확인</button><button onClick={()=>setShowAddUser(false)} className="flex-1 bg-gray-300 text-black text-xs py-1 rounded">취소</button></div>
            </div>
          ) : (
            <select value={currentLibrary} onChange={(e) => loadLibrary(e.target.value)} className={`w-full bg-transparent font-bold outline-none cursor-pointer ${currentTheme.primary}`}>
              {Object.keys(databases).map(owner => <option key={owner} value={owner} className="text-gray-900">{owner}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {books.filter(b => !b.category || b.category.length === 0 || (b.category.length === 1 && b.category[0] === '')).length > 0 && (
          <div className="mb-4">
             <div className="flex items-center gap-2 px-2 py-2 rounded-lg font-medium opacity-80 mb-1"><Folder size={18} className="text-gray-400" /> 미분류</div>
             <div className="space-y-1">
               {books.filter(b => !b.category || b.category.length === 0 || (b.category.length === 1 && b.category[0] === '')).map(book => {
                 const progress = calculateProgress(book.id);
                 return (
                   <div key={book.id} onClick={() => { setSelectedBook(book); setViewMode('chapters'); }} draggable onDragStart={(e) => handleDragStart(e, book.id)} className={`flex items-center gap-2 px-2 py-2 ml-4 rounded-lg cursor-pointer hover:bg-black/5 text-sm ${selectedBook?.id === book.id ? 'bg-black/5 font-bold' : ''}`}>
                     <Book size={16} className="shrink-0" /> 
                     <span className="truncate flex-1">{book.title}</span>
                     {progress === 100 && <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">완독</span>}
                   </div>
                 );
               })}
             </div>
          </div>
        )}
        {usedGenres.map(genre => (
          <div key={genre} onDragOver={(e) => handleDragOver(e, genre)} onDrop={(e) => handleDrop(e, genre)} onDragLeave={() => setDragOverGenre(null)} className={`mb-4 rounded-xl transition-colors ${dragOverGenre === genre ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}>
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg font-medium opacity-80 mb-1"><Folder size={18} className={currentTheme.primary} /> {genre}</div>
            <div className="space-y-1">
              {books.filter(b => Array.isArray(b.category) && b.category.includes(genre)).map(book => {
                const progress = calculateProgress(book.id);
                return (
                  <div key={book.id} onClick={() => { setSelectedBook(book); setViewMode('chapters'); }} draggable onDragStart={(e) => handleDragStart(e, book.id)} className={`flex items-center gap-2 px-2 py-2 ml-4 rounded-lg cursor-pointer hover:bg-black/5 text-sm transition-colors ${selectedBook?.id === book.id ? currentTheme.primaryLight + ' font-bold' : ''}`}>
                    <Book size={16} className="shrink-0" /> 
                    <span className="truncate flex-1">{book.title}</span>
                    {progress === 100 && <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">완독</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="pt-2 px-2">
          {showAddGenre ? (
            <div className="flex gap-1"><input autoFocus value={newGenreName} onChange={e=>setNewGenreName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmAddGenre()} className="text-xs p-1.5 rounded border w-full" placeholder="장르명"/><button onClick={confirmAddGenre} className="bg-green-500 text-white text-xs px-2 rounded">V</button></div>
          ) : (
            <button onClick={() => { setShowAddGenre(true); setNewGenreName(''); }} className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 hover:text-blue-500 transition-colors w-full p-2"><Plus size={14}/> 장르 추가</button>
          )}
        </div>
      </div>
      <div className={`p-6 border-t ${currentTheme.border} flex justify-between bg-black/5 p-1 rounded-full mx-4 mb-4`}>
        <button onClick={() => setTheme('light')} className={`p-2 rounded-full ${theme === 'light' ? 'bg-white shadow' : 'opacity-50'}`}><Sun size={14} /></button>
        <button onClick={() => setTheme('sepia')} className={`p-2 rounded-full ${theme === 'sepia' ? 'bg-[#fdf6e3] shadow' : 'opacity-50'}`}><Layout size={14} /></button>
        <button onClick={() => setTheme('dark')} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white shadow' : 'opacity-50'}`}><Moon size={14} /></button>
      </div>
    </aside>
  );

  // --- Right Utility Panel ---
  const renderUtilityPanel = () => {
    const videoTargetObj = viewMode === 'editor' ? selectedDetail : (viewMode === 'details' ? selectedChapter : selectedBook);
    const currentVideoUrl = videoTargetObj?.videoUrl || '';
    const levelName = viewMode === 'editor' ? '세부 항목' : (viewMode === 'details' ? '챕터' : '책');

    return (
      <aside className={`transition-all duration-300 border-l ${currentTheme.border} ${currentTheme.panel} flex flex-col z-20 shadow-lg shrink-0 ${sidebarTab ? 'w-80' : 'w-16'} h-full`}>
        <div className={`flex items-center border-b ${currentTheme.border}`}>
          <button onClick={() => setSidebarTab(sidebarTab ? null : 'search')} className="p-4 opacity-50 hover:opacity-100">{sidebarTab ? <PanelRightClose size={20}/> : <PanelRightOpen size={20}/>}</button>
          {sidebarTab && (
            <div className="flex flex-1 justify-around pr-2">
              <button onClick={() => setSidebarTab('search')} className={`p-3 border-b-2 transition-colors ${sidebarTab === 'search' ? `border-blue-500 ${currentTheme.primary}` : 'border-transparent opacity-50'}`}><Search size={20}/></button>
              <button onClick={() => setSidebarTab('spell')} className={`p-3 border-b-2 transition-colors ${sidebarTab === 'spell' ? `border-blue-500 ${currentTheme.primary}` : 'border-transparent opacity-50'}`}><CheckCircle size={20}/></button>
              <button onClick={() => setSidebarTab('video')} className={`p-3 border-b-2 transition-colors ${sidebarTab === 'video' ? `border-blue-500 ${currentTheme.primary}` : 'border-transparent opacity-50'}`}><Video size={20}/></button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {sidebarTab && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6 overflow-y-auto">
              {sidebarTab === 'search' && (
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Search size={18}/> 검색</h3>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색어 입력..." className={`w-full p-2 rounded border ${currentTheme.border} bg-transparent outline-none focus:ring-2 focus:ring-blue-500`} />
                  <div className="space-y-2">
                    {searchResults.length === 0 ? <p className="text-center opacity-50 text-xs py-4">결과가 없습니다.</p> : searchResults.map((res, i) => (
                      <div key={i} onClick={() => handleSearchResultClick(res)} className={`p-3 rounded border bg-black/5 text-sm cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all`}>
                        <div className="font-bold flex items-center gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-blue-500 shrink-0`}>{res.type}</span><span className="truncate">{res.title}</span><ExternalLink size={12} className="opacity-50"/></div>
                        <div className="opacity-60 text-xs mt-1 truncate">{res.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. 맞춤법 탭 */}
              {sidebarTab === 'spell' && (
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><CheckCircle size={18}/> 맞춤법 / 내용 교정</h3>
                  {spellMessage && <div className="bg-green-100 text-green-800 p-2 rounded text-xs font-bold">{spellMessage}</div>}

                  {viewMode === 'editor' && selectedDetail ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-xs font-bold text-center border-b pb-2 flex items-center justify-center gap-2">
                        <Edit3 size={12}/> {selectedDetail.title} 교정 중
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold opacity-50 pl-1">원본 내용 (Original)</span>
                        <div className="bg-black/5 p-3 rounded border border-black/10 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap text-gray-500">
                          {selectedDetail.content || "(내용이 비어있습니다)"}
                        </div>
                      </div>

                      <div className="flex justify-center my-1">
                        <button 
                          onClick={handleRunSpellCheck}
                          disabled={isCheckingSpelling || !selectedDetail.content}
                          className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                        >
                          {isCheckingSpelling ? <span className="animate-spin">⏳</span> : <Sparkles size={14}/>}
                          {isCheckingSpelling ? 'AI 분석 및 교정 중...' : '✨ 자동 맞춤법 검사 실행'}
                        </button>
                      </div>

                      <div className="flex justify-center opacity-30"><ArrowDown size={20}/></div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold opacity-100 text-blue-600 pl-1">수정할 내용 (Edit here)</span>
                        <textarea 
                          value={spellCorrection} 
                          onChange={e=>setSpellCorrection(e.target.value)} 
                          className="w-full h-40 p-3 rounded border-2 border-blue-200 bg-white text-sm focus:border-blue-500 outline-none resize-none text-gray-900" 
                          placeholder="수정할 내용을 입력하세요..."
                        ></textarea>
                      </div>
                      
                      <button onClick={applySpellCorrection} className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-colors">본문에 적용하기</button>
                    </div>
                  ) : (
                    <p className="text-center opacity-50 text-xs py-10">에디터 화면에서 글을 작성하면<br/>자동으로 이곳에 불러옵니다.</p>
                  )}
                </div>
              )}

              {/* 3. 동영상 탭 */}
              {sidebarTab === 'video' && (
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Video size={18}/> 동영상 링크 ({levelName})</h3>
                  {videoTargetObj ? (
                    <>
                      <div className="text-xs opacity-60 mb-1">유튜브 링크를 입력하세요:</div>
                      <input type="text" value={currentVideoUrl} onChange={e=>handleVideoUpdate(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full p-2 rounded border bg-transparent text-xs outline-none focus:border-blue-500" />
                      {getYoutubeId(currentVideoUrl) ? (
                        <div className="relative aspect-video bg-black rounded shadow mt-2"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(currentVideoUrl)}`} frameBorder="0" allowFullScreen></iframe></div>
                      ) : <div className="aspect-video bg-black/10 rounded flex items-center justify-center text-xs opacity-50 mt-2">표지 미리보기 없음</div>}
                      <p className="text-[10px] opacity-50 mt-2">* 세부 항목의 경우, 글을 작성하는 에디터 화면 맨 아래에도 영상이 표시됩니다.</p>
                    </>
                  ) : <p className="text-center opacity-50 text-xs">대상을 선택하세요</p>}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    );
  };

  // --- Main Content ---
  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-500 font-sans ${currentTheme.bg} ${currentTheme.text}`} onClick={() => setContextMenu(null)}>
      {renderLeftNav()}

      <main className="flex-1 flex flex-col relative z-0 min-w-0">
        <header className={`h-16 border-b ${currentTheme.border} ${currentTheme.panel} flex items-center px-6 z-10 shadow-sm shrink-0`}>
          <div className="flex items-center gap-2 text-sm font-medium opacity-60">
            <button onClick={() => {setViewMode('shelf'); setSelectedBook(null); setSelectedChapter(null); setSelectedDetail(null);}} className="hover:opacity-100 flex items-center gap-1 hover:text-blue-500 transition-colors"><Folder size={16}/> 서재</button>
            {selectedBook && <><ChevronRight size={14}/><button onClick={() => {setViewMode('chapters'); setSelectedChapter(null); setSelectedDetail(null);}} className={`hover:opacity-100 hover:text-blue-500 transition-colors truncate max-w-[150px] ${viewMode==='chapters'?'text-blue-500 font-bold opacity-100':''}`}>{selectedBook.title}</button></>}
            {selectedChapter && viewMode !== 'shelf' && <><ChevronRight size={14}/><button onClick={() => {setViewMode('details'); setSelectedDetail(null);}} className={`hover:opacity-100 hover:text-blue-500 transition-colors truncate max-w-[150px] ${viewMode==='details'?'text-blue-500 font-bold opacity-100':''}`}>{selectedChapter.title}</button></>}
            {selectedDetail && viewMode === 'editor' && <><ChevronRight size={14}/><span className="text-blue-500 font-bold opacity-100 truncate max-w-[150px]">{selectedDetail.title}</span></>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. Shelf View */}
            {viewMode === 'shelf' && (
              <motion.div key="shelf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-black mb-8 flex items-center gap-2">{currentLibrary}의 도서 <span className="text-sm font-normal bg-black/10 px-2 py-1 rounded-full">{books.length}권</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {books.map(book => (
                    <motion.div key={book.id} onClick={() => { setSelectedBook(book); setViewMode('chapters'); }} onContextMenu={e => handleContextMenu(e, book)} className={`relative p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.panel} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-64`}>
                      <div className="flex justify-between items-start mb-4"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${book.status==='읽는 중'?'bg-blue-100 text-blue-600':'bg-black/5'}`}>{book.status}</span><MoreVertical size={16} className="opacity-0 group-hover:opacity-50" /></div>
                      <div className="flex-1">
                        {editingBookId === book.id ? <input autoFocus defaultValue={book.title} onClick={e=>e.stopPropagation()} onBlur={e=>handleRename(book.id, e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleRename(book.id, e.target.value)} className="text-2xl font-black w-full bg-transparent border-b-2 border-blue-500 outline-none"/> : <div className="flex items-center gap-2 group/edit"><h3 className="text-2xl font-black line-clamp-2">{book.title}</h3><button onClick={(e)=>{e.stopPropagation();setEditingBookId(book.id)}} className="opacity-0 group-hover/edit:opacity-100 text-gray-400 hover:text-blue-500"><Edit3 size={16}/></button></div>}
                        <p className="mt-2 text-sm opacity-60">{book.author || '저자 미상'} · {book.totalPages}p</p>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-4"><div style={{width: `${calculateProgress(book.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}></div></div>
                    </motion.div>
                  ))}
                  <button onClick={handleAddBook} className={`h-64 rounded-3xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center opacity-50 hover:opacity-100 hover:border-blue-500 hover:text-blue-500 transition-all gap-2`}><Plus size={32}/><span className="font-bold">새로운 책 추가</span></button>
                </div>
              </motion.div>
            )}

            {/* 2. Chapters View (개선됨: 진행률 표시) */}
            {viewMode === 'chapters' && selectedBook && (
              <motion.div key="chapters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
                <div className="mb-8 flex gap-8">
                   <label className={`w-32 h-44 rounded-xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center cursor-pointer hover:opacity-70 overflow-hidden relative ${selectedBook.coverUrl?'':'bg-black/5'}`}>
                     {selectedBook.coverUrl ? <img src={selectedBook.coverUrl} className="w-full h-full object-cover"/> : <span className="text-xs opacity-50 text-center p-2">표지 추가</span>}
                     <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files[0]) updateBook(selectedBook.id, {coverUrl: URL.createObjectURL(e.target.files[0])})}} />
                   </label>
                   <div className="flex-1">
                     <div className="flex flex-col gap-2 mb-4">
                       <div className="flex items-center gap-2">
                         <h2 className="text-4xl font-black">{selectedBook.title}</h2>
                         <button onClick={()=>setEditingBookId(selectedBook.id)} className="text-gray-400 hover:text-blue-500"><Edit3 size={20}/></button>
                       </div>
                       
                       {/* 진행률 표시 추가 */}
                       <div className="flex items-center gap-3">
                         <div className="w-48 h-3 rounded-full bg-black/10 overflow-hidden">
                           <div style={{width: `${calculateProgress(selectedBook.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}></div>
                         </div>
                         <span className={`text-lg font-bold ${currentTheme.primary}`}>{calculateProgress(selectedBook.id)}% 읽음</span>
                         {calculateProgress(selectedBook.id) === 100 && (
                           <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold"><Award size={14}/> 완독 달성!</span>
                         )}
                       </div>
                     </div>
                     
                     <div className="space-y-2 text-sm opacity-80">
                        <div className="flex items-center gap-2"><span>저자:</span><input value={selectedBook.author} onChange={e=>updateBook(selectedBook.id,{author:e.target.value})} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-32"/></div>
                        <div className="flex items-center gap-2"><span>장르:</span><input value={localCategory} onChange={e=>setLocalCategory(e.target.value)} onBlur={()=>{updateBook(selectedBook.id,{category:localCategory.split(',').map(s=>s.trim())})}} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-48" placeholder="예: 소설, 과학"/></div>
                        <div className="flex items-center gap-2"><span>총 페이지:</span><input type="number" value={selectedBook.totalPages} onChange={e=>updateBook(selectedBook.id,{totalPages:parseInt(e.target.value)||0})} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-16 font-bold"/>쪽</div>
                     </div>
                   </div>
                </div>
                <div className="space-y-3">
                  {chapters.filter(c => c.bookId === selectedBook.id).map(chapter => (
                    <motion.div key={chapter.id} onClick={() => { setSelectedChapter(chapter); setViewMode('details'); }} className={`p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-lg transition-all cursor-pointer flex items-center justify-between`}>
                      <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${currentTheme.primaryLight} ${currentTheme.primary}`}>{chapter.index}</div><span className="font-bold text-lg">{chapter.title}</span></div>
                      <ChevronRight size={20} className="opacity-30"/>
                    </motion.div>
                  ))}
                  <button onClick={handleAddChapter} className={`w-full p-4 rounded-2xl border-2 border-dashed ${currentTheme.border} text-center opacity-50 hover:opacity-100 font-bold`}>+ 챕터 추가</button>
                </div>
              </motion.div>
            )}

            {/* 3. Details View */}
            {viewMode === 'details' && selectedChapter && (
               <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto h-full flex flex-col">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black mb-6 flex items-center gap-2"><span className={currentTheme.primary}>#{selectedChapter.index}</span> <input value={selectedChapter.title} onChange={e=>{const n=e.target.value;setSelectedChapter({...selectedChapter,title:n});setChapters(chapters.map(c=>c.id===selectedChapter.id?{...c,title:n}:c))}} className="bg-transparent outline-none w-full"/></h2>
                    {details.filter(d=>d.chapterId===selectedChapter.id).map(detail=>(
                      <div key={detail.id} onClick={()=>{setSelectedDetail(detail);setViewMode('editor')}} className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-md cursor-pointer flex justify-between`}>
                        <span className="font-bold">{detail.title}</span><span className="text-xs opacity-50">{detail.startPage}-{detail.endPage}p</span>
                      </div>
                    ))}
                    <button onClick={handleAddDetail} className={`w-full p-4 rounded-xl border-2 border-dashed ${currentTheme.border} opacity-50 hover:opacity-100 font-bold`}>+ 세부 노트 추가</button>
                  </div>
               </motion.div>
            )}

            {/* 4. Editor View (페이지 입력 다크모드 개선) */}
            {viewMode === 'editor' && selectedDetail && (
               <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto h-full flex flex-col">
                 <div className={`flex-1 rounded-3xl border ${currentTheme.border} ${currentTheme.panel} p-8 flex flex-col gap-4 shadow-sm overflow-y-auto`}>
                   
                   {/* 페이지 입력 (다크모드 완벽 대응) */}
                   <div className={`flex gap-4 text-sm items-center bg-black/5 p-2 rounded-lg w-fit ${theme === 'dark' ? 'text-white' : ''}`}>
                     <span className="opacity-50 font-bold">PAGE:</span>
                     <input 
                       value={selectedDetail.startPage} 
                       onChange={e=>{const v=parseInt(e.target.value)||0;setSelectedDetail({...selectedDetail,startPage:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,startPage:v}:d))}} 
                       className={`w-12 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                     />
                     <span className="opacity-50">~</span>
                     <input 
                       value={selectedDetail.endPage} 
                       onChange={e=>{const v=parseInt(e.target.value)||0;setSelectedDetail({...selectedDetail,endPage:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,endPage:v}:d))}} 
                       className={`w-12 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                     />
                   </div>

                   <input value={selectedDetail.title} onChange={e=>{const v=e.target.value;setSelectedDetail({...selectedDetail,title:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,title:v}:d))}} className="text-2xl font-black bg-transparent outline-none border-b border-transparent focus:border-gray-200 pb-2"/>
                   
                   <textarea 
                     value={selectedDetail.content} 
                     onChange={e=>{const v=e.target.value;setSelectedDetail({...selectedDetail,content:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,content:v}:d))}} 
                     className="min-h-[300px] bg-transparent outline-none resize-none leading-relaxed text-lg" 
                     placeholder="내용을 입력하세요..."
                   />

                   {selectedDetail.videoUrl && getYoutubeId(selectedDetail.videoUrl) && (
                     <div className="mt-8 border-t pt-8">
                       <h4 className="text-sm font-bold opacity-60 mb-4 flex items-center gap-2"><Video size={16}/> 관련 영상</h4>
                       <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
                         <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(selectedDetail.videoUrl)}`} frameBorder="0" allowFullScreen></iframe>
                       </div>
                     </div>
                   )}
                 </div>
               </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {renderUtilityPanel()}
      {contextMenu && (
        <div className="fixed bg-white border rounded-xl shadow-2xl py-2 w-40 z-50 text-sm" style={{top:contextMenu.y, left:contextMenu.x}} onClick={e=>e.stopPropagation()}>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black" onClick={()=>{setEditingBookId(contextMenu.book.id);setContextMenu(null)}}>이름 변경</button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500" onClick={()=>{handleDeleteBook(contextMenu.book.id);setContextMenu(null)}}>삭제</button>
        </div>
      )}
    </div>
  );
}