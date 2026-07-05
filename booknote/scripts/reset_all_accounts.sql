-- BookNote: 모든 계정 + 데이터 전체 삭제 (되돌릴 수 없음)
-- 실행 전 반드시 Supabase 대시보드 > Database > Backups 에서 백업을 확인하세요.
-- Supabase 대시보드 > SQL Editor 에서 아래 내용을 실행하세요.

BEGIN;

-- 1) 서재/책/챕터/노트 데이터 전체 삭제
DELETE FROM booknote_saves;

-- 2) 회원 계정 전체 삭제
DELETE FROM booknote_users;

COMMIT;

-- 삭제 후 확인용 (0건이어야 정상)
-- SELECT COUNT(*) FROM booknote_saves;
-- SELECT COUNT(*) FROM booknote_users;
