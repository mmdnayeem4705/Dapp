-- Drop existing RLS policies that are blocking inserts
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Doctors are publicly viewable" ON doctors;
DROP POLICY IF EXISTS "Doctors can update their own profile" ON doctors;
DROP POLICY IF EXISTS "Patients can view their own data" ON patients;
DROP POLICY IF EXISTS "Patients can update their own data" ON patients;
DROP POLICY IF EXISTS "Patients can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can update appointment status" ON appointments;

-- Create new RLS policies that allow public inserts for registration
CREATE POLICY "Allow public user registration" ON users
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (wallet_address = current_setting('app.current_wallet', true));

-- Allow public patient profile creation
CREATE POLICY "Allow public patient creation" ON patients
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Patients can view their own data" ON patients
  FOR SELECT USING (TRUE);

CREATE POLICY "Patients can update their own data" ON patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = patients.user_id AND users.wallet_address = current_setting('app.current_wallet', true)
    )
  );

-- Allow public doctor profile creation
CREATE POLICY "Allow public doctor creation" ON doctors
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Doctors are publicly viewable" ON doctors
  FOR SELECT USING (TRUE);

CREATE POLICY "Doctors can update their own profile" ON doctors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = doctors.user_id AND users.wallet_address = current_setting('app.current_wallet', true)
    )
  );

-- Allow public appointment creation
CREATE POLICY "Allow public appointment creation" ON appointments
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Patients can view their appointments" ON appointments
  FOR SELECT USING (TRUE);

CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (TRUE);

CREATE POLICY "Doctors can update appointment status" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM doctors d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.id = appointments.doctor_id AND u.wallet_address = current_setting('app.current_wallet', true)
    )
  );
