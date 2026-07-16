import React, { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getAdminAiLogDetail,
  getAdminAiLogs,
  getAdminTrips,
  getAdminUsers,
} from '../../services/admin';
import {
  AdminUserOption,
  AiInteractionLogDetail,
  AiInteractionLogSummary,
  Trip,
} from '../../types';

interface AdminPanelProps {
  onLogout: () => void;
  onTripSelect?: (trip: Trip) => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout, onTripSelect }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [logs, setLogs] = useState<AiInteractionLogSummary[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AiInteractionLogDetail | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch(() => setError(t('admin_load_error')));
  }, [t]);

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true);
    setError(null);
    try {
      const data = await getAdminTrips(selectedUserId ? Number(selectedUserId) : undefined);
      setTrips(data);
    } catch {
      setError(t('admin_load_error'));
    } finally {
      setLoadingTrips(false);
    }
  }, [selectedUserId, t]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setError(null);
    try {
      const data = await getAdminAiLogs({
        userId: selectedUserId ? Number(selectedUserId) : undefined,
        limit: 100,
      });
      setLogs(data.logs);
    } catch {
      setError(t('admin_load_error'));
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedUserId, t]);

  useEffect(() => {
    if (tab === 0) loadTrips();
    if (tab === 1) loadLogs();
  }, [tab, loadTrips, loadLogs]);

  const openLogDetail = async (logId: number) => {
    setLogDialogOpen(true);
    setLogLoading(true);
    setSelectedLog(null);
    try {
      const detail = await getAdminAiLogDetail(logId);
      setSelectedLog(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin_load_error');
      setError(message);
      setLogDialogOpen(false);
    } finally {
      setLogLoading(false);
    }
  };

  const userFilter = (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel>{t('admin_filter_user')}</InputLabel>
      <Select
        label={t('admin_filter_user')}
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(String(e.target.value))}
      >
        <MenuItem value="">{t('admin_all_users')}</MenuItem>
        {users.map((user) => (
          <MenuItem key={user.id} value={String(user.id)}>
            {user.username} ({user.name})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('admin_panel')}
          </Typography>
          <IconButton color="inherit" onClick={onLogout} aria-label={t('logout')}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
          <Tab label={t('admin_trips_tab')} />
          <Tab label={t('admin_ai_logs_tab')} />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          {userFilter}
          <Button variant="outlined" onClick={() => (tab === 0 ? loadTrips() : loadLogs())}>
            {t('refresh')}
          </Button>
        </Box>

        {tab === 0 && (
          <Paper>
            {loadingTrips ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('trip_name')}</TableCell>
                    <TableCell>{t('admin_owner')}</TableCell>
                    <TableCell>{t('start_date')}</TableCell>
                    <TableCell>{t('end_date')}</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id} hover>
                      <TableCell>{trip.name}</TableCell>
                      <TableCell>
                        {(trip.users && trip.users.length > 0)
                          ? trip.users.map((u) => u.username).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>{formatDateTime(trip.startDate)}</TableCell>
                      <TableCell>{formatDateTime(trip.endDate)}</TableCell>
                      <TableCell align="right">
                        {onTripSelect && (
                          <Button size="small" onClick={() => onTripSelect(trip)}>
                            {t('open')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {trips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        {t('admin_no_trips')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {tab === 1 && (
          <Paper>
            {loadingLogs ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('date')}</TableCell>
                    <TableCell>{t('admin_owner')}</TableCell>
                    <TableCell>{t('admin_feature')}</TableCell>
                    <TableCell>{t('admin_operation')}</TableCell>
                    <TableCell>{t('admin_session')}</TableCell>
                    <TableCell>{t('status')}</TableCell>
                    <TableCell align="right">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>{log.user?.username || '—'}</TableCell>
                      <TableCell>{log.feature}</TableCell>
                      <TableCell>{log.operation}</TableCell>
                      <TableCell>
                        {log.sessionType ? `${log.sessionType} #${log.sessionId ?? '—'}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={log.status}
                          color={log.status === 'success' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => openLogDetail(log.id)}>
                          {t('admin_view_details')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        {t('admin_no_logs')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}
      </Box>

      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{t('admin_ai_log_detail')}</DialogTitle>
        <DialogContent dividers>
          {logLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!logLoading && selectedLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2">
                {t('admin_feature')}: {selectedLog.feature} / {selectedLog.operation}
              </Typography>
              <Typography variant="subtitle2">{t('admin_system_prompt')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                {selectedLog.systemPrompt || '—'}
              </Paper>
              <Typography variant="subtitle2">{t('admin_user_prompt')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                {selectedLog.userPrompt || '—'}
              </Paper>
              <Typography variant="subtitle2">{t('admin_request_payload')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(selectedLog.requestPayload, null, 2)}</pre>
              </Paper>
              <Typography variant="subtitle2">{t('admin_raw_response')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                {selectedLog.rawResponse || '—'}
              </Paper>
              <Typography variant="subtitle2">{t('admin_parsed_response')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 240, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
                <pre style={{ margin: 0 }}>
                  {selectedLog.parsedResponse != null
                    ? JSON.stringify(selectedLog.parsedResponse, null, 2)
                    : '—'}
                </pre>
              </Paper>
              {selectedLog.errorMessage && (
                <>
                  <Typography variant="subtitle2" color="error">{t('error')}</Typography>
                  <Typography color="error">{selectedLog.errorMessage}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
