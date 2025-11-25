"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppointmentCard } from "@/components/appointment-card"

interface Appointment {
  id: string
  doctor_id: string
  appointment_date: string
  status: string
  symptoms: string
  consultation_fee: number
  payment_status: string
  doctor: {
    specialization: string
    user: {
      full_name: string
    }
  }
}

export default function PatientDashboard() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const walletAddress = sessionStorage.getItem("wallet_address")
    if (!walletAddress) {
      router.push("/auth/patient-login")
      return
    }

    fetchPatientData(walletAddress)
  }, [router])

  const fetchPatientData = async (walletAddress: string) => {
    try {
      const supabase = getSupabaseClient()

      // Get user data
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("wallet_address", walletAddress)
        .single()

      if (userError || !user) {
        router.push("/auth/patient-login")
        return
      }

      setUserName(user.full_name || "Patient")

      // Get patient appointments
      const { data: patientData } = await supabase.from("patients").select("id").eq("user_id", user.id).single()

      if (patientData) {
        const { data: appointmentsData } = await supabase
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
              user:users(full_name)
            )
          `,
          )
          .eq("patient_id", patientData.id)
          .order("appointment_date", { ascending: false })

        setAppointments(appointmentsData || [])
      }
    } catch (error) {
      console.error("Error fetching patient data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("wallet_address")
    sessionStorage.removeItem("user_type")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {userName}</h1>
            <p className="text-muted-foreground">Patient Dashboard</p>
          </div>
          <div className="space-x-2">
            <Button onClick={() => router.push("/patient/book-appointment")}>Book Appointment</Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList>
            <TabsTrigger value="appointments">My Appointments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">No appointments yet</p>
                  <Button onClick={() => router.push("/patient/book-appointment")}>Book Your First Appointment</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {appointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} isDoctor={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Profile details will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
