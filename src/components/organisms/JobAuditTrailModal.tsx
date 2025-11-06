import React, { useEffect, useState } from 'react';
import { getJobAuditTrail, AuditRecord, JobAuditTrailResponse } from '@/services/api/jobsApi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { XIcon, CalendarIcon, UserIcon, PaperclipIcon, ImageIcon } from 'lucide-react';

interface DriverInfo {
  id: number;
  name: string;
  license_number: string;
}

interface JobAuditTrailModalProps {
  jobId: number;
  isOpen: boolean;
  onClose: () => void;
}

const JobAuditTrailModal: React.FC<JobAuditTrailModalProps> = ({ jobId, isOpen, onClose }) => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set()); // Track failed images
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({}); // Track blob URLs for authenticated images

  useEffect(() => {
    if (isOpen && jobId) {
      loadAuditTrail();
    }
  }, [isOpen, jobId]);

  // Fetch images with authentication if needed
  useEffect(() => {
    const fetchAuthenticatedImages = async () => {
      auditRecords.forEach(record => {
        record.attachments?.forEach(async (attachment: { file_url: string } | string) => {
          // Extract URL from attachment
          const url = typeof attachment === 'string' ? attachment : attachment.file_url;
          
          // Skip if already processed or if it's a public URL
          if (imageBlobUrls[url] || failedImages.has(url)) {
            return;
          }
          
          // Check if URL might require authentication (relative URLs or same domain)
          const isRelativeUrl = url.startsWith('/');
          const isSameDomain = url.startsWith(window.location.origin);
          
          // Only fetch with credentials if it's likely to need authentication
          if (isRelativeUrl || isSameDomain) {
            try {
              const response = await fetch(url, {
                credentials: 'include' // Include cookies/session
              });
              if (response.ok) {
                const blob = await response.blob();
                setImageBlobUrls(prev => ({...prev, [url]: URL.createObjectURL(blob)}));
              } else {
                // If not authorized, mark as failed
                setFailedImages(prev => new Set(prev).add(url));
              }
            } catch (error) {
              console.error('Error fetching authenticated image:', error);
              setFailedImages(prev => new Set(prev).add(url));
            }
          }
        });
      });
    };

    if (auditRecords.length > 0) {
      fetchAuthenticatedImages();
    }

    // Cleanup blob URLs when component unmounts or imageBlobUrls change
    return () => {
      Object.keys(imageBlobUrls).forEach(url => {
        URL.revokeObjectURL(imageBlobUrls[url]);
      });
    };
  }, [auditRecords, imageBlobUrls]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  // Get avatar color based on role
  const getAvatarColor = (role?: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-500';
      case 'Driver': return 'bg-blue-500';
      case 'Customer': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    // Convert status to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus.includes('confirm')) return 'bg-gray-200 text-gray-800';
    if (lowerStatus.includes('accept')) return 'bg-teal-200 text-teal-800';
    if (lowerStatus.includes('spot')) return 'bg-yellow-200 text-yellow-800';
    if (lowerStatus.includes('booking')) return 'bg-orange-200 text-orange-800';
    if (lowerStatus.includes('complete')) return 'bg-green-200 text-green-800';
    if (lowerStatus.includes('cancel')) return 'bg-red-200 text-red-800';
    if (lowerStatus.includes('pending')) return 'bg-blue-200 text-blue-800';
    
    // Default fallback
    return 'bg-gray-200 text-gray-800';
  };

  // Get role badge color
  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-200 text-purple-800';
      case 'Driver': return 'bg-blue-200 text-blue-800';
      case 'Customer': return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const response = await getJobAuditTrail(jobId);

      const normalizedRecords = (response.audit_records || []).map(record => {
        const normalizedAttachments = record.attachments
          ?.map((att) => {
            if (typeof att === 'string') {
              return att;
            }
            return att.file_url;
          })
          .filter((url: string | undefined): url is string => Boolean(url?.trim()))
          || [];
        
        return {
          ...record,
          attachments: normalizedAttachments
        };
      });

      const sortedRecords = [...normalizedRecords].sort((a, b) => {
        return a.id - b.id;
      });

      setAuditRecords(sortedRecords);
      setDriverInfo(response.driver_info || null);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail data');
      setAuditRecords([]);
      setDriverInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const imageUrl = target.src;
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  // Open image in modal
  const openImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Close image modal
  const closeImage = () => {
    setSelectedImage(null);
  };

  // Reset image modal state when parent modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Job Audit Trail - JB-{String(jobId).padStart(6, '0')}
              </h2>
              {driverInfo && (
                <p className="text-blue-100 mt-1 text-sm">
                  Driver: {driverInfo.name} • ID: #{driverInfo.id} • License: {driverInfo.license_number || 'N/A'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xl leading-none flex items-center justify-center transition-colors"
              aria-label="Close"
              title="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
            </div>
          ) : auditRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <PaperclipIcon className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-200 mb-1">No audit records found</h3>
              <p className="text-gray-400">There are no audit records for this job yet.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-700 transform translate-x-1/2"></div>
                
                {auditRecords.map((record, index) => {
                  return (
                    <div key={record.id} className="relative flex gap-4 pb-8">
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${getAvatarColor(record.role)}`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      
                      {/* Name, Role, and Timestamp in one line outside the card */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-white">
                            {record.changed_by_name || record.changed_by_email || 'Unknown User'}
                          </span>
                          {record.role && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(record.role)}`}>
                              {record.role}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(record.changed_at)}</span>
                          </div>
                        </div>
                        
                        {/* Card */}
                        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-4">
                          <p className="text-gray-200 mb-3">{record.description || 'No description provided'}</p>
                          
                          {record.new_status && (
                            <div className="mb-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(record.new_status)}`}>
                                {record.new_status}
                              </span>
                            </div>
                          )}
                          
                          {/* Show reason if available */}
                          {record.reason && (
                            <div className="mb-3 p-3 bg-indigo-900/50 rounded-lg border border-indigo-700">
                              <div className="text-sm font-medium text-indigo-300 mb-1">Reason</div>
                              <div className="text-gray-200">
                                {record.reason.replace(/\(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)\)/g, '').trim() || record.reason}
                              </div>
                            </div>
                          )}
                          
                          {/* Show extra services if available */}
                          {record.extra_services && record.extra_services.length > 0 && (
                            <div className="mb-3 p-3 bg-purple-900/50 rounded-lg border border-purple-700">
                              <div className="text-sm font-medium text-purple-300 mb-1">Extra Services</div>
                              <div className="text-gray-200">
                                {record.extra_services
                                  .filter((service): service is string => typeof service === 'string' && service.trim().length > 0)
                                  .join(', ')}
                              </div>
                            </div>
                          )}
                        
                          {/* Show customer remark when status is confirmed (from new or pending) */}
                          {record.new_status?.toLowerCase() === 'confirmed' && 
                           (record.old_status?.toLowerCase() === 'new' || record.old_status?.toLowerCase() === 'pending') && 
                           record.remark && (
                            <div className="mb-3 p-3 bg-blue-900/50 rounded-lg border border-blue-700">
                              <div className="text-sm font-medium text-blue-300 mb-1">Customer Remark</div>
                              <div className="text-gray-200">{record.remark}</div>
                            </div>
                        )}
                        
                        {/* Show specific driver remarks for pob, ots, otw, and jc statuses */}
                        {record.new_status?.toLowerCase() === 'pob' && record.driver_remarks && record.driver_remarks.length > 0 && (
                          <div className="mb-3 p-3 bg-yellow-900/50 rounded-lg border border-yellow-700">
                            <div className="text-sm font-medium text-yellow-300 mb-1">Driver Remark</div>
                            <div className="text-gray-200">
                              {record.driver_remarks[record.driver_remarks.length - 1]?.remark}
                            </div>
                          </div>
                        )}
                        
                        {record.new_status?.toLowerCase() === 'ots' && record.driver_remarks && record.driver_remarks.length > 0 && (
                          <div className="mb-3 p-3 bg-yellow-900/50 rounded-lg border border-yellow-700">
                            <div className="text-sm font-medium text-yellow-300 mb-1">Driver Remark</div>
                            <div className="text-gray-200">
                              {record.driver_remarks[record.driver_remarks.length - 1]?.remark}
                            </div>
                          </div>
                        )}
                        
                        {record.new_status?.toLowerCase() === 'otw' && record.driver_remarks && record.driver_remarks.length > 0 && (
                          <div className="mb-3 p-3 bg-yellow-900/50 rounded-lg border border-yellow-700">
                            <div className="text-sm font-medium text-yellow-300 mb-1">Driver Remark</div>
                            <div className="text-gray-200">
                              {record.driver_remarks[record.driver_remarks.length - 1]?.remark}
                            </div>
                          </div>
                        )}
                        
                        {record.new_status?.toLowerCase() === 'jc' && record.driver_remarks && record.driver_remarks.length > 0 && (
                          <div className="mb-3 p-3 bg-yellow-900/50 rounded-lg border border-yellow-700">
                            <div className="text-sm font-medium text-yellow-300 mb-1">Driver Remark</div>
                            <div className="text-gray-200">
                              {record.driver_remarks[record.driver_remarks.length - 1]?.remark}
                            </div>
                          </div>
                        )}
                          
                          {record.attachments && record.attachments.length > 0 && (
                            <div className="border-t border-gray-700 pt-3 mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-300">
                                  {record.attachments.length} image{record.attachments.length > 1 ? 's' : ''} uploaded for this stage
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {record.attachments.slice(0, 4).map((attachment, idx) => {
                                  // Extract URL from attachment (can be string or object)
                                  const attachmentUrl = typeof attachment === 'string' ? attachment : attachment.file_url;
                                  
                                  // Check if the attachment URL is valid
                                  const isValidUrl = attachmentUrl && (attachmentUrl.startsWith('http') || attachmentUrl.startsWith('/'));
                                  
                                  if (!isValidUrl) {
                                    return (
                                      <div key={idx} className="w-32 h-20 rounded border border-gray-700 overflow-hidden bg-gray-900 flex items-center justify-center">
                                        <div className="text-gray-500 text-xs text-center p-2">Invalid URL</div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className="w-32 h-20 rounded border border-gray-700 overflow-hidden bg-gray-900 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => openImage(attachmentUrl)}
                                    >
                                      {!failedImages.has(attachmentUrl) ? (
                                        <img 
                                          src={imageBlobUrls[attachmentUrl] || attachmentUrl} 
                                          alt={`Attachment ${idx + 1}`} 
                                          className="w-full h-full object-cover"
                                          onError={handleImageError}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-500 text-xs p-2 text-center">
                                          <div>Image not available</div>
                                          <div className="text-xs mt-1 text-gray-600 truncate w-full">
                                            {attachmentUrl.substring(attachmentUrl.lastIndexOf('/') + 1)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {record.attachments.length > 4 && (
                                  <div className="w-32 h-20 rounded border border-gray-700 bg-gray-900 flex items-center justify-center">
                                    <span className="text-gray-400 text-sm">+{record.attachments.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900 flex items-center justify-between">
          <p className="text-sm text-gray-400">Tracking all job changes and updates</p>
          <Button 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Close
          </Button>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4" onClick={closeImage}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeImage();
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              aria-label="Close"
            >
              <XIcon className="w-8 h-8" />
            </button>
            <img 
              src={imageBlobUrls[selectedImage] || selectedImage} 
              alt="Full size view" 
              className="max-w-full max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default JobAuditTrailModal;