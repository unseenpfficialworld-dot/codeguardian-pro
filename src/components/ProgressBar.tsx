import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  size = 'md',
  color = 'blue',
  showPercentage = true,
  animated = false,
  className = ''
}) => {
  // Validate progress value
  const validatedProgress = Math.min(100, Math.max(0, progress));

  // Size classes
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  // Color classes
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };

  // Background color classes
  const bgColorClasses = {
    blue: 'bg-blue-500/20',
    green: 'bg-green-500/20',
    red: 'bg-red-500/20',
    yellow: 'bg-yellow-500/20',
    purple: 'bg-purple-500/20'
  };

  // Animation class
  const animationClass = animated ? 'animate-pulse' : '';

  return (
    <div className={`w-full ${className}`}>
      {/* Label and Percentage */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-300">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-400">
              {Math.round(validatedProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar Container */}
      <div className={`w-full bg-gray-700 rounded-full ${sizeClasses[size]} ${animationClass}`}>
        {/* Progress Fill */}
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${validatedProgress}%` }}
        >
          {/* Animated shimmer effect for active progress bars */}
          {animated && validatedProgress > 0 && validatedProgress < 100 && (
            <div className="w-full h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps (Optional) */}
      {animated && (
        <div className="flex justify-between mt-1">
          <div className="flex space-x-1">
            {[0, 25, 50, 75, 100].map((step) => (
              <div
                key={step}
                className={`w-1 h-1 rounded-full ${
                  validatedProgress >= step ? colorClasses[color] : 'bg-gray-600'
                }`}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Additional ProgressBar variants

interface StepProgressBarProps {
  steps: {
    label: string;
    completed: boolean;
    current?: boolean;
  }[];
  className?: string;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({ steps, className = '' }) => {
  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <ProgressBar
        progress={progress}
        size="sm"
        color="blue"
        showPercentage={false}
      />
      
      {/* Step Labels */}
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex flex-col items-center ${
              step.completed ? 'text-blue-400' : 
              step.current ? 'text-white' : 'text-gray-500'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mb-1 ${
              step.completed ? 'bg-blue-400' : 
              step.current ? 'bg-white' : 'bg-gray-600'
            }`}></div>
            <span className="text-xs">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface FileProgressBarProps {
  fileName: string;
  progress: number;
  fileSize?: string;
  speed?: string;
  status?: 'uploading' | 'processing' | 'completed' | 'error';
  onCancel?: () => void;
}

export const FileProgressBar: React.FC<FileProgressBarProps> = ({
  fileName,
  progress,
  fileSize,
  speed,
  status = 'uploading',
  onCancel
}) => {
  const statusColors = {
    uploading: 'blue',
    processing: 'yellow',
    completed: 'green',
    error: 'red'
  } as const;

  const statusIcons = {
    uploading: '⬆️',
    processing: '🔄',
    completed: '✅',
    error: '❌'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{statusIcons[status]}</span>
          <div>
            <div className="text-sm font-medium text-white truncate max-w-xs">
              {fileName}
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              {fileSize && <span>{fileSize}</span>}
              {speed && <span>{speed}/s</span>}
              <span className={`px-2 py-1 rounded ${
                status === 'completed' ? 'bg-green-500/20 text-green-400' :
                status === 'error' ? 'bg-red-500/20 text-red-400' :
                status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>
        </div>
        
        {onCancel && status !== 'completed' && status !== 'error' && (
          <button
            onClick={onCancel}
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      <ProgressBar
        progress={progress}
        color={statusColors[status]}
        showPercentage={true}
        animated={status === 'uploading' || status === 'processing'}
      />
    </div>
  );
};

interface CircularProgressBarProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showPercentage?: boolean;
}

export const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = '#3B82F6',
  label,
  showPercentage = true
}) => {
  const validatedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (validatedProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#374151"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Percentage text */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {Math.round(validatedProgress)}%
            </span>
          </div>
        )}
      </div>
      
      {label && (
        <span className="text-xs text-gray-400 mt-2 text-center">
          {label}
        </span>
      )}
    </div>
  );
};

export default ProgressBar;