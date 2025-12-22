import { useState, useEffect, useCallback } from 'react';
import { PatientRecord } from '../types';
import { getPatients } from '../services/gcsDataService';

export function usePatients() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([]);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPatients();
      setPatients(data);
      setFilteredPatients(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPatients = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = patients.filter(patient =>
      patient.demographics.name.toLowerCase().includes(lowercaseQuery) ||
      patient.demographics.idNumber.toLowerCase().includes(lowercaseQuery) ||
      patient.contact.email.toLowerCase().includes(lowercaseQuery) ||
      patient.contact.phone.includes(query)
    );
    setFilteredPatients(filtered);
  }, [patients]);

  const filterByCondition = useCallback((condition: string) => {
    if (!condition) {
      setFilteredPatients(patients);
      return;
    }
    const filtered = patients.filter(patient =>
      patient.medicalInfo.chronicConditions.some(c =>
        c.toLowerCase().includes(condition.toLowerCase())
      )
    );
    setFilteredPatients(filtered);
  }, [patients]);

  const sortPatients = useCallback((sortBy: 'name' | 'lastVisit' | 'age') => {
    const sorted = [...filteredPatients].sort((a, b) => {
      if (sortBy === 'name') {
        return a.demographics.name.localeCompare(b.demographics.name);
      } else if (sortBy === 'age') {
        return b.demographics.age - a.demographics.age;
      } else if (sortBy === 'lastVisit') {
        const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
    setFilteredPatients(sorted);
  }, [filteredPatients]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return {
    patients: filteredPatients,
    allPatients: patients,
    loading,
    error,
    searchQuery,
    searchPatients,
    filterByCondition,
    sortPatients,
    reloadPatients: loadPatients,
  };
}
