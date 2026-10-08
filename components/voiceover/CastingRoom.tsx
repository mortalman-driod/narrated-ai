'use client';

import React, { useState } from 'react';
import { VoiceProfile } from '@/lib/voiceover/types';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';

interface CastingRoomProps {
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
  onPlaySample: (text: string, voice: VoiceProfile) => void;
  isPlaying: boolean;
  activePlayingVoiceId: string | null;
}

export const CastingRoom: React.FC<CastingRoomProps> = ({
  selectedVoice,
  onSelectVoice,
  onPlaySample,
  isPlaying,
  activePlayingVoiceId
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [customTestPhrase, setCustomTestPhrase] = useState<string>('');
  const [sampleType, setSampleType] = useState<'benchmark' | 'standard' | 'nigerian'>('benchmark');

  const UNIFIED_BENCHMARK_PASSAGE =
    "Every story deserves a voice that carries it home. This one begins in Lagos, moves through Abuja and Enugu, and ends somewhere warm. Chioma Okafor met Emeka Nwosu on a Tuesday in Surulere, and nothing was ever the same again.";

  const filteredVoices = LAUNCH_VOICES.filter((v) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nigerian') return v.category.startsWith('nigerian');
    if (activeFilter === 'male') return v.voiceGender === 'male';
    if (activeFilter === 'female') return v.voiceGender === 'female';
    if (activeFilter === 'foreign') return v.category.startsWith('foreign');
    return true;
  });

  const handleTestOwnWords = () => {
    if (!customTestPhrase.trim()) return;
    onPlaySample(customTestPhrase.trim(), selectedVoice);
  };

  return (
    <div className="space-y-6">
      {/* Casting Room Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#B4532A] font-semibold">
            The Casting Room
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#1C1917] tracking-tight mt-0.5">
            Choose Your Narrator
          </h2>
          <p className="text-xs text-[#6B6259] mt-1 max-w-xl">
            12 broadcast-grade voices including Nigerian-accented English and international narrators.
            Listen before you commit.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Narrators' },
            { id: 'nigerian', label: 'Nigerian Voices' },
            { id: 'foreign', label: 'International Voices' },
            { id: 'male', label: 'Male' },
            { id: 'female', label: 'Female' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-[6px] font-medium transition-all ${
                activeFilter === f.id
                  ? 'bg-[#B4532A] text-white shadow-sm'
                  : 'bg-white text-[#6B6259] border border-[#E8E2D9] hover:text-[#1C1917] hover:border-[#6B6259]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test My Own Words Box */}
      <div className="bg-[#FAF7F2] border border-[#E8E2D9] rounded-[8px] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#1C1917]">
              Test with your own words in <strong className="text-[#B4532A]">{selectedVoice.name}</strong>'s voice
            </label>
            <div className="flex items-center gap-2 text-[11px] text-[#6B6259]">
              <span>Sample passage:</span>
              <button
                type="button"
                onClick={() => setSampleType('benchmark')}
                className={`underline ${sampleType === 'benchmark' ? 'text-[#B4532A] font-bold' : ''}`}
                title="Unified Lagos/Enugu benchmark passage to compare all voices equally"
              >
                Benchmark (Lagos/Enugu)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setSampleType('standard')}
                className={`underline ${sampleType === 'standard' ? 'text-[#B4532A] font-bold' : ''}`}
              >
                Prose
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setSampleType('nigerian')}
                className={`underline ${sampleType === 'nigerian' ? 'text-[#B4532A] font-bold' : ''}`}
              >
                Local Names
              </button>
            </div>
          </div>
          <input
            type="text"
            value={customTestPhrase}
            onChange={(e) => setCustomTestPhrase(e.target.value)}
            placeholder={`Type any line to test (e.g. "Welcome to the documentary series...")`}
            className="w-full text-xs p-2.5 rounded-[6px] border border-[#E8E2D9] bg-white text-[#1C1917] placeholder-[#6B6259]/60 focus:outline-none focus:border-[#B4532A]"
          />
        </div>

        <button
          type="button"
          onClick={handleTestOwnWords}
          className="px-4 py-2.5 self-end sm:self-center bg-[#1C1917] hover:bg-black text-white text-xs font-semibold rounded-[6px] transition-colors shrink-0"
        >
          Hear it Now
        </button>
      </div>

      {/* Voices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoice.id === voice.id;
          const isThisPlaying = isPlaying && activePlayingVoiceId === voice.id;
          const sampleToPlay =
            sampleType === 'benchmark'
              ? UNIFIED_BENCHMARK_PASSAGE
              : sampleType === 'nigerian' && voice.nigerianSampleText
              ? voice.nigerianSampleText
              : voice.sampleAudioText;

          return (
            <div
              key={voice.id}
              className={`p-5 rounded-[8px] bg-white border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                isSelected
                  ? 'border-[#B4532A] ring-1 ring-[#B4532A]'
                  : 'border-[#E8E2D9] hover:border-[#6B6259]'
              }`}
            >
              <div>
                {/* Header: Name & Category Tag */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-[#1C1917]">
                      {voice.name}
                    </h3>
                    <p className="text-xs text-[#6B6259]">{voice.accent}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#FAF7F2] text-[#6B6259] border border-[#E8E2D9] uppercase tracking-wide">
                    {voice.categoryLabel}
                  </span>
                </div>

                {/* Tone Descriptors & Age Color */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[11px] font-mono text-[#B4532A] bg-[#B4532A]/10 px-2 py-0.5 rounded-[4px] font-medium">
                    {voice.tone}
                  </span>
                  <span className="text-[11px] font-mono text-[#4D7C0F] bg-[#4D7C0F]/10 px-2 py-0.5 rounded-[4px]">
                    {voice.ageColor} Timber
                  </span>
                </div>

                {/* Sample Text Preview */}
                <div className="text-xs text-[#1C1917] bg-[#FAF7F2] p-3 rounded-[6px] border border-[#E8E2D9] italic line-clamp-3 leading-relaxed">
                  "{sampleToPlay}"
                </div>
              </div>

              {/* Action Buttons: Listen & Select Voice */}
              <div className="pt-2 border-t border-[#E8E2D9] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onPlaySample(sampleToPlay, voice)}
                  className={`px-3 py-1.5 rounded-[6px] border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isThisPlaying
                      ? 'bg-[#1C1917] text-white border-[#1C1917]'
                      : 'border-[#E8E2D9] text-[#1C1917] hover:border-[#1C1917] bg-white'
                  }`}
                >
                  {isThisPlaying ? '■ Stop Playing' : '▶ Listen'}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectVoice(voice)}
                  className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#4D7C0F] text-white'
                      : 'bg-[#B4532A] hover:bg-[#9A4524] text-white'
                  }`}
                >
                  {isSelected ? '✓ Active Voice' : 'Select Voice'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
