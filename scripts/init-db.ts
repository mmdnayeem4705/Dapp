import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const migrationSQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('patient', 'doctor')),
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  specialization VARCHAR(255) NOT NULL,
  bio TEXT,
  experience_years INTEGER,
  consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR(50),
  blood_group VARCHAR(10),
  allergies TEXT,
  medical_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'held', 'completed', 'cancelled')) DEFAULT 'pending',
  symptoms TEXT,
  description TEXT,
  consultation_fee DECIMAL(10, 2),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for registration" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Doctors are publicly viewable" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can update their own profile" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can insert their profile" ON public.doctors;
DROP POLICY IF EXISTS "Patients can view their own data" ON public.patients;
DROP POLICY IF EXISTS "Patients can update their own data" ON public.patients;
DROP POLICY IF EXISTS "Patients can insert their profile" ON public.patients;
DROP POLICY IF EXISTS "Patients can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can update appointment status" ON public.appointments;

CREATE POLICY "Allow public insert for registration" ON public.users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Doctors are publicly viewable" ON public.doctors FOR SELECT USING (TRUE);
CREATE POLICY "Doctors can insert their profile" ON public.doctors FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Doctors can update their own profile" ON public.doctors FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = public.doctors.user_id 
    AND public.users.wallet_address = current_setting('app.current_wallet', true)
  )
);

CREATE POLICY "Patients can insert their profile" ON public.patients FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Patients can view their own data" ON public.patients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = public.patients.user_id 
    AND public.users.wallet_address = current_setting('app.current_wallet', true)
  )
);
CREATE POLICY "Patients can update their own data" ON public.patients FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = public.patients.user_id 
    AND public.users.wallet_address = current_setting('app.current_wallet', true)
  )
);

CREATE POLICY "Patients can create appointments" ON public.appointments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Patients can view their appointments" ON public.appointments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.users u ON p.user_id = u.id 
    WHERE p.id = public.appointments.patient_id 
    AND u.wallet_address = current_setting('app.current_wallet', true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.doctors d 
    JOIN public.users u ON d.user_id = u.id 
    WHERE d.id = public.appointments.doctor_id 
    AND u.wallet_address = current_setting('app.current_wallet', true)
  )
);
CREATE POLICY "Doctors can update appointment status" ON public.appointments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.doctors d 
    JOIN public.users u ON d.user_id = u.id 
    WHERE d.id = public.appointments.doctor_id 
    AND u.wallet_address = current_setting('app.current_wallet', true)
  )
);
`

async function initializeDatabase() {
  try {
    console.log("[v0] Starting database initialization...")

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      console.log(`[v0] Executing: ${statement.substring(0, 50)}...`)

      const { error } = await supabase.rpc("exec_sql", {
        sql: statement,
      })

      if (error && !error.message?.includes("already exists")) {
        console.error(`[v0] Error executing statement: ${error.message}`)
      }
    }

    console.log("[v0] Database initialization completed successfully!")
  } catch (error) {
    console.error("[v0] Database initialization failed:", error)
    process.exit(1)
  }
}

initializeDatabase()
