import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../api';

export default function SupportView({ vendor }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await API.get('/support/tickets');
      setTickets(res.data);
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error('Subject and message required');
      return;
    }
    setLoading(true);
    try {
      await API.post('/support/tickets', { subject, message });
      toast.success('Support ticket sent!');
      setSubject('');
      setMessage('');
      fetchTickets();
    } catch (error) {
      toast.error('Failed to send ticket');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Open</span>;
      case 'in_progress': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">In Progress</span>;
      case 'resolved': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Resolved</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* New Ticket Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Submit Support Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
          <textarea placeholder="Describe your issue in detail..." rows="4" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
          <button type="submit" disabled={loading} className="bg-brand-orange text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition disabled:opacity-50">
            <Send size={16} /> {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>

      {/* Ticket History */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Your Tickets</h3>
        {tickets.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No support tickets yet</p>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div key={ticket.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-sm text-gray-600 mt-1">{ticket.message}</p>
                    {ticket.admin_reply && (
                      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                        <strong>Admin Reply:</strong> {ticket.admin_reply}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    {getStatusBadge(ticket.status)}
                    <span className="text-xs text-gray-400 mt-1">{new Date(ticket.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}