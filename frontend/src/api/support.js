import API from './client';

export const fetchTickets = () => API.get('/support/tickets');
export const createTicket = (payload) => API.post('/support/tickets', payload);
