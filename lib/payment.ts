// MetaMask payment utilities
import { getConnectedAccount } from "./metamask"

export interface PaymentDetails {
  doctorAddress: string
  amount: string
  appointmentId: string
}

export async function initiatePayment(details: PaymentDetails): Promise<string | null> {
  if (!window.ethereum) {
    alert("Please install MetaMask")
    return null
  }

  try {
    const userAccount = await getConnectedAccount()
    if (!userAccount) {
      alert("Please connect your MetaMask wallet")
      return null
    }

    // Convert amount to Wei (1 ETH = 10^18 Wei)
    const amountInWei = (Number.parseFloat(details.amount) * 1e18).toString(16)

    const transactionHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: userAccount,
          to: details.doctorAddress,
          value: `0x${amountInWei}`,
          gas: "0x5208", // 21000 gas for simple transfer
        },
      ],
    })

    return transactionHash
  } catch (error) {
    console.error("Payment failed:", error)
    if (error instanceof Error && error.message.includes("User denied")) {
      throw new Error("Payment cancelled by user")
    }
    throw new Error("Payment failed. Please try again.")
  }
}

export async function getTransactionStatus(transactionHash: string): Promise<boolean> {
  if (!window.ethereum) return false

  try {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    })

    return receipt && receipt.status === "0x1"
  } catch (error) {
    console.error("Error checking transaction status:", error)
    return false
  }
}
