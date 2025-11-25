import { getSupabaseServer } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await getSupabaseServer()
    const body = await request.json()
    const appointmentId = params.id

    // Update appointment with payment details
    const { data: appointment, error: updateError } = await supabase
      .from("appointments")
      .update({
        payment_status: "completed",
        transaction_hash: body.transaction_hash,
      })
      .eq("id", appointmentId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 400 })
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
