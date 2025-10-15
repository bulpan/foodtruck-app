-- Food Truck 데이터베이스 초기화 스크립트

-- 데이터베이스 생성 (이미 생성되어 있다면 에러 무시)
CREATE DATABASE IF NOT EXISTS foodtruck_db;

-- 사용자 생성 (이미 있다면 에러 무시)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'foodtruck_admin') THEN
        CREATE USER foodtruck_admin WITH PASSWORD 'foodtruck_password';
    END IF;
END
$$;

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE foodtruck_db TO foodtruck_admin;

-- 데이터베이스 연결 (SQL은 아니므로 실제 환경에서는 Node.js 스크립트로 처리)
-- 이 파일은 참고용이므로 실제 초기화는 Sequelize models로 처리됩니다.


