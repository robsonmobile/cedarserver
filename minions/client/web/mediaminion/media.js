MediaMinionMedia = class MediaMinionMedia {
    constructor (action, minion) {
        this.ready = false;
        this.shown = false;
        this.removed = false;
        
        this.syncing = false;
    
        this.action = action;
        this.minion = minion;
        
        this.media = media.findOne(this.action.media);
        this.settings = combineSettings(action.settings, this.media.settings, this.minion.settings);
        
        this.volume = parseFloat(this.settings.media_volume) * parseFloat(this.settings.mediaminion_volume);
                        
        if (this.media.type == 'video' || this.media.type == 'image') {                    
            this.materials = [];
            this.meshes = [];
            this.opacity = 0;
            
            this.z = this.minion.stage.settings.layers.indexOf(this.action.layer) * 0.001;

            if (this.media.type == 'video') {
                this.type = 'video';
                this.video = document.createElement('video');
                this.tosync = this.video;
                this.video.src = settings.findOne({key: 'mediaurl'}).value + this.media.location;
                this.video.controls = false;
                
                if (this.settings.media_loop == 'yes') {
                    this.video.addEventListener('ended', function () {
                        this.play();
                    }.bind(this.video));
                }
                
                this.video.onloadedmetadata = () => {                        
                    this.texture = new THREE.VideoTexture(this.video);
                    this.texture.minFilter = THREE.LinearFilter;
                    this.texture.magFilter = THREE.LinearFilter;
                    this.ready = true;
                }
            }
            
            else if (this.media.type == 'image') {
                this.type = 'image';
                
                this.image = new Image();
                this.image.src = settings.findOne({key: 'mediaurl'}).value + this.media.location;
                
                this.image.onload = () => {                        
                    this.texture = new THREE.Texture(this.image);
                    this.texture.minFilter = THREE.LinearFilter;
                    this.texture.magFilter = THREE.LinearFilter;
                    this.texture.needsUpdate = true;
                    this.ready = true;
                }
            }
        }
        
        else if (this.media.type == 'audio') {
            this.type = 'audio';
            this.audio = document.createElement('audio');
            this.tosync = this.audio;
            this.audio.src = settings.findOne({key: 'mediaurl'}).value + this.media.location;
            this.audio.controls = false;
            this.audio.volume = 0;

            if (this.settings.media_loop == 'yes') {
                this.audio.addEventListener('ended', function () {
                    this.play();
                }.bind(this.audio));
            }
            
            this.audio.onloadedmetadata = () => {
                this.ready = true;
            }
        }
    }
    
    sync () {
        if (this.shown) {
            if (this.settings.media_loop == 'yes')
                var t = time.since(this.action.time) % (this.tosync.duration * 1000);
            else var t = time.since(this.action.time);

            if (this.tosync.paused) {
                this.tosync.currentTime = t * 0.001;
                this.tosync.play();
            }
            
            else {
                var o = t * 0.001 - this.tosync.currentTime;
                
                /* WIP - aggressive media sync, currently a bit buggy
                if (o > 0.5 || o < -0.5) {
                    this.tosync.playbackRate = 1;
                    this.tosync.currentTime = t * 0.001;
                    this.syncing = false;
                    console.log(`o:${o}, jumping to ${t * 0.001}`);
                } */
                
                if ((o > 0.2 || o < -0.2) && !this.syncing) {
                    if (o > 0) this.tosync.playbackRate = 1.02;
                    else this.tosync.playbackRate = 0.98;
                    this.syncing = true;
                    console.log(`o:${o}, setting rate to ${this.tosync.playbackRate}`);
                } else if ((o < 0.05 && o > -0.05) && this.syncing) {
                    console.log(`o:${o}, resetting rate`);
                    this.tosync.playbackRate = 1;
                    this.syncing = false;
                }
                
            }
        
            Meteor.setTimeout(this.sync.bind(this), 500);
        }
    }
    
    show (old) {
        if (this.ready) {
            this.shown = true;
            
            if (old) {
                old.hide();
                old.remove();
            }
            
            if (this.type == 'video' || this.type == 'audio') {
                this.sync();
            }

            if (this.type == 'video' || this.type == 'image') {
                this.minion.create_blocks(this);
                
                this.minion.fades.push({
                    start: 0, end: 1,
                    length: parseFloat(this.settings.media_fade) * 1000,
                    time: this.action.time,
                    callback: (v) => {
                        this.opacity = v;
                        for (var n in this.materials) {
                            this.materials[n].uniforms.opacity.value = v;
                        }
                        
                        if (this.type == 'video') this.video.volume = v * this.volume;
                    }
                });
            }
            
            else if (this.type == 'audio') {
                this.minion.fades.push({
                    start: 0, end: 1,
                    length: parseFloat(this.settings.media_fade) * 1000,
                    time: this.action.time,
                    callback: (v) => {this.audio.volume = v * this.volume;}
                });
            }
        }
        
        else Meteor.setTimeout(this.show.bind(this, old), 100);
    }
    
    hide () {
        if (this.type == 'video' || this.type == 'image') {
            this.minion.fades.push({
                start: 1, end: 0,
                length: parseFloat(this.settings.media_fade) * 1000,
                time: time.now(),
                callback: (v) => {
                    for (var n in this.materials) {
                        this.opacity = v;
                        this.materials[n].uniforms.opacity.value = v;
                    }
                    
                    if (this.type == 'video') this.video.volume = v * this.volume;

                    if (v == 0) {
                        this.shown = false;
                        if (this.type == 'video') this.video.pause();
                        for (var i in this.meshes) {
                            this.minion.scene.remove(this.meshes[i]);
                        }
                    }
                }
            });
        }
        
        else if (this.type == 'audio') {
            this.minion.fades.push({
                start: 1, end: 0,
                length: parseFloat(this.settings.media_fade) * 1000,
                time: time.now(),
                callback: (v) => {
                    this.audio.volume = v * this.volume;
                    if (v == 0) {
                        this.shown = false;
                        this.audio.pause();
                    }
                }
            });
        }
    }
    
    remove () {
        if (!this.shown) {
            if (this.type == 'video') {
                this.video.pause();
                $(this.video).remove();
            }
            
            if (this.type == 'audio') {
                this.audio.pause();
                $(this.audio).remove();
            }
            
            this.removed = true;
        }
        
        else Meteor.setTimeout(this.remove.bind(this), 100);
    }
}
