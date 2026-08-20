const statusConfig = {
  active: { bg: 'bg-success-50', text: 'text-success', dot: 'bg-success', label: 'Active' },
  upcoming: { bg: 'bg-primary-50', text: 'text-primary', dot: 'bg-primary', label: 'Upcoming' },
  completed: { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]', dot: 'bg-[#9CA3AF]', label: 'Completed' },
  paused: { bg: 'bg-warning-50', text: 'text-warning', dot: 'bg-warning', label: 'Paused' },
  expired: { bg: 'bg-danger-50', text: 'text-danger', dot: 'bg-danger', label: 'Expired' },
  taken: { bg: 'bg-success-50', text: 'text-success', dot: 'bg-success', label: 'Taken' },
  missed: { bg: 'bg-danger-50', text: 'text-danger', dot: 'bg-danger', label: 'Missed' },
  delayed: { bg: 'bg-warning-50', text: 'text-warning', dot: 'bg-warning', label: 'Delayed' },
  pending: { bg: 'bg-warning-50', text: 'text-warning', dot: 'bg-warning', label: 'Pending' },
  pending_review: { bg: 'bg-warning-50', text: 'text-warning', dot: 'bg-warning', label: 'Pending Review' },
  reviewed: { bg: 'bg-primary-50', text: 'text-primary', dot: 'bg-primary', label: 'Reviewed' },
  connected: { bg: 'bg-success-50', text: 'text-success', dot: 'bg-success', label: 'Connected' },
  disconnected: { bg: 'bg-danger-50', text: 'text-danger', dot: 'bg-danger', label: 'Disconnected' },
};

export default function StatusBadge({ status, className = '' }) {
  const config = statusConfig[status] || statusConfig.active;

  return (
    <span className={`badge ${config.bg} ${config.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
