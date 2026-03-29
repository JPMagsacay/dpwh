-- Run with: mysql -u root -p < database/scripts/create_dpwh_database.sql
-- Creates the application database with full Unicode support (names, addresses, etc.)

CREATE DATABASE IF NOT EXISTS `dpwh`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
