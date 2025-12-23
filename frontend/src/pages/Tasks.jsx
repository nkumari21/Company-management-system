// frontend/src/pages/Tasks.jsx

import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Autocomplete,
} from '@mui/material';
import { Edit, Delete, Add, CloudUpload } from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchTasks();
    if (user?.role !== 'employee') {
      fetchUsers();
    }
  }, [user?.role]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/api/tasks');
      setTasks(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      const allUsers = res.data.data || [];
      // Filter to only show employees (tasks can only be assigned to employees)
      const assignableUsers = allUsers.filter(u => u.role === 'employee');
      setUsers(assignableUsers);
    } catch (err) {
      console.error('Failed to fetch users');
      setUsers([]);
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      const assignedUser = users.find(u => u._id === task.assignedTo?._id) || null;
      setSelectedUser(assignedUser);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assignedTo?._id || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        status: task.status || 'pending'
      });
    } else {
      setEditingTask(null);
      setSelectedUser(null);
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
        status: 'pending'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setSelectedUser(null);
  };

  const handleOpenCompleteDialog = (task) => {
    setCompletingTask(task);
    setSelectedFile(null);
    setOpenCompleteDialog(true);
  };

  const handleCloseCompleteDialog = () => {
    setOpenCompleteDialog(false);
    setCompletingTask(null);
    setSelectedFile(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext !== 'pdf' && ext !== 'csv') {
        toast.error('Only PDF and CSV files are allowed');
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF or CSV file');
      return;
    }

    setSubmitting(true);
    const formDataUpload = new FormData();
    formDataUpload.append('completionFile', selectedFile);

    try {
      await axios.post(`/api/tasks/${completingTask._id}/complete`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Task completed successfully!');
      handleCloseCompleteDialog();
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserSelect = (event, newValue) => {
    setSelectedUser(newValue);
    setFormData(prev => ({
      ...prev,
      assignedTo: newValue?._id || ''
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.assignedTo) {
      toast.error('Please select an employee to assign');
      return;
    }

    try {
      if (editingTask) {
        await axios.put(`/api/tasks/${editingTask._id}`, formData);
        toast.success('Task updated successfully');
      } else {
        await axios.post('/api/tasks', formData);
        toast.success('Task created successfully');
      }
      handleCloseDialog();
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`/api/tasks/${taskId}`);
        toast.success('Task deleted successfully');
        fetchTasks();
      } catch (err) {
        toast.error('Failed to delete task');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'review': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const canCreateTask = user?.role !== 'employee';
  const canEditTask = user?.role !== 'employee';
  const canDeleteTask = user?.role !== 'employee';

  const isAssignedUser = (task) => {
    return task.assignedTo?._id === user?.id || task.assignedTo === user?.id;
  };

  const canCompleteTask = (task) => {
    return user?.role === 'employee' &&
           isAssignedUser(task) &&
           task.status !== 'completed';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5">
            Tasks Management
          </Typography>
          {canCreateTask && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Create Task
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task._id}>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>
                    {task.description?.length > 50
                      ? `${task.description.substring(0, 50)}...`
                      : task.description}
                  </TableCell>
                  <TableCell>{task.assignedTo?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.status}
                      size="small"
                      color={getStatusColor(task.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : 'No due date'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {canCompleteTask(task) && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<CloudUpload />}
                          onClick={() => handleOpenCompleteDialog(task)}
                        >
                          Upload Work
                        </Button>
                      )}
                      {canEditTask && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(task)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      {canDeleteTask && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(task._id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {tasks.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No tasks found
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Create/Edit Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
          />

          {/* Autocomplete for Assign To - allows typing email to search */}
          <Autocomplete
            options={users}
            value={selectedUser}
            onChange={handleUserSelect}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            filterOptions={(options, { inputValue }) => {
              const filterValue = inputValue.toLowerCase();
              return options.filter(
                (option) =>
                  option.name.toLowerCase().includes(filterValue) ||
                  option.email.toLowerCase().includes(filterValue)
              );
            }}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.email} - {option.department}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assign To (Search by name or email)"
                margin="normal"
                required
                placeholder="Type name or email to search..."
                helperText={users.length === 0 ? "No employees available in your department" : ""}
              />
            )}
            noOptionsText="No employees found"
            isOptionEqualToValue={(option, value) => option._id === value?._id}
          />

          <TextField
            fullWidth
            select
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
          {editingTask && (
            <TextField
              fullWidth
              select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              margin="normal"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </TextField>
          )}
          <TextField
            fullWidth
            label="Due Date"
            name="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={handleChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.title || !formData.assignedTo}
          >
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Work Dialog */}
      <Dialog open={openCompleteDialog} onClose={handleCloseCompleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upload Work: {completingTask?.title}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload your work file (PDF or CSV) to submit this task. Task will be marked as completed after upload.
          </Alert>

          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".pdf,.csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
              id="completion-file-input"
            />
            <label htmlFor="completion-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                fullWidth
              >
                Select PDF or CSV File
              </Button>
            </label>

            {selectedFile && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Selected File:</strong> {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteTask}
            variant="contained"
            color="primary"
            disabled={!selectedFile || submitting}
            startIcon={<CloudUpload />}
          >
            {submitting ? 'Uploading...' : 'Submit Work'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tasks;
