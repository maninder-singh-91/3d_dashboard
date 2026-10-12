declare module "three/examples/jsm/loaders/HDRLoader.js" {
  export class HDRLoader {
    setDataType(type: number): this;
    parse(buffer: ArrayBuffer): { width: number; height: number; data: Float32Array };
  }
}
