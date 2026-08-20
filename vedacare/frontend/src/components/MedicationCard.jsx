import { Volume2, Check, Clock, Utensils } from 'lucide-react';
import { useState } from 'react';

const foodLabels = {
  before_food: 'Before food',
  after_food: 'After food',
  with_food: 'With food',
  empty_stomach: 'Empty stomach',
};

const foodIcons = {
  before_food: '🍽️ Before food',
  after_food: '🍽️ After food',
  with_food: '🍽️ With food',
  empty_stomach: '⏰ Empty stomach',
};

export default function MedicationCard({
  medication,
  onMarkTaken,
  onListen,
  showActions = true,
  size = 'normal', // 'normal' | 'large' (patient view)
  className = '',
}) {
  const [taken, setTaken] = useState(false);
  const [playing, setPlaying] = useState(false);

  const handleTaken = () => {
    setTaken(true);
    onMarkTaken?.(medication);
  };

  const handleListen = () => {
    setPlaying(true);
    onListen?.(medication);
    setTimeout(() => setPlaying(false), 3000);
  };

  const isLarge = size === 'large';

  return (
    <div
      className={`card p-${isLarge ? '6' : '5'} fade-in ${taken ? 'opacity-60' : ''} ${className}`}
      style={taken ? { borderColor: 'var(--color-success)' } : {}}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Drug name & strength */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`${isLarge ? 'text-2xl' : 'text-lg'}`}>💊</span>
            <h3
              className={`font-semibold text-text ${isLarge ? 'text-xl' : 'text-base'} truncate`}
            >
              {medication.drug_name}
            </h3>
            <span
              className={`text-text-secondary ${isLarge ? 'text-lg' : 'text-sm'}`}
            >
              {medication.strength}
            </span>
          </div>

          {/* Dose info */}
          <div
            className={`flex flex-wrap items-center gap-3 ${isLarge ? 'mt-3' : 'mt-2'}`}
          >
            {medication.dose_per_intake && (
              <span
                className={`badge bg-primary-50 text-primary ${isLarge ? 'text-base px-3 py-1.5' : ''}`}
              >
                {medication.dose_per_intake} {medication.form || 'dose'}
                {medication.dose_per_intake > 1 ? 's' : ''}
              </span>
            )}
            {medication.food_instruction && (
              <span
                className={`badge bg-warning-50 text-warning ${isLarge ? 'text-base px-3 py-1.5' : ''}`}
              >
                {foodIcons[medication.food_instruction] || medication.food_instruction}
              </span>
            )}
            {medication.timing_slots && medication.timing_slots.length > 0 && (
              <span
                className={`flex items-center gap-1 text-text-secondary ${isLarge ? 'text-base' : 'text-sm'}`}
              >
                <Clock size={isLarge ? 18 : 14} />
                {medication.timing_slots.join(', ')}
              </span>
            )}
          </div>

          {/* Instructions */}
          {medication.special_instructions_en && (
            <p
              className={`text-text-secondary mt-2 ${isLarge ? 'text-lg leading-relaxed' : 'text-sm'}`}
            >
              {medication.special_instructions_en}
            </p>
          )}
        </div>

        {/* Confidence indicator */}
        {medication.confidence === 'needs_review' && (
          <span className="badge bg-warning-light text-warning font-medium">
            ⚠ Needs Review
          </span>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className={`flex items-center gap-3 ${isLarge ? 'mt-5' : 'mt-4'} pt-4 border-t border-border-light`}>
          <button
            onClick={handleListen}
            className={`btn ${isLarge ? 'btn-lg' : ''} btn-secondary flex-shrink-0`}
            disabled={playing}
          >
            <Volume2 size={isLarge ? 22 : 18} className={playing ? 'animate-pulse' : ''} />
            {playing ? 'Playing...' : '🔊 Listen'}
          </button>
          <button
            onClick={handleTaken}
            className={`btn ${isLarge ? 'btn-xl' : 'btn-lg'} ${taken ? 'bg-success text-white' : 'btn-primary'} flex-1`}
            disabled={taken}
          >
            <Check size={isLarge ? 22 : 18} />
            {taken ? 'Taken ✓' : '✅ I\'ve Taken It'}
          </button>
        </div>
      )}
    </div>
  );
}
