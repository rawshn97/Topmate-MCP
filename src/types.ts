export interface TopmateProfile {
  username?: string;
  name?: string;
  title?: string;
  description?: string;
  profilePicUrl?: string;
  services?: TopmateService[];
  // Topmate's actual payload has more fields than this; anything not modeled
  // explicitly here still comes through via [key: string] below.
  [key: string]: unknown;
}

export interface TopmateService {
  id: string;
  title: string;
  description?: string;
  charge?: number;
  currency?: string;
  durationMinutes?: number;
  questions?: string[];
  // Topmate's internal service-type id (e.g. 1 = video call, 2 = Priority
  // DM) — needed to build the dashboard's edit-page URL.
  type?: number;
  [key: string]: unknown;
}

export interface ServiceInput {
  title: string;
  description: string;
  price?: number;
  currency?: string;
  durationMinutes?: number;
  questions?: string[];
}

export interface UpdateServiceInput {
  serviceId: string;
  title?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  questions?: string[];
}

export interface UpdateProfileInput {
  title?: string;
  description?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  serviceId?: string;
  screenshotPath?: string;
}
