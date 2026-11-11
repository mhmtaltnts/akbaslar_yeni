// Google Haritalar bağlantıları (resmi "Maps URLs": anahtar gerekmez; telefonda
// Haritalar uygulaması varsa onu açar). Aramaya otopark adı da eklenir ki
// adres tek başına belirsizse doğru yer bulunsun.
const q = (name: string, address: string) => encodeURIComponent(`${name}, ${address}`);

// Haritada konumu göster.
export const mapsSearchUrl = (name: string, address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${q(name, address)}`;

// Bulunulan yerden yol tarifi.
export const mapsDirectionsUrl = (name: string, address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${q(name, address)}`;
