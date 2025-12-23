// frontend/src/pages/Salary.jsx

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Salary = () => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    userId: '',
    month: '',
    year: new Date().getFullYear(),
    basicSalary: '',
    allowances: 0,
    deductions: 0,
  });

  // Auto-calculate net salary
  const netSalary = (Number(formData.basicSalary) || 0) + (Number(formData.allowances) || 0) - (Number(formData.deductions) || 0);

  // Check if user can assign salary (Founder or Co-Founder only)
  const canAssignSalary = user?.role === 'founder' || user?.role === 'co-founder';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchSalaries();
    if (canAssignSalary) {
      fetchUsers();
    }
  }, [canAssignSalary]);

  const fetchSalaries = async () => {
    try {
      const res = await axios.get('/api/salaries');
      setSalaries(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load salary data');
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      // Filter to only show lower roles that can have salary assigned
      const lowerRoleUsers = res.data.data.filter(u => {
        if (user?.role === 'founder') {
          // Founder can assign to everyone except other founders
          return u.role !== 'founder';
        } else if (user?.role === 'co-founder') {
          // Co-founder can assign to department heads and employees only
          return u.role !== 'founder' && u.role !== 'co-founder';
        }
        return false;
      });
      setUsers(lowerRoleUsers);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      userId: '',
      month: '',
      year: currentYear,
      basicSalary: '',
      allowances: 0,
      deductions: 0,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.userId) {
      toast.error('Please select an employee');
      return;
    }
    if (!formData.month) {
      toast.error('Please select a month');
      return;
    }
    if (!formData.basicSalary || Number(formData.basicSalary) <= 0) {
      toast.error('Please enter a valid basic salary');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/salaries', {
        userId: formData.userId,
        month: formData.month,
        year: Number(formData.year),
        basicSalary: Number(formData.basicSalary),
        allowances: Number(formData.allowances) || 0,
        deductions: Number(formData.deductions) || 0,
      });
      toast.success('Salary assigned successfully');
      handleCloseDialog();
      fetchSalaries();
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || 'Unauthorized: Only Founder and Co-Founder can assign salaries');
      } else {
        toast.error(err.response?.data?.message || 'Failed to assign salary');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Salary Records
          </Typography>
          {canAssignSalary && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
            >
              Assign Salary
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {user?.role !== 'employee' && <TableCell>Employee Name</TableCell>}
                <TableCell>Month</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Basic Salary</TableCell>
                <TableCell>Allowances</TableCell>
                <TableCell>Deductions</TableCell>
                <TableCell>Net Salary</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Department</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salaries.map((salary) => (
                <TableRow key={salary._id}>
                  {user?.role !== 'employee' && (
                    <TableCell>{salary.user?.name || 'N/A'}</TableCell>
                  )}
                  <TableCell>{salary.month}</TableCell>
                  <TableCell>{salary.year}</TableCell>
                  <TableCell>₹{(salary.basicSalary || 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(salary.allowances || 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(salary.deductions || 0).toLocaleString()}</TableCell>
                  <TableCell>₹{(salary.netSalary || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={salary.status}
                      size="small"
                      color={
                        salary.status === 'paid' ? 'success' :
                        salary.status === 'pending' ? 'warning' : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {salary.department || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {salaries.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No salary records found
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Assign Salary Dialog - Only for Founder/Co-Founder */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Salary
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Select Employee</InputLabel>
            <Select
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              label="Select Employee"
            >
              {users.map((u) => (
                <MenuItem key={u._id} value={u._id}>
                  {u.name} ({u.role}) - {u.department || 'No Dept'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Month</InputLabel>
              <Select
                name="month"
                value={formData.month}
                onChange={handleChange}
                label="Month"
              >
                {months.map((month) => (
                  <MenuItem key={month} value={month}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Year</InputLabel>
              <Select
                name="year"
                value={formData.year}
                onChange={handleChange}
                label="Year"
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Basic Salary"
            name="basicSalary"
            type="number"
            value={formData.basicSalary}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{ inputProps: { min: 0 } }}
          />

          <TextField
            fullWidth
            label="Allowances"
            name="allowances"
            type="number"
            value={formData.allowances}
            onChange={handleChange}
            margin="normal"
            InputProps={{ inputProps: { min: 0 } }}
          />

          <TextField
            fullWidth
            label="Deductions"
            name="deductions"
            type="number"
            value={formData.deductions}
            onChange={handleChange}
            margin="normal"
            InputProps={{ inputProps: { min: 0 } }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Net Salary (Auto-calculated):</strong> ₹{netSalary.toLocaleString()}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Assigning...' : 'Assign Salary'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Salary;
