# BookNote - 나만의 클라우드 서재

책 읽기 기록을 클라우드에 저장하고 관리하는 웹 앱입니다.

🌐 **배포 사이트**: https://coding-book-note-20260226.vercel.app

## 주요 기능

### 인증
- 이름 + 비밀번호로 회원가입 / 로그인
- 브라우저를 닫아도 로그인 상태 유지
- 사용자별 데이터 완전 분리

### 서재 (Shelf)
- 카카오 도서 검색 API로 책 정보 자동 입력
  - 제목, 저자, 표지 이미지, 출판사, 출판일, 판매가, 줄거리
  - 도서 정보 페이지 링크 연결
- 직접 입력으로 책 추가 가능
- 읽기 진행률 % 표시
- 책 카드 hover 시 수정 / 삭제 버튼
- 장르별 분류 및 드래그 앤 드롭으로 장르 변경

### 챕터 / 노트
- 책 → 챕터 → 세부 노트 계층 구조
- 페이지 범위 기반 진행률 자동 계산
- 유튜브 영상 연결 가능

### 기타
- 라이트 / 다크 / 세피아 테마
- 2초 디바운스 자동 저장 (Supabase 클라우드)
- 노트 내 전체 검색
- 맞춤법 검사

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Frontend | React 19, Framer Motion, Lucide React, Tailwind CSS |
| Backend | Supabase (PostgreSQL) |
| 도서 검색 | 카카오 도서 검색 API |

## Supabase 테이블 구조

```sql
-- 사용자 계정
CREATE TABLE booknote_users (
  id TEXT PRIMARY KEY,           -- 이름 (로그인 ID)
  password_hash TEXT NOT NULL,   -- SHA-256 해시
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 책/챕터/노트 데이터 (사용자별 1행)
CREATE TABLE booknote_saves (
  id TEXT PRIMARY KEY,   -- 사용자 ID
  data JSONB             -- 전체 서재 데이터
);
```

## 환경 변수 설정

`booknote/.env.local` 파일 생성 후 아래 내용 입력:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_KAKAO_API_KEY=your_kakao_rest_api_key
```

## 실행 방법

```bash
cd booknote
npm install
npm start
```

브라우저에서 `http://localhost:3000` 접속

## 데이터 구조

```
databases: {
  [libraryName]: {
    books: [ { id, title, author, totalPages, status, category[], coverUrl, videoUrl,
               publisher, publishedDate, contents, salePrice, url } ],
    chapters: [ { id, bookId, index, title, videoUrl } ],
    details: [ { id, chapterId, index, title, startPage, endPage, content, videoUrl } ],
    customGenres: [ string ]
  }
}
```
