declare module 'brotli/decompress*' {
  /** 解压 brotli 数据流（WOFF2 使用该算法压缩） */
  export default function decompress(input: Uint8Array): Uint8Array
}
