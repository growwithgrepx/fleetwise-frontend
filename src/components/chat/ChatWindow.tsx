'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Maximize2, 
  Sidebar, 
  Download,
  Send,
  Bot,
  User,
  Loader2,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { chatService } from '@/services/chatService'
import { useTheme } from '@/context/ThemeContext'

interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant'
  data?: any[]
  timestamp: Date
}

interface ChatWindowProps {
  className?: string
}

export default function ChatWindow({ className }: ChatWindowProps) {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDocked, setIsDocked] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Welcome! Click on any button below to view fleet data:',
      type: 'assistant',
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [currentData, setCurrentData] = useState<any[]>([])
  const [currentQuery, setCurrentQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const lastRequestIdRef = useRef<string | null>(null)

  // Helper function for development logging
  const devLog = (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  }

  // Debug logging
  useEffect(() => {
    devLog('ChatWindow mounted')
  }, [])

  useEffect(() => {
    devLog('isOpen state changed:', isOpen)
  }, [isOpen])

  useEffect(() => {
    devLog('isMinimized state changed:', isMinimized)
  }, [isMinimized])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add this useEffect to handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        devLog('Escape key pressed, closing chat')
        setIsOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleButtonClick = async (query: string) => {
    devLog('handleButtonClick called with query:', query)
    const requestId = Date.now().toString()
    lastRequestIdRef.current = requestId
    const userMessage: ChatMessage = {
      id: requestId,
      content: query,
      type: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setCurrentQuery(query)

    try {
      const data = await chatService.sendMessage(query)
      
      // Check if this is a stale response
      if (lastRequestIdRef.current !== requestId) return
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        type: 'assistant',
        data: data.data,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setCurrentData(data.data || [])
    } catch (error: any) {
      devLog('Chat error:', error)
      // Check if this is a stale response
      if (lastRequestIdRef.current !== requestId) return
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        type: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      // Only set loading to false if this is the current request
      if (lastRequestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }

  const handleDownload = async () => {
    if (!currentData.length || !currentQuery) return

    try {
      const blob = await chatService.downloadData({
        query: currentQuery,
        data: currentData
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentQuery.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      devLog('Download error:', error)
    }
  }

  const getStatusClass = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('active') || statusLower.includes('completed') || statusLower.includes('paid') || statusLower.includes('confirmed')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    } else if (statusLower.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    } else if (statusLower.includes('cancelled') || statusLower.includes('unpaid')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const formatDataTable = (data: any[]) => {
    if (!data || data.length === 0) return null

    const columns = Object.keys(data[0])
    
    return (
      <div className="mt-4 w-full">
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 max-w-full">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {columns.map((col) => {
                    const value = row[col] || ''
                    
                    if (col.includes('status') && value) {
                      return (
                        <td key={col} className="px-2 py-1.5">
                          <span className={cn("inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full", getStatusClass(value))}>
                            {value}
                          </span>
                        </td>
                      )
                    }
                    
                    return (
                      <td key={col} className="px-2 py-1.5 text-gray-900 dark:text-gray-100">
                        <div className="max-w-[150px] truncate">
                          {typeof value === 'string' && value.length > 20 ? `${value.substring(0, 20)}...` : value}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const quickQueries = [
    {
      category: 'Jobs',
      icon: '📋',
      queries: [
        { label: 'All Jobs', query: 'all jobs' },
        { label: 'Active Jobs', query: 'active jobs' },
        { label: 'Pending Jobs', query: 'pending jobs' },
        { label: 'Yet to be Invoiced', query: 'yet to be invoiced jobs' },
        { label: 'Cancelled Jobs', query: 'cancelled jobs' }
      ]
    },
    {
      category: 'Drivers',
      icon: '👨‍💼',
      queries: [
        { label: 'All Drivers', query: 'all drivers' },
        { label: 'Available Drivers', query: 'available drivers' }
      ]
    },
    {
      category: 'Vehicles',
      icon: '🚗',
      queries: [
        { label: 'All Vehicles', query: 'all vehicles' },
        { label: 'Available Vehicles', query: 'available vehicles' }
      ]
    },
    {
      category: 'Others',
      icon: '📊',
      queries: [
        { label: 'All Customers', query: 'all customers' },
        { label: 'All Services', query: 'all services' },
        { label: 'All Invoices', query: 'all invoices' },
        { label: 'Job Status', query: 'job status' },
        { label: 'Dashboard Summary', query: 'dashboard summary' },
        { label: 'About You', query: 'about you' }
      ]
    }
  ]

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-[9999]"
            data-testid="chat-toggle-button-container"
          >
            <Button
              onClick={() => {
                devLog('Chat button clicked')
                setIsOpen(true)
              }}
              size="lg"
              className="rounded-full w-16 h-16 shadow-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 border-2 border-white dark:border-gray-200"
              data-testid="chat-toggle-button"
            >
              <div className="relative">
                <MessageSquare className="w-7 h-7 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-200 animate-pulse"></div>
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col",
              isMinimized ? "h-16" : "h-[600px]",
              isFullscreen ? "inset-4" : isDocked ? "top-20 right-6 bottom-6 w-full max-w-md" : "bottom-20 right-6 w-full max-w-md",
              className
            )}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Fleet Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDocked(!isDocked)}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Sidebar className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    devLog('Close button clicked')
                    setIsOpen(false)
                  }}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 overflow-x-hidden">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-start space-x-2",
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.type === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "px-4 py-2 rounded-lg max-w-[80%]",
                          message.type === 'user'
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.data && formatDataTable(message.data)}
                      </div>
                      {message.type === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Query Buttons */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                  {quickQueries.map((category) => (
                    <div key={category.category} className="bg-white dark:bg-gray-800 rounded-lg p-2">
                      <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <span className="mr-1 text-lg">{category.icon}</span>
                        {category.category}
                      </h6>
                      <div className="grid grid-cols-2 gap-1">
                        {category.queries.map((query) => (
                          <Button
                            key={query.query}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              devLog('Query button clicked:', query.query)
                              handleButtonClick(query.query)
                            }}
                            className="text-xs h-7 px-2 text-gray-700 border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            disabled={isLoading}
                          >
                            {query.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download Section */}
                {currentData.length > 0 && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Download Data</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="h-8 text-gray-700 border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
} 