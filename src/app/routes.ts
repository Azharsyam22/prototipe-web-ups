export type Screen =
  | 'home'
  | 'loginPedagang'
  | 'loginPembeli'
  | 'informasi'
  | 'register'
  | 'otp'
  | 'lupaAkun'
  | 'berandaPdg'
  | 'ulasanPdg'
  | 'tambahProduk'
  | 'popupDonePdg'
  | 'settingPdg'
  | 'settingPembeli'
  | 'chatUlasanPdg'
  | 'fotoUlasanPdg'
  | 'chatUlasanPembeli'
  | 'berandaPembeli'
  | 'ulasanPembeli'
  | 'favoritUmkm'
  | 'profilPedagangPembeli'
  | 'profilUmkmPembeli'
  | 'aturNotifikasi'
  | 'tambahUlasanPembeli'

export const routes: Record<Screen, string> = {
  home: '/',
  loginPedagang: '/login-pedagang',
  loginPembeli: '/login-pembeli',
  informasi: '/informasi',
  register: '/register',
  otp: '/otp',
  lupaAkun: '/lupa-akun',
  berandaPdg: '/pedagang/beranda',
  ulasanPdg: '/pedagang/ulasan',
  tambahProduk: '/pedagang/tambah-produk',
  popupDonePdg: '/pedagang/popup-done',
  settingPdg: '/pedagang/profil',
  settingPembeli: '/pembeli/profil',
  chatUlasanPdg: '/pedagang/ulasan/balas',
  fotoUlasanPdg: '/pedagang/ulasan/foto',
  chatUlasanPembeli: '/pembeli/ulasan/balas',
  berandaPembeli: '/pembeli/beranda',
  ulasanPembeli: '/pembeli/ulasan',
  favoritUmkm: '/pembeli/favorit',
  profilPedagangPembeli: '/pembeli/pedagang',
  profilUmkmPembeli: '/pembeli/umkm',
  aturNotifikasi: '/pembeli/notifikasi',
  tambahUlasanPembeli: '/pembeli/ulasan/tambah',
}

export const pathToScreen: Record<string, Screen> = Object.entries(routes).reduce(
  (acc, [key, path]) => {
    acc[path] = key as Screen
    return acc
  },
  {} as Record<string, Screen>,
)

export const screenHeights: Record<Screen, number> = {
  home: 844,
  loginPedagang: 844,
  loginPembeli: 844,
  informasi: 938,
  register: 830,
  otp: 830,
  lupaAkun: 830,
  berandaPdg: 1035,
  ulasanPdg: 1172,
  tambahProduk: 612,
  popupDonePdg: 360,
  settingPdg: 410,
  settingPembeli: 269,
  chatUlasanPdg: 844,
  fotoUlasanPdg: 281,
  chatUlasanPembeli: 844,
  berandaPembeli: 983,
  ulasanPembeli: 980,
  favoritUmkm: 918,
  profilPedagangPembeli: 918,
  profilUmkmPembeli: 1172,
  aturNotifikasi: 269,
  tambahUlasanPembeli: 556,
}
