import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';

const VALID_SLOTS = ['Morning (fasting)', 'After breakfast', 'After lunch', 'After dinner'];

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const todayStr = new Date().toISOString().split('T')[0];

  // Readings state
  const [readings, setReadings] = useState([]);
  const [sugarLevel, setSugarLevel] = useState('');
  const [timing, setTiming] = useState('Morning (fasting)');
  const [date, setDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Inline Edit state
  const [editingId, setEditingId] = useState(null);
  const [editSugar, setEditSugar] = useState('');
  const [editTiming, setEditTiming] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Reports state
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(todayStr);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchReadings = async () => {
    try {
      const res = await API.get(`/readings/${user.id}`);
      setReadings(res.data);
    } catch (err) {
      console.error('Failed to fetch readings:', err);
    }
  };

  const fetchReport = async () => {
    if (!user?.id) return;
    setReportLoading(true);
    try {
      const res = await API.get(`/reports/${user.id}`, {
        params: { type: reportType, date: reportDate },
      });
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchReadings();
    }
  }, [user]);

  useEffect(() => {
    fetchReport();
  }, [user, reportType, reportDate, readings]);

  const handleAddReading = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/readings', {
        user_id: user.id,
        sugar_level: sugarLevel === '' ? '' : Number(sugarLevel),
        timing,
        date,
        notes,
      });
      setSugarLevel('');
      setNotes('');
      fetchReadings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add reading');
    }
  };

  const startEdit = (r) => {
    setError('');
    setEditingId(r.id);
    setEditSugar(r.sugar_level);
    setEditTiming(r.timing);
    setEditNotes(r.notes || '');
  };

  const handleSaveEdit = async (id) => {
    setError('');
    try {
      await API.put(`/readings/${id}`, {
        sugar_level: Number(editSugar),
        timing: editTiming,
        notes: editNotes,
      });
      setEditingId(null);
      fetchReadings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update reading');
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await API.delete(`/readings/${id}`);
      fetchReadings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete reading');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Sweety — Welcome, {user?.name || 'User'}!</h2>
        <button onClick={logout} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </header>

      {error && (
        <div style={{ background: '#ffe6e6', color: '#b30000', padding: '10px 14px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #ffcccc' }}>
          {error}
        </div>
      )}

      {/* LOG READING FORM */}
      <section style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Log Blood Glucose Reading</h3>
        <form onSubmit={handleAddReading}>
          <div style={{ marginBottom: '12px' }}>
            <label>Reading (40–600 mg/dL): </label>
            <input
              type="number"
              value={sugarLevel}
              onChange={(e) => setSugarLevel(e.target.value)}
              placeholder="e.g. 95"
              style={{ padding: '6px', marginLeft: '10px', width: '120px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label>Timing Slot: </label>
            <select value={timing} onChange={(e) => setTiming(e.target.value)} style={{ padding: '6px', marginLeft: '10px' }}>
              {VALID_SLOTS.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label>Date: </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{ padding: '6px', marginLeft: '10px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Notes: </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              style={{ padding: '6px', marginLeft: '10px', width: '60%' }}
            />
          </div>

          <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Add Reading
          </button>
        </form>
      </section>

      {/* REPORTS SECTION */}
      <section style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Glucose Reports</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <button
              type="button"
              onClick={() => setReportType('daily')}
              style={{
                padding: '6px 12px',
                marginRight: '6px',
                background: reportType === 'daily' ? '#007bff' : '#e9ecef',
                color: reportType === 'daily' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setReportType('mtd')}
              style={{
                padding: '6px 12px',
                marginRight: '6px',
                background: reportType === 'mtd' ? '#007bff' : '#e9ecef',
                color: reportType === 'mtd' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Month-to-Date
            </button>
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              style={{
                padding: '6px 12px',
                background: reportType === 'monthly' ? '#007bff' : '#e9ecef',
                color: reportType === 'monthly' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Monthly (Prev Month)
            </button>
          </div>

          <div>
            <label>Selected Date: </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              style={{ padding: '6px' }}
            />
          </div>
        </div>

        {reportLoading ? (
          <p>Loading report...</p>
        ) : !reportData || reportData.count === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No readings recorded for this period ({reportData?.dateRange || reportDate}). Log a reading to see your stats!
          </p>
        ) : (
          <div>
            <p style={{ marginBottom: '12px', color: '#555' }}>
              <strong>Period:</strong> {reportData.dateRange}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: '#f8f9fa', color: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ddd' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Readings</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{reportData.count}</div>
              </div>
              <div style={{ padding: '12px', background: '#f8f9fa', color: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ddd' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Highest (mg/dL)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>{reportData.highest}</div>
              </div>
              <div style={{ padding: '12px', background: '#f8f9fa', color: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ddd' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Lowest (mg/dL)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>{reportData.lowest}</div>
              </div>
              <div style={{ padding: '12px', background: '#f8f9fa', color: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ddd' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Average (mg/dL)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>{reportData.average}</div>
              </div>
            </div>

            {reportType === 'daily' && reportData.readings?.length > 0 && (
              <div>
                <h4>Daily Breakdown</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  {reportData.readings.map((item) => (
                    <li key={item.id} style={{ marginBottom: '4px' }}>
                      <strong>{item.timing}:</strong> {item.sugar_level} mg/dL {item.notes ? `(${item.notes})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* RECENT READINGS TABLE WITH EDIT & DELETE */}
      <section>
        <h3>All Readings</h3>
        {readings.length === 0 ? (
          <p>No readings logged yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: '#f2f2f2', color: '#333', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Sugar Level (mg/dL)</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Timing</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Notes</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>

                  {editingId === r.id ? (
                    <>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <input
                          type="number"
                          value={editSugar}
                          onChange={(e) => setEditSugar(e.target.value)}
                          style={{ width: '80px', padding: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <select value={editTiming} onChange={(e) => setEditTiming(e.target.value)} style={{ padding: '4px' }}>
                          {VALID_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          style={{ width: '100%', padding: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <button
                          onClick={() => handleSaveEdit(r.id)}
                          style={{ padding: '4px 10px', marginRight: '6px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ padding: '4px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                        {r.sugar_level}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.timing}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.notes || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <button
                          onClick={() => startEdit(r)}
                          style={{ padding: '4px 10px', marginRight: '6px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          style={{ padding: '4px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Dashboard;