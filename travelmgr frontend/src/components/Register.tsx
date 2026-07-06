import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { register } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { RegisterData } from '../types';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [data, setData] = useState<RegisterData>({
    username: '',
    name: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await register(data);
      setUser(user);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Travel Manager
      </Typography>
      <Typography variant="h6" gutterBottom align="center">
        Register
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Username"
          value={data.username}
          onChange={(e) => setData({ ...data, username: e.target.value })}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Full Name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          margin="normal"
          required
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </Button>
        <Button
          fullWidth
          variant="text"
          onClick={onSwitchToLogin}
        >
          Already have an account? Login
        </Button>
      </Box>
    </Paper>
  );
};

export default Register;