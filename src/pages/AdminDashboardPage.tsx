import React, { useEffect, useState } from 'react';
import { Plus, Shield, Trash2 } from 'lucide-react';
import {
  createFaculty,
  createMajor,
  createSubject,
  deleteFaculty,
  deleteMajor,
  deleteSubject,
  fetchFaculties,
  fetchMajors,
  fetchSubjects,
  type FacultyItem,
  type MajorItem,
  type SubjectItem
} from '../lib/http';

const AdminDashboardPage: React.FC = () => {
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [newFaculty, setNewFaculty] = useState({ nameAr: '', nameFr: '' });
  const [newMajor, setNewMajor] = useState({ nameAr: '', nameFr: '', facultyId: '' });
  const [newSubject, setNewSubject] = useState({ nameAr: '', nameFr: '', facultyId: '', majorId: '' });

  const loadLookups = async () => {
    const [{ data: facultyData }, { data: majorData }, { data: subjectData }] = await Promise.all([
      fetchFaculties(),
      fetchMajors(),
      fetchSubjects(),
    ]);

    setFaculties(facultyData.faculties);
    setMajors(majorData.majors);
    setSubjects(subjectData.subjects);
  };

  useEffect(() => {
    void loadLookups();
  }, []);

  const addFaculty = async (event: React.FormEvent) => {
    event.preventDefault();
    await createFaculty(newFaculty);
    setNewFaculty({ nameAr: '', nameFr: '' });
    await loadLookups();
  };

  const addMajor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMajor.facultyId) return;
    await createMajor(newMajor);
    setNewMajor({ nameAr: '', nameFr: '', facultyId: '' });
    await loadLookups();
  };

  const addSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newSubject.facultyId || !newSubject.majorId) return;
    await createSubject(newSubject);
    setNewSubject({ nameAr: '', nameFr: '', facultyId: '', majorId: '' });
    await loadLookups();
  };

  return (
    <div className="space-y-4">
      <div className="card-surface p-5 flex items-center gap-3">
        <Shield className="text-emerald-600" />
        <div>
          <h1 className="section-title">Console admin</h1>
          <p className="helper-text">Gérez les données réelles : facultés, filières et matières.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Facultés</h3>
            <span className="badge-soft">{faculties.length}</span>
          </div>
          <form className="space-y-2" onSubmit={addFaculty}>
            <input
              className="w-full"
              placeholder="Nom en Ar"
              value={newFaculty.nameAr}
              onChange={(e) => setNewFaculty((prev) => ({ ...prev, nameAr: e.target.value }))}
              required
            />
            <input
              className="w-full"
              placeholder="Nom en Fr"
              value={newFaculty.nameFr}
              onChange={(e) => setNewFaculty((prev) => ({ ...prev, nameFr: e.target.value }))}
              required
            />
            <button type="submit" className="primary-btn w-full">
              <Plus size={16} className="me-1" /> Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {faculties.map((faculty) => (
              <div key={faculty._id} className="card-surface p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{faculty.nameFr}</p>
                  <p className="text-sm text-slate-600">{faculty.nameAr}</p>
                </div>
                <button className="secondary-btn" onClick={() => deleteFaculty(faculty._id).then(loadLookups)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!faculties.length && <p className="text-sm text-slate-500">Aucune faculté enregistrée.</p>}
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Filières</h3>
            <span className="badge-soft">{majors.length}</span>
          </div>
          <form className="space-y-2" onSubmit={addMajor}>
            <select
              className="w-full"
              value={newMajor.facultyId}
              onChange={(e) => setNewMajor((prev) => ({ ...prev, facultyId: e.target.value }))}
              required
            >
              <option value="">Choisir une faculté</option>
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>{faculty.nameFr}</option>
              ))}
            </select>
            <input
              className="w-full"
              placeholder="Nom en Ar"
              value={newMajor.nameAr}
              onChange={(e) => setNewMajor((prev) => ({ ...prev, nameAr: e.target.value }))}
              required
            />
            <input
              className="w-full"
              placeholder="Nom en Fr"
              value={newMajor.nameFr}
              onChange={(e) => setNewMajor((prev) => ({ ...prev, nameFr: e.target.value }))}
              required
            />
            <button type="submit" className="primary-btn w-full">
              <Plus size={16} className="me-1" /> Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {majors.map((major) => (
              <div key={major._id} className="card-surface p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{major.nameFr}</p>
                  <p className="text-sm text-slate-600">{major.facultyId?.nameFr}</p>
                </div>
                <button className="secondary-btn" onClick={() => deleteMajor(major._id).then(loadLookups)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!majors.length && <p className="text-sm text-slate-500">Aucune filière enregistrée.</p>}
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Matières</h3>
            <span className="badge-soft">{subjects.length}</span>
          </div>
          <form className="space-y-2" onSubmit={addSubject}>
            <select
              className="w-full"
              value={newSubject.facultyId}
              onChange={(e) => setNewSubject((prev) => ({ ...prev, facultyId: e.target.value }))}
              required
            >
              <option value="">Choisir une faculté</option>
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>{faculty.nameFr}</option>
              ))}
            </select>
            <select
              className="w-full"
              value={newSubject.majorId}
              onChange={(e) => setNewSubject((prev) => ({ ...prev, majorId: e.target.value }))}
              required
            >
              <option value="">Choisir une filière</option>
              {majors
                .filter((m) => !newSubject.facultyId || m.facultyId?._id === newSubject.facultyId)
                .map((major) => (
                  <option key={major._id} value={major._id}>{major.nameFr}</option>
                ))}
            </select>
            <input
              className="w-full"
              placeholder="Nom en Ar"
              value={newSubject.nameAr}
              onChange={(e) => setNewSubject((prev) => ({ ...prev, nameAr: e.target.value }))}
              required
            />
            <input
              className="w-full"
              placeholder="Nom en Fr"
              value={newSubject.nameFr}
              onChange={(e) => setNewSubject((prev) => ({ ...prev, nameFr: e.target.value }))}
              required
            />
            <button type="submit" className="primary-btn w-full">
              <Plus size={16} className="me-1" /> Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div key={subject._id} className="card-surface p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{subject.nameFr}</p>
                  <p className="text-sm text-slate-600">{subject.majorId?.nameFr}</p>
                </div>
                <button className="secondary-btn" onClick={() => deleteSubject(subject._id).then(loadLookups)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!subjects.length && <p className="text-sm text-slate-500">Aucune matière enregistrée.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
