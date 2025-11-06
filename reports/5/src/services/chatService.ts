import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Helper function for development logging
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

export interface ChatResponse {
  response: string
  data: any[] | null
}

export interface DownloadRequest {
  query: string
  data: any[]
}

export const chatService = {
  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      devLog('Sending message to:', `${API_BASE_URL}/api/chat`)
      devLog('Message:', message)
      
      // Add a timeout to prevent hanging
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message
      }, {
        timeout: 10000 // 10 second timeout
      })
      
      devLog('Response:', response.data)
      return response.data
    } catch (error: any) {
      devLog('Chat API error:', error)
      devLog('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      })
      
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.')
      } else if (!error.response) {
        throw new Error('Network error. Please check your connection.')
      } else if (error.response.status === 404) {
        throw new Error('Chat service not found. Please contact support.')
      } else if (error.response.status >= 500) {
        throw new Error('Server error. Please try again later.')
      } else {
        throw new Error('Failed to send message. Please try again.')
      }
    }
  },

  async downloadData(request: DownloadRequest): Promise<Blob> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat/download`, request, {
        responseType: 'blob',
        timeout: 10000 // 10 second timeout
      })
      return response.data
    } catch (error: any) {
      devLog('Download API error:', error)
      if (error.code === 'ECONNABORTED') {
        throw new Error('Download timeout. Please try again.')
      } else if (!error.response) {
        throw new Error('Network error. Please check your connection.')
      } else {
        throw new Error('Failed to download data. Please try again.')
      }
    }
  }
}