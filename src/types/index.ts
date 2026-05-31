export type UserRole = "super_admin" | "hostel_admin" | "worker" | "student";
export type ComplaintStatus = "pending" | "in_progress" | "resolved";
export type ComplaintSeverity = "low" | "medium" | "high";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  status: "active" | "suspended";
  push_token: string | null;
  room_id?: number;
  room_number?: string;
  hostel_id?: number;
  created_at: string;
}

export interface Complaint {
  id: number;
  title: string;
  description: string;
  category: string; // plumbing, electrical, carpentry, housekeeping, other
  room_number: string;
  hostel_id?: number;
  hostel_name: string;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  image_url: string | null;
  resolved_image_url?: string | null;
  student_id: number;
  worker_id: number | null;
  created_at: string;
  updated_at: string;
  student?: User;
  worker?: User;
}

export interface Comment {
  id: number;
  complaint_id: number;
  user_id: number | null;
  text: string;
  is_system_action: boolean;
  created_at: string;
  user?: User;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface WorkerWorkload {
  worker_id: number;
  worker_name: string;
  active_tasks: number;
}

export interface Analytics {
  status_metrics: {
    pending: number;
    in_progress: number;
    resolved: number;
    total: number;
  };
  category_metrics: Record<string, number>;
  worker_workload: WorkerWorkload[];
  average_resolution_hours: number;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  hostel_name: string | null; // null means global to all hostels
  created_at: string;
  created_by?: User;
}

export interface Hostel {
  id: number;
  name: string;
  location: string;
  admin_id: number | null;
  admin_name?: string;
  total_rooms: number;
  total_students: number;
  created_at: string;
}

export interface Room {
  id: number;
  room_number: string;
  hostel_id: number;
  hostel_name?: string;
  capacity: number;
  occupied: number;
  status: "available" | "full" | "maintenance";
}
