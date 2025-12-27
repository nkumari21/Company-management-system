import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { Add, CheckCircle, Cancel } from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    type: 'leave',
    description: '',
    metadata: {}
  });

  const isEmployee = user?.role === 'employee';
  const canApprove = user?.role !== 'employee';

  useEffect(() => {
    fetchRequests();
  }, [tabValue]);

  const fetchRequests = async () => {
    try {
      let endpoint = '/api/requests';
      if (isEmployee && tabValue === 0) {
        endpoint = '/api/requests/my-requests';
      } else if (canApprove && tabValue === 1) {
        endpoint = '/api/requests/pending';
      }
      
      const res = await axios.get(endpoint);
      setRequests(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ type: 'leave', description: '', metadata: {} });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      await axios.post('/api/requests', formData);
      toast.success('Request created successfully');
      handleCloseDialog();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await axios.put(`/api/requests/${requestId}/approve`);
      toast.success('Request approved');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Enter rejection reason (optional):');
    try {
      await axios.put(`/api/requests/${requestId}/reject`, { reason: reason || '' });
      toast.success('Request rejected');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'leave': return 'primary';
      case 'expense': return 'secondary';
      case 'task': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5">
            Requests
          </Typography>
          {isEmployee && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
            >
              Create Request
            </Button>
          )}
        </Box>

        {canApprove && (
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
            <Tab label="All Requests" />
            <Tab label="Pending Approval" />
          </Tabs>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                {!isEmployee && <TableCell>Created By</TableCell>}
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                {canApprove && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>
                    <Chip
                      label={request.type}
                      size="small"
                      color={getTypeColor(request.type)}
                    />
                  </TableCell>
                  <TableCell>{request.description}</TableCell>
                  {!isEmployee && (
                    <TableCell>
                      {request.createdBy?.name || 'N/A'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={request.status}
                      size="small"
                      color={getStatusColor(request.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                  {canApprove && request.status === 'pending' && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApprove(request._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleReject(request._id)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {requests.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No requests found
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Request Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="leave">Leave</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="task">Task</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={4}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.description.trim()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Requests;
