"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Appointment {
  id: string
  patient_id: string
  appointment_date: string
  status: string
  symptoms: string
  description: string
  consultation_fee: number
  patient: {
    user: {
      full_name: string
    }
    gender: string
    blood_group: string
    age?: number
  }
}

export default function DoctorDashboard() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorName, setDoctorName] = useState("")
  const [specialization, setSpecialization] = useState("")

  useEffect(() => {
    const walletAddress = sessionStorage.getItem("wallet_address")
    if (!walletAddress) {
      router.push("/auth/doctor-login")
      return
    }

    fetchDoctorData(walletAddress)
  }, [router])

  const fetchDoctorData = async (walletAddress: string) => {
    try {
      const supabase = getSupabaseClient()

      // Get user data
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("wallet_address", walletAddress)
        .single()

      if (userError || !user) {
        router.push("/auth/doctor-login")
        return
      }

      setDoctorName(user.full_name || "Doctor")

      // Get doctor profile
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("specialization")
        .eq("user_id", user.id)
        .single()

      if (doctorData) {
        setSpecialization(doctorData.specialization)

        // Get appointments for this doctor
        const { data: appointmentsData } = await supabase
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
            patient:patients(
              user:users(full_name),
              gender,
              blood_group
            )
          `,
          )
          .eq("doctor_id", doctorData.id)
          .order("appointment_date", { ascending: true })

        setAppointments(appointmentsData || [])
      }
    } catch (error) {
      console.error("Error fetching doctor data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAppointmentAction = async (appointmentId: string, newStatus: string) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", appointmentId)

      if (!error) {
        // Refresh appointments
        const walletAddress = sessionStorage.getItem("wallet_address")
        if (walletAddress) {
          fetchDoctorData(walletAddress)
        }
      }
    } catch (error) {
      console.error("Error updating appointment:", error)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("wallet_address")
    sessionStorage.removeItem("user_type")
    router.push("/")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "held":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
            <h1 className="text-3xl font-bold">Dr. {doctorName}</h1>
            <p className="text-muted-foreground">{specialization}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No appointments yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {appointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{appointment.patient.user.full_name}</CardTitle>
                          <CardDescription>{new Date(appointment.appointment_date).toLocaleString()}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Gender:</span> {appointment.patient.gender}
                        </div>
                        <div>
                          <span className="font-medium">Blood Group:</span> {appointment.patient.blood_group}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-sm">Symptoms:</span>
                        <p className="text-sm text-muted-foreground">{appointment.symptoms}</p>
                      </div>

                      <div>
                        <span className="font-medium text-sm">Description:</span>
                        <p className="text-sm text-muted-foreground">{appointment.description}</p>
                      </div>

                      <div className="pt-4 border-t flex gap-2">
                        {appointment.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAppointmentAction(appointment.id, "approved")}
                              className="flex-1"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAppointmentAction(appointment.id, "held")}
                              className="flex-1"
                            >
                              Hold
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAppointmentAction(appointment.id, "rejected")}
                              className="flex-1"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {appointment.status === "held" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAppointmentAction(appointment.id, "approved")}
                              className="flex-1"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAppointmentAction(appointment.id, "rejected")}
                              className="flex-1"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
