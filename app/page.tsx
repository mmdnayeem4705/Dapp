"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getConnectedAccount } from "@/lib/metamask"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const router = useRouter()
  const [account, setAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccount = async () => {
      const connectedAccount = await getConnectedAccount()
      setAccount(connectedAccount)
      setLoading(false)
    }

    checkAccount()
  }, [])

  const handlePatientLogin = () => {
    router.push("/auth/patient-login")
  }

  const handleDoctorLogin = () => {
    router.push("/auth/doctor-login")
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
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">MediConnect</CardTitle>
          <CardDescription>Doctor Appointment Booking System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {account ? (
            <div className="bg-secondary p-3 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground">Connected Wallet:</p>
              <p className="text-sm font-mono break-all">{account}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">Please connect your MetaMask wallet to continue</p>
          )}

          <div className="space-y-3">
            <Button onClick={handlePatientLogin} className="w-full" size="lg">
              Patient Login
            </Button>
            <Button onClick={handleDoctorLogin} variant="outline" className="w-full bg-transparent" size="lg">
              Doctor Login
            </Button>
          </div>

          {/* <Button onClick={() => router.push("/setup")} variant="ghost" className="w-full text-xs">
            First time? Initialize Database
          </Button> */}

          <p className="text-xs text-muted-foreground text-center">Secure authentication powered by MetaMask</p>
        </CardContent>
      </Card>
    </main>
  )
}
