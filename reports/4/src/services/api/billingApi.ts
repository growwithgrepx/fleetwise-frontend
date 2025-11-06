import { Job } from "@/types/job";
import { api } from "@/lib/api";
import { Invoice } from "@/types/types";

export interface JobFilters {
  search?: string;
  customer_name?: string;
  type_of_service?: string;
  pickup_date?: string;
  pickup_date_start?: string;
  pickup_location?: string;
  dropoff_location?: string;
  status?: string;
  invoice_id?: string | null;
}

export interface JobsResponse {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}
export interface InvoiceFilters {
  search?: string;
  customer_id?: number | null;
  status?: string;
  id?: number | null;
  date?: string;
  items?: Job[]
}

// export interface PaginatedResponse<T> {
//   items: T[];
//   total: number;
// }



// export async function getPaidOrUnpaidJobs(
//   query: InvoiceFilters & { status?: string } = {}
// ): Promise<Invoice[]> {
//   const params = new URLSearchParams();
  
//   // Only add status filter if it's provided and not "unbilled"
//   if (query.status && query.status !== "unbilled") {
//     params.append("status", query.status);
//   }
  
//   // Add other filters
//   Object.entries(query).forEach(([key, value]) => {
//     if (key !== "status" && value !== undefined && value !== null && value !== "") {
//       params.append(key, String(value));
//     }
//   });

//   const response = await api.get<Invoice[]>(`/api/invoices?${params.toString()}`);
//   console.log('resdata',response.data)
//   console.log("API Response:", response.data);
//   return response.data;
// }

export async function getUnBilledJobs(query = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const response = await api.get<JobsResponse>(
    `/api/jobs/unbilled?${params.toString()}`
  );
  console.log('resdataf',response.data)
  return response.data;
}


// export async function getPaidOrUnpaidJobs(query = {}): Promise<JobsResponse> {
//   const params = new URLSearchParams();
//   Object.entries(query).forEach(([key, value]) => {
//     if (value !== undefined && value !== null && value !== "") {
//       params.append(key, String(value));
//     }
//   });
//   const response = await api.get<JobsResponse>(
//     `/api/invoices?${params.toString()}`
//   );
//   console.log('resdata',response.data)
//   return response.data;
// }


// # real code
export async function getPaidOrUnpaidJobs(query = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const response = await api.get<JobsResponse>(
    `/api/invoices/unpaid?${params.toString()}`
  );
  console.log('resdataft',response.data)
  return response.data;
}

// export async function getPaidOrUnpaidJobs(query: { status?: string | string[], customer_id?: number | null } = {}): Promise<JobsResponse> {
//   const params = new URLSearchParams();

//   if (query.status) {
//     if (Array.isArray(query.status)) {
//       query.status.forEach((s) => params.append("status", s));
//     } else {
//       params.append("status", query.status);
//     }
//   }

//   if (query.customer_id != null) {
//     params.append("customer_id", String(query.customer_id));
//   }

//   const response = await api.get<JobsResponse>(`/api/invoices?${params.toString()}`);
//   console.log('resdataft', response.data);
//   return response.data;
// }



// export async function getUnBilledJobs(query = {}): Promise<JobsResponse> {
//   const params = new URLSearchParams();
//   Object.entries(query).forEach(([key, value]) => {
//     if (value !== undefined && value !== null && value !== "") {
//       params.append(key, String(value));
//     }
//   });
//   const response = await api.get<JobsResponse>(
//     `/api/jobs/unbilled?${params.toString()}`
//   );
//   return response.data;
// }

export async function generateInvoice(data: {
  job_ids: number[];
  customer_id: number | null;
}) {
  const response = await api.post<Job>("/api/invoices/generate", data);
  return response.data;
}

export async function generateContractorBill(data: {
  contractor_id: number;
  job_id: number[];
}): Promise<any> {
  const response = await api.post("/api/bills/contractor", data);
  return response.data; // Return full response to access message and bills info
}

export async function generateDriverBill(data: {
  driver_id: number;
  job_id: number[];
}): Promise<any> {
  const response = await api.post("/api/bills/driver", data);
  return response.data; // Return full response to access message and bills info
}

export async function getBills(): Promise<{ items: any[]; total: number }> {
  const response = await api.get<{ items: any[]; total: number }>("/api/bills");
  return response.data;
}

export async function getContractorBills(): Promise<{ items: any[]; total: number }> {
  const response = await api.get<{ items: any[]; total: number }>("/api/bills?type=contractor");
  return response.data;
}

export async function getDriverBills(): Promise<{ items: any[]; total: number }> {
  const response = await api.get<{ items: any[]; total: number }>("/api/bills?type=driver");
  return response.data;
}

export async function updateInvoiceStatus(data : { id: number | null; status: string }): Promise<Invoice> {
  const response = await api.put<Invoice>(`/api/invoices/statusUpdate/${data.id}`, data);
  return response.data;
}

export async function updateBillStatus(data : { id: number | null; status: string }): Promise<any> {
  const response = await api.put<any>(`/api/bills/${data.id}`, { status: data.status });
  return response.data;
}

export async function removeJob(id: number | null): Promise<void> {
  await api.delete(`/api/jobs/remove/${id}`);
}

export async function removeJobFromBill(billId: number, jobId: number): Promise<any> {
  const response = await api.delete(`/api/bills/${billId}/jobs/${jobId}`);
  return response.data;
}

/**
 * Delete unpaid invoice
 */
export async function deleteUnpaidInvoice(id: number | null): Promise<void> {
  await api.delete(`/api/invoices/remove/${id}`);
}

/**
 * Download unpaid invoice
 */
export async function getUnpaidInvoice(id: number | null): Promise<Blob> {
  const response = await api.get(`/api/invoices/unpaid/download/${id}`, {
    responseType: 'blob', 
  });

  const blobURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.title = `Invoice #${id}`;
      pdfWindow.document.body.style.margin = "0";
      pdfWindow.document.body.innerHTML = `<iframe src="${blobURL}" width="100%" height="100%" style="border:none;"></iframe>`;
    } else {
      alert("Please allow popups to view the invoice.");
    }

  return response.data;
}
/**
 * Download paid invoice
 */
export async function getPaidInvoice(id: number |null): Promise<any> {
  const response = await api.get(`/api/invoices/download/${id}`, {
    responseType: 'blob', 
  });
    const blobURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.title = `Invoice #${id}`;
      pdfWindow.document.body.style.margin = "0";
      pdfWindow.document.body.innerHTML = `<iframe src="${blobURL}" width="100%" height="100%" style="border:none;"></iframe>`;
    } else {
      alert("Please allow popups to view the invoice.");
    }

  
  return response.data;

}

export async function getDriverBillableJobs(query = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const response = await api.get<JobsResponse>(
    `/api/jobs/driver-billable?${params.toString()}`
  );
  return response.data;
}

