"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AppointmentCardProps {
  appointment: any
  isDoctor?: boolean
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onHold?: (id: string) => void
}

export function AppointmentCard({ appointment, isDoctor = false, onApprove, onReject, onHold }: AppointmentCardProps) {
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
      case "completed":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>
              {isDoctor ? appointment.patient?.user?.full_name : appointment.doctor?.user?.full_name}
            </CardTitle>
            <CardDescription>
              {isDoctor ? appointment.patient?.gender : appointment.doctor?.specialization}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
            <Badge className={getPaymentStatusColor(appointment.payment_status)}>
              {appointment.payment_status === "completed" ? "Paid" : "Pending"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Date & Time:</span>
            <p className="text-muted-foreground">{new Date(appointment.appointment_date).toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium">Fee:</span>
            <p className="text-muted-foreground">${appointment.consultation_fee}</p>
          </div>
        </div>

        {appointment.symptoms && (
          <div>
            <span className="font-medium text-sm">Symptoms:</span>
            <p className="text-sm text-muted-foreground">{appointment.symptoms}</p>
          </div>
        )}

        {appointment.description && (
          <div>
            <span className="font-medium text-sm">Description:</span>
            <p className="text-sm text-muted-foreground">{appointment.description}</p>
          </div>
        )}

        {isDoctor && appointment.patient?.blood_group && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Blood Group:</span>
              <p className="text-muted-foreground">{appointment.patient.blood_group}</p>
            </div>
          </div>
        )}

        {isDoctor && appointment.status === "pending" && (
          <div className="pt-4 border-t flex gap-2">
            <Button size="sm" onClick={() => onApprove?.(appointment.id)} className="flex-1">
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onHold?.(appointment.id)} className="flex-1">
              Hold
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onReject?.(appointment.id)} className="flex-1">
              Reject
            </Button>
          </div>
        )}

        {isDoctor && appointment.status === "held" && (
          <div className="pt-4 border-t flex gap-2">
            <Button size="sm" onClick={() => onApprove?.(appointment.id)} className="flex-1">
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onReject?.(appointment.id)} className="flex-1">
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
