"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react"

export default function SetupPage() {
  const [copied, setCopied] = useState(false)

  const sqlScript = `-- Create users table
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
);`

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Database Setup Required</CardTitle>
          <CardDescription>Initialize your Supabase database to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Follow these steps to initialize your database:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your Supabase dashboard</li>
                <li>Open the SQL Editor</li>
                <li>Copy the SQL script below</li>
                <li>Paste and run it in the SQL Editor</li>
                <li>Refresh this page and proceed to registration</li>
              </ol>
            </div>
          </div>

          {/* SQL Script Display */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">SQL Migration Script:</label>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-64 text-xs font-mono">
              <pre>{sqlScript}</pre>
            </div>
          </div>

          {/* Copy Button */}
          <Button onClick={handleCopy} variant="outline" className="w-full bg-transparent" size="lg">
            <Copy className="w-4 h-4 mr-2" />
            {copied ? "Copied to clipboard!" : "Copy SQL Script"}
          </Button>

          {/* Supabase Link */}
          <Button asChild className="w-full" size="lg">
            <a
              href="https://app.supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Supabase Dashboard
            </a>
          </Button>

          {/* Navigation */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => (window.location.href = "/")}>
              Back to Home
            </Button>
            <Button className="flex-1" onClick={() => (window.location.href = "/auth/patient-login")}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              I've Set Up Database
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
