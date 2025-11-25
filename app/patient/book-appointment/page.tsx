"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Doctor {
  id: string
  specialization: string
  consultation_fee: number
  experience_years: number
  bio: string
  user: {
    full_name: string
  }
}

export default function BookAppointment() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [appointmentDate, setAppointmentDate] = useState("")
  const [appointmentTime, setAppointmentTime] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [specialization, setSpecialization] = useState("")

  useEffect(() => {
    const walletAddress = sessionStorage.getItem("wallet_address")
    if (!walletAddress) {
      router.push("/auth/patient-login")
      return
    }

    fetchDoctors()
  }, [router])

  const fetchDoctors = async () => {
    try {
      const supabase = getSupabaseClient()

      let query = supabase.from("doctors").select(
        `
        id,
        specialization,
        consultation_fee,
        experience_years,
        bio,
        user:users(full_name)
      `,
      )

      if (specialization) {
        query = query.eq("specialization", specialization)
      }

      const { data: doctorsData, error: doctorsError } = await query

      if (!doctorsError) {
        setDoctors(doctorsData || [])
      }
    } catch (error) {
      console.error("Error fetching doctors:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSpecializationChange = (value: string) => {
    setSpecialization(value)
    setSelectedDoctor(null)
  }

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDoctor || !appointmentDate || !appointmentTime) {
      setError("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const walletAddress = sessionStorage.getItem("wallet_address")
      if (!walletAddress) {
        setError("Session expired. Please login again.")
        setSubmitting(false)
        return
      }

      const supabase = getSupabaseClient()

      // Get user ID
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single()

      if (userError || !user) {
        setError("User not found")
        setSubmitting(false)
        return
      }

      // Get patient ID
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (patientError || !patient) {
        setError("Patient profile not found")
        setSubmitting(false)
        return
      }

      // Combine date and time
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`)

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert([
          {
            patient_id: patient.id,
            doctor_id: selectedDoctor.id,
            appointment_date: appointmentDateTime.toISOString(),
            symptoms,
            description,
            consultation_fee: selectedDoctor.consultation_fee,
            status: "pending",
            payment_status: "pending",
          },
        ])
        .select()
        .single()

      if (appointmentError) {
        setError("Failed to create appointment")
        setSubmitting(false)
        return
      }

      // Store appointment ID for payment
      sessionStorage.setItem("pending_appointment_id", appointment.id)
      sessionStorage.setItem("doctor_wallet", selectedDoctor.user.full_name) // In real app, store doctor's wallet
      sessionStorage.setItem("appointment_fee", selectedDoctor.consultation_fee.toString())

      // Redirect to payment
      router.push("/patient/payment")
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading doctors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.push("/patient/dashboard")} className="mb-4">
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Book an Appointment</h1>
          <p className="text-muted-foreground">Find and book with a specialist</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter by Specialization */}
            <Card>
              <CardHeader>
                <CardTitle>Filter by Specialization</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={specialization} onValueChange={handleSpecializationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Specializations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specializations</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Dermatology">Dermatology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                    <SelectItem value="General Practice">General Practice</SelectItem>
                    <SelectItem value="Dentistry">Dentistry</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Doctors List */}
            <div className="space-y-3">
              {doctors.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No doctors found</p>
                  </CardContent>
                </Card>
              ) : (
                doctors.map((doctor) => (
                  <Card
                    key={doctor.id}
                    className={`cursor-pointer transition-all ${selectedDoctor?.id === doctor.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => handleDoctorSelect(doctor)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{doctor.user.full_name}</CardTitle>
                          <CardDescription>{doctor.specialization}</CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${doctor.consultation_fee}</p>
                          <p className="text-sm text-muted-foreground">{doctor.experience_years} years exp.</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{doctor.bio}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Appointment Form */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {selectedDoctor ? (
                    <div className="bg-secondary p-3 rounded-lg mb-4">
                      <p className="text-sm font-medium">{selectedDoctor.user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedDoctor.specialization}</p>
                      <p className="text-sm font-bold mt-2">${selectedDoctor.consultation_fee}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Select a doctor first</p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="date">Appointment Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      disabled={!selectedDoctor}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Appointment Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      required
                      disabled={!selectedDoctor}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Symptoms</Label>
                    <Textarea
                      id="symptoms"
                      placeholder="Describe your symptoms..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={2}
                      required
                      disabled={!selectedDoctor}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Additional Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Any additional information..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      disabled={!selectedDoctor}
                    />
                  </div>

                  {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">{error}</div>}

                  <Button type="submit" className="w-full" disabled={!selectedDoctor || submitting}>
                    {submitting ? "Processing..." : "Proceed to Payment"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
