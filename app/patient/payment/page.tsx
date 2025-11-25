"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { initiatePayment } from "@/lib/payment"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"

interface AppointmentDetails {
  id: string
  doctor_id: string
  consultation_fee: number
  appointment_date: string
  doctor: {
    user: {
      full_name: string
      wallet_address: string
    }
  }
}

export default function PaymentPage() {
  const router = useRouter()
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "error">("pending")
  const [error, setError] = useState("")
  const [transactionHash, setTransactionHash] = useState("")

  useEffect(() => {
    const appointmentId = sessionStorage.getItem("pending_appointment_id")
    if (!appointmentId) {
      router.push("/patient/dashboard")
      return
    }

    fetchAppointmentDetails(appointmentId)
  }, [router])

  const fetchAppointmentDetails = async (appointmentId: string) => {
    try {
      const supabase = getSupabaseClient()

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          doctor_id,
          consultation_fee,
          appointment_date,
          doctor:doctors(
            user:users(full_name, wallet_address)
          )
        `,
        )
        .eq("id", appointmentId)
        .single()

      if (appointmentError || !appointmentData) {
        setError("Appointment not found")
        setLoading(false)
        return
      }

      setAppointment(appointmentData)
      setLoading(false)
    } catch (err) {
      console.error("Error fetching appointment:", err)
      setError("Failed to load appointment details")
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!appointment) return

    setProcessing(true)
    setPaymentStatus("processing")
    setError("")

    try {
      // For demo purposes, we'll use a placeholder wallet address
      // In production, you'd get the actual doctor's wallet from the database
      const doctorWallet = appointment.doctor.user.wallet_address || "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE"

      const paymentDetails = {
        doctorAddress: doctorWallet,
        amount: appointment.consultation_fee.toString(),
        appointmentId: appointment.id,
      }

      const hash = await initiatePayment(paymentDetails)

      if (!hash) {
        setPaymentStatus("error")
        setError("Payment failed. Please try again.")
        setProcessing(false)
        return
      }

      setTransactionHash(hash)

      // Update appointment payment status
      const supabase = getSupabaseClient()
      await supabase
        .from("appointments")
        .update({
          payment_status: "completed",
          transaction_hash: hash,
        })
        .eq("id", appointment.id)

      setPaymentStatus("success")

      // Clear session storage
      sessionStorage.removeItem("pending_appointment_id")
      sessionStorage.removeItem("doctor_wallet")
      sessionStorage.removeItem("appointment_fee")

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push("/patient/dashboard")
      }, 3000)
    } catch (err) {
      setPaymentStatus("error")
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.")
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Appointment not found</p>
            <Button onClick={() => router.push("/patient/dashboard")} className="mt-4 w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Payment Confirmation</CardTitle>
          <CardDescription>Complete your appointment booking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Status */}
          {paymentStatus === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-900">Payment Successful!</p>
              <p className="text-sm text-green-700 mt-1">Your appointment has been booked.</p>
              {transactionHash && (
                <p className="text-xs text-green-600 mt-2 font-mono break-all">TX: {transactionHash.slice(0, 20)}...</p>
              )}
            </div>
          )}

          {paymentStatus === "processing" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <Clock className="h-12 w-12 text-blue-600 mx-auto mb-2 animate-spin" />
              <p className="font-medium text-blue-900">Processing Payment...</p>
              <p className="text-sm text-blue-700 mt-1">Please confirm the transaction in MetaMask</p>
            </div>
          )}

          {paymentStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
              <p className="font-medium text-red-900">Payment Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Appointment Details */}
          <div className="space-y-3 bg-secondary p-4 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium">{appointment.doctor.user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Appointment Date</p>
              <p className="font-medium">{new Date(appointment.appointment_date).toLocaleString()}</p>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Consultation Fee</p>
              <p className="text-2xl font-bold">${appointment.consultation_fee}</p>
            </div>
          </div>

          {/* Doctor Wallet Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">Doctor Wallet Address</p>
            <p className="text-xs font-mono break-all text-blue-900">{appointment.doctor.user.wallet_address}</p>
          </div>

          {/* Payment Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-900 mb-2">Payment Instructions:</p>
            <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
              <li>Click "Pay with MetaMask" button below</li>
              <li>Confirm the transaction in your MetaMask wallet</li>
              <li>Wait for the transaction to complete</li>
              <li>Your appointment will be confirmed automatically</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {paymentStatus === "success" ? (
              <Button onClick={() => router.push("/patient/dashboard")} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePayment}
                  disabled={processing || paymentStatus === "success"}
                  className="w-full"
                  size="lg"
                >
                  {processing ? "Processing..." : "Pay with MetaMask"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/patient/book-appointment")}
                  disabled={processing}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center">
            This is a blockchain transaction. Please ensure you have sufficient ETH in your wallet for gas fees.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
