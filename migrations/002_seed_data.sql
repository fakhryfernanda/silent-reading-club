-- Silent Reading Club - Seed Data
-- Migration: 002_seed_data
-- Jalankan untuk populate database dengan data dummy (optional untuk dev)

INSERT INTO members (wa_phone, display_name) VALUES
  ('+628111111111', 'Budi'),
  ('+628222222222', 'Rina'),
  ('+628333333333', 'Ayu');

INSERT INTO books (title, author, type) VALUES
  ('Atomic Habits', 'James Clear', 'Nonfiksi'),
  ('Sapiens', 'Yuval Noah Harari', 'Nonfiksi'),
  ('Deep Work', 'Cal Newport', 'Nonfiksi');

INSERT INTO notes (member_id, book_id, content, sort_order) VALUES
  (
    (SELECT id FROM members WHERE display_name = 'Budi'),
    (SELECT id FROM books WHERE title = 'Atomic Habits'),
    'Habit stacking itu mind-blowing — tumpuk kebiasaan baru di atas yang lama yang sudah ada.',
    1
  ),
  (
    (SELECT id FROM members WHERE display_name = 'Rina'),
    (SELECT id FROM books WHERE title = 'Atomic Habits'),
    'Identity-based habits: bukan "aku mau lari" tapi "aku adalah orang yang aktif". Framing identitas dulu, baru behavior ngikutin.',
    2
  ),
  (
    (SELECT id FROM members WHERE display_name = 'Budi'),
    (SELECT id FROM books WHERE title = 'Atomic Habits'),
    'You do not rise to the level of your goals. You fall to the level of your systems.',
    3
  ),
  (
    (SELECT id FROM members WHERE display_name = 'Ayu'),
    (SELECT id FROM books WHERE title = 'Atomic Habits'),
    'Two-minute rule: bikin versi 2 menit dari kebiasaan baru. Bukan "baca 30 menit" tapi "buka buku". Entry barrier jadi kecil banget.',
    4
  ),
  (
    (SELECT id FROM members WHERE display_name = 'Rina'),
    (SELECT id FROM books WHERE title = 'Sapiens'),
    'Revolusi kognitif bukan soal otak yang lebih besar, tapi fiksi bersama yang kita percaya.',
    1
  ),
  (
    (SELECT id FROM members WHERE display_name = 'Budi'),
    (SELECT id FROM books WHERE title = 'Deep Work'),
    'Shallow work yang terasa produktif justru melatih otak untuk tidak fokus.',
    1
  );
