import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, Folder, ChevronRight, ChevronLeft, Search, CheckCircle, Video,
  Plus, Moon, Sun, BookOpen, Lock, Globe,
  Layout, PanelRightClose, PanelRightOpen, Check, Edit3,
  Users, Save, ExternalLink, ArrowDown, Award, Sparkles, Trash2,
  UserPlus, UserCheck, GraduationCap, Star, Eye, EyeOff
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
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPw, setShowAuthConfirmPw] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authType, setAuthType] = useState('personal'); // 'personal' | 'education'
  const [authClassCode, setAuthClassCode] = useState('');

  // --- 독자 현황 / 친구 ---
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [socialData, setSocialData] = useState([]);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [socialViewUserId, setSocialViewUserId] = useState(null);
  const [socialViewBookId, setSocialViewBookId] = useState(null);
  const [socialViewChapterId, setSocialViewChapterId] = useState(null);
  const [authEduRole, setAuthEduRole] = useState('student'); // 'student' | 'teacher'
  const [classroomData, setClassroomData] = useState([]);
  const [isClassroomLoading, setIsClassroomLoading] = useState(false);
  const [classroomViewStudentId, setClassroomViewStudentId] = useState(null);
  const [classroomViewBookId, setClassroomViewBookId] = useState(null);
  const [classroomViewChapterId, setClassroomViewChapterId] = useState(null);
  const [feedbackDraft, setFeedbackDraft] = useState({}); // { detailId: { text, score } }
  const [feedbackSaving, setFeedbackSaving] = useState({}); // { detailId: bool }
  const [classroomTab, setClassroomTab] = useState('students'); // 'students'|'announcements'|'materials'
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [materialDraft, setMaterialDraft] = useState({ title: '', content: '', url: '' });
  const [messageDraft, setMessageDraft] = useState('');
  const [showTeacherPanel, setShowTeacherPanel] = useState(false); // 학생용 선생님 패널
  const [teacherInfo, setTeacherInfo] = useState(null); // 학생이 로드한 선생님 데이터
  const [teacherPanelTab, setTeacherPanelTab] = useState('announcements');
  const [isTeacherInfoLoading, setIsTeacherInfoLoading] = useState(false);
  const [classroomMsgStudentId, setClassroomMsgStudentId] = useState(null); // 교사: 메시지 열린 학생
  const [bookMode, setBookMode] = useState('list'); // 'list' | 'mindmap' | 'journal'
  const [teacherNotesView, setTeacherNotesView] = useState(false); // 교사: true=내 노트, false=학급현황
  const [mmDrag, setMmDrag] = useState(null); // { t:'ch'|'d', id, ox, oy }
  const [mmEditKey, setMmEditKey] = useState(null); // 'ch-{id}' | 'd-{id}'
  const [mmEditText, setMmEditText] = useState('');

  const themeStyles = {
    light: { bg: 'bg-gray-50', text: 'text-gray-900', panel: 'bg-white', border: 'border-gray-200', primary: 'text-blue-600', primaryBg: 'bg-blue-600', primaryLight: 'bg-blue-50' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', panel: 'bg-gray-800', border: 'border-gray-700', primary: 'text-blue-400', primaryBg: 'bg-blue-500', primaryLight: 'bg-gray-800' },
    sepia: { bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', panel: 'bg-[#fdf6e3]', border: 'border-[#e5d5b5]', primary: 'text-[#d35400]', primaryBg: 'bg-[#d35400]', primaryLight: 'bg-[#f9f1df]' }
  };
  const currentTheme = themeStyles[theme];

  // --- 자동저장 refs ---
  const autoSaveTimerRef = useRef(null);
  const isInitialized = useRef(false);
  const mmRef = useRef(null);
  const mmMovedRef = useRef(false);
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

  // ★ 마인드맵 드래그: 윈도우 레벨 이벤트로 컨테이너 밖에서도 동작
  useEffect(() => {
    if (!mmDrag) return;
    const onMove = (e) => {
      if (!mmRef.current) return;
      mmMovedRef.current = true;
      const rect = mmRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + mmRef.current.scrollLeft - mmDrag.ox;
      const y = e.clientY - rect.top + mmRef.current.scrollTop - mmDrag.oy;
      const cx = Math.max(60, Math.min(MM_W - 60, x));
      const cy2 = Math.max(30, Math.min(MM_H - 30, y));
      if (mmDrag.t === 'ch') setChapters(p => p.map(c => c.id === mmDrag.id ? { ...c, mapX: cx, mapY: cy2 } : c));
      else setDetails(p => p.map(d => d.id === mmDrag.id ? { ...d, mapX: cx, mapY: cy2 } : d));
    };
    const onUp = () => setMmDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [mmDrag]); // eslint-disable-line

  // --- 인증 함수들 ---

  const hashPassword = async (pw) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw + '_bknote_salt_'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const loadUserData = async (userId, displayName, initMeta = null) => {
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
        const libData = { books: [], chapters: [], details: [], customGenres: [] };
        // initMeta가 있으면 (교육 계정) __meta 포함하여 최초 저장
        const newDb = initMeta
          ? { [displayName]: libData, __meta: initMeta }
          : { [displayName]: libData };
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
    const isEduSignup = authType === 'education';
    if (!name || !authPassword) return setAuthError('이름과 비밀번호를 입력해주세요.');
    if (name.length < 2) return setAuthError('이름은 2자 이상이어야 합니다.');
    if (authPassword !== authConfirmPw) return setAuthError('비밀번호가 일치하지 않습니다.');
    if (authPassword.length < 8) return setAuthError('비밀번호는 8자 이상이어야 합니다.');
    if (!/[a-zA-Z가-힣]/.test(authPassword)) return setAuthError('비밀번호에 문자(영문 또는 한글)를 포함해야 합니다.');
    if (!/[0-9]/.test(authPassword)) return setAuthError('비밀번호에 숫자를 포함해야 합니다.');
    if (isEduSignup) {
      const code = authClassCode.trim();
      if (!code) return setAuthError('교육 버전은 클래스 코드가 필수입니다.');
      if (code.length < 4) return setAuthError('클래스 코드는 4자 이상이어야 합니다.');
      if (!/^[a-zA-Z0-9가-힣\-_]+$/.test(code)) return setAuthError('클래스 코드는 영문/숫자/한글/-/_ 만 사용할 수 있습니다.');
    }
    setIsAuthLoading(true); setAuthError('');
    try {
      const { data: existing } = await supabase.from('booknote_users').select('id').eq('id', name).maybeSingle();
      if (existing) {
        // 기존 계정 타입 확인 (교육/일반 혼용 방지)
        const { data: exSave } = await supabase.from('booknote_saves').select('data').eq('id', name).maybeSingle();
        const exMode = exSave?.data?.__meta?.mode || 'personal';
        if (exMode === 'education' && !isEduSignup) return setAuthError('이 이름은 교육 버전 계정으로 등록되어 있습니다. 교육 버전으로 로그인하거나 다른 이름을 사용하세요.');
        if (exMode !== 'education' && isEduSignup) return setAuthError('이 이름은 일반 버전 계정으로 등록되어 있습니다. 일반 버전으로 로그인하거나 다른 이름을 사용하세요.');
        return setAuthError('이미 사용 중인 이름입니다. 다른 이름을 사용해주세요.');
      }
      const hash = await hashPassword(authPassword);
      const { error } = await supabase.from('booknote_users').insert({ id: name, password_hash: hash, display_name: name });
      if (error) throw error;
      const user = { id: name, displayName: name };
      setCurrentUser(user);
      localStorage.setItem('booknote_session', JSON.stringify(user));
      setIsAppLoading(true);
      // 교육 모드는 initMeta 포함하여 한 번에 저장 (race condition 방지)
      const initMeta = isEduSignup
        ? { friends: [], mode: 'education', classCode: authClassCode.trim(), role: authEduRole }
        : null;
      await loadUserData(name, name, initMeta);
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
      // 계정 타입 일치 검증 (__meta가 실제로 있는 경우에만 검사)
      const { data: saveData } = await supabase.from('booknote_saves').select('data').eq('id', name).maybeSingle();
      if (saveData?.data) {
        const savedMode = saveData.data?.__meta?.mode || 'personal';
        const loginMode = authType === 'education' ? 'education' : 'personal';
        if (savedMode === 'education' && loginMode !== 'education') return setAuthError('이 계정은 교육 버전 계정입니다. 위에서 [교육] 버튼을 누르고 로그인해주세요.');
        if (savedMode !== 'education' && loginMode === 'education') return setAuthError('이 계정은 일반 버전 계정입니다. 위에서 [일반] 버튼을 누르고 로그인해주세요.');
      }
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
    setShowAuthPassword(false); setShowAuthConfirmPw(false);
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

  // ─── 마인드맵 에디터 헬퍼 ───────────────────────────────
  const MM_W = 1300, MM_H = 740, MM_CX = 650, MM_CY = 370;
  const MM_COLORS = ['#e06a3a','#3d8fc7','#45a872','#8b63c4','#c9953a','#31a8a8','#c94f7a','#7aaa42'];

  const mmChPos = (ch, i, n) => {
    if (ch.mapX != null) return { x: ch.mapX, y: ch.mapY };
    const a = n === 1 ? -Math.PI / 2 : (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = 195 + (i % 3) * 20;
    return { x: MM_CX + r * Math.cos(a), y: MM_CY + r * Math.sin(a) };
  };

  const mmDetPos = (d, di, dn, chPos, ci, cn) => {
    if (d.mapX != null) return { x: d.mapX, y: d.mapY };
    const baseA = cn === 1 ? -Math.PI / 2 : (ci / cn) * 2 * Math.PI - Math.PI / 2;
    const spread = dn <= 1 ? 0 : (di - (dn - 1) / 2) * 0.68;
    const a = baseA + spread;
    return { x: chPos.x + 155 * Math.cos(a), y: chPos.y + 155 * Math.sin(a) };
  };


  const startMmDrag = (e, t, id, pos) => {
    e.preventDefault(); e.stopPropagation();
    if (!mmRef.current) return;
    mmMovedRef.current = false;
    const rect = mmRef.current.getBoundingClientRect();
    setMmDrag({ t, id, ox: e.clientX - rect.left + mmRef.current.scrollLeft - pos.x, oy: e.clientY - rect.top + mmRef.current.scrollTop - pos.y });
  };

  const mmCommit = () => {
    if (!mmEditKey) return;
    const txt = mmEditText.trim();
    if (txt) {
      if (mmEditKey.startsWith('ch-')) { const id = parseInt(mmEditKey.slice(3)); setChapters(p => p.map(c => c.id === id ? { ...c, title: txt } : c)); }
      else { const id = parseInt(mmEditKey.slice(2)); setDetails(p => p.map(d => d.id === id ? { ...d, title: txt } : d)); }
    }
    setMmEditKey(null); setMmEditText('');
  };

  const mmAddCh = () => {
    if (!selectedBook) return;
    const n = chapters.filter(c => c.bookId === selectedBook.id).length + 1;
    setChapters(p => [...p, { id: Date.now(), bookId: selectedBook.id, index: n.toString(), title: `챕터 ${n}`, videoUrl: '' }]);
  };

  const mmAddDet = (chId) => {
    const n = details.filter(d => d.chapterId === chId).length + 1;
    setDetails(p => [...p, { id: Date.now(), chapterId: chId, index: n.toString(), title: `세부 항목 ${n}`, startPage: 1, endPage: 10, content: '', videoUrl: '' }]);
  };
  // ─────────────────────────────────────────────────────────

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

  // 공개 수준 비교 헬퍼: private(0) < friends(1) < public(2)
  const VIS = { private: 0, friends: 1, public: 2 };
  const canSee = (vis, friendStatus) => vis === 'public' || (vis === 'friends' && friendStatus === 'accepted');
  const effectiveVis = (parent, child) => VIS[child] < VIS[parent] ? child : parent;

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
          const allBooks = [], allChapters = [], allDetails = [];
          if (save?.data) {
            Object.entries(save.data).forEach(([key, lib]) => {
              if (key.startsWith('__') || !lib?.books) return;
              lib.books.forEach(b => {
                const bookVis = b.visibility || 'private';
                if (!canSee(bookVis, friendStatus)) return;
                allBooks.push(b);
                // 챕터 수집
                (lib.chapters || []).filter(c => c.bookId === b.id).forEach(c => {
                  const chVis = effectiveVis(bookVis, c.visibility || bookVis);
                  if (!canSee(chVis, friendStatus)) return;
                  allChapters.push({ ...c, _vis: chVis });
                  // 세부 노트 수집
                  (lib.details || []).filter(d => d.chapterId === c.id).forEach(d => {
                    const dVis = effectiveVis(chVis, d.visibility || chVis);
                    if (canSee(dVis, friendStatus)) allDetails.push(d);
                  });
                });
              });
            });
          }
          return { id: u.id, displayName: u.display_name, books: allBooks, chapters: allChapters, details: allDetails, friendStatus };
        });
      setSocialData(result);
    } catch (err) {
      console.error('독자 데이터 로딩 실패:', err);
    } finally {
      setIsSocialLoading(false);
    }
  };

  const loadClassroomData = async () => {
    setIsClassroomLoading(true);
    try {
      const myClassCode = databasesRef.current?.__meta?.classCode;
      if (!myClassCode) { setIsClassroomLoading(false); return; }
      const [{ data: users }, { data: saves }] = await Promise.all([
        supabase.from('booknote_users').select('id, display_name'),
        supabase.from('booknote_saves').select('id, data')
      ]);
      const result = (saves || [])
        .filter(s => s.id !== currentUser?.id && s.data?.__meta?.classCode === myClassCode && s.data?.__meta?.role !== 'teacher')
        .map(s => {
          const user = (users || []).find(u => u.id === s.id);
          const allBooks = [], allChapters = [], allDetails = [];
          Object.entries(s.data || {}).forEach(([key, lib]) => {
            if (key.startsWith('__') || !lib?.books) return;
            allBooks.push(...lib.books);
            allChapters.push(...(lib.chapters || []));
            allDetails.push(...(lib.details || []));
          });
          const myMsgs = databasesRef.current?.__meta?.messages?.[s.id] || [];
          const tMsgs = s.data?.__meta?.messages?.[currentUser?.id] || [];
          const allMsgs = [...new Map([...myMsgs, ...tMsgs].map(m => [`${m.ts}-${m.from}`, m])).values()].sort((a, b) => a.ts - b.ts);
          return { id: s.id, displayName: user?.display_name || s.id, books: allBooks, chapters: allChapters, details: allDetails, messages: allMsgs };
        });
      setClassroomData(result);
    } catch (err) {
      console.error('학급 데이터 로딩 실패:', err);
    } finally {
      setIsClassroomLoading(false);
    }
  };

  // 교사 계정 여부
  const isTeacher = databases?.__meta?.role === 'teacher';
  const isEduMode = databases?.__meta?.mode === 'education';

  const saveFeedbackToStudent = async (studentId, detailId, text, score) => {
    setFeedbackSaving(prev => ({ ...prev, [detailId]: true }));
    try {
      const { data: studentSave } = await supabase.from('booknote_saves').select('data').eq('id', studentId).single();
      if (!studentSave?.data) return;
      const updatedData = JSON.parse(JSON.stringify(studentSave.data));
      Object.values(updatedData).forEach(lib => {
        if (!lib?.details) return;
        const detail = lib.details.find(d => d.id === detailId);
        if (detail) detail.teacherFeedback = { text, score: Number(score) || 0, teacherName: currentUser.displayName };
      });
      await supabase.from('booknote_saves').upsert({ id: studentId, data: updatedData });
      // 로컬 classroomData도 업데이트
      setClassroomData(prev => prev.map(s => s.id !== studentId ? s : {
        ...s,
        details: s.details.map(d => d.id !== detailId ? d : { ...d, teacherFeedback: { text, score: Number(score) || 0, teacherName: currentUser.displayName } })
      }));
    } catch (err) {
      console.error('피드백 저장 실패:', err);
    } finally {
      setFeedbackSaving(prev => ({ ...prev, [detailId]: false }));
    }
  };

  // 학생: 선생님 정보 로드 (공지, 자료, 메시지)
  const loadTeacherInfo = async () => {
    setIsTeacherInfoLoading(true);
    try {
      const myClassCode = databasesRef.current?.__meta?.classCode;
      if (!myClassCode) return;
      const { data: saves } = await supabase.from('booknote_saves').select('id, data');
      const teacherSave = (saves || []).find(s => s.data?.__meta?.classCode === myClassCode && s.data?.__meta?.role === 'teacher');
      if (teacherSave) {
        const myMsgs = databasesRef.current?.__meta?.messages?.[teacherSave.id] || [];
        const tMsgs = teacherSave.data.__meta?.messages?.[currentUser?.id] || [];
        const allMsgs = [...new Map([...myMsgs, ...tMsgs].map(m => [`${m.ts}-${m.from}`, m])).values()].sort((a, b) => a.ts - b.ts);
        setTeacherInfo({
          id: teacherSave.id,
          announcements: teacherSave.data.__meta?.announcements || [],
          materials: teacherSave.data.__meta?.materials || [],
          messages: allMsgs
        });
      }
    } catch (err) {
      console.error('선생님 정보 로딩 실패:', err);
    } finally {
      setIsTeacherInfoLoading(false);
    }
  };

  // 교사: 공지사항 저장
  const saveAnnouncement = async () => {
    if (!announcementDraft.trim()) return;
    const newAnn = { id: Date.now().toString(), text: announcementDraft.trim(), ts: Date.now() };
    const meta = databasesRef.current?.__meta || {};
    await saveMeta({ ...meta, announcements: [newAnn, ...(meta.announcements || [])] });
    setAnnouncementDraft('');
    loadClassroomData();
  };

  // 교사: 예시 자료 저장
  const saveMaterialItem = async () => {
    if (!materialDraft.title.trim() && !materialDraft.content.trim()) return;
    const newMat = { id: Date.now().toString(), ...materialDraft, ts: Date.now() };
    const meta = databasesRef.current?.__meta || {};
    await saveMeta({ ...meta, materials: [newMat, ...(meta.materials || [])] });
    setMaterialDraft({ title: '', content: '', url: '' });
  };

  // 메시지 전송 (교사↔학생 전용)
  const sendMessage = async (toId) => {
    if (!messageDraft.trim()) return;
    const msg = { from: currentUser.id, text: messageDraft.trim(), ts: Date.now() };
    const meta = databasesRef.current?.__meta || {};
    const myMsgs = { ...(meta.messages || {}), [toId]: [...(meta.messages?.[toId] || []), msg] };
    await saveMeta({ ...meta, messages: myMsgs });
    setMessageDraft('');
    // 상대방 데이터에도 저장
    try {
      const { data: target } = await supabase.from('booknote_saves').select('data').eq('id', toId).single();
      if (target?.data) {
        const tMeta = target.data.__meta || {};
        const tMsgs = { ...(tMeta.messages || {}), [currentUser.id]: [...(tMeta.messages?.[currentUser.id] || []), msg] };
        await supabase.from('booknote_saves').upsert({ id: toId, data: { ...target.data, __meta: { ...tMeta, messages: tMsgs } } });
      }
    } catch {}
    // 학생이면 teacherInfo 메시지 업데이트
    if (!isTeacher && teacherInfo) {
      setTeacherInfo(prev => prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev);
    }
    // 교사이면 classroomData 메시지 업데이트
    if (isTeacher) {
      setClassroomData(prev => prev.map(s => s.id !== toId ? s : {
        ...s,
        messages: [...(s.messages || []), msg]
      }));
    }
  };

  // 교사 로그인 시 학급 현황 자동 로드
  useEffect(() => {
    if (isTeacher && !isAppLoading && classroomData.length === 0 && !isClassroomLoading) {
      loadClassroomData();
    }
  }, [isTeacher, isAppLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 교사: 30초마다 학급 현황 자동 갱신
  useEffect(() => {
    if (!isTeacher || isAppLoading) return;
    const interval = setInterval(() => { loadClassroomData(); }, 30000);
    return () => clearInterval(interval);
  }, [isTeacher, isAppLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const isEdu = authType === 'education';
    return (
      <div className={`flex items-center justify-center h-screen w-full ${currentTheme.bg} ${currentTheme.text} font-sans`}>
        <motion.div
          key={authMode + authType}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`p-10 rounded-3xl shadow-2xl ${currentTheme.panel} border ${isEdu ? 'border-emerald-400' : currentTheme.border} w-full max-w-sm mx-4`}
        >
          <div className="text-center mb-6">
            {isEdu
              ? <GraduationCap size={48} className="mx-auto mb-3 text-emerald-500" />
              : <BookOpen size={48} className={`mx-auto mb-3 ${currentTheme.primary}`} />
            }
            <h1 className="text-2xl font-black">BookNote</h1>
            <p className="text-xs opacity-40 mt-1">{isEdu ? '🎓 교육 버전' : '☁️ 나만의 클라우드 서재'}</p>
          </div>
          {/* 버전 선택 */}
          <div className={`flex rounded-xl overflow-hidden border-2 mb-3 ${currentTheme.border}`}>
            <button onClick={() => { setAuthType('personal'); setAuthError(''); }} className={`flex-1 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${!isEdu ? `${currentTheme.primaryBg} text-white` : `${currentTheme.text} opacity-60 hover:opacity-100`}`}><BookOpen size={14}/> 일반</button>
            <button onClick={() => { setAuthType('education'); setAuthError(''); }} className={`flex-1 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${isEdu ? 'bg-emerald-600 text-white' : `${currentTheme.text} opacity-60 hover:opacity-100`}`}><GraduationCap size={14}/> 교육</button>
          </div>
          {isEdu && isSignup && (
            <div className="flex rounded-xl overflow-hidden border-2 mb-4 border-emerald-200">
              <button onClick={() => { setAuthEduRole('student'); setAuthError(''); }} className={`flex-1 py-2 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${authEduRole==='student' ? 'bg-emerald-500 text-white' : `${currentTheme.text} opacity-60 hover:opacity-100`}`}><Book size={13}/> 학생</button>
              <button onClick={() => { setAuthEduRole('teacher'); setAuthError(''); }} className={`flex-1 py-2 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${authEduRole==='teacher' ? 'bg-emerald-700 text-white' : `${currentTheme.text} opacity-60 hover:opacity-100`}`}><GraduationCap size={13}/> 교사</button>
            </div>
          )}

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
              <div className="relative">
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={e => { setAuthPassword(e.target.value); setAuthError(''); }}
                  onKeyDown={e => e.key === 'Enter' && (isSignup ? handleSignup() : handleLogin())}
                  placeholder="비밀번호 (8자 이상, 문자+숫자 필수)"
                  className={`w-full p-3 pr-10 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-blue-400 text-sm`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowAuthPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                  aria-label={showAuthPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showAuthPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            {isSignup && (
              <div>
                <label className="text-xs font-bold opacity-60 mb-1 block">비밀번호 확인</label>
                <div className="relative">
                  <input
                    type={showAuthConfirmPw ? 'text' : 'password'}
                    value={authConfirmPw}
                    onChange={e => { setAuthConfirmPw(e.target.value); setAuthError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    placeholder="비밀번호를 다시 입력하세요"
                    className={`w-full p-3 pr-10 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-blue-400 text-sm`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowAuthConfirmPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                    aria-label={showAuthConfirmPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    {showAuthConfirmPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            )}
            {isSignup && isEdu && (
              <div>
                <label className="text-xs font-bold mb-1 block text-emerald-600 flex items-center gap-1"><GraduationCap size={11}/> {authEduRole==='teacher'?'학급 코드 설정':'학급 코드 입력'} <span className="text-red-500 font-bold">*필수</span></label>
                <input
                  value={authClassCode}
                  onChange={e => { setAuthClassCode(e.target.value); setAuthError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  placeholder={authEduRole==='teacher'?'4자 이상 · 영문+숫자 조합 권장 (예: class2025)':'선생님께 받은 학급 코드 입력 (필수)'}
                  className={`w-full p-3 rounded-xl border-2 border-emerald-300 bg-transparent outline-none focus:border-emerald-500 text-sm`}
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
            className={`w-full mt-5 py-3 rounded-xl ${isEdu ? 'bg-emerald-600 hover:bg-emerald-700' : currentTheme.primaryBg} text-white font-bold shadow transition-colors disabled:opacity-50`}
          >
            {isAuthLoading ? '처리 중...' : isSignup ? (isEdu ? (authEduRole==='teacher'?'🏫 교사 계정 만들기':'🎓 학생 계정 만들기') : '회원가입') : (isEdu ? '🎓 교육 버전 로그인' : '로그인')}
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
        {!isEduMode && usedGenres.map(genre => (
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
        {!isEduMode && (
        <div className="pt-2 px-2">
          {showAddGenre ? (
            <div className="flex gap-1"><input autoFocus value={newGenreName} onChange={e=>setNewGenreName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmAddGenre()} className="text-xs p-1.5 rounded border w-full" placeholder="장르명"/><button onClick={confirmAddGenre} className="bg-green-500 text-white text-xs px-2 rounded">V</button></div>
          ) : (
            <button onClick={() => { setShowAddGenre(true); setNewGenreName(''); }} className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 hover:text-blue-500 transition-colors w-full p-2"><Plus size={14}/> 장르 추가</button>
          )}
        </div>
        )}
      </div>
      <div className={`p-6 border-t ${currentTheme.border} flex justify-between bg-black/5 p-1 rounded-full mx-4 mb-4`}>
        <button onClick={() => setTheme('light')} className={`p-2 rounded-full ${theme === 'light' ? 'bg-white shadow' : 'opacity-50'}`}><Sun size={14} /></button>
        <button onClick={() => setTheme('sepia')} className={`p-2 rounded-full ${theme === 'sepia' ? 'bg-[#fdf6e3] shadow' : 'opacity-50'}`}><Layout size={14} /></button>
        <button onClick={() => setTheme('dark')} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white shadow' : 'opacity-50'}`}><Moon size={14} /></button>
      </div>
    </aside>
  );

  // --- 마인드맵 렌더러 ---
  const renderMindMap = (centerLabel, nodes, onNodeClick) => {
    const N = nodes.length;
    if (N === 0) return <div className="text-center py-16 opacity-40 font-bold">항목이 없습니다</div>;
    const radius = Math.max(160, Math.min(300, N * 38 + 70));
    const svgW = (radius + 140) * 2;
    const svgH = (radius + 110) * 2;
    const cx = svgW / 2;
    const cy = svgH / 2;
    const tc = {
      sepia:  { centerFill: '#d35400', centerText: '#fff', nodeFill: '#fdf6e3', nodeBorder: '#d35400', nodeText: '#5b4636', line: '#e2c990' },
      light:  { centerFill: '#2563eb', centerText: '#fff', nodeFill: '#eff6ff', nodeBorder: '#3b82f6', nodeText: '#1e40af', line: '#93c5fd' },
      dark:   { centerFill: '#1d4ed8', centerText: '#fff', nodeFill: '#1e293b', nodeBorder: '#60a5fa', nodeText: '#93c5fd', line: '#334155' },
    }[theme] || { centerFill: '#d35400', centerText: '#fff', nodeFill: '#fdf6e3', nodeBorder: '#d35400', nodeText: '#5b4636', line: '#e2c990' };
    const trunc = (s, n) => s && s.length > n ? s.slice(0, n - 1) + '…' : (s || '');

    return (
      <div className="w-full overflow-auto py-2 flex justify-center">
        <svg width={svgW} height={svgH} style={{ minWidth: '340px', maxWidth: '100%' }}>
          {nodes.map((node, i) => {
            const angle = N === 1 ? -Math.PI / 2 : (i / N) * 2 * Math.PI - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            const cpx = (cx + nx) / 2 + (ny - cy) * 0.3;
            const cpy = (cy + ny) / 2 - (nx - cx) * 0.3;
            return (
              <path key={`l-${node.id}`}
                d={`M ${cx} ${cy} Q ${cpx} ${cpy} ${nx} ${ny}`}
                stroke={tc.line} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            );
          })}
          {/* 중심 노드 */}
          <rect x={cx - 68} y={cy - 24} width={136} height={48} rx={24} fill={tc.centerFill} />
          <text x={cx} y={cy + 6} textAnchor="middle" fill={tc.centerText} fontSize={13} fontWeight="bold">
            {trunc(centerLabel, 13)}
          </text>
          {/* 자식 노드 */}
          {nodes.map((node, i) => {
            const angle = N === 1 ? -Math.PI / 2 : (i / N) * 2 * Math.PI - Math.PI / 2;
            const nx = cx + radius * Math.cos(angle);
            const ny = cy + radius * Math.sin(angle);
            const line1 = node.index ? `${node.index}.` : '';
            const line2 = trunc(node.title, 13);
            return (
              <g key={node.id} onClick={() => onNodeClick(node)} style={{ cursor: 'pointer' }}>
                <rect x={nx - 62} y={ny - 26} width={124} height={52} rx={14}
                  fill={tc.nodeFill} stroke={tc.nodeBorder} strokeWidth="2" />
                {line1 && (
                  <text x={nx} y={ny - 5} textAnchor="middle" fill={tc.nodeText} fontSize={10} fontWeight="bold" opacity={0.6}>
                    {line1}
                  </text>
                )}
                <text x={nx} y={line1 ? ny + 13 : ny + 7} textAnchor="middle" fill={tc.nodeText} fontSize={12} fontWeight="600">
                  {line2}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

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
          {!isTeacher && isEduMode && (
            <button
              onClick={() => { setShowTeacherPanel(true); loadTeacherInfo(); }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-300 hover:border-emerald-500 hover:text-emerald-700 transition-all opacity-70 hover:opacity-100`}
            >
              <GraduationCap size={14}/> 선생님
            </button>
          )}
          {!isTeacher && !isEduMode && (
            <button
              onClick={() => { setShowSocialPanel(true); loadSocialData(); }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border ${currentTheme.border} hover:border-blue-400 hover:text-blue-500 transition-all opacity-60 hover:opacity-100`}
            >
              <Users size={14}/> 다른 독자
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {viewMode === 'shelf' && (
              <motion.div key="shelf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                {isTeacher && !teacherNotesView ? (
                  /* ── 교사 학급 현황 뷰 ── */
                  <div>
                    {classroomViewChapterId ? (
                      /* 레벨 3: 학생 노트 읽기 + 피드백 */
                      <div className="w-full">
                        <button onClick={() => setClassroomViewChapterId(null)} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-60 hover:opacity-100 transition-all mb-6`}><ChevronLeft size={13}/> 챕터 목록으로</button>
                        <div className="space-y-5">
                          {(() => {
                            const student = classroomData.find(s => s.id === classroomViewStudentId);
                            const chDets = student?.details?.filter(d => d.chapterId === classroomViewChapterId) || [];
                            if (chDets.length === 0) return <div className="text-sm opacity-40 text-center py-10">작성된 노트가 없습니다.</div>;
                            return chDets.map((d, i) => {
                              const draft = feedbackDraft[d.id] ?? { text: d.teacherFeedback?.text || '', score: d.teacherFeedback?.score ?? '' };
                              return (
                                <div key={i} className={`rounded-2xl border-2 ${currentTheme.border} overflow-hidden`}>
                                  {/* 노트 헤더 */}
                                  <div className={`flex items-center justify-between px-5 py-3 ${currentTheme.primaryLight}`}>
                                    <h3 className="font-black text-base">{d.title}</h3>
                                    <span className="text-xs opacity-50 font-medium">{d.startPage}–{d.endPage}p</span>
                                  </div>
                                  {/* 노트 내용 */}
                                  <div className="px-5 py-4">
                                    <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{d.content || '(내용 없음)'}</p>
                                  </div>
                                  {/* 교사 피드백 영역 */}
                                  <div className={`px-5 py-4 border-t-2 border-emerald-100 bg-emerald-50/50`}>
                                    <div className="text-xs font-black text-emerald-700 mb-2 flex items-center gap-1.5"><GraduationCap size={12}/> 교사 피드백</div>
                                    <textarea
                                      value={draft.text}
                                      onChange={e => setFeedbackDraft(prev => ({ ...prev, [d.id]: { ...draft, text: e.target.value } }))}
                                      placeholder="피드백을 입력하세요..."
                                      rows={2}
                                      className="w-full p-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:border-emerald-500 outline-none resize-none"
                                    />
                                    <div className="flex items-center gap-3 mt-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold opacity-60">점수</span>
                                        <input
                                          type="number" min="0" max="100"
                                          value={draft.score}
                                          onChange={e => setFeedbackDraft(prev => ({ ...prev, [d.id]: { ...draft, score: e.target.value } }))}
                                          placeholder="0–100"
                                          className="w-16 p-1.5 rounded-lg border border-emerald-200 bg-white text-sm text-center font-bold focus:border-emerald-500 outline-none"
                                        />
                                        <span className="text-xs opacity-40">점</span>
                                      </div>
                                      <button
                                        onClick={() => saveFeedbackToStudent(classroomViewStudentId, d.id, draft.text, draft.score)}
                                        disabled={feedbackSaving[d.id]}
                                        className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow transition-all disabled:opacity-50"
                                      >
                                        <Save size={12}/> {feedbackSaving[d.id] ? '저장 중...' : '피드백 저장'}
                                      </button>
                                    </div>
                                    {d.teacherFeedback && <div className="text-[10px] opacity-40 mt-1.5">마지막 저장: {d.teacherFeedback.teacherName} · {d.teacherFeedback.score}점</div>}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : classroomViewBookId ? (
                      /* 레벨 2: 책의 챕터 목록 */
                      <div className="max-w-3xl">
                        <button onClick={() => setClassroomViewBookId(null)} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-60 hover:opacity-100 transition-all mb-6`}><ChevronLeft size={13}/> 책 목록으로</button>
                        {(() => {
                          const student = classroomData.find(s => s.id === classroomViewStudentId);
                          const book = student?.books.find(b => b.id === classroomViewBookId);
                          const bookChapters = student?.chapters?.filter(c => c.bookId === classroomViewBookId) || [];
                          return (
                            <div>
                              <div className="flex items-center gap-4 mb-6">
                                {book?.coverUrl ? <img src={book.coverUrl} className="w-12 h-16 object-contain rounded-lg shadow" alt=""/> : <div className={`w-12 h-16 rounded-lg ${currentTheme.primaryLight} flex items-center justify-center`}><Book size={20} className="opacity-30"/></div>}
                                <div>
                                  <div className="font-black text-xl">{book?.title}</div>
                                  {book?.author && <div className="text-sm opacity-50 mt-0.5">{book.author}</div>}
                                </div>
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">챕터 목록</div>
                              {bookChapters.length === 0 ? <div className="text-sm opacity-40 text-center py-8">작성된 챕터가 없습니다.</div> : (
                                <div className="space-y-2">
                                  {bookChapters.map((c, i) => {
                                    const noteCount = student?.details?.filter(d => d.chapterId === c.id).length || 0;
                                    return (
                                      <div key={i} onClick={() => setClassroomViewChapterId(c.id)} className={`flex items-center gap-4 p-4 rounded-xl border ${currentTheme.border} hover:border-emerald-300 cursor-pointer hover:shadow-sm transition-all`}>
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm bg-emerald-50 text-emerald-700 shrink-0`}>{c.index}</div>
                                        <div className="flex-1 min-w-0"><div className="font-bold">{c.title}</div><div className="text-xs opacity-40">노트 {noteCount}개</div></div>
                                        <ChevronRight size={16} className="opacity-30"/>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : classroomViewStudentId ? (
                      /* 레벨 1: 학생의 책 목록 + 메시지 */
                      <div className="w-full">
                        <button onClick={() => { setClassroomViewStudentId(null); setClassroomViewBookId(null); setClassroomMsgStudentId(null); }} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-60 hover:opacity-100 transition-all mb-6`}><ChevronLeft size={13}/> 학생 목록으로</button>
                        {(() => {
                          const student = classroomData.find(s => s.id === classroomViewStudentId);
                          if (!student) return null;
                          return (
                            <div className="flex gap-6">
                              {/* 왼쪽: 읽은 책 목록 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4 mb-6">
                                  <div className={`w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-black`}>{student.displayName[0]}</div>
                                  <div><div className="font-black text-2xl">{student.displayName}</div><div className="text-sm opacity-40 mt-0.5">책 {student.books.length}권 등록</div></div>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">읽은 책</div>
                                {student.books.length === 0 ? <div className="text-sm opacity-40 text-center py-10">등록된 책이 없습니다.</div> : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {student.books.map((b, i) => {
                                      const chCount = student.chapters?.filter(c => c.bookId === b.id).length || 0;
                                      const dCount = student.details?.filter(d => student.chapters?.filter(c => c.bookId === b.id).map(c => c.id).includes(d.chapterId)).length || 0;
                                      return (
                                        <div key={i} onClick={() => setClassroomViewBookId(b.id)} className={`flex gap-3 p-4 rounded-2xl border ${currentTheme.border} hover:border-emerald-400 cursor-pointer hover:shadow-md transition-all`}>
                                          {b.coverUrl ? <img src={b.coverUrl} className="w-12 h-16 object-contain rounded shrink-0" alt=""/> : <div className={`w-12 h-16 rounded ${currentTheme.primaryLight} flex items-center justify-center shrink-0`}><Book size={16} className="opacity-30"/></div>}
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold leading-snug line-clamp-2">{b.title}</div>
                                            {b.author && <div className="text-xs opacity-40 truncate mt-0.5">{b.author}</div>}
                                            <div className="flex gap-3 mt-2 text-xs opacity-50"><span>챕터 {chCount}개</span><span>노트 {dCount}개</span></div>
                                          </div>
                                          <ChevronRight size={16} className="opacity-30 self-center"/>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* 오른쪽: 1:1 메시지 */}
                              <div className={`w-80 shrink-0 rounded-2xl border-2 border-emerald-200 flex flex-col overflow-hidden`} style={{maxHeight:'60vh'}}>
                                <div className="px-4 py-3 bg-emerald-600 text-white flex items-center gap-2 shrink-0">
                                  <Users size={15}/>
                                  <span className="font-black text-sm">{student.displayName} 님과 메시지</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                  {(student.messages || []).length === 0 ? (
                                    <div className="text-xs opacity-30 text-center py-6">메시지가 없습니다</div>
                                  ) : (student.messages || []).map((m, i) => (
                                    <div key={i} className={`flex ${m.from === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-sm' : `${currentTheme.panel} border ${currentTheme.border} rounded-tl-sm`}`}>
                                        {m.text}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className={`p-3 border-t border-emerald-200 flex gap-2 shrink-0`}>
                                  <input
                                    value={classroomMsgStudentId === student.id ? messageDraft : ''}
                                    onFocus={() => setClassroomMsgStudentId(student.id)}
                                    onChange={e => { setClassroomMsgStudentId(student.id); setMessageDraft(e.target.value); }}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage(student.id).then(() => setMessageDraft(''))}
                                    placeholder="메시지 입력..."
                                    className="flex-1 text-xs p-2 rounded-xl border border-emerald-200 bg-transparent outline-none focus:border-emerald-500"
                                  />
                                  <button onClick={() => sendMessage(student.id).then(() => setMessageDraft(''))} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shrink-0">전송</button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* 레벨 0: 탭 (학생 목록 / 공지사항 / 예시 자료) */
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-3xl font-black flex items-center gap-3"><GraduationCap size={32} className="text-emerald-600"/> 학급 현황<span className="text-sm font-normal bg-black/10 px-2 py-1 rounded-full">{classroomData.length}명</span></h2>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setTeacherNotesView(true)} className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-2xl bg-black/5 hover:bg-black/10 transition-all"><BookOpen size={15}/> 내 노트</button>
                            <button onClick={loadClassroomData} disabled={isClassroomLoading} className={`group flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed`}>
                              <svg className={`w-4 h-4 ${isClassroomLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              {isClassroomLoading ? '불러오는 중...' : '새로고침'}
                            </button>
                          </div>
                        </div>
                        {/* 탭 바 */}
                        <div className={`flex gap-1 p-1 rounded-2xl mb-6 w-fit`} style={{background:'rgba(0,0,0,0.06)'}}>
                          {[['students','👥 학생 목록'],['announcements','📢 공지사항'],['materials','📚 예시 자료'],['chat','💬 채팅']].map(([key, label]) => (
                            <button key={key} onClick={() => setClassroomTab(key)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${classroomTab===key ? 'bg-emerald-600 text-white shadow-md' : 'opacity-50 hover:opacity-80'}`}>{label}</button>
                          ))}
                        </div>

                        {/* 학생 목록 탭 */}
                        {classroomTab === 'students' && (isClassroomLoading ? (
                          <div className="flex items-center justify-center h-32 text-sm opacity-40 animate-pulse">학생 데이터 불러오는 중...</div>
                        ) : classroomData.length === 0 ? (
                          <div className="text-center py-20 opacity-40">
                            <GraduationCap size={48} className="mx-auto mb-4 opacity-30"/>
                            <p className="font-bold">아직 학생이 없습니다.</p>
                            <p className="text-sm mt-1">학급 코드: <span className="font-bold text-emerald-600">{databases?.__meta?.classCode || '없음'}</span> 을 학생들에게 알려주세요.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classroomData.map(student => (
                              <div key={student.id} onClick={() => { setClassroomViewStudentId(student.id); setClassroomViewBookId(null); setClassroomViewChapterId(null); setClassroomMsgStudentId(null); }} className={`p-5 rounded-2xl border ${currentTheme.border} hover:border-emerald-400 cursor-pointer hover:shadow-lg transition-all group`}>
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl font-black shrink-0">{student.displayName[0]}</div>
                                  <div className="flex-1 min-w-0"><div className="font-black text-base truncate">{student.displayName}</div><div className="text-xs opacity-40">책 {student.books.length}권</div></div>
                                  <ChevronRight size={16} className="opacity-30 group-hover:opacity-70 transition-opacity"/>
                                </div>
                                <div className="flex gap-3 text-xs opacity-50 border-t pt-3" style={{borderColor:'rgba(0,0,0,0.08)'}}>
                                  <span>챕터 {student.chapters.length}개</span>
                                  <span>노트 {student.details.length}개</span>
                                  {(student.messages||[]).length > 0 && <span className="text-emerald-600 font-bold">메시지 {student.messages.length}개</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* 공지사항 탭 */}
                        {classroomTab === 'announcements' && (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40`}>
                              <div className="text-xs font-black text-emerald-700 mb-2 flex items-center gap-1.5">📢 새 공지 작성</div>
                              <textarea value={announcementDraft} onChange={e => setAnnouncementDraft(e.target.value)} placeholder="전체 학생에게 전달할 내용을 입력하세요..." rows={3} className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-sm focus:border-emerald-500 outline-none resize-none mb-2"/>
                              <button onClick={saveAnnouncement} disabled={!announcementDraft.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow transition-all disabled:opacity-40"><Save size={14}/> 공지 등록</button>
                            </div>
                            {(databases?.__meta?.announcements || []).length === 0 ? (
                              <div className="text-sm opacity-40 text-center py-8">등록된 공지사항이 없습니다.</div>
                            ) : (databases?.__meta?.announcements || []).map(ann => (
                              <div key={ann.id} className={`p-4 rounded-2xl border ${currentTheme.border}`}>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{ann.text}</div>
                                <div className="text-[10px] opacity-30 mt-2">{new Date(ann.ts).toLocaleString('ko-KR')}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 예시 자료 탭 — 책 카드 방식 */}
                        {classroomTab === 'materials' && (
                          <div>
                            {/* 등록 폼 — 책 추가 스타일 */}
                            <div className={`mb-6 p-5 rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50/30`}>
                              <div className="text-sm font-black text-blue-700 mb-4 flex items-center gap-2"><Book size={16}/> 새 예시 자료 등록</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2">
                                  <label className="text-xs font-bold opacity-60 mb-1 block">제목 *</label>
                                  <input value={materialDraft.title} onChange={e => setMaterialDraft(p => ({...p, title: e.target.value}))} placeholder="예시 자료 제목" className="w-full p-3 rounded-xl border-2 border-blue-200 bg-white text-sm focus:border-blue-500 outline-none font-bold"/>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-xs font-bold opacity-60 mb-1 block">내용</label>
                                  <textarea value={materialDraft.content} onChange={e => setMaterialDraft(p => ({...p, content: e.target.value}))} placeholder="학생들에게 보여줄 내용을 작성하세요..." rows={5} className="w-full p-3 rounded-xl border-2 border-blue-200 bg-white text-sm focus:border-blue-500 outline-none resize-none leading-relaxed"/>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-xs font-bold opacity-60 mb-1 block">YouTube 또는 URL (선택)</label>
                                  <input value={materialDraft.url} onChange={e => setMaterialDraft(p => ({...p, url: e.target.value}))} placeholder="https://youtube.com/watch?v=... 또는 링크" className="w-full p-3 rounded-xl border-2 border-blue-200 bg-white text-sm focus:border-blue-500 outline-none"/>
                                </div>
                              </div>
                              <button onClick={saveMaterialItem} disabled={!materialDraft.title.trim()} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-md transition-all disabled:opacity-40"><Plus size={15}/> 자료 등록</button>
                            </div>
                            {/* 자료 카드 그리드 */}
                            {(databases?.__meta?.materials || []).length === 0 ? (
                              <div className="text-sm opacity-40 text-center py-12">등록된 예시 자료가 없습니다.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {(databases?.__meta?.materials || []).map(mat => (
                                  <div key={mat.id} className={`rounded-3xl border ${currentTheme.border} shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden`}>
                                    {/* 상단: 영상 or 색상 배너 */}
                                    <div className="h-32 shrink-0 overflow-hidden relative">
                                      {mat.url && getYoutubeId(mat.url)
                                        ? <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(mat.url)}`} title="material" allowFullScreen className="w-full h-full"/>
                                        : <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center"><Book size={36} className="text-white opacity-40"/></div>
                                      }
                                    </div>
                                    {/* 하단: 텍스트 정보 */}
                                    <div className={`flex-1 p-4 ${currentTheme.panel} flex flex-col gap-2`}>
                                      <div className="font-black text-base leading-snug">{mat.title}</div>
                                      {mat.content && <p className="text-xs opacity-60 leading-relaxed line-clamp-3 whitespace-pre-wrap">{mat.content}</p>}
                                      {mat.url && !getYoutubeId(mat.url) && <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs flex items-center gap-1 hover:underline mt-auto"><ExternalLink size={11}/> 링크 열기</a>}
                                      <div className="text-[10px] opacity-25 mt-1">{new Date(mat.ts).toLocaleString('ko-KR')}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 채팅 탭 */}
                        {classroomTab === 'chat' && (
                          <div className="flex gap-4" style={{height:'calc(100vh - 280px)', minHeight:'480px'}}>
                            {/* 왼쪽: 학생 목록 */}
                            <div className={`w-56 shrink-0 border-2 rounded-2xl overflow-hidden flex flex-col border-emerald-200`}>
                              <div className="px-4 py-3 bg-emerald-600 text-white text-xs font-black shrink-0">대화 상대</div>
                              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {classroomData.length === 0 ? (
                                  <div className="text-xs opacity-30 text-center py-6">학생이 없습니다</div>
                                ) : classroomData.map(s => {
                                  const lastMsg = (s.messages||[]).slice(-1)[0];
                                  const unread = (s.messages||[]).filter(m => m.from !== currentUser.id).length;
                                  return (
                                    <div key={s.id} onClick={() => setClassroomMsgStudentId(s.id)} className={`p-2.5 rounded-xl cursor-pointer transition-all ${classroomMsgStudentId===s.id ? 'bg-emerald-600 text-white' : `hover:bg-emerald-50 ${currentTheme.text}`}`}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${classroomMsgStudentId===s.id ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}>{s.displayName[0]}</div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold text-xs truncate">{s.displayName}</div>
                                          {lastMsg && <div className={`text-[10px] truncate ${classroomMsgStudentId===s.id ? 'opacity-70' : 'opacity-40'}`}>{lastMsg.text}</div>}
                                        </div>
                                        {unread > 0 && classroomMsgStudentId !== s.id && <div className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">{unread}</div>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {/* 오른쪽: 채팅 창 */}
                            <div className={`flex-1 border-2 rounded-2xl overflow-hidden flex flex-col border-emerald-200`}>
                              {!classroomMsgStudentId ? (
                                <div className="flex-1 flex items-center justify-center opacity-30">
                                  <div className="text-center"><Users size={40} className="mx-auto mb-3 opacity-30"/><p className="text-sm font-bold">왼쪽에서 학생을 선택하세요</p></div>
                                </div>
                              ) : (() => {
                                const student = classroomData.find(s => s.id === classroomMsgStudentId);
                                return (
                                  <>
                                    <div className="px-5 py-3 bg-emerald-600 text-white flex items-center gap-3 shrink-0">
                                      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-black">{student?.displayName[0]}</div>
                                      <span className="font-black text-base">{student?.displayName}</span>
                                      <span className="ml-auto text-xs opacity-70">메시지 {(student?.messages||[]).length}개</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                      {(student?.messages||[]).length === 0 ? (
                                        <div className="text-sm opacity-30 text-center py-10">아직 메시지가 없습니다.<br/>먼저 말을 걸어보세요!</div>
                                      ) : (student?.messages||[]).map((m, i) => (
                                        <div key={i} className={`flex ${m.from === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                          {m.from !== currentUser.id && <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black mr-2 shrink-0 self-end">{student?.displayName[0]}</div>}
                                          <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.from === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-sm' : `${currentTheme.panel} border ${currentTheme.border} rounded-tl-sm`}`}>
                                            {m.text}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className={`p-4 border-t-2 border-emerald-100 flex gap-3 shrink-0`}>
                                      <input
                                        value={messageDraft}
                                        onChange={e => setMessageDraft(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && classroomMsgStudentId) { sendMessage(classroomMsgStudentId); } }}
                                        placeholder={`${student?.displayName} 님에게 메시지 입력...`}
                                        className={`flex-1 text-sm p-3 rounded-xl border-2 ${currentTheme.border} bg-transparent outline-none focus:border-emerald-400`}
                                      />
                                      <button onClick={() => classroomMsgStudentId && sendMessage(classroomMsgStudentId)} className="px-5 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow transition-all shrink-0">전송</button>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── 일반 학생/개인 서재 뷰 ── */
                  <div>
                {isTeacher && <button onClick={() => setTeacherNotesView(false)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all mb-5 shrink-0"><ChevronLeft size={13}/> 학급 현황으로</button>}
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
                            : <h3 className="text-base font-black line-clamp-2 leading-snug">{book.title}</h3>
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
                  </div>
                )}
              </motion.div>
            )}
            {viewMode === 'chapters' && selectedBook && (
              <motion.div key="chapters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                {/* ── 상단: 모드 탭 + 서재로 버튼 ── */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex gap-1.5">
                    {[['list','📋 목록'],['mindmap','🗺️ 마인드맵'],['journal','📖 독서록']].map(([m, label]) => (
                      <button key={m} onClick={() => setBookMode(m)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${bookMode===m ? `${currentTheme.primaryBg} text-white shadow-md` : 'bg-black/5 hover:bg-black/10 opacity-60 hover:opacity-100'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => {setViewMode('shelf'); setSelectedBook(null); setSelectedChapter(null); setSelectedDetail(null);}} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-50 hover:opacity-100 transition-all">
                    <ChevronLeft size={13}/> 서재로
                  </button>
                </div>

                {/* ── 책 정보 (항상 표시) ── */}
                <div className="mb-6 flex gap-8">
                  <label className={`w-28 h-40 rounded-xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center cursor-pointer hover:opacity-70 overflow-hidden relative shrink-0 ${selectedBook.coverUrl?'':'bg-black/5'}`}>
                    {selectedBook.coverUrl ? <img src={selectedBook.coverUrl} className="w-full h-full object-cover" alt="cover"/> : <span className="text-xs opacity-50 text-center p-2">표지 추가</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files[0]) updateBook(selectedBook.id, {coverUrl: URL.createObjectURL(e.target.files[0])})}} />
                  </label>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-3xl font-black truncate">{selectedBook.title}</h2>
                      <button onClick={()=>setEditingBookId(selectedBook.id)} className="text-gray-400 hover:text-blue-500 shrink-0"><Edit3 size={18}/></button>
                      <button onClick={()=>{ if(window.confirm(`"${selectedBook.title}"을 삭제하시겠습니까?`)) handleDeleteBook(selectedBook.id); }} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 size={16}/></button>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-40 h-2.5 rounded-full bg-black/10 overflow-hidden"><div style={{width:`${calculateProgress(selectedBook.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}/></div>
                      <span className={`text-sm font-bold ${currentTheme.primary}`}>{calculateProgress(selectedBook.id)}% 읽음</span>
                      {calculateProgress(selectedBook.id)===100 && <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold"><Award size={12}/> 완독!</span>}
                    </div>
                    <div className="space-y-1.5 text-sm opacity-80">
                      <div className="flex items-center gap-2"><span>저자:</span><input value={selectedBook.author} onChange={e=>updateBook(selectedBook.id,{author:e.target.value})} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-28"/></div>
                      <div className="flex items-center gap-2"><span>총 페이지:</span><input type="number" value={selectedBook.totalPages} onChange={e=>updateBook(selectedBook.id,{totalPages:parseInt(e.target.value)||0})} className="bg-transparent border-b border-dashed border-gray-400 focus:border-blue-500 outline-none w-14 font-bold"/>쪽</div>
                      {selectedBook.publisher && <div className="flex items-center gap-2"><span>출판사:</span><span className="font-medium">{selectedBook.publisher}</span></div>}
                      {selectedBook.url && <a href={selectedBook.url} target="_blank" rel="noopener noreferrer" className={`${currentTheme.primary} hover:underline flex items-center gap-1 text-xs`}>도서 정보 보기 <ExternalLink size={11}/></a>}
                    </div>
                  </div>
                </div>
                {selectedBook.contents && (
                  <div className={`mb-5 p-3.5 rounded-2xl ${currentTheme.primaryLight} text-sm`}>
                    <div className={`text-xs font-bold mb-1 ${currentTheme.primary} opacity-70`}>도서 소개</div>
                    <p className="opacity-70 line-clamp-2">{selectedBook.contents}</p>
                  </div>
                )}

                {/* ── 문서 모드 (연속 스크롤) ── */}
                {bookMode === 'list' && (
                  <div className="space-y-6">
                    {chapters.filter(c => c.bookId === selectedBook.id).map((ch, ci) => {
                      const chDets = details.filter(d => d.chapterId === ch.id);
                      const chColor = MM_COLORS[ci % MM_COLORS.length];
                      return (
                        <div key={ch.id} className={`rounded-2xl border-2 overflow-hidden`} style={{ borderColor: chColor + '55' }}>
                          {/* 챕터 헤더 — 클릭 시 챕터 세부 화면으로 이동 */}
                          <div
                            className="flex items-center gap-3 px-5 py-4 group cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ background: chColor + '18' }}
                            onClick={() => { setSelectedChapter(ch); setViewMode('details'); }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0" style={{ background: chColor }}>{ch.index}</div>
                            <input
                              value={ch.title}
                              onChange={e => { e.stopPropagation(); setChapters(p => p.map(c => c.id === ch.id ? {...c, title: e.target.value} : c)); }}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 text-xl font-black bg-transparent outline-none cursor-text"
                            />
                            <button onClick={e=>{e.stopPropagation();const v=ch.visibility||'show';const next={show:'private',private:'friends',friends:'show'};setChapters(p=>p.map(c=>c.id===ch.id?{...c,visibility:next[v]}:c));}} className={`p-1 rounded-full transition-all shrink-0 ${(ch.visibility&&ch.visibility!=='show')?'opacity-100':'opacity-0 group-hover:opacity-60'}`}>
                              {ch.visibility==='private'?<Lock size={13} className="text-red-400"/>:ch.visibility==='friends'?<Users size={13} className="text-blue-400"/>:<Globe size={13} className="text-gray-400"/>}
                            </button>
                            <ChevronRight size={16} className="opacity-30 shrink-0"/>
                            <button onClick={(e) => handleDeleteChapter(e, ch.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 shrink-0"><Trash2 size={16}/></button>
                          </div>
                          {/* 세부 항목 목록 (내용 포함) */}
                          <div className={`divide-y ${currentTheme.border}`}>
                            {chDets.map(d => (
                              <div key={d.id} className={`${currentTheme.panel} group`}>
                                {/* 세부 항목 제목 행 — 클릭 시 에디터로 이동 */}
                                <div
                                  className="flex items-center gap-2 px-5 pt-4 pb-1 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => { setSelectedChapter(ch); setSelectedDetail(d); setViewMode('editor'); }}>
                                  <div className="w-1.5 h-5 rounded-full shrink-0" style={{ background: chColor }}/>
                                  <input
                                    value={d.title}
                                    onChange={e => { e.stopPropagation(); setDetails(p => p.map(dd => dd.id === d.id ? {...dd, title: e.target.value} : dd)); }}
                                    onClick={e => e.stopPropagation()}
                                    className="flex-1 font-bold text-base bg-transparent outline-none cursor-text"
                                  />
                                  <span className="text-xs opacity-40 shrink-0">{d.startPage}-{d.endPage}p</span>
                                  <button onClick={e=>{e.stopPropagation();const v=d.visibility||'show';const next={show:'private',private:'friends',friends:'show'};setDetails(p=>p.map(dd=>dd.id===d.id?{...dd,visibility:next[v]}:dd));}} className={`p-1 rounded-full transition-all shrink-0 ${(d.visibility&&d.visibility!=='show')?'opacity-100':'opacity-0 group-hover:opacity-60'}`}>
                                    {d.visibility==='private'?<Lock size={12} className="text-red-400"/>:d.visibility==='friends'?<Users size={12} className="text-blue-400"/>:<Globe size={12} className="text-gray-400"/>}
                                  </button>
                                  <ChevronRight size={13} className="opacity-20 shrink-0"/>
                                  <button onClick={e => handleDeleteDetail(e, d.id)} className="opacity-0 group-hover:opacity-60 text-gray-400 hover:text-red-500 transition-opacity p-1 shrink-0"><Trash2 size={14}/></button>
                                </div>
                                {/* 내용 — 클릭해도 에디터로 이동하지 않음 (인라인 편집) */}
                                <textarea
                                  value={d.content || ''}
                                  onChange={e => setDetails(p => p.map(dd => dd.id === d.id ? {...dd, content: e.target.value} : dd))}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="내용을 입력하세요... (클릭하면 바로 작성 가능)"
                                  rows={Math.max(2, Math.ceil((d.content || '').length / 60) + 1)}
                                  className={`w-full px-5 pb-4 pt-1 bg-transparent outline-none resize-none text-sm leading-relaxed opacity-80 placeholder-gray-400`}
                                />
                                {d.teacherFeedback && (
                                  <div className="mx-5 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                                    <span className="font-bold text-emerald-700">선생님 피드백</span>
                                    <span className="ml-2 text-emerald-600 text-xs bg-emerald-100 px-1.5 py-0.5 rounded-full">{d.teacherFeedback.score}점</span>
                                    <p className="text-emerald-700 mt-1 text-xs">{d.teacherFeedback.text}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className={`${currentTheme.panel} px-5 py-3`}>
                              <button
                                onClick={() => {
                                  const n = chDets.length + 1;
                                  setDetails(p => [...p, { id: Date.now(), chapterId: ch.id, index: n.toString(), title: `세부 항목 ${n}`, startPage: 1, endPage: 10, content: '', videoUrl: '' }]);
                                }}
                                className="text-xs font-bold opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1">
                                <Plus size={13}/> 세부 항목 추가
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={handleAddChapter} className={`w-full p-4 rounded-2xl border-2 border-dashed ${currentTheme.border} text-center opacity-50 hover:opacity-100 font-bold flex items-center justify-center gap-2`}>
                      <Plus size={16}/> 챕터 추가
                    </button>
                  </div>
                )}

                {/* ── 마인드맵 에디터 ── */}
                {bookMode === 'mindmap' && (() => {
                  const bkChaps = chapters.filter(c => c.bookId === selectedBook.id);
                  const edges = [];
                  const chNodes = bkChaps.map((ch, ci) => {
                    const chPos = mmChPos(ch, ci, bkChaps.length);
                    const color = MM_COLORS[ci % MM_COLORS.length];
                    edges.push({ fx: MM_CX, fy: MM_CY, tx: chPos.x, ty: chPos.y, color, w: 5 });
                    const dets = details.filter(d => d.chapterId === ch.id);
                    dets.forEach((d, di) => {
                      const dp = mmDetPos(d, di, dets.length, chPos, ci, bkChaps.length);
                      edges.push({ fx: chPos.x, fy: chPos.y, tx: dp.x, ty: dp.y, color, w: 2.5 });
                    });
                    return { ch, chPos, color, ci, dets };
                  });
                  return (
                    <div className="relative">
                      <div ref={mmRef}
                        className={`rounded-2xl border ${currentTheme.border} overflow-auto`}
                        style={{ height: Math.min(MM_H, window.innerHeight - 400) + 'px', minHeight:'360px', maxHeight: MM_H + 'px', cursor: mmDrag?'grabbing':'default', userSelect:'none', background: theme==='dark'?'#0f172a': theme==='sepia'?'#fdf8f0':'#f8fafc' }}
>
                        <div style={{ width:MM_W, height:MM_H, position:'relative' }}>
                          {/* SVG 연결선 */}
                          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
                            <defs>
                              {MM_COLORS.map((c,i) => (
                                <filter key={i} id={`glow-${i}`}>
                                  <feGaussianBlur stdDeviation="2" result="blur"/>
                                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                              ))}
                            </defs>
                            {edges.map((e, i) => {
                              const dx = e.tx - e.fx, dy = e.ty - e.fy;
                              // 유기적 S-곡선: 수직/수평에 따라 다른 느낌
                              const cp1x = e.fx + dx * 0.45 + dy * 0.05;
                              const cp1y = e.fy + dy * 0.05 - dx * 0.05;
                              const cp2x = e.tx - dx * 0.45 + dy * 0.05;
                              const cp2y = e.ty - dy * 0.05 - dx * 0.05;
                              return (
                                <path key={i}
                                  d={`M ${e.fx} ${e.fy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${e.tx} ${e.ty}`}
                                  stroke={e.color} strokeWidth={e.w} fill="none" strokeLinecap="round"
                                  opacity={e.w > 4 ? 0.85 : 0.65}/>
                              );
                            })}
                          </svg>
                          {/* 책 루트 노드 */}
                          <div style={{ position:'absolute', left:MM_CX, top:MM_CY, transform:'translate(-50%,-50%)', zIndex:10 }}>
                            <div className={`${currentTheme.primaryBg} text-white font-black text-base text-center shadow-2xl px-6 py-3 rounded-3xl`}
                              style={{ minWidth:'140px', maxWidth:'180px', lineHeight:'1.3', boxShadow:`0 8px 32px ${theme==='dark'?'#0008':'#0002'}` }}>
                              {(selectedBook.title||'').length > 14 ? selectedBook.title.slice(0,13)+'…' : selectedBook.title}
                            </div>
                          </div>
                          {/* 챕터 + 세부 노드 */}
                          {chNodes.map(({ ch, chPos, color, ci, dets }) => (
                            <div key={ch.id}>
                              {/* 챕터 노드 */}
                              <div style={{ position:'absolute', left:chPos.x, top:chPos.y, transform:'translate(-50%,-50%)', zIndex:8 }}
                                className="group"
                                onMouseDown={e => startMmDrag(e, 'ch', ch.id, chPos)}>
                                <div style={{ background: color, cursor: mmDrag?.id===ch.id?'grabbing':'grab', boxShadow:`0 4px 20px ${color}55` }}
                                  className="rounded-2xl px-5 py-3 shadow-xl min-w-[120px] text-center relative">
                                  {mmEditKey===`ch-${ch.id}` ? (
                                    <input autoFocus value={mmEditText}
                                      onChange={e=>setMmEditText(e.target.value)}
                                      onBlur={mmCommit}
                                      onKeyDown={e=>{if(e.key==='Enter')mmCommit();if(e.key==='Escape')setMmEditKey(null);}}
                                      className="bg-transparent outline-none text-sm font-bold w-full text-center text-white"
                                      onClick={e=>e.stopPropagation()}/>
                                  ) : (
                                    <span className="text-sm font-bold select-none text-white"
                                      onDoubleClick={e=>{e.stopPropagation();setMmEditKey(`ch-${ch.id}`);setMmEditText(ch.title);}}>
                                      {ch.title.length>15?ch.title.slice(0,14)+'…':ch.title}
                                    </span>
                                  )}
                                  {/* 삭제 버튼 */}
                                  <button onClick={e=>{e.stopPropagation();if(window.confirm('이 챕터를 삭제하시겠습니까?')){setChapters(p=>p.filter(c=>c.id!==ch.id));setDetails(p=>p.filter(d=>d.chapterId!==ch.id));}}}
                                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">×</button>
                                  {/* 세부 추가 버튼 */}
                                  <button onClick={e=>{e.stopPropagation();mmAddDet(ch.id);}}
                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{backgroundColor:color}}>+</button>
                                </div>
                              </div>
                              {/* 세부 노드 */}
                              {dets.map((d, di) => {
                                const dp = mmDetPos(d, di, dets.length, chPos, ci, bkChaps.length);
                                return (
                                  <div key={d.id}
                                    style={{ position:'absolute', left:dp.x, top:dp.y, transform:'translate(-50%,-50%)', zIndex:6 }}
                                    className="group"
                                    onMouseDown={e => startMmDrag(e, 'd', d.id, dp)}
                                    onClick={() => { if(!mmMovedRef.current){ setSelectedChapter(ch); setSelectedDetail(d); setViewMode('editor'); } }}>
                                    <div style={{ border:`2.5px solid ${color}`, background:`${color}22`, cursor: mmDrag?.id===d.id?'grabbing':'grab', backdropFilter:'blur(4px)' }}
                                      className="rounded-2xl px-3 py-2 shadow-lg min-w-[90px] text-center relative hover:shadow-xl transition-shadow">
                                      {mmEditKey===`d-${d.id}` ? (
                                        <input autoFocus value={mmEditText}
                                          onChange={e=>setMmEditText(e.target.value)}
                                          onBlur={mmCommit}
                                          onKeyDown={e=>{if(e.key==='Enter')mmCommit();if(e.key==='Escape')setMmEditKey(null);}}
                                          className="bg-transparent outline-none text-xs font-semibold w-full text-center"
                                          style={{color}} onClick={e=>e.stopPropagation()}/>
                                      ) : (
                                        <span className="text-xs font-semibold select-none" style={{color}}
                                          onDoubleClick={e=>{e.stopPropagation();setMmEditKey(`d-${d.id}`);setMmEditText(d.title);}}>
                                          {(()=>{const t=(d.content||'').trim()||d.title;return t.length>18?t.slice(0,17)+'…':t;})()}
                                        </span>
                                      )}
                                      <button onClick={e=>{e.stopPropagation();if(window.confirm('삭제하시겠습니까?'))setDetails(p=>p.filter(dd=>dd.id!==d.id));}}
                                        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">×</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* 챕터 추가 버튼 (캔버스 외부) */}
                      <div className="mt-3 flex justify-center">
                        <button onClick={mmAddCh} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border-2 border-dashed ${currentTheme.border} opacity-60 hover:opacity-100 transition-all`}>
                          <Plus size={15}/> 챕터 추가
                        </button>
                      </div>
                      <p className="text-center text-xs opacity-40 mt-2">드래그로 이동 · 더블클릭으로 이름 수정 · 챕터의 + 버튼으로 세부 항목 추가 · 세부 항목 클릭으로 내용 편집</p>
                    </div>
                  );
                })()}

                {/* ── 독서록 모드 ── */}
                {bookMode === 'journal' && (() => {
                  const j = selectedBook.readingJournal || {};
                  const upJ = (field, val) => updateBook(selectedBook.id, { readingJournal: { ...j, [field]: val } });
                  return (
                    <div className={`rounded-2xl border-2 ${currentTheme.border} overflow-hidden`}>
                      {/* 헤더 */}
                      <div className={`${currentTheme.primaryBg} text-white px-8 py-5`}>
                        <div className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">독서록 · Reading Journal</div>
                        <div className="text-2xl font-black">{selectedBook.title}</div>
                        <div className="text-sm opacity-80 mt-0.5">{selectedBook.author && `저자: ${selectedBook.author}`}</div>
                      </div>
                      <div className={`${currentTheme.panel} px-8 py-6 space-y-6`}>
                        {/* 날짜 + 별점 */}
                        <div className="flex flex-wrap gap-6 items-start">
                          <div>
                            <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-1.5">읽은 날짜</div>
                            <input type="date" value={j.date||''} onChange={e=>upJ('date',e.target.value)}
                              className={`border ${currentTheme.border} rounded-lg px-3 py-1.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-blue-400`}/>
                          </div>
                          <div>
                            <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-1.5">별점</div>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button key={s} onClick={()=>upJ('rating', j.rating===s?0:s)}>
                                  <Star size={24} className={`transition-colors ${s<=(j.rating||0)?'text-yellow-400 fill-yellow-400':'text-gray-300'}`}/>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-1.5">추천 여부</div>
                            <div className="flex gap-2">
                              {[[true,'👍 추천'],[false,'👎 비추천']].map(([v,label])=>(
                                <button key={String(v)} onClick={()=>upJ('recommend',j.recommend===v?null:v)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${j.recommend===v?`${currentTheme.primaryBg} text-white border-transparent`:`${currentTheme.border} opacity-50 hover:opacity-100`}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* 줄거리 요약 */}
                        <div>
                          <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-2">📝 줄거리 요약</div>
                          <textarea value={j.summary||''} onChange={e=>upJ('summary',e.target.value)}
                            placeholder="책의 주요 내용을 간략히 요약해 보세요..."
                            className={`w-full min-h-[100px] border ${currentTheme.border} rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed`}/>
                        </div>
                        {/* 인상 깊은 구절 */}
                        <div>
                          <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-2">💬 인상 깊은 구절</div>
                          <textarea value={j.quote||''} onChange={e=>upJ('quote',e.target.value)}
                            placeholder="마음에 남는 문장이나 구절을 적어보세요..."
                            className={`w-full min-h-[80px] border ${currentTheme.border} rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed italic`}/>
                        </div>
                        {/* 느낀 점 */}
                        <div>
                          <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-2">💭 느낀 점 / 감상</div>
                          <textarea value={j.impression||''} onChange={e=>upJ('impression',e.target.value)}
                            placeholder="책을 읽고 느낀 점, 배운 점, 삶에 어떻게 적용할 것인지 써보세요..."
                            className={`w-full min-h-[120px] border ${currentTheme.border} rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed`}/>
                        </div>
                        {/* 완독 상태 */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${currentTheme.primaryLight} text-sm`}>
                          <span className={`font-bold ${currentTheme.primary}`}>진행률:</span>
                          <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
                            <div style={{width:`${calculateProgress(selectedBook.id)}%`}} className={`h-full ${currentTheme.primaryBg}`}/>
                          </div>
                          <span className={`font-black ${currentTheme.primary}`}>{calculateProgress(selectedBook.id)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
            {viewMode === 'details' && selectedChapter && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col">
                <div className="flex justify-end mb-3">
                  <button onClick={() => {setViewMode('chapters'); setSelectedChapter(null); setSelectedDetail(null);}} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 opacity-50 hover:opacity-100 transition-all">
                    <ChevronLeft size={13}/> 뒤로
                  </button>
                </div>
                <h2 className="text-3xl font-black mb-4 flex items-center gap-2"><span className={currentTheme.primary}>#{selectedChapter.index}</span> <input value={selectedChapter.title} onChange={e=>{const n=e.target.value;setSelectedChapter({...selectedChapter,title:n});setChapters(chapters.map(c=>c.id===selectedChapter.id?{...c,title:n}:c))}} className="bg-transparent outline-none w-full"/></h2>
                <div className="space-y-3">
                  {details.filter(d=>d.chapterId===selectedChapter.id).map(detail=>(
                    <div key={detail.id} onClick={()=>{setSelectedDetail(detail);setViewMode('editor')}} className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.panel} hover:shadow-md cursor-pointer flex justify-between items-center group`}>
                      <span className="font-bold">{detail.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs opacity-50">{detail.startPage}-{detail.endPage}p</span>
                        <button onClick={(e)=>{e.stopPropagation();const v=detail.visibility||'show';const next={show:'private',private:'friends',friends:'show'};setDetails(details.map(d=>d.id===detail.id?{...d,visibility:next[v]}:d));}} className={`p-1 rounded-full transition-all ${(detail.visibility&&detail.visibility!=='show')?'opacity-100':'opacity-0 group-hover:opacity-60'}`}>
                          {detail.visibility==='private'?<Lock size={12} className="text-red-400"/>:detail.visibility==='friends'?<Users size={12} className="text-blue-400"/>:<Globe size={12} className="text-gray-400"/>}
                        </button>
                        <button onClick={(e) => handleDeleteDetail(e, detail.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"><Trash2 size={15}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddDetail} className={`w-full p-4 rounded-xl border-2 border-dashed ${currentTheme.border} opacity-50 hover:opacity-100 font-bold`}>+ 세부 노트 추가</button>
                </div>
              </motion.div>
            )}
            {viewMode === 'editor' && selectedDetail && (
              <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col">
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
                  {selectedDetail.teacherFeedback && (
                    <div className="mt-6 border-t-2 border-emerald-100 pt-5">
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap size={15} className="text-emerald-600"/>
                        <span className="text-xs font-black text-emerald-700">선생님 피드백</span>
                        <span className="ml-auto text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{selectedDetail.teacherFeedback.score}점</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-emerald-900">{selectedDetail.teacherFeedback.text || '(내용 없음)'}</div>
                      <div className="text-[10px] opacity-40 mt-1.5 text-right">{selectedDetail.teacherFeedback.teacherName} 선생님</div>
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
        const closeAll = () => { setShowSocialPanel(false); setSocialViewUserId(null); setSocialViewBookId(null); setSocialViewChapterId(null); };
        const viewUser = socialData.find(u => u.id === socialViewUserId);
        const viewBook = viewUser?.books.find(b => b.id === socialViewBookId);
        const viewChapter = viewUser?.chapters?.find(c => c.id === socialViewChapterId);
        const pendingReceived = (databasesRef.current?.__meta?.friends || []).filter(f => f.status === 'received');

        // 헤더 뒤로가기 핸들러
        const handleBack = () => {
          if (socialViewChapterId) { setSocialViewChapterId(null); return; }
          if (socialViewBookId) { setSocialViewBookId(null); return; }
          setSocialViewUserId(null);
        };

        // 헤더 제목 결정
        const headerTitle = viewChapter ? viewChapter.title
          : viewBook ? viewBook.title
          : viewUser ? viewUser.displayName
          : null;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeAll}>
            <div className={`${currentTheme.panel} ${currentTheme.text} rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>

              {/* 헤더 */}
              <div className={`px-6 py-4 border-b ${currentTheme.border} flex items-center gap-2 shrink-0`}>
                {(socialViewUserId || socialViewBookId || socialViewChapterId) && (
                  <button onClick={handleBack} className="p-1.5 rounded-full hover:bg-black/5 mr-1 shrink-0"><ChevronLeft size={18}/></button>
                )}
                <div className="flex-1 font-black text-base flex items-center gap-2 min-w-0">
                  {headerTitle ? (
                    <><div className={`w-7 h-7 rounded-full ${currentTheme.primaryBg} flex items-center justify-center text-white text-xs font-black shrink-0`}>{(viewUser?.displayName||'?')[0]}</div><span className="truncate">{headerTitle}</span></>
                  ) : <><Users size={18}/> 다른 독자</>}
                </div>
                {pendingReceived.length > 0 && !socialViewUserId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shrink-0">{pendingReceived.length}개 요청</span>
                )}
                <button onClick={closeAll} className="text-xs opacity-40 hover:opacity-100 px-2 py-1 rounded-lg hover:bg-black/5 ml-1 shrink-0">닫기</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isSocialLoading ? (
                  <div className="flex items-center justify-center h-32 text-sm opacity-40 animate-pulse">불러오는 중...</div>

                ) : socialViewChapterId && viewChapter ? (
                  /* ── 레벨 3: 노트 읽기 뷰 ── */
                  <div className="space-y-4">
                    {(() => {
                      const chapterDetails = viewUser.details?.filter(d => d.chapterId === socialViewChapterId) || [];
                      if (chapterDetails.length === 0) return <div className="text-sm opacity-40 text-center py-10">공개된 노트가 없습니다.</div>;
                      return chapterDetails.map((d, i) => (
                        <div key={i} className={`p-5 rounded-2xl border ${currentTheme.border}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-black text-base">{d.title}</h3>
                            <span className="text-xs opacity-40">{d.startPage}–{d.endPage}p</span>
                          </div>
                          <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{d.content || '(내용 없음)'}</p>
                        </div>
                      ));
                    })()}
                  </div>

                ) : socialViewBookId && viewBook ? (
                  /* ── 레벨 2: 챕터 목록 ── */
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      {viewBook.coverUrl
                        ? <img src={viewBook.coverUrl} className="w-14 h-20 object-contain rounded-lg shadow" alt=""/>
                        : <div className={`w-14 h-20 rounded-lg ${currentTheme.primaryLight} flex items-center justify-center`}><Book size={22} className="opacity-30"/></div>
                      }
                      <div>
                        <div className="font-black text-lg leading-snug">{viewBook.title}</div>
                        {viewBook.author && <div className="text-sm opacity-50 mt-0.5">{viewBook.author}</div>}
                      </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">챕터 목록</div>
                    {(() => {
                      const bookChapters = viewUser.chapters?.filter(c => c.bookId === socialViewBookId) || [];
                      if (bookChapters.length === 0) return <div className="text-sm opacity-40 text-center py-8">공개된 챕터가 없습니다.</div>;
                      return (
                        <div className="space-y-2">
                          {bookChapters.map((c, i) => {
                            const noteCount = viewUser.details?.filter(d => d.chapterId === c.id).length || 0;
                            return (
                              <div key={i} onClick={() => setSocialViewChapterId(c.id)} className={`flex items-center gap-4 p-4 rounded-xl border ${currentTheme.border} hover:border-blue-300 cursor-pointer hover:shadow-sm transition-all group`}>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${currentTheme.primaryLight} ${currentTheme.primary} shrink-0`}>{c.index}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold">{c.title}</div>
                                  <div className="text-xs opacity-40">노트 {noteCount}개</div>
                                </div>
                                <ChevronRight size={16} className="opacity-30"/>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                ) : socialViewUserId && viewUser ? (
                  /* ── 레벨 1: 프로필 + 책 목록 ── */
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-16 h-16 rounded-2xl ${currentTheme.primaryBg} flex items-center justify-center text-white text-3xl font-black`}>{viewUser.displayName[0]}</div>
                      <div className="flex-1">
                        <div className="font-black text-xl">{viewUser.displayName}</div>
                        <div className="text-xs opacity-40 mt-0.5">공개 책 {viewUser.books.length}권</div>
                      </div>
                      {viewUser.friendStatus === 'none' && <button onClick={() => sendFriendRequest(viewUser.id)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600"><UserPlus size={13}/> 친구 추가</button>}
                      {viewUser.friendStatus === 'sent' && <span className="text-xs font-bold px-3 py-2 rounded-xl bg-black/5 opacity-50">요청 보냄</span>}
                      {viewUser.friendStatus === 'received' && <button onClick={() => acceptFriendRequest(viewUser.id)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"><UserCheck size={13}/> 수락하기</button>}
                      {viewUser.friendStatus === 'accepted' && <span className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-600 border border-green-200"><UserCheck size={13}/> 친구</span>}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">읽은 책</div>
                    {viewUser.books.length === 0 ? (
                      <div className="text-sm opacity-40 text-center py-10">{viewUser.friendStatus === 'accepted' ? '공개된 책이 없습니다.' : '친구가 되면 더 많은 책을 볼 수 있어요.'}</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {viewUser.books.map((b, i) => {
                          const chCount = viewUser.chapters?.filter(c => c.bookId === b.id).length || 0;
                          return (
                            <div key={i} onClick={() => setSocialViewBookId(b.id)} className={`flex gap-3 p-3 rounded-xl border ${currentTheme.border} hover:border-blue-300 cursor-pointer hover:shadow-sm transition-all`}>
                              {b.coverUrl
                                ? <img src={b.coverUrl} className="w-10 h-14 object-contain rounded shrink-0" alt=""/>
                                : <div className={`w-10 h-14 rounded ${currentTheme.primaryLight} flex items-center justify-center shrink-0`}><Book size={14} className="opacity-30"/></div>
                              }
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="font-bold text-xs leading-snug line-clamp-2">{b.title}</div>
                                  {b.author && <div className="text-[10px] opacity-40 truncate mt-0.5">{b.author}</div>}
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] opacity-40">챕터 {chCount}개</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${b.visibility==='public'?'bg-green-100 text-green-600':'bg-blue-100 text-blue-600'}`}>{b.visibility==='public'?'공개':'친구'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                ) : (
                  /* ── 레벨 0: 유저 목록 ── */
                  <div className="space-y-2">
                    {pendingReceived.map(req => {
                      const reqUser = socialData.find(u => u.id === req.id);
                      if (!reqUser) return null;
                      return (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-black shrink-0">{reqUser.displayName[0]}</div>
                          <div className="flex-1 text-sm min-w-0"><span className="font-bold">{reqUser.displayName}</span><span className="opacity-60"> 님이 친구 요청을 보냈습니다</span></div>
                          <button onClick={() => acceptFriendRequest(req.id)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600 shrink-0">수락</button>
                        </div>
                      );
                    })}
                    {socialData.length === 0 ? (
                      <div className="text-center text-sm opacity-40 py-10">다른 독자가 없습니다.</div>
                    ) : socialData.map(user => (
                      <div key={user.id} onClick={() => { setSocialViewUserId(user.id); setSocialViewBookId(null); setSocialViewChapterId(null); }} className={`flex items-center gap-3 p-3 rounded-xl border ${currentTheme.border} hover:border-blue-300 cursor-pointer hover:shadow-sm transition-all`}>
                        <div className={`w-11 h-11 rounded-xl ${currentTheme.primaryBg} flex items-center justify-center text-white font-black text-lg shrink-0`}>{user.displayName[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold">{user.displayName}</div>
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

      {/* ── 학생: 선생님 패널 모달 ── */}
      {showTeacherPanel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTeacherPanel(false)}>
          <div className={`${currentTheme.panel} ${currentTheme.text} rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className={`px-6 py-4 border-b ${currentTheme.border} flex items-center gap-3 shrink-0 bg-emerald-600 text-white`}>
              <GraduationCap size={20}/>
              <span className="font-black text-base flex-1">선생님 공간</span>
              <button onClick={() => setShowTeacherPanel(false)} className="text-white/60 hover:text-white text-xs font-bold px-2 py-1 rounded-lg">닫기</button>
            </div>
            {/* 탭 */}
            <div className={`flex gap-1 p-2 shrink-0`} style={{background:'rgba(0,0,0,0.04)'}}>
              {[['announcements','📢 공지사항'],['materials','📚 예시 자료'],['message','💬 선생님과 대화']].map(([key, label]) => (
                <button key={key} onClick={() => setTeacherPanelTab(key)} className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-all ${teacherPanelTab===key ? 'bg-emerald-600 text-white shadow' : 'opacity-50 hover:opacity-80'}`}>{label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {isTeacherInfoLoading ? (
                <div className="flex items-center justify-center h-24 text-sm opacity-40 animate-pulse">불러오는 중...</div>
              ) : !teacherInfo ? (
                <div className="text-center py-10 opacity-40"><p className="font-bold">선생님 정보를 찾을 수 없습니다.</p><p className="text-sm mt-1">학급 코드가 올바른지 확인하세요.</p></div>
              ) : (
                <>
                  {/* 공지사항 탭 */}
                  {teacherPanelTab === 'announcements' && (
                    <div className="space-y-3">
                      {teacherInfo.announcements.length === 0 ? (
                        <div className="text-sm opacity-40 text-center py-10">등록된 공지사항이 없습니다.</div>
                      ) : teacherInfo.announcements.map(ann => (
                        <div key={ann.id} className={`p-4 rounded-2xl border ${currentTheme.border}`}>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">{ann.text}</div>
                          <div className="text-[10px] opacity-30 mt-2">{new Date(ann.ts).toLocaleString('ko-KR')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 예시 자료 탭 — 책 카드 스타일 */}
                  {teacherPanelTab === 'materials' && (
                    <div>
                      {teacherInfo.materials.length === 0 ? (
                        <div className="text-sm opacity-40 text-center py-10">등록된 예시 자료가 없습니다.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {teacherInfo.materials.map(mat => (
                            <div key={mat.id} className={`rounded-2xl border ${currentTheme.border} shadow-sm overflow-hidden flex flex-col`}>
                              <div className="h-28 shrink-0 overflow-hidden">
                                {mat.url && getYoutubeId(mat.url)
                                  ? <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYoutubeId(mat.url)}`} title="material" allowFullScreen className="w-full h-full"/>
                                  : <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center"><Book size={28} className="text-white opacity-40"/></div>
                                }
                              </div>
                              <div className={`flex-1 p-3 ${currentTheme.panel}`}>
                                {mat.title && <div className="font-black text-sm mb-1">{mat.title}</div>}
                                {mat.content && <p className="text-xs opacity-60 leading-relaxed line-clamp-3 whitespace-pre-wrap">{mat.content}</p>}
                                {mat.url && !getYoutubeId(mat.url) && <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs flex items-center gap-1 hover:underline mt-1"><ExternalLink size={10}/> 링크</a>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* 메시지 탭 */}
                  {teacherPanelTab === 'message' && (
                    <div className="flex flex-col h-full" style={{minHeight:'300px'}}>
                      <div className="flex-1 space-y-2 mb-3 overflow-y-auto" style={{maxHeight:'340px'}}>
                        {teacherInfo.messages.length === 0 ? (
                          <div className="text-xs opacity-30 text-center py-8">선생님과의 대화가 없습니다.</div>
                        ) : teacherInfo.messages.map((m, i) => (
                          <div key={i} className={`flex ${m.from === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                            {m.from !== currentUser.id && <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-black mr-2 shrink-0 self-end">T</div>}
                            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.from === currentUser.id ? 'bg-emerald-600 text-white rounded-tr-sm' : `${currentTheme.panel} border ${currentTheme.border} rounded-tl-sm`}`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-3 border-t" style={{borderColor:'rgba(0,0,0,0.1)'}}>
                        <input
                          value={messageDraft}
                          onChange={e => setMessageDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && teacherInfo) sendMessage(teacherInfo.id); }}
                          placeholder="선생님께 메시지 보내기..."
                          className={`flex-1 text-sm p-3 rounded-xl border ${currentTheme.border} bg-transparent outline-none focus:border-emerald-500`}
                        />
                        <button onClick={() => teacherInfo && sendMessage(teacherInfo.id)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shrink-0">전송</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
