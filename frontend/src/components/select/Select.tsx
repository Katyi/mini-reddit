import { useEffect, useRef } from 'react';
import downArrow from '../../assets/icons/down-arrow.svg';

type Option = {
  label: string;
  value: string;
};

interface CustomSelectProps {
  options: Option[];
  selectedLabel: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  selectedLabel,
  onChange,
  open,
  setOpen,
  className = '',
}) => {
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mouseup', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mouseup', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setOpen]);

  return (
    /* Контейнер теперь использует grid для наложения */
    <div
      className={`relative inline-grid items-center ${className}`}
      ref={selectRef}
    >
      {/* 1. GHOST ELEMENT: Определяет физический размер (ширину и высоту) */}
      <div className="invisible flex items-center px-3 pr-10 whitespace-nowrap text-sm font-normal border-2 border-transparent h-[33px] md:h-[34px]">
        {/* Находим самую длинную строку среди опций и текущего значения */}
        {[selectedLabel, ...options.map((o) => o.value)].reduce((a, b) => {
          const strA = String(a || '');
          const strB = String(b || '');
          return strA.length > strB.length ? strA : strB;
        })}
      </div>

      {/* 2. REAL BUTTON: Накладывается сверху через absolute */}
      <div
        onClick={() => setOpen(!open)}
        className={`
          absolute inset-0 cursor-pointer flex items-center justify-between rounded-lg
          border border-orange-500 px-3 transition-all bg-white hover:border-2 focus:border-2
        ${open && 'border-2'}`}
      >
        <div className="text-sm font-medium text-black whitespace-nowrap">
          {selectedLabel}
        </div>
        <img
          src={downArrow}
          alt="arrow"
          className={`w-5 h-5 transition-transform duration-300 ml-2 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* 3. DROPDOWN */}
      <div
        className={`
          absolute left-0 mt-px top-full w-full bg-white border border-gray-300 shadow-xl rounded-lg
          z-[100] transition-all duration-200
          ${
            open
              ? 'visible opacity-100 translate-y-0'
              : 'invisible opacity-0 -translate-y-2'
          }
        `}
      >
        <div className="py-1 px-1 max-h-60 overflow-y-auto">
          {options?.map((opt) => (
            <div
              className="px-4 py-2 rounded-b-lg hover:bg-orange-50 cursor-pointer text-sm text-gray-800 transition-colors"
              key={opt.label}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomSelect;
