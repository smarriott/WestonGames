import Phaser from 'phaser';
import { TILE } from '../config';
import { LevelMapData, Marker } from '../levels/LevelMap';

export type Theme = 'cellar' | 'hall' | 'house' | 'toys' | 'bath' | 'kitchen' | 'attic' | 'library';

/** Background wall frame + solid tiles (mixed for variety) + top-edge tiles per theme. */
const THEMES: Record<Theme, { wall: number; solid: number[]; top: number[] }> = {
    cellar: { wall: 0, solid: [0], top: [1] },
    hall: { wall: 1, solid: [0], top: [1] },
    house: { wall: 1, solid: [4], top: [5] },
    toys: { wall: 2, solid: [6, 7, 8], top: [6, 7, 8] },
    bath: { wall: 3, solid: [9], top: [10] },
    kitchen: { wall: 4, solid: [11], top: [12] },
    attic: { wall: 5, solid: [13], top: [14] },
    library: { wall: 6, solid: [15], top: [16] },
};
const SOLID_TILES = [0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

const T = { SHELF: 2, LADDER: 3 };

/** Builds the Phaser tilemap for a parsed level and answers tile questions. */
export class WorldMap {
    readonly layer: Phaser.Tilemaps.TilemapLayer;
    readonly widthPx: number;
    readonly heightPx: number;

    constructor(private scene: Phaser.Scene, readonly data: LevelMapData, theme: Theme) {
        this.widthPx = data.width * TILE;
        this.heightPx = data.height * TILE;

        // Background wall
        scene.add
            .tileSprite(0, 0, this.widthPx, this.heightPx, 'wallpaper', THEMES[theme].wall)
            .setOrigin(0)
            .setDepth(-100);

        const map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: data.width, height: data.height });
        const tiles = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
        const ladders = map.createBlankLayer('ladders', tiles)!.setDepth(5);
        const ground = map.createBlankLayer('ground', tiles)!.setDepth(10);

        const { solid, top } = THEMES[theme];
        const pick = (arr: number[], c: number, r: number) => arr[(c * 7 + r * 3) % arr.length];
        for (let r = 0; r < data.height; r++) {
            for (let c = 0; c < data.width; c++) {
                if (data.ladders[r][c]) ladders.putTileAt(T.LADDER, c, r);
                const cell = data.cells[r][c];
                if (cell === 'solid') {
                    const above = r > 0 && data.cells[r - 1][c] === 'solid';
                    ground.putTileAt(pick(above ? solid : top, c, r), c, r);
                } else if (cell === 'shelf') {
                    ground.putTileAt(T.SHELF, c, r);
                }
            }
        }
        ground.setCollision(SOLID_TILES);
        // shelves are one-way: only their top edge is solid
        ground.forEachTile((t) => {
            if (t.index === T.SHELF) t.setCollision(false, false, true, false);
        });
        this.layer = ground;
    }

    /** Collide a sprite with the level. Shelves are ignored while `passShelves()` is true. */
    addCollider(obj: Phaser.GameObjects.GameObject, passShelves: () => boolean = () => false) {
        return this.scene.physics.add.collider(obj, this.layer, undefined, (_o, tile) => {
            return !((tile as Phaser.Tilemaps.Tile).index === T.SHELF && passShelves());
        });
    }

    ladderAt(x: number, y: number): boolean {
        const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
        if (r < 0 || r >= this.data.height || c < 0 || c >= this.data.width) return false;
        return this.data.ladders[r][c];
    }

    /** Is there something to stand on (block or shelf) at this point? */
    groundAt(x: number, y: number): boolean {
        const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
        if (r < 0 || r >= this.data.height || c < 0 || c >= this.data.width) return false;
        return this.data.cells[r][c] !== 'empty';
    }

    ladderCenterX(x: number) {
        return Math.floor(x / TILE) * TILE + TILE / 2;
    }

    /** World position for a marker: horizontally centred, standing on the cell's floor. */
    static feet(m: Marker) {
        return { x: m.col * TILE + TILE / 2, y: (m.row + 1) * TILE };
    }
}
