/**
 * validation.ts — Zod schemas for 2MC Gastro
 * Comprehensive validation schemas for:
 * - Authentication (login, register)
 * - Checkout/billing (B2B)
 * - Lead capture
 * - Contact forms
 * - Product reviews
 * - Projects
 *
 * NOTE: Zod should be installed via: npm install zod --legacy-peer-deps
 */

// NOTE: If using this file, first add Zod to package.json dependencies
// For now, we provide TypeScript interfaces that mirror Zod schemas

// ============ Helper Types ============

export interface ValidationError {
  field: string;
  message: string;
}

// Minimal validation function without Zod dependency
export function validate<T extends Record<string, any>>(
  data: unknown,
  schema: (value: any) => { success: boolean; data?: T; errors?: ValidationError[] }
): { success: boolean; data?: T; errors?: ValidationError[] } {
  return schema(data);
}

// ============ Auth Schemas ============

export interface LoginCredentials {
  email: string;
  password: string;
}

export function validateLogin(data: unknown): { success: boolean; data?: LoginCredentials; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (!d.email || typeof d.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!d.password || typeof d.password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (d.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  } else if (d.password.length > 128) {
    errors.push({ field: 'password', message: 'Password too long' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: { email: d.email, password: d.password } };
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  taxId?: string;
  sector?: string;
}

export function validateRegister(data: unknown): { success: boolean; data?: RegisterData; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (!d.fullName || typeof d.fullName !== 'string' || d.fullName.trim().length === 0) {
    errors.push({ field: 'fullName', message: 'Full name is required' });
  } else if (d.fullName.length > 100) {
    errors.push({ field: 'fullName', message: 'Full name too long (max 100 chars)' });
  }

  if (!d.email || typeof d.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  } else if (d.email.length > 254) {
    errors.push({ field: 'email', message: 'Email too long' });
  }

  if (!d.company || typeof d.company !== 'string' || d.company.trim().length === 0) {
    errors.push({ field: 'company', message: 'Company name is required' });
  } else if (d.company.length > 150) {
    errors.push({ field: 'company', message: 'Company name too long (max 150 chars)' });
  }

  if (!d.password || typeof d.password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (d.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  } else if (d.password.length > 128) {
    errors.push({ field: 'password', message: 'Password too long' });
  } else if (!/[A-Z]/.test(d.password)) {
    errors.push({ field: 'password', message: 'Password must contain uppercase letter' });
  } else if (!/[0-9]/.test(d.password)) {
    errors.push({ field: 'password', message: 'Password must contain number' });
  }

  if (d.password !== d.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  if (d.taxId && typeof d.taxId === 'string') {
    if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(d.taxId.trim().toUpperCase())) {
      errors.push({ field: 'taxId', message: 'Invalid VAT ID format' });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      fullName: d.fullName,
      email: d.email,
      password: d.password,
      confirmPassword: d.confirmPassword,
      company: d.company,
      taxId: d.taxId,
      sector: d.sector,
    },
  };
}

// ============ Checkout Schema (B2B) ============

export interface CheckoutData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  taxId?: string;
}

export function validateCheckout(data: unknown): { success: boolean; data?: CheckoutData; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (!d.email || typeof d.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!d.firstName || typeof d.firstName !== 'string' || d.firstName.trim().length === 0) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  } else if (d.firstName.length > 50) {
    errors.push({ field: 'firstName', message: 'First name too long' });
  }

  if (!d.lastName || typeof d.lastName !== 'string' || d.lastName.trim().length === 0) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  } else if (d.lastName.length > 50) {
    errors.push({ field: 'lastName', message: 'Last name too long' });
  }

  if (!d.phone || typeof d.phone !== 'string' || d.phone.trim().length === 0) {
    errors.push({ field: 'phone', message: 'Phone is required' });
  } else if (!/^[\d+\-\s()]{10,20}$/.test(d.phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone format' });
  }

  if (!d.company || typeof d.company !== 'string' || d.company.trim().length === 0) {
    errors.push({ field: 'company', message: 'Company name is required' });
  } else if (d.company.length > 150) {
    errors.push({ field: 'company', message: 'Company name too long' });
  }

  if (!d.address || typeof d.address !== 'string' || d.address.trim().length === 0) {
    errors.push({ field: 'address', message: 'Address is required' });
  } else if (d.address.length > 200) {
    errors.push({ field: 'address', message: 'Address too long' });
  }

  if (!d.city || typeof d.city !== 'string' || d.city.trim().length === 0) {
    errors.push({ field: 'city', message: 'City is required' });
  } else if (d.city.length > 100) {
    errors.push({ field: 'city', message: 'City too long' });
  }

  if (!d.postal || typeof d.postal !== 'string' || d.postal.trim().length === 0) {
    errors.push({ field: 'postal', message: 'Postal code is required' });
  } else if (!/^[A-Z0-9\s\-]{3,10}$/i.test(d.postal)) {
    errors.push({ field: 'postal', message: 'Invalid postal code format' });
  }

  if (!d.country || typeof d.country !== 'string') {
    errors.push({ field: 'country', message: 'Country is required' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: d.email,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      company: d.company,
      address: d.address,
      city: d.city,
      postal: d.postal,
      country: d.country,
      taxId: d.taxId,
    },
  };
}

// ============ Lead Capture Schema ============

export interface LeadCaptureData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
}

export function validateLeadCapture(data: unknown): { success: boolean; data?: LeadCaptureData; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (!d.email || typeof d.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  } else if (d.email.length > 254) {
    errors.push({ field: 'email', message: 'Email too long' });
  }

  if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (d.name.length > 100) {
    errors.push({ field: 'name', message: 'Name too long' });
  }

  if (d.company && typeof d.company === 'string' && d.company.length > 150) {
    errors.push({ field: 'company', message: 'Company name too long' });
  }

  if (d.phone && typeof d.phone === 'string' && !/^[\d+\-\s()]{10,20}$/.test(d.phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone format' });
  }

  if (d.message && typeof d.message === 'string' && d.message.length > 1000) {
    errors.push({ field: 'message', message: 'Message too long (max 1000 chars)' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: d.name,
      email: d.email,
      company: d.company,
      phone: d.phone,
      message: d.message,
    },
  };
}

// ============ Contact Form Schema ============

export interface ContactFormData {
  email: string;
  subject: string;
  message: string;
  name?: string;
}

export function validateContactForm(data: unknown): { success: boolean; data?: ContactFormData; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (!d.email || typeof d.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!d.subject || typeof d.subject !== 'string' || d.subject.trim().length === 0) {
    errors.push({ field: 'subject', message: 'Subject is required' });
  } else if (d.subject.length > 200) {
    errors.push({ field: 'subject', message: 'Subject too long' });
  }

  if (!d.message || typeof d.message !== 'string' || d.message.trim().length === 0) {
    errors.push({ field: 'message', message: 'Message is required' });
  } else if (d.message.length < 10) {
    errors.push({ field: 'message', message: 'Message too short (min 10 chars)' });
  } else if (d.message.length > 5000) {
    errors.push({ field: 'message', message: 'Message too long (max 5000 chars)' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: d.email,
      subject: d.subject,
      message: d.message,
      name: d.name,
    },
  };
}

// ============ Product Review Schema ============

export interface ProductReviewData {
  rating: number;
  title: string;
  content: string;
  productId: string;
}

export function validateProductReview(data: unknown): { success: boolean; data?: ProductReviewData; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (typeof d.rating !== 'number' || d.rating < 1 || d.rating > 5) {
    errors.push({ field: 'rating', message: 'Rating must be between 1 and 5' });
  }

  if (!d.title || typeof d.title !== 'string' || d.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (d.title.length > 100) {
    errors.push({ field: 'title', message: 'Title too long' });
  }

  if (!d.content || typeof d.content !== 'string' || d.content.trim().length === 0) {
    errors.push({ field: 'content', message: 'Review content is required' });
  } else if (d.content.length < 10) {
    errors.push({ field: 'content', message: 'Review too short (min 10 chars)' });
  } else if (d.content.length > 2000) {
    errors.push({ field: 'content', message: 'Review too long (max 2000 chars)' });
  }

  if (!d.productId || typeof d.productId !== 'string') {
    errors.push({ field: 'productId', message: 'Product ID is required' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      rating: d.rating,
      title: d.title,
      content: d.content,
      productId: d.productId,
    },
  };
}

// ============ Project Schema ============

export interface ProjectData {
  name: string;
  description?: string;
  kitchenType?: string;
  floorPlanData?: string;
}

export function validateProject(data: unknown): { success: boolean; data?: ProjectData; errors?: ValidationError[] } {
  if (typeof data !== 'object' || !data) {
    return { success: false, errors: [{ field: 'root', message: 'Invalid input' }] };
  }

  const d = data as Record<string, any>;
  const errors: ValidationError[] = [];

  if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Project name is required' });
  } else if (d.name.length > 200) {
    errors.push({ field: 'name', message: 'Project name too long' });
  }

  if (d.description && typeof d.description === 'string' && d.description.length > 2000) {
    errors.push({ field: 'description', message: 'Description too long (max 2000 chars)' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: d.name,
      description: d.description,
      kitchenType: d.kitchenType,
      floorPlanData: d.floorPlanData,
    },
  };
}
