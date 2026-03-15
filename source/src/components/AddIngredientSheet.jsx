import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useApp } from '../context/AppContext';
import { ingredientMaster, STORAGE_TYPES, UNITS } from '../data/ingredientMaster';

function formatDateForInput(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function AddIngredientSheet({ open, onClose }) {
  const { addInventoryItem, ingredientMaster: master } = useApp();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [expiryDate, setExpiryDate] = useState('');
  const [storageType, setStorageType] = useState('Fridge');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return master.slice(0, 15);
    return master.filter((i) => i.name.toLowerCase().includes(q));
  }, [search, master]);

  const suggestedExpiry = useMemo(() => {
    if (!selected) return '';
    const d = new Date();
    d.setDate(d.getDate() + (selected.expiry_day || 7));
    return formatDateForInput(d);
  }, [selected]);

  const effectiveExpiry = expiryDate || suggestedExpiry;

  const handleSelect = (ing) => {
    setSelected(ing);
    setShowDropdown(false);
    if (!expiryDate) setExpiryDate(formatDateForInput(new Date(Date.now() + (ing.expiry_day || 7) * 86400000)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected) return;
    const qty = Math.max(0, parseInt(quantity, 10) || 1);
    addInventoryItem({
      ingredient_id: selected.ingredient_id,
      quantity: qty,
      unit,
      expiry_date: effectiveExpiry,
      storage_type,
    });
    setSearch('');
    setSelected(null);
    setQuantity('');
    setUnit('g');
    setExpiryDate('');
    setStorageType('Fridge');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="재료 추가">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">재료 이름 (마스터 검색)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={selected ? selected.name : search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="재료 검색..."
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 outline-none"
            />
            {showDropdown && (
              <>
                <div className="absolute inset-0 -bottom-2" onClick={() => setShowDropdown(false)} />
                <ul className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg z-10">
                  {filtered.map((ing) => (
                    <li key={ing.ingredient_id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(ing)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 text-gray-900"
                          >
                            {ing.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

        <Input
          label="수량"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">단위</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 outline-none"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">유통기한 (마스터 expiry_day 자동 계산)</label>
          <input
            type="date"
            value={effectiveExpiry}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">보관 유형</label>
          <div className="flex flex-wrap gap-2">
            {STORAGE_TYPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStorageType(s)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-smooth ${
                  storageType === s
                    ? 'bg-[#10B981] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={!selected}>
          재료 등록
        </Button>
      </form>
    </BottomSheet>
  );
}
