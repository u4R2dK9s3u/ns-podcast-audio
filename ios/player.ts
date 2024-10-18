import { Observable } from '@nativescript/core';
import { TNSPlayerI } from '../common';
import { AudioPlayerOptions } from '../options';

declare var AVAudioPlayer;

class TNSPlayerDelegate extends NSObject implements AVAudioPlayerDelegate {
  static ObjCProtocols = [AVAudioPlayerDelegate];
  private _owner: WeakRef<TNSPlayer>;

  static initWithOwner(owner: TNSPlayer) {
    try {
      const delegate = <TNSPlayerDelegate>TNSPlayerDelegate.new();
      delegate._owner = new global.WeakRef(owner);
      return delegate;
    } catch (error) {
      console.error('[Code error IOS-E00] Error with initWithOwner :', error);
      throw error;
    }
  }

  audioPlayerDidFinishPlayingSuccessfully(player?: any, flag?: boolean) {
    try {
      const owner = this._owner.get();
      if (owner) {
        if (flag && owner.completeCallback) {
          owner.completeCallback({ player, flag });
        }
        else if (!flag && owner.errorCallback) {
          owner.errorCallback({ player, flag });
        } else {
          console.error('[Code error IOS-E01] Owner is null');
        }
      } else {
        console.error('[Code error IOS-E02] Owner is null');
      }
    } catch (error) {
      console.error('[Code error IOS-E03] Error with audioPlayerDidFinishPlayingSuccessfully :', error);
      throw error;
    }
  }

  audioPlayerDecodeErrorDidOccurError(player: any, error: NSError) {
    try {
      const owner = this._owner.get();
      if (owner) {
        if (owner.errorCallback) {
          owner.errorCallback({ player, error });
        }
      } else {
        console.error('[Code error IOS-E04] Owner is null');
      }
    } catch (error) {
      console.error('[Code error IOS-E05] Error with audioPlayerDecodeErrorDidOccurError :', error);
      throw error;
    }
  }
}

export { TNSPlayerDelegate };

export class AudioFocusManager extends Observable { }

export class TNSPlayer extends Observable implements TNSPlayerI {
  completeCallback: any;
  errorCallback: any;
  infoCallback: any;
  _isPrepared: boolean;

  private _player: AVAudioPlayer;
  private _task: NSURLSessionDataTask;
  private delegate: TNSPlayerDelegate;
  constructor() {
    try {
      super();
      this._isPrepared = false;
    } catch (error) {
      console.error('[Code error IOS-E06] Error with constructor :', error);
      throw error;
    }
  }
  get ios(): any {
    try {
      return this._player;
    } catch (error) {
      console.error('[Code error IOS-E07] Error with ios :', error);
      throw error;
    }
  }

  get volume(): number {
    try {
      return this._player ? this._player.volume : 0;
    } catch (error) {
      console.error('[Code error IOS-E08] Error with volume :', error);
      throw error;
    }
  }

  set volume(value: number) {
    try {
      if (this._player && value >= 0) {
        this._player.volume = value;
      } else {
        console.error('[Code error IOS-E09] Player is null or value is not valid');
      }
    } catch (error) {
      console.error('[Code error IOS-E10] Error with volume :', error);
      throw error;
    }
  }

  public get duration() {
    try {
      if (this._player) {
        return this._player.duration;
      }
      else {
        return 0;
      }
    } catch (error) {
      console.error('[Code error IOS-E11] Error with duration :', error);
      throw error;
    }
  }

  get currentTime(): number {
    try {
      return this._player ? this._player.currentTime : 0;
    } catch (error) {
      console.error('[Code error IOS-E12] Error with currentTime :', error);
      throw error;
    }
  }

  public setAudioFocusManager(manager: any) { }

  public initFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        options.autoPlay = false;
        this.playFromUrl(options).then(resolve, reject);
      } catch (error) {
        console.error('[Code error IOS-E16] Error with initFromUrl :', error);
        reject(error);
        throw error;
      }
    });
  }

  public playFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      if (options.autoPlay !== false) {
        options.autoPlay = true;
      }
      try {
        this._task = NSURLSession.sharedSession.dataTaskWithURLCompletionHandler(NSURL.URLWithString(options.audioFile), (data, response, error) => {
          if (error !== null) {
            if (this.errorCallback) {
              this.errorCallback({ error });
            }
            reject();
          }

          this.completeCallback = options.completeCallback;
          this.errorCallback = options.errorCallback;
          this.infoCallback = options.infoCallback;

          const audioSession = AVAudioSession.sharedInstance();
          if (options.audioMixing) {
            audioSession.setCategoryWithOptionsError(AVAudioSessionCategoryAmbient, 1);
          } else {
            audioSession.setCategoryWithOptionsError(AVAudioSessionCategoryAmbient, 2);
          }

          const errorRef = new interop.Reference();
          this._player = AVAudioPlayer.alloc().initWithDataError(data, errorRef);

          if (errorRef && errorRef.value) {
            reject(errorRef.value);
          } else if (this._player) {
            this._player.delegate = TNSPlayerDelegate.initWithOwner(this);
            this._player.enableRate = true;
            this._player.numberOfLoops = options.loop ? -1 : 0;
            if (options.metering) {
              this._player.meteringEnabled = true;
            }

            this._isPrepared = true;
            if (options.autoPlay) {
              this.play();
            }
            resolve(null);
          } else {
            reject();
          }
        });
        this._task.resume();
      } catch (error) {
        if (this.errorCallback) {
          this.errorCallback({ error });
        }
        console.error('[Code error IOS-E17] Error with playFromUrl :', error);
        reject(error);
        throw error;
      }
    });
  }

  public pause(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this._player.playing) {
          this._player.pause();
        }
        resolve(true);
      }
      catch (error) {
        if (this.errorCallback) {
          this.errorCallback({ error });
        }
        console.error('[Code error IOS-E18] Error with pause :', error);
        reject(error);
        throw error;
      }
    });
  }

  public play(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isAudioPlaying() && this._isPrepared) {
          this._player.play();
          resolve(true);
        } else {
          reject(new Error("Player is not prepared or already playing"));
        }
      } catch (error) {
        if (this.errorCallback) {
          this.errorCallback({ error });
        }
        console.error('[Code error IOS-E19] Error with play :', error);
        reject(error);
        throw error;
      }
    });
  }

  public resume(): void {
    try {
      if (this._player) {
        this._player.play();
      } else {
        console.error('[Code error IOS-E20] Player is null');
      }
    } catch (error) {
      console.error('[Code error IOS-E21] Error with resume :', error);
      throw error;
    }
  }

  public playAtTime(time: number): void {
    try {
      if (this._player) {
        this._player.playAtTime(time);
      } else {
        console.error('[Code error IOS-E22] Player is null');
      }
    } catch (error) {
      console.error('[Code error IOS-E23] Error with playAtTime :', error);
      throw error;
    }
  }

  public seekTo(time: number): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._isPrepared && this._player) {
          this._player.currentTime = time;
          resolve(true);
        } else {
          console.error('[Code error IOS-E24] Player is not prepared');
          reject(new Error("Player is not prepared"));
        }
      } catch (error) {
        if (this.errorCallback) {
          this.errorCallback({ error });
        }
        console.error('[Code error IOS-E25] Error with seekTo :', error);
        reject(error);
        throw error;
      }
    });
  }

  public dispose(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this.isAudioPlaying()) {
          this._player.stop();
        }
        const audioSession = AVAudioSession.sharedInstance();
        audioSession.setActiveError(false);
        this._reset();
        this._isPrepared = false;
        resolve(null);
      } catch (error) {
        if (this.errorCallback) {
          this.errorCallback({ error });
        }
        console.error('[Code error IOS-E26] Error with dispose :', error);
        reject(error);
        throw error;
      }
    });
  }

  public isAudioPlaying(): boolean {
    try {
      return this._player ? this._player.playing : false;
    } catch (error) {
      console.error('[Code error IOS-E27] Error with isAudioPlaying :', error);
      throw error;
    }
  }

  public getAudioTrackDuration(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const duration = this._player ? this._player.duration : 0;
        resolve(duration.toString());
      }
      catch (error) {
        if (this.errorCallback) {
          this.errorCallback({ error });
        }
        console.error('[Code error IOS-E28] Error with getAudioTrackDuration :', error);
        reject(error);
        throw error;
      }
    });
  }

  public changePlayerSpeed(speed) {
    try {
      if (this._player && speed) {
        if (typeof speed === 'string') {
          speed = parseFloat(speed);
        }
        this._player.rate = speed;
      } else {
        console.error('[Code error IOS-E29] Player is null or speed is not valid');
      }
    } catch (error) {
      console.error('[Code error IOS-E30] Error with changePlayerSpeed :', error);
      throw error;
    }
  }

  private _reset() {
    try {
      if (this._player) {
        this._player = undefined;
      }
      if (this.delegate) {
        this.delegate = undefined;
      }
      if (this._task) {
        this._task.cancel();
        this._task = undefined;
      }
      this._isPrepared = false;
    } catch (error) {
      console.error('[Code error IOS-E31] Error with _reset :', error);
      throw error;
    }
  }
}