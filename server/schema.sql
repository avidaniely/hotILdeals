CREATE DATABASE IF NOT EXISTS hotildeals;
USE hotildeals;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  merchant VARCHAR(255),
  url TEXT NOT NULL,
  image_path VARCHAR(500),
  category_id INT,
  temperature FLOAT DEFAULT 0,
  hot_votes INT DEFAULT 0,
  cold_votes INT DEFAULT 0,
  trend_score FLOAT DEFAULT 0,
  hottest_score FLOAT DEFAULT 0,
  user_id INT,
  source ENUM('user','scraper') DEFAULT 'user',
  status ENUM('active','expired','hidden') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deal_id INT NOT NULL,
  vote_type ENUM('hot','cold') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (user_id, deal_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_votes_created_deal ON votes (created_at, deal_id, vote_type);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned TINYINT(1) DEFAULT 0;

CREATE TABLE IF NOT EXISTS messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sender_id    INT NOT NULL,
  receiver_id  INT NOT NULL,
  body         TEXT NOT NULL,
  is_read      TINYINT(1) DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_msg_receiver (receiver_id, is_read),
  INDEX idx_msg_thread   (sender_id, receiver_id, created_at)
);

INSERT IGNORE INTO categories (name, slug, icon) VALUES
  ('אלקטרוניקה', 'electronics', '💻'),
  ('אופנה', 'fashion', '👗'),
  ('בית וגינה', 'home-garden', '🏠'),
  ('מזון ומשקאות', 'food-drink', '🍔'),
  ('תיירות', 'travel', '✈️'),
  ('בילוי ופנאי', 'entertainment', '🎬'),
  ('ספורט', 'sports', '⚽'),
  ('אחר', 'other', '🏷️');
