
import React, { useState, useCallback, useEffect } from 'react';
import { DisciplineRecord, InfractionType, Student, FitnessRecord, Restriction, DutyAssignment } from './types';
import Header from './components/Header';
import DisciplineForm from './components/DisciplineForm';
import RecordList from './components/RecordList';
import Login from './components/Login';
import FitnessTracker from './components/FitnessTracker';
import StudentDatabase from './components/StudentDatabase';
import ViolationWatchlist from './components/ViolationWatchlist';
import DutyRoster from './components/DutyRoster';
import { db, isFirebaseActive, syncStudents, addDisciplineRecord, saveRestriction, deleteRestriction as firebaseDeleteRestriction } from './services/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { initialDutyRoster } from './data/dutyData';

const App: React.FC = () => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('shraddha-discipline-tracker-user');
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('shraddha-discipline-tracker-is-admin') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'discipline' | 'watchlist' | 'fitness' | 'duty' | 'students'>('discipline');
  const [isCloudActive, setIsCloudActive] = useState(isFirebaseActive());

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('shraddha-student-roster');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'std-1', name: 'Senora L', class: '3', section: 'A', enrollmentNo: 'SCAK002226' },
      { id: 'std-2', name: 'Aditya Kumar', class: '4', section: 'B', enrollmentNo: 'SCAK002227' }
    ];
  });

  const [records, setRecords] = useState<DisciplineRecord[]>(() => {
    const saved = localStorage.getItem('shraddha-discipline-records');
    return saved ? JSON.parse(saved) : [];
  });

  const [fitnessRecords, setFitnessRecords] = useState<FitnessRecord[]>(() => {
    const saved = localStorage.getItem('shraddha-fitness-records');
    return saved ? JSON.parse(saved) : [];
  });

  const [restrictions, setRestrictions] = useState<Restriction[]>(() => {
    const saved = localStorage.getItem('shraddha-restrictions');
    return saved ? JSON.parse(saved) : [];
  });

  const [dutyRoster, setDutyRoster] = useState<DutyAssignment[]>(() => {
    const saved = localStorage.getItem('shraddha-duty-roster');
    return saved ? JSON.parse(saved) : initialDutyRoster;
  });

  // FIREBASE REAL-TIME SYNC
  useEffect(() => {
    if (!db) return;

    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Student);
      if (list.length > 0) setStudents(list);
    });

    const qDiscipline = query(collection(db, "discipline_records"), orderBy("date", "desc"));
    const unsubDiscipline = onSnapshot(qDiscipline, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DisciplineRecord));
      setRecords(list);
    });

    const unsubFitness = onSnapshot(collection(db, "fitness_records"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as FitnessRecord);
      if (list.length > 0) setFitnessRecords(list);
    });

    const unsubRestrictions = onSnapshot(collection(db, "restrictions"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Restriction);
      setRestrictions(list);
    });

    const unsubDuty = onSnapshot(collection(db, "duty_roster"), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as DutyAssignment);
      if (list.length > 0) setDutyRoster(list);
    });

    return () => {
      unsubStudents();
      unsubDiscipline();
      unsubFitness();
      unsubRestrictions();
      unsubDuty();
    };
  }, []);

  // PERSIST TO LOCAL STORAGE (Crucial for Local Mode)
  useEffect(() => {
    localStorage.setItem('shraddha-student-roster', JSON.stringify(students));
    localStorage.setItem('shraddha-discipline-records', JSON.stringify(records));
    localStorage.setItem('shraddha-fitness-records', JSON.stringify(fitnessRecords));
    localStorage.setItem('shraddha-restrictions', JSON.stringify(restrictions));
    localStorage.setItem('shraddha-duty-roster', JSON.stringify(dutyRoster));
  }, [students, records, fitnessRecords, restrictions, dutyRoster]);

  const handleImportStudents = async (newList: Student[]) => {
    setStudents(newList);
    if (db) await syncStudents(newList);
  };

  const handleClearStudents = () => {
    if(confirm('Clear current roster?')) {
      setStudents([]);
    }
  };

  const handleLogin = (identifier: string, adminStatus: boolean) => {
    setCurrentUserEmail(identifier);
    setIsAdmin(adminStatus);
    localStorage.setItem('shraddha-discipline-tracker-user', identifier);
    localStorage.setItem('shraddha-discipline-tracker-is-admin', adminStatus ? 'true' : 'false');
  };

  const handleLogout = () => {
    setCurrentUserEmail(null);
    setIsAdmin(false);
    localStorage.removeItem('shraddha-discipline-tracker-user');
    localStorage.removeItem('shraddha-discipline-tracker-is-admin');
  };

  const handleAddRecord = useCallback(async (newRecord: Omit<DisciplineRecord, 'id' | 'date' | 'enteredBy'>) => {
    if (!currentUserEmail) return;
    const recordData = {
      ...newRecord,
      date: new Date().toISOString().split('T')[0],
      enteredBy: currentUserEmail,
    };
    if (db) {
      await addDisciplineRecord(recordData);
    } else {
      const localRec: DisciplineRecord = { ...recordData, id: `dr-${Date.now()}`, isNew: true };
      setRecords(prev => [localRec, ...prev]);
    }
  }, [currentUserEmail]);

  const handleSaveRestriction = async (restr: Restriction) => {
    if (db) {
      await saveRestriction(restr);
    } else {
      setRestrictions(prev => [...prev.filter(r => r.id !== restr.id), restr]);
    }
  };

  const handleDeleteRestriction = async (id: string) => {
    if (db) {
      await firebaseDeleteRestriction(id);
    } else {
      setRestrictions(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleUpdateDutyRoster = async (newList: DutyAssignment[]) => {
    setDutyRoster(newList);
    if (db) {
      // In a production app, we would ideally sync only changed docs, 
      // but for this implementation we'll assume the local state is master.
      for (const assignment of newList) {
        await setDoc(doc(db, "duty_roster", assignment.id), assignment);
      }
    }
  };

  if (!currentUserEmail) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header userEmail={currentUserEmail} onLogout={handleLogout} />
      
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
          <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'discipline', label: 'Discipline' },
              { id: 'watchlist', label: 'Violations' },
              { id: 'fitness', label: 'Fitness' },
              { id: 'duty', label: 'Duty Roster' },
              { id: 'students', label: 'Master Roster' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-5 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-3 ml-4">
            {isAdmin && (
              <div className="hidden md:flex items-center text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200">
                Admin
              </div>
            )}
            <div className={`flex items-center text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${isCloudActive ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-amber-500 bg-amber-50 border-amber-100'}`}>
              {isCloudActive ? 'Live Cloud' : 'Local Storage'}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'discipline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <DisciplineForm onAddRecord={handleAddRecord} students={students} />
              </div>
              <div className="lg:col-span-2">
                <RecordList records={records} restrictions={restrictions} />
              </div>
            </div>
          )}

          {activeTab === 'watchlist' && (
            <ViolationWatchlist 
              records={records} 
              restrictions={restrictions}
              students={students}
              onSaveRestriction={handleSaveRestriction}
              onDeleteRestriction={handleDeleteRestriction}
              currentUserEmail={currentUserEmail}
            />
          )}
          
          {activeTab === 'fitness' && (
            <FitnessTracker 
              students={students} 
              records={fitnessRecords} 
              onUpdateRecords={(updated) => setFitnessRecords(updated)}
            />
          )}

          {activeTab === 'duty' && (
            <DutyRoster 
              roster={dutyRoster} 
              onUpdateRoster={handleUpdateDutyRoster} 
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'students' && (
            <StudentDatabase 
              students={students} 
              disciplineRecords={records}
              fitnessRecords={fitnessRecords}
              onImport={handleImportStudents} 
              onClear={handleClearStudents} 
              onFullRestore={(data) => {
                if (data.students) setStudents(data.students);
                if (data.disciplineRecords) setRecords(data.disciplineRecords);
                if (data.fitnessRecords) setFitnessRecords(data.fitnessRecords);
                if (data.restrictions) setRestrictions(data.restrictions);
                if (data.dutyRoster) setDutyRoster(data.dutyRoster);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
