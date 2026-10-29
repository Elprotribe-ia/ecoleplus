PRAGMA foreign_keys = ON;

-- Each school has its own profile, settings and users in the shared D1 database.
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school_type TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL,
  currency TEXT NOT NULL,
  annual_fee INTEGER NOT NULL DEFAULT 0 CHECK(annual_fee >= 0),
  grade_scale REAL NOT NULL DEFAULT 20 CHECK(grade_scale > 0),
  levels_json TEXT NOT NULL DEFAULT '[]',
  student_id_prefix TEXT NOT NULL DEFAULT 'EP',
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, email)
);

CREATE TABLE IF NOT EXISTS school_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  teacher_name TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name, school_year)
);
CREATE INDEX IF NOT EXISTS idx_classes_school ON school_classes(school_id, school_year);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  weekday TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_timetable_school_class ON timetable_entries(school_id, class_id, weekday);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  matricule TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_names TEXT NOT NULL,
  birth_date TEXT,
  birth_place TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT '',
  class_id INTEGER REFERENCES school_classes(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL DEFAULT '',
  parent_relation TEXT NOT NULL DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  parent_email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  annual_fee INTEGER NOT NULL DEFAULT 0 CHECK(annual_fee >= 0),
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, matricule)
);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_students_school_name ON students(school_id, last_name, first_names);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES school_classes(id) ON DELETE SET NULL,
  attendance_date TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('Présente','Absent','Retard','Excusé')),
  note TEXT NOT NULL DEFAULT '',
  recorded_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, student_id, attendance_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, attendance_date, class_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_id INTEGER REFERENCES school_classes(id) ON DELETE SET NULL,
  term TEXT NOT NULL DEFAULT '',
  coefficient REAL NOT NULL DEFAULT 1,
  max_score REAL NOT NULL DEFAULT 20,
  evaluation_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evaluations_school_class ON evaluations(school_id, class_id);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score REAL,
  comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Brouillon',
  UNIQUE(school_id, evaluation_id, student_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by TEXT NOT NULL DEFAULT '',
  UNIQUE(school_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_payments_school_student ON payments(school_id, student_id, paid_at);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'Parents',
  class_id INTEGER REFERENCES school_classes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Brouillon',
  scheduled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_school_date ON activity_log(school_id, created_at);
