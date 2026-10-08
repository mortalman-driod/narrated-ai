'use client';

import React, { useState } from 'react';
import { Volume2, Check, Sparkles, Mic, Play, Square, Globe, UserCheck } from 'lucide-react';
import { VoiceProfile } from '@/lib/voiceover/types';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';

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
      {/* Header & Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
              Voice Talent Directory
            </span>
            <span className="text-xs text-slate-400">12 Broadcast-Grade Narrators</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Choose Your Broadcast Narrator</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Spacious listed directory with authentic Nigerian-accented English and global narrators. Audition live audio with one click.
          </p>
        </div>

        {/* Filter Pills with Pop Colors */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/50 border border-white/[0.08] rounded-xl backdrop-blur-md">
          {[
            { id: 'all', label: 'All Narrators' },
            { id: 'nigerian', label: '🇳🇬 Nigerian Voices' },
            { id: 'foreign', label: '🌍 Global Voices' },
            { id: 'male', label: 'Male' },
            { id: 'female', label: 'Female' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeFilter === f.id
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-glow-amber/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test Custom Script Phrase Bar with Pop Styling */}
      <div className="bg-[#030714]/85 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 backdrop-blur-xl shadow-xl">
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-amber-400" />
              <span>Audition your script lines with <strong className="text-amber-300 font-mono text-sm">{selectedVoice.name}</strong></span>
            </label>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Passage mode:</span>
              <button
                type="button"
                onClick={() => setSampleType('benchmark')}
                className={`transition-colors ${sampleType === 'benchmark' ? 'text-amber-300 font-bold underline' : 'hover:text-slate-200'}`}
                title="Unified Lagos/Enugu benchmark passage to compare all voices equally"
              >
                Lagos/Enugu
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setSampleType('standard')}
                className={`transition-colors ${sampleType === 'standard' ? 'text-amber-300 font-bold underline' : 'hover:text-slate-200'}`}
              >
                Prose
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setSampleType('nigerian')}
                className={`transition-colors ${sampleType === 'nigerian' ? 'text-amber-300 font-bold underline' : 'hover:text-slate-200'}`}
              >
                Local Names
              </button>
            </div>
          </div>
          <input
            type="text"
            value={customTestPhrase}
            onChange={(e) => setCustomTestPhrase(e.target.value)}
            placeholder={`Type any line to test (e.g. "In ancient Nigeria, the warriors of the empire stood firm...")`}
            className="w-full text-xs p-3 rounded-xl border border-white/[0.08] bg-black/60 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner font-sans"
          />
        </div>

        <AnimatedButton
          type="button"
          variant="cyber"
          onClick={handleTestOwnWords}
          icon={<Volume2 className="w-3.5 h-3.5 text-amber-300" />}
          className="self-end sm:self-center shrink-0 px-4 py-2.5 font-bold"
        >
          Hear it Now
        </AnimatedButton>
      </div>

      {/* Spacious Listed Narrators (Listed Out as full-width rows) */}
      <div className="space-y-3">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoice.id === voice.id;
          const isThisPlaying = isPlaying && activePlayingVoiceId === voice.id;
          const isNigerian = voice.category.startsWith('nigerian');
          const sampleToPlay =
            sampleType === 'benchmark'
              ? UNIFIED_BENCHMARK_PASSAGE
              : sampleType === 'nigerian' && voice.nigerianSampleText
              ? voice.nigerianSampleText
              : voice.sampleAudioText;

          return (
            <div
              key={voice.id}
              className={`p-4 sm:p-5 rounded-2xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 backdrop-blur-xl border ${
                isSelected
                  ? 'bg-gradient-to-r from-[#0C152B] via-[#081226] to-[#040C1A] border-amber-500/80 shadow-glow-amber/25 ring-1 ring-amber-400/50'
                  : 'bg-[#030714]/85 border-white/[0.07] hover:border-white/20 hover:bg-[#060F26]/80'
              }`}
            >
              {/* Left Column: Avatar + Profile Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Pop Avatar Container */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl border shadow-md ${
                    isNigerian
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                  }`}
                >
                  {isNigerian ? '🇳🇬' : '🌍'}
                </div>

                {/* Name, Accent, Tone Tags */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{voice.name}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </h3>

                    {/* Accent Tag */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 font-semibold">
                      {voice.accent.split('(')[0].trim()}
                    </span>

                    {/* Tone Pop Tag */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-semibold">
                      {voice.tone}
                    </span>

                    {/* Timber Tag */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      {voice.ageColor} Timber
                    </span>

                    {/* Gender Tag */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-400/25">
                      {voice.voiceGender === 'male' ? 'Male' : 'Female'}
                    </span>
                  </div>

                  {/* Sample Quote in High Contrast */}
                  <p className="text-xs text-slate-300 italic line-clamp-2 leading-relaxed border-l-2 border-amber-400/50 pl-2.5 font-serif">
                    "{sampleToPlay}"
                  </p>
                </div>
              </div>

              {/* Right Column: Audio Spectrum + Listen + Select Actions */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 lg:self-center">
                {/* Live Soundwave Visualizer */}
                {isThisPlaying && (
                  <div className="px-2">
                    <SoundWaveVisualizer isPlaying={true} barCount={8} color="from-amber-400 to-rose-400" />
                  </div>
                )}

                <AnimatedButton
                  type="button"
                  variant={isThisPlaying ? 'danger' : 'secondary'}
                  onClick={() => onPlaySample(sampleToPlay, voice)}
                  icon={isThisPlaying ? <Square className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-amber-300" />}
                  className="text-xs px-3.5 py-2 font-semibold"
                >
                  {isThisPlaying ? 'Stop' : 'Listen'}
                </AnimatedButton>

                <AnimatedButton
                  type="button"
                  variant={isSelected ? 'success' : 'cyber'}
                  onClick={() => onSelectVoice(voice)}
                  icon={isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : undefined}
                  className="text-xs px-4 py-2 font-bold"
                >
                  {isSelected ? 'Active Narrator' : 'Select Voice'}
                </AnimatedButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
