import { AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const severityStyles = {
  high: { bg: 'bg-danger-50', border: 'border-danger/20', icon: 'text-danger', badge: 'bg-danger-light text-danger' },
  moderate: { bg: 'bg-warning-50', border: 'border-warning/20', icon: 'text-warning', badge: 'bg-warning-light text-warning' },
  low: { bg: 'bg-primary-50', border: 'border-primary/20', icon: 'text-primary', badge: 'bg-primary-100 text-primary' },
};

export default function SafetyAlertCard({
  flag,
  onViewDetails,
  onMarkReviewed,
  className = '',
}) {
  const [reviewed, setReviewed] = useState(flag.reviewed || false);
  const [showDetails, setShowDetails] = useState(false);

  const style = severityStyles[flag.severity] || severityStyles.moderate;

  const handleReview = () => {
    setReviewed(true);
    onMarkReviewed?.(flag);
  };

  return (
    <div
      className={`card ${style.bg} border ${style.border} p-5 fade-in ${reviewed ? 'opacity-60' : ''} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${style.icon}`}>
          <AlertTriangle size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text text-base">
              ⚠ POTENTIAL INTERACTION
            </h3>
            <span className={`badge ${style.badge} text-xs font-medium uppercase`}>
              {flag.severity} severity
            </span>
          </div>

          {/* Drug pair */}
          {flag.drug_names && (
            <div className="flex items-center gap-2 mt-2">
              <span className="badge bg-white/80 text-text font-medium border border-border-light">
                💊 {flag.drug_names[0]}
              </span>
              <span className="text-text-muted text-sm">+</span>
              <span className="badge bg-white/80 text-text font-medium border border-border-light">
                💊 {flag.drug_names[1]}
              </span>
            </div>
          )}

          {/* Risk summary */}
          <p className="text-text mt-3 text-sm leading-relaxed">
            {flag.summary}
          </p>

          {/* Details (expandable) */}
          {showDetails && (
            <div className="mt-3 p-3 bg-white/60 rounded-lg border border-border-light">
              <p className="text-sm text-text-secondary leading-relaxed">
                {flag.recommendation}
              </p>
            </div>
          )}

          {/* Professional review line */}
          <p className="text-text-secondary text-xs mt-3 italic flex items-center gap-1.5">
            <span>🩺</span>
            Review with healthcare professional before making any changes
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-light/50">
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            onViewDetails?.(flag);
          }}
          className="btn btn-secondary text-sm"
        >
          <Eye size={16} />
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
        <button
          onClick={handleReview}
          className={`btn text-sm ${reviewed ? 'bg-success/10 text-success border border-success/20' : 'btn-outline'}`}
          disabled={reviewed}
        >
          <CheckCircle2 size={16} />
          {reviewed ? 'Reviewed ✓' : 'Mark Reviewed'}
        </button>
      </div>
    </div>
  );
}
