import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    setEditTiming(r.timing || r.timing_slot);
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

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReadings = readings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(readings.length / itemsPerPage);

  // Prepare data for Recharts
  const chartData = [...readings]
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at))
    .map((r) => ({
      date: r.date ? r.date.split('T')[0] : new Date(r.created_at).toLocaleDateString(),
      sugar: r.sugar_level,
      timing: r.timing || r.timing_slot,
    }));

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

      {/* REPORTS SECTION & RECHARTS */}
      <section style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Glucose Reports & Trends</h3>
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
              <div style={{ marginBottom: '20px' }}>
                <h4>Daily Breakdown</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  {reportData.readings.map((item) => (
                    <li key={item.id} style={{ marginBottom: '4px' }}>
                      <strong>{item.timing || item.timing_slot}:</strong> {item.sugar_level} mg/dL {item.notes ? `(${item.notes})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* RECHARTS TREND GRAPH */}
        {chartData.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4>Glucose Trend Chart</h4>
            <div style={{ width: '100%', height: 280, background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[40, 400]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sugar" name="Sugar Level (mg/dL)" stroke="#007bff" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* RECENT READINGS TABLE WITH PAGINATION & EDIT/DELETE */}
      <section>
        <h3>All Readings</h3>
        {readings.length === 0 ? (
          <p>No readings logged yet.</p>
        ) : (
          <>
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
                {currentReadings.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {r.date ? r.date.split('T')[0] : new Date(r.created_at).toLocaleDateString()}
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
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.timing || r.timing_slot}</td>
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

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', background: currentPage === 1 ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', background: currentPage === totalPages ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Dashboard;