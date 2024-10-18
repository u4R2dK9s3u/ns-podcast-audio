# ns-podcast-audio

An advanced audio player plugin for NativeScript that provides seamless audio playback capabilities for podcasts and music applications on both Android and iOS platforms.

## Features

- **Cross-Platform Support**: Works on both Android and iOS devices.
- **Audio Focus Management**: Handles audio focus changes gracefully.
- **Playback Controls**: Play, pause, seek, and adjust volume.
- **Playback Speed Adjustment**: Change playback speed (Android API 23+).
- **Looping Support**: Loop audio playback as needed.
- **Event Handling**: Listen to playback events like start, pause, and seek.
- **Error Handling**: Provides callbacks for error management.
- **Audio Mixing**: Supports audio mixing options.
- **Pitch Adjustment**: Adjust the pitch of the audio playback.

## Installation

Install the plugin using npm:

```bash
npm install ns-podcast-audio
```

## Usage

Import the plugin into your NativeScript project:

```javascript
import { TNSPlayer, AudioPlayerOptions, AudioPlayerEvents } from 'ns-podcast-audio';
```

### Basic Example

```javascript
const player = new TNSPlayer();

const audioOptions: AudioPlayerOptions = {
  audioFile: 'https://example.com/podcast.mp3',
  loop: false,
  autoPlay: true,
  completeCallback: () => {
    console.log('Playback completed');
  },
  errorCallback: (error) => {
    console.error('Playback error:', error);
  },
};

player.playFromUrl(audioOptions).then(() => {
  console.log('Audio started playing');
}).catch((error) => {
  console.error('Error playing audio:', error);
});
```

### Adjusting Volume

```javascript
// Get current volume
const currentVolume = player.volume;

// Set volume (value between 0 and 1)
player.volume = 0.5;
```

### Seeking Audio

```javascript
// Seek to 30 seconds
player.seekTo(30).then(() => {
  console.log('Seek successful');
}).catch((error) => {
  console.error('Error seeking audio:', error);
});
```

### Changing Playback Speed

```javascript
// Change playback speed to 1.5x
player.changePlayerSpeed(1.5);
```

### Listening to Events

```javascript
player.events.on(AudioPlayerEvents.started, () => {
  console.log('Audio playback started');
});

player.events.on(AudioPlayerEvents.paused, () => {
  console.log('Audio playback paused');
});

player.events.on(AudioPlayerEvents.seek, () => {
  console.log('Audio playback seeked');
});
```

## API Reference

### TNSPlayer

#### Methods

- **playFromUrl(options: AudioPlayerOptions): Promise<any>**
  - Starts playing audio from a URL.
- **play(): Promise<boolean>**
  - Resumes playback if paused.
- **pause(): Promise<boolean>**
  - Pauses the audio playback.
- **seekTo(time: number): Promise<boolean>**
  - Seeks to a specific time in seconds.
- **dispose(): Promise<boolean>**
  - Releases the resources used by the player.
- **changePlayerSpeed(speed: number): void**
  - Changes the playback speed (Android API 23+).
- **isAudioPlaying(): boolean**
  - Checks if the audio is currently playing.
- **getAudioTrackDuration(): Promise<string>**
  - Gets the duration of the audio track.

#### Properties

- **volume: number**
  - Gets or sets the playback volume (0 to 1).
- **currentTime: number**
  - Gets the current playback position in seconds.
- **duration: number**
  - Gets the duration of the audio track in seconds.
- **events: Observable**
  - Observable to listen for playback events.

### AudioPlayerOptions

- **audioFile: string**
  - The URL or local path of the audio file.
- **loop: boolean**
  - Whether to loop the audio playback.
- **autoPlay?: boolean**
  - Whether to start playback immediately after loading.
- **metering?: boolean**
  - Enable audio metering (not implemented in this version).
- **audioMixing?: boolean**
  - Enable audio mixing with other apps.
- **pitch?: number**
  - Adjust the pitch of the audio playback.
- **completeCallback?: Function**
  - Callback when playback completes.
- **errorCallback?: Function**
  - Callback when an error occurs.
- **infoCallback?: Function**
  - Callback for informational events.

### AudioPlayerEvents

- **AudioPlayerEvents.started**
  - Fired when audio playback starts.
- **AudioPlayerEvents.paused**
  - Fired when audio playback is paused.
- **AudioPlayerEvents.seek**
  - Fired when audio playback position changes due to seeking.

## Audio Focus Management (Android Only)

The plugin handles audio focus changes on Android to provide a seamless audio experience. It responds to system audio focus events to pause, resume, or adjust the volume as needed.

### Example

```javascript
import { AudioFocusManager, AudioFocusDurationHint } from 'ns-podcast-audio';

const audioFocusManager = new AudioFocusManager({
  durationHint: AudioFocusDurationHint.AUDIOFOCUS_GAIN,
});

player.setAudioFocusManager(audioFocusManager);
```

## Pitch Adjustment (iOS Only)

Adjust the pitch of the audio playback on iOS devices.

### Example

```javascript
const audioOptions: AudioPlayerOptions = {
  // ... other options
  pitch: 1.2, // Increase pitch by 20%
};
```

## Error Handling

Implement `errorCallback` in `AudioPlayerOptions` to handle errors gracefully.

```javascript
const audioOptions: AudioPlayerOptions = {
  // ... other options
  errorCallback: (error) => {
    console.error('An error occurred during playback:', error);
  },
};
```

## Requirements

- **Android**: API Level 21 or higher
- **iOS**: iOS 9.0 or higher
- **NativeScript**: 8.x or higher

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/u4R2dK9s3u/ns-podcast-audio).

## License

This project is licensed under the MIT License.