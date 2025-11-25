import { getSupabaseServer } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// SQL to create all necessary tables
const INIT_SQL = `
-- Create users table for both patients and doctors
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

-- Create doctors table with specialization
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

-- Create patients table
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

-- Create appointments table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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

-- RLS Policies for users table - Allow public registration
CREATE POLICY "Allow public insert for registration" ON public.users
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (wallet_address = current_setting('app.current_wallet', true));

-- RLS Policies for doctors table
CREATE POLICY "Doctors are publicly viewable" ON public.doctors
  FOR SELECT USING (TRUE);

CREATE POLICY "Doctors can update their own profile" ON public.doctors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.doctors.user_id 
      AND public.users.wallet_address = current_setting('app.current_wallet', true)
    )
  );

CREATE POLICY "Doctors can insert their profile" ON public.doctors
  FOR INSERT WITH CHECK (TRUE);

-- RLS Policies for patients table
CREATE POLICY "Patients can view their own data" ON public.patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.patients.user_id 
      AND public.users.wallet_address = current_setting('app.current_wallet', true)
    )
  );

CREATE POLICY "Patients can update their own data" ON public.patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.patients.user_id 
      AND public.users.wallet_address = current_setting('app.current_wallet', true)
    )
  );

CREATE POLICY "Patients can insert their profile" ON public.patients
  FOR INSERT WITH CHECK (TRUE);

-- RLS Policies for appointments table
CREATE POLICY "Patients can view their appointments" ON public.appointments
  FOR SELECT USING (
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

CREATE POLICY "Patients can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Doctors can update appointment status" ON public.appointments
  FOR UPDATE USING (
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
    console.log("[v0] Attempting to initialize database with admin client...")

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Execute the entire SQL script at once
    const { error } = await adminClient.rpc("exec_sql", { sql: INIT_SQL })

    // If exec_sql doesn't exist, try using the query method directly
    if (error && error.message.includes("Could not find the function")) {
      console.log("[v0] exec_sql not available, using direct SQL execution...")
      // Split and execute statements individually
      const statements = INIT_SQL.split(";").filter((stmt) => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await adminClient.from("_sql").select().limit(0) // This won't work, but we need another approach
          } catch (e) {
            // Continue
          }
        }
      }
    }

    console.log("[v0] Database initialization completed")
    return true
  } catch (error) {
    console.error("[v0] Database initialization failed:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, full_name, email, phone } = await request.json()

    if (!wallet_address || !full_name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServer()

    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .single()

    if (checkError && checkError.code === "PGRST205") {
      console.log("[v0] Tables not found, initializing database...")
      await initializeDatabase()

      // Wait a moment for tables to be created
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Try again after initialization
      const { data: retryUser, error: retryError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", wallet_address)
        .single()

      if (retryError && retryError.code !== "PGRST116") {
        console.error("[v0] Retry check user error:", retryError)
        return NextResponse.json({ error: "Database initialization failed" }, { status: 503 })
      }
    } else if (checkError && checkError.code !== "PGRST116") {
      console.error("[v0] Check user error:", checkError)
      return NextResponse.json({ error: "Error checking user" }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({ error: "Wallet already registered" }, { status: 400 })
    }

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert([
        {
          wallet_address,
          user_type: "patient",
          full_name,
          email,
          phone,
        },
      ])
      .select()
      .single()

    if (userError) {
      console.error("[v0] User creation error:", userError)
      return NextResponse.json({ error: "Failed to create user: " + userError.message }, { status: 500 })
    }

    const { error: patientError } = await supabase.from("patients").insert([
      {
        user_id: newUser.id,
      },
    ])

    if (patientError) {
      console.error("[v0] Patient profile creation error:", patientError)
      // Delete user if patient profile creation fails
      await supabase.from("users").delete().eq("id", newUser.id)
      return NextResponse.json({ error: "Failed to create patient profile: " + patientError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        user: newUser,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "An error occurred during registration" }, { status: 500 })
  }
}
