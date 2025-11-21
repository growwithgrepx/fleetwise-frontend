import React, { useState, useRef, useEffect } from 'react';

interface TimePicker24HourProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

const TimePicker24Hour: React.FC<TimePicker24HourProps> = ({ 
  value, 
  onChange, 
  readOnly = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const timePickerRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      if (h && m) {
        setHours(h.padStart(2, '0'));
        setMinutes(m.padStart(2, '0'));
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleHourChange = (hour: string) => {
    const newHours = hour.padStart(2, '0');
    setHours(newHours);
    onChange(`${newHours}:${minutes}`);
  };

  const handleMinuteChange = (minute: string) => {
    const newMinutes = minute.padStart(2, '0');
    setMinutes(newMinutes);
    onChange(`${hours}:${newMinutes}`);
  };

  const handleHourClick = (hour: number) => {
    const hourStr = hour.toString().padStart(2, '0');
    handleHourChange(hourStr);
  };

  const handleMinuteClick = (minute: number) => {
    const minuteStr = minute.toString().padStart(2, '0');
    handleMinuteChange(minuteStr);
  };

  // Generate hours (00-23)
  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  
  // Generate minutes (00-59, in 5-minute increments)
  const minutesList = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative" ref={timePickerRef}>
      <div 
        className={`flex items-center px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${className} ${readOnly ? 'bg-gray-600 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !readOnly && setIsOpen(!isOpen)}
      >
        <span className="font-mono">{hours}:{minutes}</span>
        <svg 
          className={`ml-auto w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !readOnly && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          <div className="grid grid-cols-2 gap-4 p-4">
            {/* Hours column */}
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Hours</div>
              <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                {hoursList.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={`py-2 text-sm rounded text-center ${
                      hours === hour.toString().padStart(2, '0')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={() => handleHourClick(hour)}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes column */}
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Minutes</div>
              <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                {minutesList.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={`py-2 text-sm rounded text-center ${
                      minutes === minute.toString().padStart(2, '0')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={() => handleMinuteClick(minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker24Hour;