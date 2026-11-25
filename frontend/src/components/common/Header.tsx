import React, { useState, useEffect, useRef } from 'react';
import { Wind, CheckCircle2, Search, MapPin, Loader2 } from 'lucide-react';
import { LocationPreset } from '../../api/types';
import { apiClient } from '../../api/client';

interface HeaderProps {
  presets: LocationPreset[];
  selectedPreset: LocationPreset | null;
  onSelectPreset: (preset: LocationPreset) => void;
  onOpenImpactModal: () => void;
  totalAvoidedKg: number;
}

export const Header: React.FC<HeaderProps> = ({
  presets,
  selectedPreset,
  onSelectPreset,
  onOpenImpactModal,
  totalAvoidedKg,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationPreset[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiClient.searchLocations(trimmed);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('City search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchedCity = (city: LocationPreset) => {
    onSelectPreset(city);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const isCustomCity =
    selectedPreset && !presets.some((p) => p.name === selectedPreset.name);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-emerald-400">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Urban Air Quality Assistant
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Decision Support
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Science-grounded winter smog routines, CADR sizing & transit exposure
            </p>
          </div>
        </div>

        {/* Controls: City Search, Preset Selector & Impact Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global City Search */}
          <div ref={searchContainerRef} className="relative">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                aria-label="Search any city"
                aria-expanded={showDropdown}
                aria-controls="city-search-results"
                placeholder="Search any city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 text-xs rounded-lg pl-8 pr-7 py-2 w-44 sm:w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              {searching && (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin absolute right-2" />
              )}
            </div>

            {showDropdown && (
              <div
                id="city-search-results"
                className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50"
              >
                {searchResults.length > 0 ? (
                  <ul role="listbox" className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
                    {searchResults.map((city) => (
                      <li key={city.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSearchedCity(city)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{city.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">No matching cities found</div>
                )}
              </div>
            )}
          </div>

          {/* Preset Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="preset-select" className="text-xs font-medium text-slate-400 hidden sm:inline">
              City Preset:
            </label>
            <select
              id="preset-select"
              value={selectedPreset?.name || ''}
              onChange={(e) => {
                const found = presets.find((p) => p.name === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
            >
              {isCustomCity && selectedPreset && (
                <option value={selectedPreset.name}>
                  {selectedPreset.name} (Searched)
                </option>
              )}
              {presets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.country})
                </option>
              ))}
            </select>
          </div>

          {/* Communal Impact Modal Trigger */}
          <button
            onClick={onOpenImpactModal}
            className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-750 border border-emerald-500/30 hover:border-emerald-500/60 text-xs text-emerald-300 px-3 py-2 rounded-lg transition-all font-medium shadow-sm hover:shadow-emerald-500/10 cursor-pointer"
            title="View community impact ledger"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Avoided CO₂:</span>
            <span className="font-bold text-white">{totalAvoidedKg.toFixed(1)} kg</span>
          </button>
        </div>
      </div>
    </header>
  );
};
