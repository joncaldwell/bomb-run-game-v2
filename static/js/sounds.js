class GameSounds {
    constructor() {
        this.synth = new Tone.Synth().toDestination();
        this.explosion = new Tone.MembraneSynth().toDestination();
    }

    playMove() {
        this.synth.triggerAttackRelease("C4", "32n", undefined, 0.1);
    }

    playExplosion() {
        this.explosion.triggerAttackRelease("C2", "8n", undefined, 0.5);
    }

    playGameOver() {
        this.synth.triggerAttackRelease("C3", "4n", undefined, 0.3);
        setTimeout(() => {
            this.synth.triggerAttackRelease("G2", "2n", undefined, 0.3);
        }, 200);
    }
}
