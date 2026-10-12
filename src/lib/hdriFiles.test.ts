import { describe, expect, it } from 'vitest';
import { validateHdriFile } from './hdriFiles';
const header = '#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 2\n';
describe('HDRI upload validation', () => {
  it('accepts a Radiance RGBE environment', async () => {
    await expect(validateHdriFile(new File([header, new Uint8Array([128,128,128,129,128,128,128,129])], 'studio.hdr'))).resolves.toBeUndefined();
  });
  it('rejects renamed images and missing pixel data', async () => {
    await expect(validateHdriFile(new File(['not an HDR image'], 'studio.hdr'))).rejects.toThrow('Radiance HDR');
    await expect(validateHdriFile(new File([header], 'studio.hdr'))).rejects.toThrow('valid HDRI');
  });
  it('rejects unsupported extensions and excessive dimensions', async () => {
    await expect(validateHdriFile(new File([header], 'studio.exr'))).rejects.toThrow('.hdr');
    await expect(validateHdriFile(new File([header.replace('+X 2', '+X 99999'), new Uint8Array(8)], 'studio.hdr'))).rejects.toThrow('8192');
  });
  it('rejects files exceeding the upload limit', async () => {
    await expect(validateHdriFile(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'studio.hdr'))).rejects.toThrow('20 MB');
  });
});
