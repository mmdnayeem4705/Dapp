# Database Setup Instructions

## Important: Initialize Your Database First

Before you can use the Doctor Appointment Booking application, you need to initialize the Supabase database with the required tables and policies.

### Steps to Initialize:

1. **Go to your Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration Script**
   - Open the file: `scripts/01-init-database.sql`
   - Copy all the SQL code
   - Paste it into the Supabase SQL Editor

4. **Execute the Script**
   - Click the "Run" button (or press Ctrl+Enter)
   - Wait for the script to complete successfully
   - You should see a success message

5. **Verify the Tables**
   - Go to the "Table Editor" in Supabase
   - You should see these tables:
     - `users`
     - `doctors`
     - `patients`
     - `appointments`

### After Setup:

Once the database is initialized, you can:
- Register as a patient
- Register as a doctor
- Book appointments
- Process payments via MetaMask

### Troubleshooting:

If you see an error like "Could not find the table 'public.users'":
- Make sure you've run the migration script
- Check that all SQL executed without errors
- Refresh the page and try again

If you see "Database not initialized" error in the app:
- Go back to step 1 and run the migration script again
- Make sure you're using the correct Supabase project
