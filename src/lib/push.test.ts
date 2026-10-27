import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('convierte la clave pública VAPID a 65 bytes sin comprimir', () => {
    const k = urlBase64ToUint8Array('BEpYUtuptjU5502MEuJcPO1ziZNjhaFakYDsDqylR4JSSJl17rQccieSYmYi5qcJbAhPTIq8etsnppfFHCpt8JU');
    expect(k.length).toBe(65);
    expect(k[0]).toBe(4);
  });
});
