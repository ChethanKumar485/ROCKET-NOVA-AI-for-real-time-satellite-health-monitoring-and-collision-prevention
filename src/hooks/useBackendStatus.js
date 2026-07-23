import { useBackendStatus } from '../hooks/useBackendStatus';

function StatusBadge() {
  const { online } = useBackendStatus();
  return (
    <span className={online ? 'status-online' : 'status-offline'}>
      {online ? 'ONLINE' : 'OFFLINE'}
    </span>
  );
}
