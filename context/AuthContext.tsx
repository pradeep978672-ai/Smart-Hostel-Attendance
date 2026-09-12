'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, UserRole } from '@/types/database';
import { getStudentByRollNumber } from '@/services/studentService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getStoredStudents } from '@/services/mockDataService';
import { verifyPassword, hashPassword, isSha256Hash } from '@/lib/password';

interface AuthContextType {
  role: UserRole | null;
  currentStudent: Student | null;
  adminUser: { id: string; name: string; email: string } | null;
  loginAsAdmin: (email: string, pass: string) => Promise<boolean>;
  loginAsStudent: (rollNumber: string, passOrPasskey: string) => Promise<boolean>;
  logout: () => void;
  devTimeWindowBypass: boolean;
  setDevTimeWindowBypass: (val: boolean) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [adminUser, setAdminUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [devTimeWindowBypass, setDevTimeWindowBypass] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedRole = localStorage.getItem('auth_role') as UserRole | null;
        const savedStudent = localStorage.getItem('auth_student');
        const savedAdmin = localStorage.getItem('auth_admin');

        if (savedRole === 'ADMIN' && savedAdmin) {
          setRole('ADMIN');
          setAdminUser(JSON.parse(savedAdmin));
        } else if (savedRole === 'STUDENT' && savedStudent) {
          const parsed: Student = JSON.parse(savedStudent);

          if (isSupabaseConfigured()) {
            // Re-fetch fresh student data from Supabase on session restore
            // This ensures stale localStorage cache does not represent deleted/updated students
            try {
              const fresh = await getStudentByRollNumber(parsed.roll_number);
              if (fresh) {
                setRole('STUDENT');
                setCurrentStudent(fresh);
                // Update local cache with fresh data
                localStorage.setItem('auth_student', JSON.stringify(fresh));
              } else {
                // Student no longer exists in Supabase — clear session
                localStorage.removeItem('auth_role');
                localStorage.removeItem('auth_student');
              }
            } catch {
              // Network error: use cached data temporarily
              setRole('STUDENT');
              setCurrentStudent(parsed);
            }
          } else {
            // Supabase not configured: use localStorage session as-is
            setRole('STUDENT');
            setCurrentStudent(parsed);
          }
        } else if (!isSupabaseConfigured()) {
          // Auto-seed first mock student only when Supabase is NOT configured (dev/demo mode)
          const defaultStudents = getStoredStudents();
          if (defaultStudents.length > 0) {
            setRole('STUDENT');
            setCurrentStudent(defaultStudents[0]);
            localStorage.setItem('auth_role', 'STUDENT');
            localStorage.setItem('auth_student', JSON.stringify(defaultStudents[0]));
          }
        }
        // When Supabase IS configured and no saved session: stay logged out (require login)
      } catch {
        // Fallback ignore
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginAsAdmin = async (email: string, pass: string): Promise<boolean> => {
    if (!email || !pass) return false;
    const adminData = { id: 'admin-001', name: 'Chief Warden (Admin)', email };
    setRole('ADMIN');
    setAdminUser(adminData);
    setCurrentStudent(null);

    localStorage.setItem('auth_role', 'ADMIN');
    localStorage.setItem('auth_admin', JSON.stringify(adminData));
    localStorage.removeItem('auth_student');
    return true;
  };

  const loginAsStudent = async (rollNumber: string, passOrPasskey: string): Promise<boolean> => {
    const cleanRoll = (rollNumber || '').trim();
    if (!cleanRoll) return false;

    const student = await getStudentByRollNumber(cleanRoll);
    if (!student) return false;

    // Password validation (unless using WebAuthn passkey)
    if (passOrPasskey !== 'passkey-auth') {
      if (student.password_hash) {
        const isPasswordValid = await verifyPassword(passOrPasskey, student.password_hash);
        if (!isPasswordValid) {
          return false;
        }

        // If this student was created before SHA-256 hashing and has a legacy plaintext record in DB,
        // seamlessly upgrade their password_hash in Supabase to a secure SHA-256 hash.
        if (isSupabaseConfigured() && !isSha256Hash(student.password_hash)) {
          (async () => {
            try {
              const newHash = await hashPassword(passOrPasskey);
              const { error } = await supabase
                .from('students')
                .update({ password_hash: newHash })
                .eq('id', student.id);
              if (!error) {
                student.password_hash = newHash;
              }
            } catch {
              // Ignore background hash upgrade error
            }
          })();
        }
      }
    }

    // Sanitize student object: NEVER expose or store password_hash in client storage
    const sanitizedStudent: Student = { ...student };
    delete sanitizedStudent.password_hash;

    setRole('STUDENT');
    setCurrentStudent(sanitizedStudent);
    setAdminUser(null);

    localStorage.setItem('auth_role', 'STUDENT');
    localStorage.setItem('auth_student', JSON.stringify(sanitizedStudent));
    localStorage.removeItem('auth_admin');
    return true;
  };

  const logout = () => {
    setRole(null);
    setCurrentStudent(null);
    setAdminUser(null);
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_student');
    localStorage.removeItem('auth_admin');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        currentStudent,
        adminUser,
        loginAsAdmin,
        loginAsStudent,
        logout,
        devTimeWindowBypass,
        setDevTimeWindowBypass,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
