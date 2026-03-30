import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, Folder, ChevronRight, ChevronLeft, Search, CheckCircle, Video,
  Plus, Moon, Sun, BookOpen, Lock, Globe,
  Layout, PanelRightClose, PanelRightOpen, Check, Edit3,
  Users, Save, ExternalLink, ArrowDown, Award, Sparkles, Trash2,
  UserPlus, UserCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function App() {
  // --- 상태 관리 ---
  const [isAppLoading, setIsAppLoading] = useState(true);
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
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState([]);
  const [isSearchingBook, setIsSearchingBook] = useState(false);
  const [bookSearchError, setBookSearchError] = useState('');

  // --- 인증 상태 ---
  const [currentUser, setCurrentUser] = useState(null); // { id, displayName }
  const [authMode, setAuthMode] = useState('login');     // 'login' | 'signup'
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPw, setAuthConfirmPw] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- 독자 현황 / 친구 ---
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [socialData, setSocialData] = useState([]);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [socialViewUserId, setSocialViewUserId] = useState(null);

  const themeStyles = {
    light: { bg: 'bg-gray-50', text: 'text-gray-900', panel: 'bg-white', border: 'border-gray-200', primary: 'text-blue-600', primaryBg: 'bg-blue-600', primaryLight: 'bg-blue-50' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', panel: 'bg-gray-800', border: 'border-gray-700', primary: 'text-blue-400', primaryBg: 'bg-blue-500', primaryLight: 'bg-gray-800' },
    sepia: { bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', panel: 'bg-[#fdf6e3]', border: 'border-[#e5d5b5]', primary: 'text-[#d35400]', primaryBg: 'bg-[#d35400]', primaryLight: 'bg-[#f9f1df]' }
  };
  const currentTheme = themeStyles[theme];

  // --- 자동저장 refs ---
  const autoSaveTimerRef = useRef(null);
  const isInitialized = useRef(false);
  // stale closure 방지: setTimeout 내부에서 항상 최신값 참조
  const databasesRef = useRef(databases);
  const currentLibraryRef = useRef(currentLibrary);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { databasesRef.current = databases; }, [databases]);
  useEffect(() => { currentLibraryRef.current = currentLibrary; }, [currentLibrary]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // --- 앱 시작 시 저장된 세션 확인 ---
  useEffect(() => {
    const initApp = async () => {
      const savedSession = localStorage.getItem('booknote_session');
      if (savedSession) {
        try {
          const user = JSON.parse(savedSession);
          setCurrentUser(user);
          await loadUserData(user.id, user.displayName);
        } catch {
          localStorage.removeItem('booknote_session');
          setIsAppLoading(false);
        }
      } else {
        setIsAppLoading(false);
      }
    };
    initApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ★ 자동저장 effect (isInitialized effect보다 먼저 정의 → 초기 로드 시 건너뜀)
  useEffect(() => {
    if (!isInitialized.current || !databasesRef.current || !currentUserRef.current) return;

    setIsSaved('saving');
    clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      // ref를 통해 항상 최신 databases, currentLibrary 참조
      const updatedDb = {
        ...databasesRef.current,
        [currentLibraryRef.current]: { books, chapters, details, customGenres }
      };
      setDatabases(updatedDb);
      localStorage.setItem('booknote_web_final', JSON.stringify(updatedDb));

      const { error } = await supabase
        .from('booknote_saves')
        .upsert({ id: currentUserRef.current?.id, data: updatedDb });

      if (!error) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        console.error('클라우드 저장 실패:', error);
        setIsSaved('error');
        setTimeout(() => setIsSaved(false), 3000);
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [books, chapters, details, customGenres]); // eslint-disable-line react-hooks/exhaustive-deps

  // ★ isInitialized: 자동저장 effect 이후에 정의해야 초기 로드를 건너뜀
  useEffect(() => {
    if (!isAppLoading) {
      isInitialized.current = true;
    }
  }, [isAppLoading]);

  // --- 인증 함수들 ---

  const hashPassword = async (pw) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw + '_bknote_salt_'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const loadUserData = async (userId, displayName) => {
    try {
      const { data } = await supabase.from('booknote_saves').select('data').eq('id', userId).single();
      if (data?.data) {
        const db = data.data;
        const firstLib = Object.keys(db).find(k => !k.startsWith('__'));
        setDatabases(db);
        setCurrentLibrary(firstLib);
        setBooks(db[firstLib].books || []);
        setChapters(db[firstLib].chapters || []);
        setDetails(db[firstLib].details || []);
        setCustomGenres(db[firstLib].customGenres || []);
        localStorage.setItem('booknote_web_final', JSON.stringify(db));
      } else {
        const newDb = { [displayName]: { books: [], chapters: [], details: [], customGenres: [] } };
        await supabase.from('booknote_saves').upsert({ id: userId, data: newDb });
        setDatabases(newDb);
        setCurrentLibrary(displayName);
        setBooks([]); setChapters([]); setDetails([]); setCustomGenres([]);
        localStorage.setItem('booknote_web_final', JSON.stringify(newDb));
      }
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setDatabases(null);
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!isSupabaseConfigured) return setAuthError('서버 연결이 설정되지 않았습니다. Vercel 환경 변수(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)를 추가한 후 재배포해주세요.');
    const name = authName.trim();
    if (!name || !authPassword) return setAuthError('이름과 비밀번호를 입력해주세요.');
    if (authPassword !== authConfirmPw) return setAuthError('비밀번호가 일치하지 않습니다.');
    if (authPassword.length < 4) return setAuthError('비밀번호는 4자 이상이어야 합니다.');
    setIsAuthLoading(true); setAuthError('');
    try {
      const { data: existing } = await supabase.from('booknote_users').select('id').eq('id', name).maybeSingle();
      if (existing) return setAuthError('이미 사용 중인 이름입니다. 다른 이름을 사용해주세요.');
      const hash = await hashPassword(authPassword);
      const { error } = await supabase.from('booknote_users').insert({ id: name, password_hash: hash, display_name: name });
      if (error) throw error;
      const user = { id: name, displayName: name };
      setCurrentUser(user);
      localStorage.setItem('booknote_session', JSON.stringify(user));
      setIsAppLoading(true);
      await loadUserData(name, name);
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setAuthError('서버에 연결할 수 없습니다. Supabase 프로젝트가 일시 정지됐거나 Vercel 환경 변수가 없습니다. supabase.com에서 프로젝트 상태를 확인해주세요.');
      } else if (err.message?.includes('schema cache') || err.code === 'PGRST204') {
        setAuthError('DB 테이블을 찾을 수 없습니다. Supabase SQL Editor에서 NOTIFY pgrst, \'reload schema\'; 를 실행해주세요.');
      } else {
        setAuthError('오류가 발생했습니다: ' + err.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!isSupabaseConfigured) return setAuthError('서버 연결이 설정되지 않았습니다. Vercel 환경 변수(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)를 추가한 후 재배포해주세요.');
    const name = authName.trim();
    if (!name || !authPassword) return setAuthError('이름과 비밀번호를 입력해주세요.');
    setIsAuthLoading(true); setAuthError('');
    try {
      const { data: user, error } = await supabase.from('booknote_users').select('id, display_name, password_hash').eq('id', name).single();
      if (error) {
        if (error.message?.includes('schema cache')) throw error;
        return setAuthError('존재하지 않는 계정입니다.');
      }
      if (!user) return setAuthError('존재하지 않는 계정입니다.');
      const hash = await hashPassword(authPassword);
      if (user.password_hash !== hash) return setAuthError('비밀번호가 올바르지 않습니다.');
      const session = { id: user.id, displayName: user.display_name };
      setCurrentUser(session);
      localStorage.setItem('booknote_session', JSON.stringify(session));
      setIsAppLoading(true);
      await loadUserData(user.id, user.display_name);
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setAuthError('서버에 연결할 수 없습니다. Supabase 프로젝트가 일시 정지됐거나 Vercel 환경 변수가 없습니다. supabase.com에서 프로젝트 상태를 확인해주세요.');
      } else if (err.message?.includes('schema cache') || err.code === 'PGRST204') {
        setAuthError('DB 테이블을 찾을 수 없습니다. Supabase SQL Editor에서 NOTIFY pgrst, \'reload schema\'; 를 실행해주세요.');
      } else {
        setAuthError('로그인 오류: ' + err.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('booknote_session');
    localStorage.removeItem('booknote_web_final');
    setCurrentUser(null);
    setDatabases(null);
    setCurrentLibrary('');
    setBooks([]); setChapters([]); setDetails([]); setCustomGenres([]);
    setSelectedBook(null); setViewMode('shelf');
    setAuthName(''); setAuthPassword(''); setAuthConfirmPw(''); setAuthError('');
    setAuthMode('login');
  };

  // --- 로직 ---

  const handleInitialSetup = async () => {
    if (!setupName.trim()) return alert("이름을 입력해주세요!");
    const name = setupName.trim();
    const newDb = { [name]: { books: [], chapters: [], details: [], customGenres: [] } };
    setDatabases(newDb);
    setCurrentLibrary(name);
    setBooks([]); setChapters([]); setDetails([]); setCustomGenres([]);
    localStorage.setItem('booknote_web_final', JSON.stringify(newDb));
    const { error } = await supabase.from('booknote_saves').upsert({ id: currentUserRef.current?.id, data: newDb });
    if (error) alert('클라우드 저장 실패. 네트워크를 확인해주세요.');
  };

  const loadLibrary = (owner) => {
    const currentDb = { ...databasesRef.current, [currentLibraryRef.current]: { books, chapters, details, customGenres } };
    setDatabases(currentDb);
    const targetData = currentDb[owner];
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
    if (gName && !customGenres.includes(gName)) setCustomGenres([...customGenres, gName]);
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
    return null;
  };

  useEffect(() => {
    if (sidebarTab === 'spell') {
      const targetData = getSpellCheckTarget();
      if (targetData && targetData.obj) setSpellCorrection(targetData.obj.content || '');
      else setSpellCorrection('');
    }
  }, [selectedDetail?.id, sidebarTab, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRunSpellCheck = async () => {
    if (!selectedDetail || !selectedDetail.content) return;
    setIsCheckingSpelling(true);
    setSpellMessage('');
    const text = selectedDetail.content;

    // 1) Vercel 서버리스 API 호출 (카카오 맞춤법 검사기)
    try {
      const res = await fetch('/api/spell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) {
        const result = await res.json();
        if (!result.error) {
          if (result.changed) {
            setSpellMessage(`✨ ${result.errorCount}개 오류 발견! 아래에서 확인 후 적용하세요.`);
            setSpellCorrection(result.corrected);
          } else {
            setSpellMessage('✅ 맞춤법 검사 완료: 오류가 없습니다!');
          }
          setIsCheckingSpelling(false);
          return;
        }
      }
    } catch { /* API 실패 → 로컬 패턴으로 폴백 */ }

    // 2) 로컬 패턴 폴백 (API 접근 불가 / 개발 환경)
    setTimeout(() => {
      let correctedText = text;
      const rules = [
        // 안/않 구분
        [/않돼/g, '안 돼'], [/않되/g, '안 돼'], [/않해/g, '안 해'],
        [/않좋/g, '안 좋'], [/않되요/g, '안 돼요'],
        // 되/돼 구분
        [/됬/g, '됐'], [/돼었/g, '되었'],
        // 왜/웬/왠
        [/웬지/g, '왠지'], [/왠만/g, '웬만'], [/왠일/g, '웬일'],
        // 맞춤법 오류
        [/오랫만/g, '오랜만'], [/어떻해/g, '어떡해'],
        [/바램/g, '바람'], [/움지이/g, '움직이'],
        // ㅅ/ㅆ 받침 혼동
        [/재밋/g, '재밌'], [/맛잇/g, '맛있'],
        [/멋잇/g, '멋있'], [/재밋/g, '재밌'],
        // 띄어쓰기
        [/할수있/g, '할 수 있'], [/할수없/g, '할 수 없'],
        [/것같/g, '것 같'], [/것이다/g, '것이다'],
      ];
      let count = 0;
      const fixes = [];
      for (const [pattern, replacement] of rules) {
        const before = correctedText;
        correctedText = correctedText.replace(pattern, replacement);
        if (correctedText !== before) { count++; fixes.push(replacement); }
      }
      if (count > 0) {
        setSpellMessage(`✨ ${count}개 오류 발견! 아래에서 확인 후 적용하세요.`);
        setSpellCorrection(correctedText);
      } else {
        setSpellMessage('⚠️ 오타를 찾지 못했습니다.');
      }
      setIsCheckingSpelling(false);
    }, 400);
  };

  const applySpellCorrection = () => {
    if (!selectedDetail || viewMode !== 'editor') return;
    const newObj = { ...selectedDetail, content: spellCorrection };
    setDetails(details.map(d => d.id === newObj.id ? newObj : d));
    setSelectedDetail(newObj);
    setSpellMessage('✅ 적용 완료!');
    setTimeout(() => setSpellMessage(''), 3000);
  };

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

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedBook) setLocalCategory(Array.isArray(selectedBook.category) ? selectedBook.category.join(', ') : (selectedBook.category || ''));
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
  const handleAddBook = () => { setShowBookSearch(true); setBookSearchQuery(''); setBookSearchResults([]); setBookSearchError(''); };

  const handleSearchBook = async (query) => {
    if (!query.trim()) return;
    setIsSearchingBook(true);
    setBookSearchResults([]);
    setBookSearchError('');
    try {
      const kakaoKey = process.env.REACT_APP_KAKAO_API_KEY;
      if (!kakaoKey || kakaoKey === '여기에_REST_API_키_붙여넣기') {
        throw new Error('카카오 API 키가 설정되지 않았습니다.');
      }
      // 카카오 도서 검색 API
      const res = await fetch(
        `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`,
        { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // 카카오 응답을 내부 포맷으로 변환
      const items = (data.documents || []).map((doc, i) => ({
        id: doc.isbn || String(i),
        volumeInfo: {
          title: doc.title,
          authors: doc.authors || [],
          translators: doc.translators || [],
          pageCount: null, // 카카오 API는 페이지 수 미제공
          imageLinks: doc.thumbnail ? { thumbnail: doc.thumbnail } : null,
          publishedDate: doc.datetime?.slice(0, 10) || '',
          publisher: doc.publisher || '',
          contents: doc.contents || '',
          salePrice: doc.sale_price || 0,
          url: doc.url || ''
        }
      }));
      setBookSearchResults(items);
      if (items.length === 0) setBookSearchError('검색 결과가 없습니다. 다른 검색어를 입력해보세요.');
    } catch (err) {
      console.error('카카오 책 검색 실패:', err);
      if (err.message.includes('API 키')) {
        setBookSearchError('.env.local 파일에 REACT_APP_KAKAO_API_KEY를 설정해주세요.');
      } else {
        setBookSearchError(`검색 오류: ${err.message}`);
      }
    } finally {
      setIsSearchingBook(false);
    }
  };

  const handleSelectBookFromSearch = (item) => {
    const info = item.volumeInfo;
    const newBook = {
      id: Date.now(),
      title: info.title || '새로운 책',
      author: (info.authors || []).join(', '),
      totalPages: info.pageCount || 300,
      status: '대기 중',
      category: [],
      coverUrl: info.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
      videoUrl: '',
      publisher: info.publisher || '',
      publishedDate: info.publishedDate || '',
      contents: info.contents || '',
      salePrice: info.salePrice || 0,
      url: info.url || '',
      visibility: 'private'
    };
    setBooks([...books, newBook]);
    setShowBookSearch(false); setBookSearchQuery(''); setBookSearchResults([]);
    setSelectedBook(newBook); setViewMode('chapters');
  };

  const handleAddBookManually = () => { const newBook = { id: Date.now(), title: '새로운 책', author: '', totalPages: 300, status: '대기 중', category: [], coverUrl: '', videoUrl: '', visibility: 'private' }; setBooks([...books, newBook]); setShowBookSearch(false); setEditingBookId(newBook.id); };
  const handleAddChapter = () => { if (!selectedBook) return; const next = chapters.filter(c => c.bookId === selectedBook.id).length + 1; setChapters([...chapters, { id: Date.now(), bookId: selectedBook.id, index: next.toString(), title: `새로운 챕터 ${next}`, videoUrl: '' }]); };
  const handleAddDetail = () => { if (!selectedChapter) return; const next = details.filter(d => d.chapterId === selectedChapter.id).length + 1; setDetails([...details, { id: Date.now(), chapterId: selectedChapter.id, index: next.toString(), title: `세부 항목 ${next}`, startPage: 1, endPage: 10, content: '', videoUrl: '' }]); };
  const handleRename = (id, newName) => { setBooks(books.map(b => b.id === id ? { ...b, title: newName } : b)); setEditingBookId(null); };
  const handleDeleteBook = (id) => {
    const bookChapterIds = chapters.filter(c => c.bookId === id).map(c => c.id);
    setBooks(books.filter(b => b.id !== id));
    setChapters(chapters.filter(c => c.bookId !== id));
    setDetails(details.filter(d => !bookChapterIds.includes(d.chapterId)));
    setContextMenu(null);
    setSelectedBook(null);
    setViewMode('shelf');
  };

  const handleDeleteChapter = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('이 챕터와 모든 세부 노트를 삭제하시겠습니까?')) return;
    setChapters(chapters.filter(c => c.id !== id));
    setDetails(details.filter(d => d.chapterId !== id));
    if (selectedChapter?.id === id) { setSelectedChapter(null); setViewMode('chapters'); }
  };

  const handleDeleteDetail = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('이 세부 노트를 삭제하시겠습니까?')) return;
    setDetails(details.filter(d => d.id !== id));
    if (selectedDetail?.id === id) { setSelectedDetail(null); setViewMode('details'); }
  };

  const handleDeleteLibrary = () => {
    const owners = Object.keys(databases).filter(k => !k.startsWith('__'));
    if (owners.length <= 1) return alert('마지막 서재는 삭제할 수 없습니다.');
    if (!window.confirm(`"${currentLibrary}" 서재를 삭제하시겠습니까?\n(모든 책과 노트가 삭제됩니다)`)) return;
    const newDb = { ...databases };
    delete newDb[currentLibrary];
    const nextOwner = Object.keys(newDb).find(k => !k.startsWith('__'));
    setDatabases(newDb);
    setCurrentLibrary(nextOwner);
    setBooks(newDb[nextOwner].books || []);
    setChapters(newDb[nextOwner].chapters || []);
    setDetails(newDb[nextOwner].details || []);
    setCustomGenres(newDb[nextOwner].customGenres || []);
    setViewMode('shelf');
    setSelectedBook(null);
    localStorage.setItem('booknote_web_final', JSON.stringify(newDb));
    supabase.from('booknote_saves').upsert({ id: currentUserRef.current?.id, data: newDb });
  };

  // 내 친구 목록 (databases.__meta.friends)
  const getMyFriends = () => databasesRef.current?.__meta?.friends || [];
  const getFriendStatus = (userId) => getMyFriends().find(f => f.id === userId)?.status || 'none';

  const saveMeta = async (newMeta) => {
    const updatedDb = { ...databasesRef.current, __meta: newMeta };
    setDatabases(updatedDb);
    await supabase.from('booknote_saves').upsert({ id: currentUserRef.current?.id, data: updatedDb });
  };

  const sendFriendRequest = async (targetId) => {
    const myFriends = getMyFriends();
    if (myFriends.find(f => f.id === targetId)) return;
    // 내 목록에 sent 추가
    await saveMeta({ ...databasesRef.current?.__meta, friends: [...myFriends, { id: targetId, status: 'sent' }] });
    // 상대방 목록에 received 추가
    try {
      const { data: tgt } = await supabase.from('booknote_saves').select('data').eq('id', targetId).single();
      if (tgt?.data) {
        const tgtMeta = tgt.data.__meta || {};
        const tgtFriends = tgtMeta.friends || [];
        if (!tgtFriends.find(f => f.id === currentUser.id)) {
          const updatedTgt = { ...tgt.data, __meta: { ...tgtMeta, friends: [...tgtFriends, { id: currentUser.id, status: 'received' }] } };
          await supabase.from('booknote_saves').upsert({ id: targetId, data: updatedTgt });
        }
      }
    } catch {}
    loadSocialData();
  };

  const acceptFriendRequest = async (fromId) => {
    // 내 목록 accepted로 변경
    const myFriends = getMyFriends().map(f => f.id === fromId ? { ...f, status: 'accepted' } : f);
    await saveMeta({ ...databasesRef.current?.__meta, friends: myFriends });
    // 상대방 목록도 accepted로 변경
    try {
      const { data: src } = await supabase.from('booknote_saves').select('data').eq('id', fromId).single();
      if (src?.data) {
        const srcMeta = src.data.__meta || {};
        const srcFriends = (srcMeta.friends || []).map(f => f.id === currentUser.id ? { ...f, status: 'accepted' } : f);
        await supabase.from('booknote_saves').upsert({ id: fromId, data: { ...src.data, __meta: { ...srcMeta, friends: srcFriends } } });
      }
    } catch {}
    loadSocialData();
  };

  const loadSocialData = async () => {
    setIsSocialLoading(true);
    try {
      const [{ data: users }, { data: saves }] = await Promise.all([
        supabase.from('booknote_users').select('id, display_name'),
        supabase.from('booknote_saves').select('id, data')
      ]);
      const myFriends = databasesRef.current?.__meta?.friends || [];
      const result = (users || [])
        .filter(u => u.id !== currentUser?.id)
        .map(u => {
          const save = (saves || []).find(s => s.id === u.id);
          const friendEntry = myFriends.find(f => f.id === u.id);
          const friendStatus = friendEntry?.status || 'none';
          const allBooks = [];
          if (save?.data) {
            Object.entries(save.data).forEach(([key, lib]) => {
              if (key.startsWith('__') || !lib?.books) return;
              lib.books.forEach(b => {
                const vis = b.visibility || 'private';
                if (vis === 'public' || (vis === 'friends' && friendStatus === 'accepted')) allBooks.push(b);
              });
            });
          }
          return { id: u.id, displayName: u.display_name, books: allBooks, friendStatus };
        });
      setSocialData(result);
    } catch (err) {
      console.error('독자 데이터 로딩 실패:', err);
    } finally {
      setIsSocialLoading(false);
    }
  };

  const usedGenres = [...new Set([...customGenres, ...books.flatMap(b => Array.isArray(b.category) ? b.category : [b.category])])].filter(g => g && g !== '');
  const handleDragStart = (e, bookId) => { setDraggedBookId(bookId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, genre) => { e.preventDefault(); if (dragOverGenre !== genre) setDragOverGenre(genre); };
  const handleDrop = (e, targetGenre) => { e.preventDefault(); setDragOverGenre(null); if (draggedBookId) { updateBook(draggedBookId, { category: [targetGenre] }); setDraggedBookId(null); } };

  // --- 로딩 화면 ---
  if (isAppLoading) {
    return (
      <div className={`flex items-center justify-center h-screen w-full ${currentTheme.bg} ${currentTheme.text} font-sans`}>
        <div className="flex flex-col items-center gap-4">
          <BookOpen size={48} className="text-blue-500 animate-pulse" />
          <p className="font-bold opacity-60">클라우드 데이터 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // --- 로그인 / 회원가입 화면 ---
  if (!currentUser) {
    const isSignup = authMode === 'signup';
    return (
      <div className={`flex items-center justify-center h-screen w-full ${currentTheme.bg} ${currentTheme.text} font-sans`}>
        <motion.div
          key={authMode}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`p-10 rounded-3xl shadow-2xl ${currentTheme.panel} border ${currentTheme.border} w-full max-w-sm mx-4`}
        >
          <div className="text-center mb-8">
            <BookOpen size={48} className={`mx-auto mb-3 ${currentTheme.primary}`} />
            <h1 className="text-2xl font-black">BookNote</h1>
            <p className="text-xs opacity-40 mt-1">☁️ 나만의 클라우드 서재</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded-xl px-3 py-2.5 leading-relaxed">
              ⚠️ <strong>서버 연결 오류</strong><br/>
              Vercel 환경 변수가 설정되지 않았습니다.<br/>
              Vercel → Project Settings → Environment Variables에서<br/>
              <code className="bg-amber-200 px-1 rounded">REACT_APP_SUPABASE_URL</code>,{' '}
              <code className="bg-amber-200 px-1 rounded">REACT_APP_SUPABASE_ANON_KEY</code>를 추가 후 재배포해주세요.
            </div>
          )}

          <div className={`flex rounded-xl overflow-hidden border-2 mb-6 ${currentTheme.border}`}>
            <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className={`flex-1 py-2.5 text-sm font-bold transition-colors ${!isSignup ? `${currentTheme.primaryBg} text-white` : `${currentTheme.text} opacity-60 hover:opacity-100`}`}>로그인</button>
            <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className={`flex-1 py-2.5 text-sm font-bold transition-colors ${isSignup ? `${currentTheme.primaryBg} text-white` : `${currentTheme.text} opacity-60 hover:opacity-100`}`}>회원가입</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold opacity-60 mb-1 block">이름</label>
              <input
                autoFocus
                value={authName}
                onChange={e => { setAuthName(e.target.value); setAuthError(''); }}
                onKeyDown={e => e.key === 'Enter' && (isSignup ? handleSignup() : handleLogin())}
                placeholder="이름을 입력하세요"
                className={`w-full p-3 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-blue-400 text-sm`}
              />
            </div>
            <div>
              <label className="text-xs font-bold opacity-60 mb-1 block">비밀번호</label>
              <input
                type="password"
                value={authPassword}
                onChange={e => { setAuthPassword(e.target.value); setAuthError(''); }}
                onKeyDown={e => e.key === 'Enter' && (isSignup ? handleSignup() : handleLogin())}
                placeholder="비밀번호 (4자 이상)"
                className={`w-full p-3 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-blue-400 text-sm`}
              />
            </div>
            {isSignup && (
              <div>
                <label className="text-xs font-bold opacity-60 mb-1 block">비밀번호 확인</label>
                <input
                  type="password"
                  value={authConfirmPw}
                  onChange={e => { setAuthConfirmPw(e.target.value); setAuthError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  placeholder="비밀번호를 다시 입력하세요"
                  className={`w-full p-3 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-blue-400 text-sm`}
                />
              </div>
            )}
          </div>

          {authError && (
            <div className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{authError}</div>
          )}

          <button
            onClick={isSignup ? handleSignup : handleLogin}
            disabled={isAuthLoading}
            className={`w-full mt-5 py-3 rounded-xl ${currentTheme.primaryBg} text-white font-bold shadow hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            {isAuthLoading ? '처리 중...' : isSignup ? '회원가입' : '로그인'}
          </button>
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
          <div className="flex items-center gap-1">
            {/* 자동저장 상태 표시 */}
            <div className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all duration-300
              ${isSaved === true ? 'bg-green-100 text-green-700'
              : isSaved === 'saving' ? 'bg-blue-50 text-blue-500'
              : isSaved === 'error' ? 'bg-red-100 text-red-600'
              : 'bg-black/5 opacity-40'}`}>
              {isSaved === true ? <><Check size={13}/> 저장됨</>
              : isSaved === 'saving' ? <><Save size={13} className="animate-pulse"/> 저장 중...</>
              : isSaved === 'error' ? <>⚠ 저장 실패</>
              : <><Save size={13}/> 자동저장</>}
            </div>
            {/* 로그아웃 버튼 */}
            <button onClick={handleLogout} title="로그아웃" className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-black/5 opacity-40 hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all">
              나가기
            </button>
          </div>
        </div>
        <div className={`rounded-2xl overflow-hidden border ${currentTheme.border} shadow-sm`}>
          <div className="px-3 pt-2.5 pb-2 flex justify-between items-center" style={{background: theme==='sepia'?'rgba(211,84,0,0.07)':theme==='dark'?'rgba(96,165,250,0.12)':'rgba(37,99,235,0.06)'}}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full ${currentTheme.primaryBg} flex items-center justify-center`}><Users size={10} className="text-white"/></div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">서재</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setShowAddUser(true); setNewUserName(''); }} className={`text-[10px] ${currentTheme.primary} font-black px-2 py-0.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors`}>+ 추가</button>
              {Object.keys(databases).filter(k=>!k.startsWith('__')).length > 1 && <button onClick={handleDeleteLibrary} className="text-[10px] text-red-400 px-1.5 py-0.5 rounded-full bg-red-50 hover:bg-red-100 transition-colors" title="서재 삭제"><Trash2 size={9}/></button>}
            </div>
          </div>
          <div className="px-3 py-2.5">
          {showAddUser ? (
            <div className="flex flex-col gap-2">
              <input autoFocus value={newUserName} onChange={e=>setNewUserName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmAddUser()} className="text-xs p-1.5 rounded-lg border w-full" placeholder="이름"/>
              <div className="flex gap-1"><button onClick={confirmAddUser} className="flex-1 bg-blue-500 text-white text-xs py-1 rounded-lg font-bold">확인</button><button onClick={()=>setShowAddUser(false)} className="flex-1 bg-black/10 text-xs py-1 rounded-lg">취소</button></div>
            </div>
          ) : (
            <select value={currentLibrary} onChange={(e) => loadLibrary(e.target.value)} className={`w-full bg-transparent font-black text-sm outline-none cursor-pointer ${currentTheme.primary}`}>
              {Object.keys(databases).filter(k=>!k.startsWith('__')).map(owner => <option key={owner} value={owner} className="text-gray-900">{owner}</option>)}
            </select>
          )}
          </div>
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
                      <div key={i} onClick={() => handleSearchResultClick(res)} className="p-3 rounded border bg-black/5 text-sm cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
                        <div className="font-bold flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-blue-500 shrink-0">{res.type}</span><span className="truncate">{res.title}</span><ExternalLink size={12} className="opacity-50"/></div>
                        <div className="opacity-60 text-xs mt-1 truncate">{res.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sidebarTab === 'spell' && (
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><CheckCircle size={18}/> 맞춤법 / 내용 교정</h3>
                  {spellMessage && <div className="bg-green-100 text-green-800 p-2 rounded text-xs font-bold">{spellMessage}</div>}
                  {viewMode === 'editor' && selectedDetail ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-xs font-bold text-center border-b pb-2 flex items-center justify-center gap-2"><Edit3 size={12}/> {selectedDetail.title} 교정 중</div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold opacity-50 pl-1">원본 내용 (Original)</span>
                        <div className="bg-black/5 p-3 rounded border border-black/10 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap text-gray-500">{selectedDetail.content || "(내용이 비어있습니다)"}</div>
                      </div>
                      <div className="flex justify-center my-1">
                        <button onClick={handleRunSpellCheck} disabled={isCheckingSpelling || !selectedDetail.content} className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 shadow-sm">
                          {isCheckingSpelling ? <span className="animate-spin">⏳</span> : <Sparkles size={14}/>}
                          {isCheckingSpelling ? 'AI 분석 및 교정 중...' : '✨ 자동 맞춤법 검사 실행'}
                        </button>
                      </div>
                      <div className="flex justify-center opacity-30"><ArrowDown size={20}/></div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold opacity-100 text-blue-600 pl-1">수정할 내용 (Edit here)</span>
                        <textarea value={spellCorrection} onChange={e=>setSpellCorrection(e.target.value)} className="w-full h-40 p-3 rounded border-2 border-blue-200 bg-white text-sm focus:border-blue-500 outline-none resize-none text-gray-900" placeholder="수정할 내용을 입력하세요..."></textarea>
                      </div>
                      <button onClick={applySpellCorrection} className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-colors">본문에 적용하기</button>
                    </div>
                  ) : (
                    <p className="text-center opacity-50 text-xs py-10">에디터 화면에서 글을 작성하면<br/>자동으로 이곳에 불러옵니다.</p>
                  )}
                </div>
              )}
              {sidebarTab === 'video' && (
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Video size={18}/> 동영상 링크 ({levelName})</h3>
                  {videoTargetObj ? (
                    <>
                      <div className="text-xs opacity-60 mb-1">유튜브 링크를 입력하세요:</div>
                      <input type="text" value={currentVideoUrl} onChange={e=>handleVideoUpdate(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full p-2 rounded border bg-transparent text-xs outline-none focus:border-blue-500" />
                      {getYoutubeId(currentVideoUrl)
                        ? <div className="relative aspect-video bg-black rounded shadow mt-2"><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(currentVideoUrl)}`} title="video" allowFullScreen></iframe></div>
                        : <div className="aspect-video bg-black/10 rounded flex items-center justify-center text-xs opacity-50 mt-2">표지 미리보기 없음</div>
                      }
                      <p className="text-[10px] opacity-50 mt-2">* 세부 항목의 경우, 에디터 화면 맨 아래에도 영상이 표시됩니다.</p>
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
          <div className="flex items-center gap-2 text-sm font-medium opacity-60 flex-1">
            <button onClick={() => {setViewMode('shelf'); setSelectedBook(null); setSelectedChapter(null); setSelectedDetail(null);}} className="hover:opacity-100 flex items-center gap-1 hover:text-blue-500 transition-colors"><Folder size={16}/> 서재</button>
            {selectedBook && <><ChevronRight size={14}/><button onClick={() => {setViewMode('chapters'); setSelectedChapter(null); setSelectedDetail(null);}} className={`hover:opacity-100 hover:text-blue-500 transition-colors truncate max-w-[150px] ${viewMode==='chapters'?'text-blue-500 font-bold opacity-100':''}`}>{selectedBook.title}</button></>}
            {selectedChapter && viewMode !== 'shelf' && <><ChevronRight size={14}/><button onClick={() => {setViewMode('details'); setSelectedDetail(null);}} className={`hover:opacity-100 hover:text-blue-500 transition-colors truncate max-w-[150px] ${viewMode==='details'?'text-blue-500 font-bold opacity-100':''}`}>{selectedChapter.title}</button></>}
            {selectedDetail && viewMode === 'editor' && <><ChevronRight size={14}/><span className="text-blue-500 font-bold opacity-100 truncate max-w-[150px]">{selectedDetail.title}</span></>}
          </div>
          <button
            onClick={() => { setShowSocialPanel(true); loadSocialData(); }}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border ${currentTheme.border} hover:border-blue-400 hover:text-blue-500 transition-all opacity-60 hover:opacity-100`}
          >
            <Users size={14}/> 다른 독자
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {viewMode === 'shelf' && (
              <motion.div key="shelf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-black mb-8 flex items-center gap-2">{currentLibrary} 님의 도서 <span className="text-sm font-normal bg-black/10 px-2 py-1 rounded-full">{books.length}권</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {books.map(book => (
                    <motion.div key={book.id} onClick={() => { setSelectedBook(book); setViewMode('chapters'); }} onContextMenu={e => handleContextMenu(e, book)} className={`relative rounded-3xl border ${currentTheme.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-64 overflow-hidden`}>
                      {/* 표지 영역 */}
                      <div className="relative h-32 shrink-0 overflow-hidden">
                        {book.coverUrl
                          ? <img src={book.coverUrl} className="w-full h-full object-contain p-1" alt={book.title}/>
                          : <div className={`w-full h-full ${currentTheme.primaryLight} flex items-center justify-center`}><Book size={38} className={`${currentTheme.primary} opacity-20`}/></div>
                        }
                        <div className="absolute top-2 left-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${book.status==='읽는 중'?'bg-blue-500/90 text-white':'bg-black/35 text-white'}`}>{book.status}</span>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e)=>{e.stopPropagation();setEditingBookId(book.id)}} className="p-1 rounded-full bg-white/80 text-gray-600 hover:text-blue-500 shadow-sm" title="이름 변경"><Edit3 size={11}/></button>
                          <button onClick={(e)=>{e.stopPropagation();if(window.confirm(`"${book.title}"을 삭제하시겠습니까?`))handleDeleteBook(book.id);}} className="p-1 rounded-full bg-white/80 text-gray-600 hover:text-red-500 shadow-sm" title="삭제"><Trash2 size={11}/></button>
                        </div>
                        {/* 공개 설정 아이콘 */}
                        <button onClick={(e)=>{e.stopPropagation();const v=book.visibility||'private';const next={private:'public',public:'friends',friends:'private'};updateBook(book.id,{visibility:next[v]});}} title="공개 설정 변경" className="absolute bottom-2 right-2 transition-transform hover:scale-110">
                          <div className={`px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[9px] font-bold ${(book.visibility||'private')==='public'?'bg-green-500/80 text-white':(book.visibility||'private')==='friends'?'bg-blue-500/80 text-white':'bg-black/40 text-white'}`}>
                            {(book.visibility||'private')==='public'?<Globe size={9}/>:(book.visibility||'private')==='friends'?<Users size={9}/>:<Lock size={9}/>}
                          </div>
                        </button>
                      </div>
                      {/* 정보 영역 */}
                      <div className={`flex-1 px-4 py-3 flex flex-col justify-between ${currentTheme.panel}`}>
                        <div>
                          {editingBookId === book.id
                            ? <input autoFocus defaultValue={book.title} onClick={e=>e.stopPropagation()} onBlur={e=>handleRename(book.id, e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleRename(book.id, e.target.value)} className="text-sm font-black w-full bg-transparent border-b-2 border-blue-500 outline-none"/>
                            : <h3 className="text-sm font-black line-clamp-2 leading-snug">{book.title}</h3>
                          }
                          <p className="mt-0.5 text-xs opacity-50 truncate">{book.author || '저자 미상'} · {book.totalPages}p</p>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1"><span className="text-[10px] opacity-40">진행률</span><span className={`text-[10px] font-bold ${currentTheme.primary}`}>{calculateProgress(book.id)}%</span></div>
                          <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden"><div style={{width: `${calculateProgress(book.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}></div></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={handleAddBook} className={`h-64 rounded-3xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center opacity-50 hover:opacity-100 hover:border-blue-500 hover:text-blue-500 transition-all gap-2`}><Plus size={32}/><span className="font-bold">새로운 책 추가</span></button>
                </div>
              </motion.div>
            )}
            {viewMode === 'chapters' && selectedBook && (
              <motion.div key="chapters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
                <div className="flex justify-end mb-3">
                  <button onClick={() => {setViewMode('shelf'); setSelectedBook(null); setSelectedChapter(null); setSelectedDetail(null);}} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-50 hover:opacity-100 transition-all">
                    <ChevronLeft size={13}/> 서재로
                  </button>
                </div>
                <div className="mb-8 flex gap-8">
                  <label className={`w-32 h-44 rounded-xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center cursor-pointer hover:opacity-70 overflow-hidden relative ${selectedBook.coverUrl?'':'bg-black/5'}`}>
                    {selectedBook.coverUrl ? <img src={selectedBook.coverUrl} className="w-full h-full object-cover" alt="cover"/> : <span className="text-xs opacity-50 text-center p-2">표지 추가</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files[0]) updateBook(selectedBook.id, {coverUrl: URL.createObjectURL(e.target.files[0])})}} />
                  </label>
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-4xl font-black">{selectedBook.title}</h2>
                        <button onClick={()=>setEditingBookId(selectedBook.id)} className="text-gray-400 hover:text-blue-500"><Edit3 size={20}/></button>
                        <button onClick={()=>{ if(window.confirm(`"${selectedBook.title}"을 삭제하시겠습니까?\n(모든 챕터와 노트가 삭제됩니다)`)) handleDeleteBook(selectedBook.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-48 h-3 rounded-full bg-black/10 overflow-hidden"><div style={{width: `${calculateProgress(selectedBook.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}></div></div>
                        <span className={`text-lg font-bold ${currentTheme.primary}`}>{calculateProgress(selectedBook.id)}% 읽음</span>
                        {calculateProgress(selectedBook.id) === 100 && <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold"><Award size={14}/> 완독 달성!</span>}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm opacity-80">
                      <div className="flex items-center gap-2"><span>저자:</span><input value={selectedBook.author} onChange={e=>updateBook(selectedBook.id,{author:e.target.value})} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-32"/></div>
                      <div className="flex items-center gap-2"><span>장르:</span><input value={localCategory} onChange={e=>setLocalCategory(e.target.value)} onBlur={()=>{updateBook(selectedBook.id,{category:localCategory.split(',').map(s=>s.trim())})}} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-48" placeholder="예: 소설, 과학"/></div>
                      <div className="flex items-center gap-2"><span>총 페이지:</span><input type="number" value={selectedBook.totalPages} onChange={e=>updateBook(selectedBook.id,{totalPages:parseInt(e.target.value)||0})} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-16 font-bold"/>쪽</div>
                      {selectedBook.publisher && <div className="flex items-center gap-2"><span>출판사:</span><span className="font-medium">{selectedBook.publisher}</span></div>}
                      {selectedBook.publishedDate && <div className="flex items-center gap-2"><span>출판일:</span><span className="font-medium">{selectedBook.publishedDate}</span></div>}
                      {selectedBook.salePrice > 0 && <div className="flex items-center gap-2"><span>판매가:</span><span className={`font-bold ${currentTheme.primary}`}>{selectedBook.salePrice.toLocaleString()}원</span></div>}
                      {selectedBook.url && <div className="flex items-center gap-2"><span>링크:</span><a href={selectedBook.url} target="_blank" rel="noopener noreferrer" className={`${currentTheme.primary} hover:underline flex items-center gap-1`}>도서 정보 보기 <ExternalLink size={12}/></a></div>}
                      <div className="flex items-center gap-2 pt-1">
                        <span>공개:</span>
                        <div className="flex gap-1">
                          {[['private','비공개',Lock],['friends','친구만',Users],['public','전체공개',Globe]].map(([v, label, Icon]) => (
                            <button key={v} onClick={()=>updateBook(selectedBook.id,{visibility:v})} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border transition-all ${(selectedBook.visibility||'private')===v?v==='public'?'bg-green-100 text-green-700 border-green-300':v==='friends'?'bg-blue-100 text-blue-700 border-blue-300':'bg-black/10 border-black/20':'bg-transparent border-transparent opacity-40 hover:opacity-70'}`}>
                              <Icon size={10}/>{label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedBook.contents && (
                  <div className={`mb-6 p-4 rounded-2xl ${currentTheme.primaryLight} text-sm leading-relaxed`}>
                    <div className={`text-xs font-bold mb-1.5 ${currentTheme.primary} opacity-70`}>도서 소개</div>
                    <p className="opacity-70">{selectedBook.contents}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {chapters.filter(c => c.bookId === selectedBook.id).map(chapter => (
                    <motion.div key={chapter.id} onClick={() => { setSelectedChapter(chapter); setViewMode('details'); }} className={`p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group`}>
                      <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${currentTheme.primaryLight} ${currentTheme.primary}`}>{chapter.index}</div><span className="font-bold text-lg">{chapter.title}</span></div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => handleDeleteChapter(e, chapter.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"><Trash2 size={16}/></button>
                        <ChevronRight size={20} className="opacity-30"/>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={handleAddChapter} className={`w-full p-4 rounded-2xl border-2 border-dashed ${currentTheme.border} text-center opacity-50 hover:opacity-100 font-bold`}>+ 챕터 추가</button>
                </div>
              </motion.div>
            )}
            {viewMode === 'details' && selectedChapter && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto h-full flex flex-col">
                <div className="flex justify-end mb-3">
                  <button onClick={() => {setViewMode('chapters'); setSelectedChapter(null); setSelectedDetail(null);}} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-50 hover:opacity-100 transition-all">
                    <ChevronLeft size={13}/> 뒤로
                  </button>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-2"><span className={currentTheme.primary}>#{selectedChapter.index}</span> <input value={selectedChapter.title} onChange={e=>{const n=e.target.value;setSelectedChapter({...selectedChapter,title:n});setChapters(chapters.map(c=>c.id===selectedChapter.id?{...c,title:n}:c))}} className="bg-transparent outline-none w-full"/></h2>
                  {details.filter(d=>d.chapterId===selectedChapter.id).map(detail=>(
                    <div key={detail.id} onClick={()=>{setSelectedDetail(detail);setViewMode('editor')}} className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-md cursor-pointer flex justify-between items-center group`}>
                      <span className="font-bold">{detail.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs opacity-50">{detail.startPage}-{detail.endPage}p</span>
                        <button onClick={(e) => handleDeleteDetail(e, detail.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"><Trash2 size={15}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddDetail} className={`w-full p-4 rounded-xl border-2 border-dashed ${currentTheme.border} opacity-50 hover:opacity-100 font-bold`}>+ 세부 노트 추가</button>
                </div>
              </motion.div>
            )}
            {viewMode === 'editor' && selectedDetail && (
              <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto h-full flex flex-col">
                <div className="flex justify-end mb-3">
                  <button onClick={() => {setViewMode('details'); setSelectedDetail(null);}} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-50 hover:opacity-100 transition-all">
                    <ChevronLeft size={13}/> 뒤로
                  </button>
                </div>
                <div className={`flex-1 rounded-3xl border ${currentTheme.border} ${currentTheme.panel} p-8 flex flex-col gap-4 shadow-sm overflow-y-auto`}>
                  <div className={`flex gap-4 text-sm items-center bg-black/5 p-2 rounded-lg w-fit ${theme === 'dark' ? 'text-white' : ''}`}>
                    <span className="opacity-50 font-bold">PAGE:</span>
                    <input value={selectedDetail.startPage} onChange={e=>{const v=parseInt(e.target.value)||0;setSelectedDetail({...selectedDetail,startPage:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,startPage:v}:d))}} className={`w-12 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}/>
                    <span className="opacity-50">~</span>
                    <input value={selectedDetail.endPage} onChange={e=>{const v=parseInt(e.target.value)||0;setSelectedDetail({...selectedDetail,endPage:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,endPage:v}:d))}} className={`w-12 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}/>
                  </div>
                  <input value={selectedDetail.title} onChange={e=>{const v=e.target.value;setSelectedDetail({...selectedDetail,title:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,title:v}:d))}} className="text-2xl font-black bg-transparent outline-none border-b border-transparent focus:border-gray-200 pb-2"/>
                  <textarea value={selectedDetail.content} onChange={e=>{const v=e.target.value;setSelectedDetail({...selectedDetail,content:v});setDetails(details.map(d=>d.id===selectedDetail.id?{...d,content:v}:d))}} className="min-h-[300px] bg-transparent outline-none resize-none leading-relaxed text-lg" placeholder="내용을 입력하세요..."/>
                  {selectedDetail.videoUrl && getYoutubeId(selectedDetail.videoUrl) && (
                    <div className="mt-8 border-t pt-8">
                      <h4 className="text-sm font-bold opacity-60 mb-4 flex items-center gap-2"><Video size={16}/> 관련 영상</h4>
                      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
                        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(selectedDetail.videoUrl)}`} title="video" allowFullScreen></iframe>
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
      {showBookSearch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowBookSearch(false)}>
          <div className={`${currentTheme.panel} ${currentTheme.text} rounded-3xl shadow-2xl p-8 w-full max-w-xl mx-4`} onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-1 flex items-center gap-2"><Search size={22}/> 책 검색</h2>
            <p className="text-xs opacity-50 mb-5">제목 또는 저자를 입력하면 자동으로 정보를 가져옵니다.</p>
            <div className="flex gap-2 mb-5">
              <input
                autoFocus
                value={bookSearchQuery}
                onChange={e => setBookSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchBook(bookSearchQuery)}
                placeholder="예: 해리포터, 조앤 롤링..."
                className={`flex-1 p-3 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-blue-500`}
              />
              <button onClick={() => handleSearchBook(bookSearchQuery)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                검색
              </button>
            </div>
            {isSearchingBook && <div className="text-center py-6 text-blue-500 font-bold animate-pulse">🔍 검색 중...</div>}
            {!isSearchingBook && bookSearchError && (
              <div className="text-center py-4 text-sm opacity-70 bg-black/5 rounded-xl px-4">{bookSearchError}</div>
            )}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {bookSearchResults.map(item => (
                <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${currentTheme.border} hover:border-blue-400 transition-all relative`}>
                  {/* 표지 이미지 */}
                  <div className="shrink-0 cursor-pointer" onClick={() => handleSelectBookFromSearch(item)}>
                    {item.volumeInfo.imageLinks?.thumbnail
                      ? <img src={item.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://')} alt="cover" className="w-16 h-[90px] object-cover rounded shadow-sm"/>
                      : <div className="w-16 h-[90px] bg-black/10 rounded flex items-center justify-center"><Book size={22} className="opacity-40"/></div>
                    }
                  </div>
                  {/* 도서 정보 */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectBookFromSearch(item)}>
                    <div className="font-bold text-sm leading-snug mb-0.5">{item.volumeInfo.title}</div>
                    <div className="text-xs opacity-60">
                      {(item.volumeInfo.authors || []).join(', ')}
                      {item.volumeInfo.translators?.length > 0 && ` · 번역: ${item.volumeInfo.translators.join(', ')}`}
                    </div>
                    {item.volumeInfo.contents && (
                      <div className="text-xs opacity-50 mt-1.5 leading-relaxed" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                        {item.volumeInfo.contents}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs opacity-50">
                      {item.volumeInfo.publisher && <span>{item.volumeInfo.publisher}</span>}
                      {item.volumeInfo.publishedDate && <span>{item.volumeInfo.publishedDate}</span>}
                      {item.volumeInfo.salePrice > 0 && (
                        <span className={`font-bold ${currentTheme.primary}`}>{item.volumeInfo.salePrice.toLocaleString()}원</span>
                      )}
                    </div>
                  </div>
                  {/* 외부 링크 버튼 */}
                  {item.volumeInfo.url && (
                    <a href={item.volumeInfo.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="도서 정보 사이트로 이동" className="shrink-0 opacity-30 hover:opacity-100 text-blue-500 transition-opacity self-start p-1 mt-0.5">
                      <ExternalLink size={15}/>
                    </a>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleAddBookManually} className={`w-full mt-4 p-3 rounded-xl border-2 border-dashed ${currentTheme.border} opacity-60 hover:opacity-100 hover:border-blue-400 hover:text-blue-500 font-bold transition-all`}>
              + 직접 입력하기
            </button>
          </div>
        </div>
      )}
      {showSocialPanel && (() => {
        const viewUser = socialData.find(u => u.id === socialViewUserId);
        const pendingReceived = (databasesRef.current?.__meta?.friends || []).filter(f => f.status === 'received');
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => { setShowSocialPanel(false); setSocialViewUserId(null); }}>
            <div className={`${currentTheme.panel} ${currentTheme.text} rounded-3xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className={`px-6 py-4 border-b ${currentTheme.border} flex items-center gap-2 shrink-0`}>
                {viewUser && <button onClick={() => setSocialViewUserId(null)} className="p-1 rounded-full hover:bg-black/5 mr-1"><ChevronLeft size={18}/></button>}
                <div className="flex-1 font-black text-base flex items-center gap-2">
                  {viewUser ? (
                    <><div className={`w-7 h-7 rounded-full ${currentTheme.primaryBg} flex items-center justify-center text-white text-xs font-black shrink-0`}>{viewUser.displayName[0]}</div>{viewUser.displayName}</>
                  ) : <><Users size={18}/> 다른 독자</>}
                </div>
                {pendingReceived.length > 0 && !viewUser && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">{pendingReceived.length}개 요청</span>
                )}
                <button onClick={() => { setShowSocialPanel(false); setSocialViewUserId(null); }} className="text-xs opacity-40 hover:opacity-100 px-2 py-1 rounded-lg hover:bg-black/5 ml-1">닫기</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isSocialLoading ? (
                  <div className="flex items-center justify-center h-32 text-sm opacity-40 animate-pulse">불러오는 중...</div>
                ) : viewUser ? (
                  /* 프로필 뷰 */
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-2xl ${currentTheme.primaryBg} flex items-center justify-center text-white text-2xl font-black`}>{viewUser.displayName[0]}</div>
                      <div className="flex-1">
                        <div className="font-black text-lg">{viewUser.displayName}</div>
                        <div className="text-xs opacity-40">공개 책 {viewUser.books.length}권</div>
                      </div>
                      {/* 친구 버튼 */}
                      {viewUser.friendStatus === 'none' && (
                        <button onClick={() => sendFriendRequest(viewUser.id)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                          <UserPlus size={13}/> 친구 추가
                        </button>
                      )}
                      {viewUser.friendStatus === 'sent' && (
                        <span className="text-xs font-bold px-3 py-2 rounded-xl bg-black/5 opacity-50">요청 보냄</span>
                      )}
                      {viewUser.friendStatus === 'received' && (
                        <button onClick={() => acceptFriendRequest(viewUser.id)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors">
                          <UserCheck size={13}/> 수락하기
                        </button>
                      )}
                      {viewUser.friendStatus === 'accepted' && (
                        <span className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-600 border border-green-200">
                          <UserCheck size={13}/> 친구
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">읽은 책</div>
                    {viewUser.books.length === 0 ? (
                      <div className="text-sm opacity-40 text-center py-10">
                        {viewUser.friendStatus === 'accepted' ? '공개된 책이 없습니다.' : '친구가 되면 더 많은 책을 볼 수 있어요.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {viewUser.books.map((b, i) => (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${currentTheme.border}`}>
                            {b.coverUrl
                              ? <img src={b.coverUrl} className="w-8 h-11 object-contain rounded shrink-0" alt=""/>
                              : <div className={`w-8 h-11 rounded ${currentTheme.primaryLight} flex items-center justify-center shrink-0`}><Book size={12} className="opacity-30"/></div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{b.title}</div>
                              {b.author && <div className="text-xs opacity-40 truncate">{b.author}</div>}
                            </div>
                            <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${b.visibility==='public'?'bg-green-100 text-green-600':'bg-blue-100 text-blue-600'}`}>
                              {b.visibility==='public'?'공개':'친구'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 유저 목록 */
                  <div className="space-y-2">
                    {/* 친구 요청 알림 */}
                    {pendingReceived.map(req => {
                      const reqUser = socialData.find(u => u.id === req.id);
                      if (!reqUser) return null;
                      return (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-black shrink-0">{reqUser.displayName[0]}</div>
                          <div className="flex-1 text-sm"><span className="font-bold">{reqUser.displayName}</span><span className="opacity-60"> 님이 친구 요청을 보냈습니다</span></div>
                          <button onClick={() => acceptFriendRequest(req.id)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600 shrink-0">수락</button>
                        </div>
                      );
                    })}
                    {socialData.length === 0 ? (
                      <div className="text-center text-sm opacity-40 py-10">다른 독자가 없습니다.</div>
                    ) : socialData.map(user => (
                      <div key={user.id} onClick={() => setSocialViewUserId(user.id)} className={`flex items-center gap-3 p-3 rounded-xl border ${currentTheme.border} hover:border-blue-300 cursor-pointer hover:shadow-sm transition-all`}>
                        <div className={`w-10 h-10 rounded-xl ${currentTheme.primaryBg} flex items-center justify-center text-white font-black shrink-0`}>{user.displayName[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{user.displayName}</div>
                          <div className="text-xs opacity-40">공개 책 {user.books.length}권</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {user.friendStatus === 'accepted' && <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200"><UserCheck size={10}/> 친구</span>}
                          {user.friendStatus === 'sent' && <span className="text-[10px] font-bold text-gray-400 bg-black/5 px-2 py-0.5 rounded-full">요청중</span>}
                          {user.friendStatus === 'received' && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">받은요청</span>}
                          <ChevronRight size={14} className="opacity-30"/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {contextMenu && (
        <div className="fixed bg-white border rounded-xl shadow-2xl py-2 w-40 z-50 text-sm" style={{top:contextMenu.y, left:contextMenu.x}} onClick={e=>e.stopPropagation()}>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black" onClick={()=>{setEditingBookId(contextMenu.book.id);setContextMenu(null)}}>이름 변경</button>
          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500" onClick={()=>{handleDeleteBook(contextMenu.book.id);setContextMenu(null)}}>삭제</button>
        </div>
      )}
    </div>
  );
}
