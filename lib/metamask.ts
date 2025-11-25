// MetaMask wallet connection utilities
export async function connectMetaMask(): Promise<string | null> {
  if (!window.ethereum) {
    alert("Please install MetaMask")
    return null
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    })
    return accounts[0]
  } catch (error) {
    console.error("MetaMask connection failed:", error)
    return null
  }
}

export async function getConnectedAccount(): Promise<string | null> {
  if (!window.ethereum) return null

  try {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    })
    return accounts[0] || null
  } catch (error) {
    console.error("Failed to get connected account:", error)
    return null
  }
}

export async function signMessage(message: string, account: string): Promise<string | null> {
  if (!window.ethereum) return null

  try {
    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [message, account],
    })
    return signature
  } catch (error) {
    console.error("Message signing failed:", error)
    return null
  }
}

export async function sendTransaction(to: string, amount: string): Promise<string | null> {
  if (!window.ethereum) return null

  try {
    const transactionHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: (await getConnectedAccount()) || "",
          to,
          value: amount,
        },
      ],
    })
    return transactionHash
  } catch (error) {
    console.error("Transaction failed:", error)
    return null
  }
}

declare global {
  interface Window {
    ethereum?: any
  }
}
