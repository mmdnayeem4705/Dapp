import { getSupabaseServer } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const walletAddress = request.headers.get("x-wallet-address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, user_type")
      .eq("wallet_address", walletAddress)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let appointments

    if (user.user_type === "patient") {
      // Get patient appointments
      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single()

      if (!patient) {
        return NextResponse.json({ appointments: [] })
      }

      const { data } = await supabase
        .from("appointments")
        .select(
          `
          id,
          doctor_id,
          appointment_date,
          status,
          symptoms,
          description,
          consultation_fee,
          payment_status,
          doctor:doctors(
            specialization,
            user:users(full_name, wallet_address)
          )
        `,
        )
        .eq("patient_id", patient.id)
        .order("appointment_date", { ascending: false })

      appointments = data
    } else {
      // Get doctor appointments
      const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()

      if (!doctor) {
        return NextResponse.json({ appointments: [] })
      }

      const { data } = await supabase
        .from("appointments")
        .select(
          `
          id,
          patient_id,
          appointment_date,
          status,
          symptoms,
          description,
          consultation_fee,
          payment_status,
          patient:patients(
            user:users(full_name),
            gender,
            blood_group
          )
        `,
        )
        .eq("doctor_id", doctor.id)
        .order("appointment_date", { ascending: true })

      appointments = data
    }

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const body = await request.json()
    const walletAddress = request.headers.get("x-wallet-address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get patient
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single()

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert([
        {
          patient_id: patient.id,
          doctor_id: body.doctor_id,
          appointment_date: body.appointment_date,
          symptoms: body.symptoms,
          description: body.description,
          consultation_fee: body.consultation_fee,
          status: "pending",
          payment_status: "pending",
        },
      ])
      .select()
      .single()

    if (appointmentError) {
      return NextResponse.json({ error: "Failed to create appointment" }, { status: 400 })
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error("Error creating appointment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const body = await request.json()
    const walletAddress = request.headers.get("x-wallet-address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, user_type")
      .eq("wallet_address", walletAddress)
      .single()

    if (userError || !user || user.user_type !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get doctor
    const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user.id).single()

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    // Verify appointment belongs to doctor
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", body.appointment_id)
      .eq("doctor_id", doctor.id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Update appointment status
    const { data: updatedAppointment, error: updateError } = await supabase
      .from("appointments")
      .update({ status: body.status })
      .eq("id", body.appointment_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Failed to update appointment" }, { status: 400 })
    }

    return NextResponse.json({ appointment: updatedAppointment })
  } catch (error) {
    console.error("Error updating appointment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
