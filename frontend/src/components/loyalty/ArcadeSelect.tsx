import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface ArcadeSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

const ArcadeSelect = ({ options, value, onChange }: ArcadeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="arcade-select-container" ref={selectRef}>
      <div 
        className={`arcade-select-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : 'SÉLECTIONNER'}</span>
        <span className="arcade-select-arrow">▼</span>
      </div>
      
      {isOpen && (
        <ul className="arcade-select-list">
          {options.map((option) => (
            <li 
              key={option.value} 
              className={`arcade-select-item ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ArcadeSelect;