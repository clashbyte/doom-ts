interface WADEntry {
  offset: number;
  size: number;
}

export class WAD {
  private static buffer: ArrayBuffer;

  private static view: DataView<ArrayBuffer>;

  private static entries: Map<string, WADEntry>;

  public static async init() {
    this.buffer = await fetch('/DOOM.WAD').then((v) => v.arrayBuffer());
    this.view = new DataView(this.buffer);
    this.entries = new Map<string, WADEntry>();

    const count = this.view.getInt32(4, true);
    const tableOffset = this.view.getInt32(8, true);

    let map = '';
    let dir = '';
    for (let i = 0; i < count; i++) {
      const pos = tableOffset + i * 16;
      const offset = this.view.getInt32(pos, true);
      const size = this.view.getInt32(pos + 4, true);
      let name = this.getString(pos + 8, 8);

      // console.debug(name);
      if (size === 0) {
        if (name.match(/^E\dM\d$/gim)) {
          map = name;
        } else {
          switch (name) {
            case 'F_START':
              dir = 'FLATS';
              break;

            case 'S_START':
              dir = 'SPRITES';
              break;

            case 'P_START':
              dir = 'PATCHES';
              break;

            case 'F_END':
            case 'S_END':
            case 'P_END':
              dir = '';
              break;
          }
        }
      } else if (
        [
          'THINGS',
          'LINEDEFS',
          'SIDEDEFS',
          'VERTEXES',
          'SEGS',
          'SSECTORS',
          'NODES',
          'SECTORS',
          'REJECT',
          'BLOCKMAP',
        ].includes(name)
      ) {
        name = `${map}/${name}`;
      } else {
        name = dir !== '' ? `${dir}/${name}` : name;
      }

      if (size !== 0) {
        this.entries.set(name, {
          offset,
          size,
        });
        // console.debug(name);
      }
    }
  }

  public static getFiles() {
    return this.entries.keys();
  }

  public static getEntry(name: string): ArrayBuffer | null {
    if (this.entries.has(name)) {
      const en = this.entries.get(name);

      return this.buffer.slice(en.offset, en.offset + en.size);
    }

    return null;
  }

  private static getString(offset: number, length: number = 8) {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += String.fromCharCode(this.view.getUint8(offset + i));
    }
    if (out.indexOf('\0') !== -1) {
      out = out.substring(0, out.indexOf('\0'));
    }

    return out;
  }
}
