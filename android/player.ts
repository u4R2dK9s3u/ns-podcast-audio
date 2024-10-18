import { Application, EventData, Observable, Utils } from '@nativescript/core';
import { resolveAudioFilePath, TNSPlayerI } from '../common';
import { AudioPlayerEvents, AudioPlayerOptions } from '../options';

export enum AudioFocusDurationHint {
    AUDIOFOCUS_GAIN = android.media.AudioManager.AUDIOFOCUS_GAIN,
    AUDIOFOCUS_GAIN_TRANSIENT = android.media.AudioManager
        .AUDIOFOCUS_GAIN_TRANSIENT,
    AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK = android.media.AudioManager
        .AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
    AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE = android.media.AudioManager
        .AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE
}

const defaultAudioFocusManagerOptions: AudioFocusManagerOptions = {
    durationHint: AudioFocusDurationHint.AUDIOFOCUS_GAIN,
    usage: android.media.AudioAttributes.USAGE_MEDIA,
    contentType: android.media.AudioAttributes.CONTENT_TYPE_MUSIC
};

export interface AudioFocusManagerOptions {
    durationHint?: AudioFocusDurationHint;
    usage?: number; // android.media.AudioAttributes.USAGE_MEDIA
    contentType?: number; // android.media.AudioAttributes.CONTENT_TYPE_MUSIC
}
export interface AudioFocusChangeEventData extends EventData {
    focusChange: number;
}

export class AudioFocusManager extends Observable {
    private _audioFocusRequest: android.media.AudioFocusRequest;
    private _mAudioFocusGranted: boolean = false;
    private _durationHint: AudioFocusDurationHint;
    private _audioPlayerSet = new Set<TNSPlayer>();
    private _events: any;

    constructor(options?: AudioFocusManagerOptions) {
        super();
        try {
            this._mAudioFocusGranted = false;
            this._audioPlayerSet = new Set();
            this._mOnAudioFocusChangeListener = new android.media.AudioManager.OnAudioFocusChangeListener({
                onAudioFocusChange: (focusChange) => {
                    this.notify({
                        eventName: 'audioFocusChange',
                        object: this._events,
                        focusChange
                    });
                }
            });
            options = Object.assign(Object.assign({}, defaultAudioFocusManagerOptions), (options || {}));
            this._durationHint = options.durationHint;
            if (android.os.Build.VERSION.SDK_INT < 26) {
                return;
            }
            const playbackAttributes = new android.media.AudioAttributes.Builder()
                .setUsage(options.usage)
                .setContentType(options.contentType)
                .build();
            this._audioFocusRequest = new android.media.AudioFocusRequest.Builder(options.durationHint)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(this._mOnAudioFocusChangeListener)
                .build();
        } catch (error) {
            console.error('[Code error AR58] Error creating audio focus manager:', error);
            throw error;
        }
    }

    private _mOnAudioFocusChangeListener =
        new android.media.AudioManager.OnAudioFocusChangeListener({
            onAudioFocusChange: (focusChange: number) => {
                this.notify({
                    eventName: 'audioFocusChange',
                    object: this._events,
                    focusChange
                });
            }
        });

    private needsFocus(): boolean {
        try {
            return this._audioPlayerSet.size > 0;
        } catch (error) {
            console.error('[Code error AR60] Error checking if focus is needed:', error);
            throw error;
        }
    }
    /**
     *
     * @param owner player requesting focus
     * @returns if we have focus or not
     */
    requestAudioFocus(owner: TNSPlayer): boolean {
        try {
            let result = true;
            let focusResult = null;
            if (!this._mAudioFocusGranted) {
                const ctx = this._getAndroidContext();
                const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    focusResult = am.requestAudioFocus(this._audioFocusRequest);
                }
                else {
                    focusResult = am.requestAudioFocus(this._mOnAudioFocusChangeListener, android.media.AudioManager.STREAM_MUSIC, this._durationHint);
                }
                if (focusResult === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                    result = true;
                }
                else {
                    result = false;
                }
            }
            this._audioPlayerSet.add(owner);
            this._mAudioFocusGranted = result;
            return result;
        } catch (error) {
            console.error('[Code error AR66] Error requesting audio focus:', error);
            throw error;
        }
    }
    /**
     * Abandons the audio focus for this player
     * Audio focus request will not be made unless owner has previously requested focus or is null
     * @param owner either a player or null if you want to manually release the audio focus
     * @returns if we still have audio focus or not
     */
    abandonAudioFocus(owner: TNSPlayer | null): boolean {
        try {
            if (owner) {
                if (!this._audioPlayerSet.has(owner)) {
                    return this._mAudioFocusGranted;
                }
                this._audioPlayerSet.delete(owner);
            }
            if (this.needsFocus() || !this._mAudioFocusGranted) {
                return this._mAudioFocusGranted;
            }
            const ctx = this._getAndroidContext();
            const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
            let result = null;
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                result = am.abandonAudioFocusRequest(this._audioFocusRequest);
            }
            else {
                result = am.abandonAudioFocus(this._mOnAudioFocusChangeListener);
            }
            if (result === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                this._mAudioFocusGranted = false;
            }
            else {
                console.log('Failed to abandon audio focus.');
            }
            return this._mAudioFocusGranted;
        } catch (error) {
            console.error('[Code error AR67] Error abandoning audio focus:', error);
            throw error;
        }
    }
    private _getAndroidContext() {
        try {
            let ctx = Application.android.context;
            if (!ctx) {
                ctx = Application.getNativeApplication().getApplicationContext();
            }
            if (ctx === null) {
                setTimeout(() => {
                    this._getAndroidContext();
                }, 200);
                return null;
            }
            return ctx;
        } catch (error) {
            console.error('[Code error AR71] Error getting Android context:', error);
            throw error;
        }
    }
}

let globalMixingManager: AudioFocusManager | null;

function getGlobalMixingManager(): AudioFocusManager {
    try {
        if (!globalMixingManager) {
            globalMixingManager = new AudioFocusManager();
        }
        return globalMixingManager;
    } catch (error) {
        console.error('[Code error AR73] Error getting global mixing manager:', error);
        throw error;
    }
}

export class TNSPlayer implements TNSPlayerI {
    private _mediaPlayer: android.media.MediaPlayer;
    private _lastPlayerVolume; // ref to the last volume setting so we can reset after ducking
    private _wasPlaying = false;
    private _events: Observable;
    private _options: AudioPlayerOptions;
    private _audioFocusManager: AudioFocusManager | null;
    _isPrepared: boolean;

    constructor(
        durationHint:
            | AudioFocusDurationHint
            | AudioFocusManager = AudioFocusDurationHint.AUDIOFOCUS_GAIN
    ) {
        try {
            this._wasPlaying = false;
            this._isPrepared = false;
            if (!(durationHint instanceof AudioFocusManager)) {
                this.setAudioFocusManager(new AudioFocusManager({
                    durationHint: durationHint
                }));
            } else {
                this.setAudioFocusManager(durationHint);
            }
            if (!this._events) {
                this._events = new Observable();
            }
        } catch (error) {
            console.error('[Code error AR75] Error creating TNSPlayer:', error);
            throw error;
        }
    }

    public get events() {
        try {
            return this._events;
        } catch (error) {
            console.error('[Code error AR78] Error getting events:', error);
            throw error;
        }
    }

    get android(): any {
        try {
            return this._player;
        } catch (error) {
            console.error('[Code error AR80] Error getting Android player:', error);
            throw error;
        }
    }

    get volume(): number {
        try {
            const ctx = this._getAndroidContext();
            const mgr = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
            return mgr.getStreamVolume(android.media.AudioManager.STREAM_MUSIC);
        } catch (error) {
            console.error('[Code error AR81] Error getting volume:', error);
            throw error;
        }
    }

    set volume(value: number) {
        try {
            if (this._player && value >= 0) {
                this._player.setVolume(value, value);
            } else {
                console.error('[Code error AR82] - Player is not initialized');
            }
        } catch (error) {
            console.error('[Code error AR83] Error setting volume:', error);
            throw error;
        }
    }

    public get duration(): number {
        try {
            if (this._player) {
                return this._player.getDuration() / 1000;
            }
            else {
                return 0;
            }
        } catch (error) {
            console.error('[Code error AR84] Error getting duration:', error);
            throw error;
        }
    }

    get currentTime(): number {
        try {
            if (!this._isPrepared || !this._player) {
                console.warn('[Code warning AR85] Player is not prepared or initialized');
                return 0;
            }
            return this._player.getCurrentPosition() / 1000;
        } catch (error) {
            console.error('[Code error AR85] Error getting current time:', error);
            throw error;
        }
    }

    public setAudioFocusManager(manager: AudioFocusManager) {
        try {
            var _a, _b, _c;
            if (manager === this._audioFocusManager) {
                return;
            }
            (_a = this._audioFocusManager) === null || _a === void 0 ? void 0 : _a.off('audioFocusChange', this._onAudioFocusChange, this);
            (_b = this._audioFocusManager) === null || _b === void 0 ? void 0 : _b.abandonAudioFocus(this);
            this._audioFocusManager = manager;
            (_c = this._audioFocusManager) === null || _c === void 0 ? void 0 : _c.on('audioFocusChange', this._onAudioFocusChange, this);
        } catch (error) {
            console.error('[Code error AR86] Error setting audio focus manager:', error);
            throw error;
        }
    }

    /**
     * Initializes the player with options, will not start playing audio.
     * @param options
     */
    public initFromUrl(options: AudioPlayerOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                options.autoPlay = false;
                this.playFromUrl(options).then(resolve, reject);
            } catch (error) {
                console.error('[Code error AR89] Error initializing audio from URL:', error);
                reject(error);
                throw error;
            }
        });
    }

    public playFromUrl(options: AudioPlayerOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                this._options = options;
                if (options.autoPlay !== false) {
                    options.autoPlay = true;
                }
                const audioPath = resolveAudioFilePath(options.audioFile);

                const player = this._player;
                if (!player) {
                    reject(new Error('MediaPlayer not initialized'));
                    return;
                }

                player.reset();
                player.setAudioStreamType(android.media.AudioManager.STREAM_MUSIC);
                player.setDataSource(audioPath);

                this._isPrepared = false;

                if (Utils.isFileOrResourcePath(audioPath)) {
                    player.prepare();
                } else {
                    player.prepareAsync();
                }

                player.setOnPreparedListener(new android.media.MediaPlayer.OnPreparedListener({
                    onPrepared: mp => {
                        console.log("MediaPlayer is prepared.");
                        this._isPrepared = true;
                        if (options.autoPlay) {
                            this.play();
                        }
                        resolve(null);
                    }
                }));

                if (options.infoCallback) {
                    player.setOnInfoListener(new android.media.MediaPlayer.OnInfoListener({
                        onInfo: (player, info, extra) => {
                            options.infoCallback({ player, info, extra });
                            return true;
                        }
                    }));
                }
            } catch (error) {
                console.error('[Code error AR88] Error playing audio from URL:', error);
                this._abandonAudioFocus();
                reject(error);
            }
        });
    }

    public pause(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this._player && this._player.isPlaying()) {
                    this._player.pause();
                    this._abandonAudioFocus(true);
                    this._sendEvent(AudioPlayerEvents.paused);
                } else {
                    console.error('[Code error AR61] - Player is not initialized or not playing');
                }
                resolve(true);
            } catch (ex) {
                console.error('[Code error AR63] Error pausing audio:', ex);
                reject(ex);
            }
        });
    }

    public play(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const player = this._player;
                if (!player || !this._isPrepared) {
                    reject(new Error('[Code error AR64] - MediaPlayer is not initialized or not prepared'));
                    return;
                }

                if (!player.isPlaying()) {
                    if (this._options.audioMixing) {
                        this.setAudioFocusManager(getGlobalMixingManager());
                    }
                    const audioFocusGranted = this._requestAudioFocus();
                    if (!audioFocusGranted) {
                        reject(new Error('Could not request audio focus'));
                        return;
                    }

                    Application.android.foregroundActivity.setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);
                    Application.android.registerBroadcastReceiver(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY, (context, intent) => {
                        this.pause();
                    });

                    if (this._options?.pitch) {
                        const playbackParams = new android.media.PlaybackParams();
                        playbackParams.setPitch(this._options.pitch);
                        player.setPlaybackParams(playbackParams);
                    }

                    player.start();
                    this._sendEvent(AudioPlayerEvents.started);
                }

                resolve(true);
            } catch (error) {
                console.error('[Code error AR65] Error playing audio:', error);
                reject(error);
            }
        });
    }

    public resume(): void {
        try {
            if (this._player) {
                this._requestAudioFocus();
                this._sendEvent(AudioPlayerEvents.started);
            } else {
                console.error('[Code error AR01] - Player is not initialized');
            }
        } catch (error) {
            console.error('[Code error AR02] Error resuming audio:', error);
            throw error;
        }
    }

    public seekTo(time: number): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this._player) {
                    this._player.seekTo(time);
                    this._sendEvent(AudioPlayerEvents.seek);
                } else {
                    console.error('[Code error AR03] - Player is not initialized');
                }
                resolve(true);
            }
            catch (error) {
                console.error('[Code error AR04] Error seeking audio:', error);
                reject(error);
                throw error;
            }
        });
    }

    public changePlayerSpeed(speed) {
        try {
            var _a, _b;
            if (android.os.Build.VERSION.SDK_INT >= 23 && this.play) {
                if ((_a = this._player) === null || _a === void 0 ? void 0 : _a.isPlaying()) {
                    this._player.setPlaybackParams(this._player.getPlaybackParams().setSpeed(speed));
                }
                else {
                    this._player.setPlaybackParams(this._player.getPlaybackParams().setSpeed(speed));
                    (_b = this._player) === null || _b === void 0 ? void 0 : _b.pause();
                }
            }
            else {
                console.warn('Android device API is not 23+. Cannot set the playbackRate on lower Android APIs.');
            }
        } catch (error) {
            console.error('Error changing player speed:', error);
            throw error;
        }
    }

    public dispose(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                if (this._player) {
                    this._player.stop();
                    this._player.reset();
                    this._options = undefined;
                    Application.android.unregisterBroadcastReceiver(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY);
                    this._abandonAudioFocus();
                    this.setAudioFocusManager(null);
                } else {
                    console.error('[Code error AR05] - Player is not initialized');
                }
                resolve(null);
            }
            catch (error) {
                console.error('[Code error AR06] Error disposing audio:', error);
                reject(error);
                throw error;
            }
        });
    }

    public isAudioPlaying(): boolean {
        try {
            if (this._player) {
                return this._player.isPlaying() ? true : false;
            }
            else {
                return false;
            }
        } catch (error) {
            console.error('[Code error AR07] Error checking if audio is playing:', error);
            throw error;
        }
    }

    public getAudioTrackDuration(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const duration = this._player ? this._player.getDuration() : 0;
                resolve(duration.toString());
            }
            catch (error) {
                console.error('[Code error AR08] Error getting audio track duration:', error);
                reject(error);
                throw error;
            }
        });
    }

    /**
     * Notify events by name and optionally pass data
     */
    private _sendEvent(eventName: string, data?: any) {
        try {
            if (this.events) {
                this.events.notify({
                    eventName,
                    object: this._events,
                    data: data
                });
            } else {
                console.error('[Code error AR09] - Events is not initialized');
            }
        } catch (error) {
            console.error('[Code error AR10] Error sending event:', error);
            throw error;
        }
    }

    /**
     * Helper method to ensure audio focus.
     */
    private _requestAudioFocus(): boolean {
        try {
            var _a;
            return (_a = this._audioFocusManager) === null || _a === void 0 ? void 0 : _a.requestAudioFocus(this);
        } catch (error) {
            console.error('[Code error AR11] Error requesting audio focus:', error);
            throw error;
        }
    }

    private _abandonAudioFocus(preserveMP: boolean = false): void {
        try {
            var _a;
            (_a = this._audioFocusManager) === null || _a === void 0 ? void 0 : _a.abandonAudioFocus(this);
            if (this._mediaPlayer && !preserveMP) {
                this._mediaPlayer.release();
                this._mediaPlayer = undefined;
            } else {
                console.error('[Code error AR12] - MediaPlayer is not initialized');
            }
        } catch (error) {
            console.error('[Code error AR13] Error abandoning audio focus:', error);
            throw error;
        }
    }

    private _getAndroidContext() {
        try {
            let ctx = Application.android.context;
            if (!ctx) {
                ctx = Application.getNativeApplication().getApplicationContext();
            }
            if (ctx === null) {
                setTimeout(() => {
                    this._getAndroidContext();
                }, 200);
                return null;
            }
            return ctx || null;
        } catch (error) {
            console.error('[Code error AR14] Error getting Android context:', error);
            throw error;
        }
    }
    /**
     * This getter will instantiate the MediaPlayer if needed
     * and register the listeners. This is done here to avoid
     * code duplication. This is also the reason why we have
     * a `_options`
     */
    private get _player() {
        try {
            if (this._mediaPlayer) {
                return this._mediaPlayer;  // Return the player if it's already initialized
            }

            if (!this._options) {
                console.warn("[Code warning AR15] - Options not set, skipping MediaPlayer initialization.");
                return null;
            }

            console.log("Initializing MediaPlayer with options:", this._options);

            // Initialize the MediaPlayer
            this._mediaPlayer = new android.media.MediaPlayer();

            // Handle MediaPlayer completion
            this._mediaPlayer.setOnCompletionListener(new android.media.MediaPlayer.OnCompletionListener({
                onCompletion: mp => {
                    if (this._options && this._options.completeCallback) {
                        if (this._options.loop === true) {
                            mp.seekTo(5);  // Looping logic
                            mp.start();
                        }
                        this._options.completeCallback({ player: mp });
                    }
                    if (!this._options.loop) {
                        this._abandonAudioFocus(true);  // Abandon focus if not looping
                    }
                }
            }));

            // Handle MediaPlayer errors
            this._mediaPlayer.setOnErrorListener(new android.media.MediaPlayer.OnErrorListener({
                onError: (player, error, extra) => {
                    console.error("[Code error AR16] MediaPlayer error occurred", error, extra);
                    if (this._options && this._options.errorCallback) {
                        this._options.errorCallback({ player, error, extra });
                    }
                    this.dispose();  // Dispose player on error
                    return true;
                }
            }));

            return this._mediaPlayer;

        } catch (error) {
            console.error("[Code error AR16] Error getting player:", error);
            throw error;
        }
    }

    private _onAudioFocusChange(data: AudioFocusChangeEventData) {
        try {
            var _a, _b, _c, _d;
            const focusChange = data.focusChange;
            switch (focusChange) {
                case android.media.AudioManager.AUDIOFOCUS_GAIN:
                    if (this._lastPlayerVolume && this._lastPlayerVolume >= 10) {
                        this.volume = 1.0;
                    }
                    else if (this._lastPlayerVolume) {
                        this.volume = parseFloat('0.' + this._lastPlayerVolume.toString());
                    }
                    if (this._wasPlaying) {
                        this.resume();
                    }
                    break;
                case android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT:
                    break;
                case android.media.AudioManager.AUDIOFOCUS_LOSS:
                    this._wasPlaying = (_b = (_a = this._player) === null || _a === void 0 ? void 0 : _a.isPlaying()) !== null && _b !== void 0 ? _b : false;
                    this.pause();
                    break;
                case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    this._wasPlaying = (_d = (_c = this._player) === null || _c === void 0 ? void 0 : _c.isPlaying()) !== null && _d !== void 0 ? _d : false;
                    this.pause();
                    break;
                case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    this._lastPlayerVolume = this.volume;
                    this.volume = 0.2;
                    break;
            }
        } catch (error) {
            console.error('[Code error AR17] Error handling audio focus change:', error);
            throw error;
        }
    }
}
