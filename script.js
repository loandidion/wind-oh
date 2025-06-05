class WindMusicApp {
    constructor() {
        this.locations = [];
        this.activeOscillators = new Map();
        this.isPlaying = false;
        this.audioContext = null;
        this.masterGain = null;
        this.reverbNode = null;
        
        // Musical parameters
        this.pentatonicScale = [0, 2, 4, 7, 9];
        this.baseFreq = 220;
        
        this.elements = {
            loadingState: document.getElementById('loadingState'),
            locationsGrid: document.getElementById('locationsGrid'),
            controls: document.getElementById('controls'),
            statusDisplay: document.getElementById('statusDisplay'),
            errorState: document.getElementById('errorState'),
            refreshBtn: document.getElementById('refreshBtn'),
            clearBtn: document.getElementById('clearBtn'),
            masterPlayBtn: document.getElementById('masterPlayBtn'),
            masterPauseBtn: document.getElementById('masterPauseBtn'),
            activeCount: document.getElementById('activeCount')
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadLocations();
        this.renderInterface();
    }
    
    setupEventListeners() {
        this.elements.refreshBtn.addEventListener('click', () => this.refreshLocations());
        this.elements.clearBtn.addEventListener('click', () => this.clearAllLocations());
        this.elements.masterPlayBtn.addEventListener('click', () => this.startAudio());
        this.elements.masterPauseBtn.addEventListener('click', () => this.pauseAudio());
    }
    
    async loadLocations() {
        try {
            console.log('Starting to load locations...');
            this.elements.loadingState.textContent = 'discovering global wind patterns...';
            
            const cities = [
                { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, tz: 9 },
                { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, tz: 1 },
                { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, tz: 10 },
                { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, tz: -3 },
                { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, tz: 1 },
                { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, tz: 5.5 },
                { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522, tz: 1 },
                { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, tz: 7 }
            ];
            
            const shuffled = cities.sort(() => Math.random() - 0.5);
            this.locations = shuffled.slice(0, 8);
            
            let successCount = 0;
            for (let i = 0; i < this.locations.length; i++) {
                const location = this.locations[i];
                this.elements.loadingState.textContent = `fetching wind data... (${i + 1}/${this.locations.length})`;
                await this.getWeatherData(location);
                if (location.temperature !== undefined) successCount++;
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading locations:', error);
            this.showError('Weather API temporarily unavailable. Using simulated wind patterns for demo.');
            this.createDemoLocations();
            this.hideLoading();
        }
    }
    
    async getWeatherData(location) {
        try {
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=auto`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                const current = data.current;
                
                location.temperature = Math.round(current.temperature_2m);
                location.windSpeed = Math.round(current.wind_speed_10m * 2.237);
                location.windDirection = current.wind_direction_10m;
                location.localTime = new Date(current.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } else {
                throw new Error('API failed');
            }
        } catch (error) {
            location.temperature = Math.round(Math.random() * 40 - 10);
            location.windSpeed = Math.round(Math.random() * 25 + 2);
            location.windDirection = Math.round(Math.random() * 360);
            location.localTime = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
        
        location.active = false;
    }
    
    createDemoLocations() {
        const cities = [
            { name: 'Tokyo', country: 'Japan' },
            { name: 'Paris', country: 'France' },
            { name: 'Sydney', country: 'Australia' },
            { name: 'São Paulo', country: 'Brazil' },
            { name: 'Lagos', country: 'Nigeria' },
            { name: 'Mumbai', country: 'India' },
            { name: 'Oslo', country: 'Norway' },
            { name: 'Bangkok', country: 'Thailand' }
        ];
        
        this.locations = cities.map(city => ({
            ...city,
            temperature: Math.round(Math.random() * 40 - 10),
            windSpeed: Math.round(Math.random() * 25 + 2),
            windDirection: Math.round(Math.random() * 360),
            localTime: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }),
            active: false
        }));
    }
    
    renderInterface() {
        const grid = this.elements.locationsGrid;
        grid.innerHTML = '';
        
        this.locations.forEach((location, index) => {
            const item = document.createElement('div');
            item.className = `location-item ${location.active ? 'active' : ''}`;
            item.dataset.index = index;
            
            const timeOfDay = this.getTimeOfDay(location.localTime);
            const windDescription = this.getWindDescription(location.windSpeed);
            
            item.innerHTML = `
                <div class="location-status">${location.active ? '●' : '○'}</div>
                <div class="location-info">
                    <div class="location-name">${location.name}</div>
                    <div class="location-details">
                        ${location.temperature}°C • ${location.localTime} • ${timeOfDay}
                    </div>
                </div>
                <div class="wind-indicator">${windDescription}</div>
                <div class="audio-indicator"></div>
            `;
            
            item.addEventListener('click', () => this.toggleLocation(index));
            grid.appendChild(item);
        });
        
        this.updateActiveCount();
    }
    
    getTimeOfDay(timeString) {
        const hour = parseInt(timeString.split(':')[0]);
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
    
    getWindDescription(speed) {
        if (speed < 5) return 'calm';
        if (speed < 10) return 'gentle';
        if (speed < 15) return 'moderate';
        if (speed < 20) return 'strong';
        return 'powerful';
    }
    
    toggleLocation(index) {
        const location = this.locations[index];
        location.active = !location.active;
        
        if (location.active && this.isPlaying) {
            this.startLocationAudio(location, index);
        } else if (!location.active) {
            this.stopLocationAudio(index);
        }
        
        this.renderInterface();
    }
    
    async startAudio() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = 0.3;
                this.masterGain.connect(this.audioContext.destination);
                
                this.reverbNode = this.audioContext.createConvolver();
                this.reverbNode.buffer = this.createReverbImpulse();
                this.reverbNode.connect(this.masterGain);
                
                console.log('Web Audio context created');
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isPlaying = true;
            this.elements.masterPlayBtn.style.display = 'none';
            this.elements.masterPauseBtn.style.display = 'block';
            
            this.locations.forEach((location, index) => {
                if (location.active) {
                    this.startLocationAudio(location, index);
                }
            });
            
            console.log('Audio started');
            
        } catch (error) {
            console.error('Failed to start audio:', error);
            this.showError('Could not start audio. Please try again.');
        }
    }
    
    pauseAudio() {
        this.isPlaying = false;
        this.elements.masterPlayBtn.style.display = 'block';
        this.elements.masterPauseBtn.style.display = 'none';
        
        this.activeOscillators.forEach((data, index) => {
            this.stopLocationAudio(index);
        });
        this.activeOscillators.clear();
        
        console.log('Audio paused');
    }
    
    startLocationAudio(location, index) {
        try {
            console.log(`Starting audio for ${location.name}`);
            
            const note = this.windSpeedToNote(location.windSpeed, location.temperature);
            const interval = Math.max(4.0, this.windSpeedToInterval(location.windSpeed));
            
            console.log(`${location.name}: Playing ${note}Hz every ${interval}s (piano)`);
            
            const playPianoNote = () => {
                if (!this.isPlaying || !this.activeOscillators.has(index)) return;
                
                const fundamentalFreq = note;
                const harmonics = [
                    { freq: fundamentalFreq, gain: 0.4 },
                    { freq: fundamentalFreq * 2, gain: 0.3 },
                    { freq: fundamentalFreq * 3, gain: 0.15 },
                    { freq: fundamentalFreq * 4, gain: 0.1 },
                    { freq: fundamentalFreq * 5, gain: 0.08 },
                    { freq: fundamentalFreq * 6, gain: 0.05 }
                ];
                
                const now = this.audioContext.currentTime;
                const duration = 8.0;
                
                const noteGain = this.audioContext.createGain();
                noteGain.gain.value = 0;
                noteGain.connect(this.reverbNode);
                
                noteGain.gain.setValueAtTime(0, now);
                noteGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
                noteGain.gain.exponentialRampToValueAtTime(0.08, now + 0.5);
                noteGain.gain.exponentialRampToValueAtTime(0.03, now + 2.0);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                
                harmonics.forEach((harmonic, i) => {
                    const osc = this.audioContext.createOscillator();
                    
                    if (i === 0) osc.type = 'triangle';
                    else if (i === 1) osc.type = 'sine';
                    else osc.type = 'triangle';
                    
                    osc.frequency.value = harmonic.freq;
                    
                    const harmonicGain = this.audioContext.createGain();
                    harmonicGain.gain.value = harmonic.gain;
                    
                    const detune = (Math.random() - 0.5) * 2;
                    osc.detune.value = detune;
                    
                    osc.connect(harmonicGain);
                    harmonicGain.connect(noteGain);
                    
                    osc.start(now);
                    osc.stop(now + duration);
                    
                    osc.onended = () => {
                        harmonicGain.disconnect();
                        osc.disconnect();
                    };
                });
                
                setTimeout(() => {
                    noteGain.disconnect();
                }, duration * 1000 + 100);
            };
            
            playPianoNote();
            const intervalId = setInterval(playPianoNote, interval * 1000);
            this.activeOscillators.set(index, { intervalId });
            
        } catch (error) {
            console.error(`Failed to start audio for ${location.name}:`, error);
        }
    }
    
    stopLocationAudio(index) {
        const audioData = this.activeOscillators.get(index);
        if (audioData && audioData.intervalId) {
            clearInterval(audioData.intervalId);
            this.activeOscillators.delete(index);
        }
    }
    
    createReverbImpulse() {
        const length = this.audioContext.sampleRate * 3;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        return impulse;
    }
    
    windSpeedToNote(windSpeed, temperature) {
        const speedIndex = Math.min(Math.floor(windSpeed / 5), 4);
        let scaleNote = this.pentatonicScale[speedIndex];
        
        const tempOffset = temperature < 0 ? -12 : temperature > 25 ? 12 : 0;
        scaleNote += tempOffset;
        
        return this.baseFreq * Math.pow(2, scaleNote / 12);
    }
    
    windSpeedToInterval(windSpeed) {
        const minInterval = 3.0;
        const maxInterval = 10.0;
        const normalizedSpeed = Math.min(windSpeed / 25, 1);
        return maxInterval - (normalizedSpeed * (maxInterval - minInterval));
    }
    
    async refreshLocations() {
        this.pauseAudio();
        this.showLoading();
        await this.loadLocations();
        this.renderInterface();
    }
    
    clearAllLocations() {
        this.locations.forEach(location => location.active = false);
        this.pauseAudio();
        this.renderInterface();
    }
    
    updateActiveCount() {
        const activeCount = this.locations.filter(loc => loc.active).length;
        this.elements.activeCount.textContent = activeCount;
    }
    
    showLoading() {
        this.elements.loadingState.style.display = 'block';
        this.elements.locationsGrid.style.display = 'none';
        this.elements.controls.style.display = 'none';
        this.elements.statusDisplay.style.display = 'none';
    }
    
    hideLoading() {
        this.elements.loadingState.style.display = 'none';
        this.elements.locationsGrid.style.display = 'grid';
        this.elements.controls.style.display = 'flex';
        this.elements.statusDisplay.style.display = 'block';
    }
    
    showError(message) {
        this.elements.errorState.textContent = message;
        this.elements.errorState.style.display = 'block';
        setTimeout(() => {
            this.elements.errorState.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app
new WindMusicApp();
