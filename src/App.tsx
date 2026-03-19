import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useLocation, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { defaultCenter, pedagangMarkers } from './app/mapData'
import { pathToScreen, routes, screenHeights, type Screen } from './app/routes'
import { asset } from './utils/asset'

const pedagangIcon = new L.DivIcon({
  className: 'pedagang-marker',
  html: `
    <div class="sonar">
      <span class="sonar-ring"></span>
      <span class="sonar-ring delay"></span>
      <span class="sonar-dot"></span>
      <svg class="sonar-pin" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c-4 0-7 3-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-4-3-7-7-7Zm0 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="#E53935"/>
      </svg>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 44],
  popupAnchor: [0, -36],
})

L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url)
    .toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
})

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const screen = pathToScreen[location.pathname] ?? 'home'
  const [showPopupDone, setShowPopupDone] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authRole, setAuthRole] = useState<'none' | 'pedagang' | 'pembeli'>('none')
  const [notifLewat, setNotifLewat] = useState(true)
  const [notifDitandai, setNotifDitandai] = useState(true)
  const [notifGps, setNotifGps] = useState(false)
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [loginPedagangForm, setLoginPedagangForm] = useState({
    username: '',
    password: '',
  })
  const [loginPembeliForm, setLoginPembeliForm] = useState({
    username: '',
    password: '',
  })
  const [appModal, setAppModal] = useState({
    open: false,
    title: '',
    message: '',
    variant: 'error' as 'error' | 'info',
  })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [otpCode, setOtpCode] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(12)
  const [lupaAkunValue, setLupaAkunValue] = useState('')
  const [produkForm, setProdukForm] = useState({
    nama: '',
    harga: '',
    stok: '',
  })
  const [ulasanSearch, setUlasanSearch] = useState('')
  const [ulasanPembeliSearch, setUlasanPembeliSearch] = useState('')
  const [favoritSearch, setFavoritSearch] = useState('')
  const [umkmSearch, setUmkmSearch] = useState('')
  const [tandaiPedagang, setTandaiPedagang] = useState(false)
  const uploadProdukRef = useRef<HTMLInputElement | null>(null)
  const uploadUlasanRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 390 : window.innerWidth,
    height: typeof window === 'undefined' ? 844 : window.innerHeight,
  }))
  const contentHeight = screenHeights[screen]
  const deviceWidth = 390
  const deviceHeight = 844
  const isHomeActive = screen === 'home'
  const isBuyerScreen = [
    'berandaPembeli',
    'ulasanPembeli',
    'favoritUmkm',
    'profilPedagangPembeli',
    'profilUmkmPembeli',
    'chatUlasanPembeli',
    'settingPembeli',
  ].includes(screen)
  const showProfileNav = authRole !== 'none'
  const profileTarget = authRole === 'pembeli' ? 'settingPembeli' : 'settingPdg'
  const isProfileActive =
    (authRole === 'pembeli' && screen === 'settingPembeli') ||
    (authRole === 'pedagang' && screen === 'settingPdg')
  const canGoBack = location.pathname !== routes.home

  const goTo = useCallback(
    (next: Screen) => {
      const nextPath = routes[next]
      if (location.pathname !== nextPath) {
        navigate(nextPath)
      }
    },
    [location.pathname, navigate],
  )

  const goBack = useCallback(() => {
    if (location.pathname === routes.home) {
      return
    }
    navigate(-1)
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!gpsEnabled || !navigator.geolocation) return undefined
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude])
      },
      () => {
        setUserPosition(defaultCenter)
      },
      { enableHighAccuracy: true, timeout: 5000 },
    )
    return () => navigator.geolocation.clearWatch(watcher)
  }, [gpsEnabled])

  useEffect(() => {
    if (screen !== 'otp') return
    setOtpCountdown(12)
  }, [screen])

  useEffect(() => {
    if (!pathToScreen[location.pathname]) {
      navigate(routes.home, { replace: true })
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [screen])

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (screen !== 'tambahProduk') {
      setShowPopupDone(false)
    }
  }, [screen])

  useEffect(() => {
    if (screen !== 'otp' || otpCountdown <= 0) return
    const timer = window.setTimeout(() => {
      setOtpCountdown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [otpCountdown, screen])

  const mapCenter = useMemo(() => userPosition ?? defaultCenter, [userPosition])
  const isMobileViewport = viewport.width <= 480
  const scale = isMobileViewport
    ? Math.min(1, viewport.width / deviceWidth)
    : Math.min(
        1,
        Math.min((viewport.width - 24) / deviceWidth, (viewport.height - 24) / deviceHeight),
      )
  const scaledWidth = deviceWidth * scale
  const scaledHeight = deviceHeight * scale
  const outerClass = isMobileViewport
    ? 'w-full bg-white flex justify-start'
    : 'w-full bg-[#f3f4f6] flex justify-center items-start'
  const outerStyle = isMobileViewport
    ? { minHeight: '100vh', padding: '0', margin: '0' }
    : { minHeight: '100vh', paddingTop: '16px', paddingBottom: '16px' }
  const frameClass = isMobileViewport
    ? 'w-full'
    : 'rounded-[30px] border border-[#d6d6d6] shadow-[0_24px_60px_rgba(0,0,0,0.2)]'
  const innerClass = isMobileViewport
    ? 'relative w-[390px] overflow-hidden bg-white'
    : 'relative w-[390px] overflow-hidden rounded-[24px] bg-white'
  const frameStyle = isMobileViewport
    ? {
        width: `${deviceWidth}px`,
        height: `${deviceHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        border: 'none',
        boxShadow: 'none',
        borderRadius: '0px',
      }
    : {
        width: `${deviceWidth}px`,
        height: `${deviceHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }
  const openModal = useCallback(
    (title: string, message: string, variant: 'error' | 'info' = 'error') => {
      setAppModal({ open: true, title, message, variant })
    },
    [],
  )

  const closeModal = useCallback(() => {
    setAppModal((prev) => ({ ...prev, open: false }))
  }, [])
  const ulasanItems = useMemo(
    () => [
      {
        top: 356,
        name: 'Dadang',
        text: 'Enak Nasi Goreng nya ha..',
        img: asset('assets/foto profil dadang.svg'),
        reply: 'Lihat Balasan +1',
        full: 4,
        pos: {
          avatarLeft: 16,
          avatarTop: 16,
          nameLeft: 88,
          nameTop: 16,
          textLeft: 88,
          textTop: 37.2,
          starsLeft: 88,
          starsTop: 56,
          replyIconLeft: 15,
          replyIconTop: 111,
          replyTextLeft: 48,
          replyTextTop: 115,
        },
      },
      {
        top: 512.47,
        name: 'Abyan',
        text: 'WOI ENAK BANGET GILA..',
        img: asset('assets/foto profil abyan.svg'),
        reply: 'Balas',
        full: 5,
        pos: {
          avatarLeft: 16,
          avatarTop: 17,
          nameLeft: 90,
          nameTop: 17,
          textLeft: 90,
          textTop: 38.2,
          starsLeft: 90,
          starsTop: 57.53,
          replyIconLeft: 16,
          replyIconTop: 111,
          replyTextLeft: 48,
          replyTextTop: 115,
        },
      },
      {
        top: 669.42,
        name: 'Valiant',
        text: 'The Cracker Stale When I..',
        img: asset('assets/foto profil valiant.svg'),
        reply: 'Balas',
        full: 2,
        pos: {
          avatarLeft: 16,
          avatarTop: 14,
          nameLeft: 88,
          nameTop: 17,
          textLeft: 88,
          textTop: 38.2,
          starsLeft: 88,
          starsTop: 56,
          replyIconLeft: 16,
          replyIconTop: 111,
          replyTextLeft: 48,
          replyTextTop: 115,
        },
      },
      {
        top: 826.37,
        name: 'Hansen',
        text: 'Kok Saya Mesen Jam 23..',
        img: asset('assets/foto profil hansen.svg'),
        reply: 'Balas',
        full: 4,
        pos: {
          avatarLeft: 16,
          avatarTop: 17,
          nameLeft: 90,
          nameTop: 17,
          textLeft: 90,
          textTop: 38.2,
          starsLeft: 90,
          starsTop: 57.2,
          replyIconLeft: 16,
          replyIconTop: 111,
          replyTextLeft: 48,
          replyTextTop: 115,
        },
      },
      {
        top: 983.32,
        name: 'Fariz',
        text: 'Makanannya Enak Tapi A..',
        img: asset('assets/foto profil fariz.svg'),
        reply: 'Balas',
        full: 4,
        pos: {
          avatarLeft: 16,
          avatarTop: 17,
          nameLeft: 90,
          nameTop: 17,
          textLeft: 90,
          textTop: 38.2,
          starsLeft: 90,
          starsTop: 57.2,
          replyIconLeft: 16,
          replyIconTop: 111,
          replyTextLeft: 48,
          replyTextTop: 115,
        },
      },
    ],
    [],
  )

  const filteredUlasan = useMemo(() => {
    if (!ulasanSearch.trim()) return ulasanItems
    const keyword = ulasanSearch.toLowerCase()
    return ulasanItems.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.text.toLowerCase().includes(keyword),
    )
  }, [ulasanItems, ulasanSearch])

  const umkmItems = useMemo(
    () => [
      { name: 'Fito', biz: "Fito Brownie’s", gps: 'Mati', top: 110 },
      { name: 'Fajri', biz: 'Nasgor Goreng', gps: 'Nyala', top: 213 },
      { name: 'Fajri', biz: 'Nasgor Goreng', gps: 'Nyala', top: 316 },
    ],
    [],
  )

  const filteredUmkm = useMemo(() => {
    if (!umkmSearch.trim()) return umkmItems
    const keyword = umkmSearch.toLowerCase()
    return umkmItems.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.biz.toLowerCase().includes(keyword),
    )
  }, [umkmItems, umkmSearch])

  const ulasanPembeliItems = useMemo(
    () => [
      {
        top: 356,
        name: 'Abyan',
        product: 'Nasgor Goreng',
        text: 'WOI ENAK BANGET GILA..',
        stars: 4,
        reply: 'Lihat Balasan +1',
        replyTop: 471,
      },
      {
        top: 512.47,
        name: 'Abyan',
        product: 'Inul Nasgor',
        text: 'BEST NASGOR IN INDON..',
        stars: 4,
        reply: '',
        replyTop: 0,
      },
      {
        top: 640,
        name: 'Abyan',
        product: "Fito Brownie’s",
        text: 'Apa ini coklatnya kg mele..',
        stars: 4,
        reply: 'Lihat Balasan +3',
        replyTop: 755,
      },
      {
        top: 796.95,
        name: 'Abyan',
        product: 'Mie & Bakso Tornado',
        text: 'Boleh lah, Worth it ini bak..',
        stars: 4,
        reply: 'Balas',
        replyTop: 915,
      },
    ],
    [],
  )

  const filteredUlasanPembeli = useMemo(() => {
    if (!ulasanPembeliSearch.trim()) return ulasanPembeliItems
    const keyword = ulasanPembeliSearch.toLowerCase()
    return ulasanPembeliItems.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.product.toLowerCase().includes(keyword) ||
        item.text.toLowerCase().includes(keyword),
    )
  }, [ulasanPembeliItems, ulasanPembeliSearch])

  const favoritItems = useMemo(
    () => [
      { name: 'Nasgor Goreng', place: 'Kranji MRT Station' },
      { name: 'Nasi Padang Bandoeng', place: 'Jl. Tamansari' },
      { name: 'Cilok Diamond', place: 'Jl. Gegernong' },
      { name: 'Raja Cendol', place: 'Jembatan Lanud' },
      { name: 'Mie Bakso Torpedo', place: 'Alun-alun Tasikmalaya' },
    ],
    [],
  )

  const filteredFavorit = useMemo(() => {
    if (!favoritSearch.trim()) return favoritItems
    const keyword = favoritSearch.toLowerCase()
    return favoritItems.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.place.toLowerCase().includes(keyword),
    )
  }, [favoritItems, favoritSearch])

  return (
    <div className={outerClass} style={outerStyle}>
      <div style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
        <div className={frameClass} style={frameStyle}>
          <div
            className={innerClass}
            style={{ height: `${deviceHeight}px`, borderRadius: isMobileViewport ? 0 : undefined }}
          >
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white pb-[86px] no-scrollbar"
          >
            <div
              className="relative w-[390px] bg-white"
              style={{ height: `${contentHeight}px`, minHeight: `${deviceHeight}px` }}
            >
              {appModal.open && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                  <div className="relative w-[320px] rounded-[18px] bg-white px-[20px] pb-[20px] pt-[56px] shadow-[0px_12px_30px_rgba(0,0,0,0.25)]">
                    <div
                      className={`absolute left-1/2 top-[-28px] flex h-[56px] w-[56px] -translate-x-1/2 items-center justify-center rounded-full ${
                        appModal.variant === 'error' ? 'bg-[#FF6B6B]' : 'bg-[#13B0F9]'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-[28px] w-[28px]" aria-hidden="true">
                        {appModal.variant === 'error' ? (
                          <path
                            d="M12 6v7M12 17h.01"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        ) : (
                          <path
                            d="M5 12.5 9.2 16.5 19 7.5"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </div>

                    <div className="text-center font-['Poppins'] text-[16px] font-semibold text-black">
                      {appModal.title}
                    </div>
                    <div className="mt-[6px] text-center font-['Poppins'] text-[13px] leading-[18px] text-[#4A4A4A]">
                      {appModal.message}
                    </div>

                    <button
                      type="button"
                      onClick={closeModal}
                      className={`mt-[16px] h-[40px] w-full rounded-[12px] font-['Poppins'] text-[14px] font-semibold text-white ${
                        appModal.variant === 'error' ? 'bg-[#FF6B6B]' : 'bg-[#13B0F9]'
                      }`}
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
              {menuOpen && (
                <div className="absolute inset-0 z-50">
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/30"
                    aria-label="Tutup Menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-[6px_0_16px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center justify-between px-[16px] py-[14px]">
                      <span className="font-['Poppins'] text-[14px] font-semibold text-black">
                        Menu
                      </span>
                      <button
                        type="button"
                        aria-label="Tutup Menu"
                        onClick={() => setMenuOpen(false)}
                        className="h-[24px] w-[24px]"
                      >
                        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                          <path
                            d="M6 6 18 18M18 6 6 18"
                            stroke="#000000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    {(
                      [
                        { label: 'Beranda', screen: 'home' },
                        { label: 'Login Pedagang', screen: 'loginPedagang' },
                        { label: 'Login Pembeli', screen: 'loginPembeli' },
                        { label: 'Informasi', screen: 'informasi' },
                        { label: 'Beranda Pedagang', screen: 'berandaPdg' },
                        { label: 'Ulasan', screen: 'ulasanPdg' },
                        { label: 'Tambah Produk', screen: 'tambahProduk' },
                        { label: 'Profil', screen: 'settingPdg' },
                        { label: 'Beranda Pembeli', screen: 'berandaPembeli' },
                        { label: 'Profil Pedagang (Pembeli)', screen: 'profilPedagangPembeli' },
                        { label: 'Profil UMKM (Pembeli)', screen: 'profilUmkmPembeli' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          goTo(item.screen)
                          setMenuOpen(false)
                        }}
                        className="w-full px-[16px] py-[12px] text-left font-['Poppins'] text-[14px] text-black hover:bg-[#f3f4f6]"
                      >
                        {item.label}
                      </button>
                    ))}
                    {authRole !== 'none' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthRole('none')
                          goTo('home')
                          setMenuOpen(false)
                        }}
                        className="w-full px-[16px] py-[12px] text-left font-['Poppins'] text-[14px] text-[#d93025] hover:bg-[#f3f4f6]"
                      >
                        Logout
                      </button>
                    )}
                  </div>
                </div>
              )}
        {screen === 'home' && (
          <>
            <header className="absolute left-0 top-[45px] h-[60px] w-[390px] rounded-[20px] shadow-[0px_4px_27.5px_rgba(0,0,0,0.25)]">
              <div className="absolute left-0 top-0 h-[56px] w-[400px] rounded-[20px] bg-white shadow-[0px_1px_16.7px_rgba(0,0,0,0.25)]" />

              <button
                type="button"
                aria-label="Menu"
                className="absolute left-[16px] top-[16px] h-[24px] w-[24px]"
                onClick={() => setMenuOpen(true)}
              >
                <span className="sr-only">Menu</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-full w-full"
                  aria-hidden="true"
                >
                  <rect x="3" y="6" width="18" height="2" fill="#1A1A1A" />
                  <rect x="3" y="11" width="18" height="2" fill="#1A1A1A" />
                  <rect x="3" y="16" width="18" height="2" fill="#1A1A1A" />
                </svg>
              </button>

              <div className="absolute left-1/2 top-[12px] w-[195px] -translate-x-1/2 text-center">
                <div className="font-['Aoboshi_One'] text-[23px] leading-[16px] tracking-[0.4px] text-[#13B0F9]">
                  UPS
                </div>
                <div className="mt-[2px] text-[12px] leading-[12px] tracking-[0.4px] text-[#13B0F9]">
                  UMKM GPS
                </div>
              </div>

              <img
                src={asset('assets/logo-ups.svg')}
                alt="Logo UPS"
                className="absolute right-[16px] top-[10px] h-[39px] w-[39px] scale-x-[-1]"
              />
            </header>

            <section className="absolute left-1/2 top-[126px] h-[70px] w-[366px] -translate-x-1/2 shadow-[0px_4px_34.1px_rgba(0,0,0,0.25)]">
              <div className="absolute left-0 top-0 h-[70px] w-[361.15px] rounded-[15px] bg-[#13B0F9] shadow-[0px_4px_8.1px_rgba(0,0,0,0.25)]" />
              <div className="absolute left-[6.8px] top-0 h-[70px] w-[359.2px] rounded-[15px] bg-[#FDFDFD] shadow-[0px_4px_19.4px_3px_rgba(0,0,0,0.25)]" />
              <p className="relative z-10 mx-auto mt-[12px] w-[305px] text-center font-['Fredoka'] text-[14px] font-medium leading-[22px] text-black">
                Selamat Datang Di Aplikasi UPS Temukan Pedagang di Sekitarmu.
              </p>
            </section>

            <button
              type="button"
              onClick={() => goTo('loginPedagang')}
              className="absolute left-[20px] top-[254px] flex h-[192px] w-[144px] flex-col items-center gap-[16px]"
            >
              <span className="relative h-[144px] w-[144px]">
                <span className="absolute left-0 top-0 h-[144px] w-[144px] rounded-[20px] bg-white shadow-[-3px_2px_15.9px_rgba(0,0,0,0.25),_0px_4px_4px_rgba(0,0,0,0.25)]" />
                <img
                  src={asset('assets/logpedb.svg')}
                  alt="Login Pedagang"
                  className="absolute left-[24px] top-[27px] h-[90px] w-[96px]"
                />
              </span>
              <span className="w-[122px] text-center text-[16px] font-medium leading-[16px] tracking-[0.4px] text-black">
                Login sebagai Pedagang
              </span>
            </button>

            <button
              type="button"
              onClick={() => goTo('loginPembeli')}
              className="absolute left-[227px] top-[251px] flex h-[197px] w-[144px] flex-col items-center gap-[21px]"
            >
              <span className="relative h-[144px] w-[144px]">
                <span className="absolute left-0 top-0 h-[144px] w-[144px] rounded-[20px] bg-white shadow-[-3px_2px_15.9px_rgba(0,0,0,0.25),_0px_4px_4px_rgba(0,0,0,0.25)]" />
                <img
                  src={asset('assets/logpemb.svg')}
                  alt="Login Pembeli"
                  className="absolute left-[24px] top-[30px] h-[84px] w-[96px]"
                />
              </span>
              <span className="w-[144px] text-center text-[16px] font-medium leading-[16px] tracking-[0.4px] text-black">
                Login sebagai Pembeli
              </span>
            </button>

            <button
              type="button"
              onClick={() => goTo('informasi')}
              className="absolute left-1/2 top-[508px] flex h-[180.18px] w-[144px] -translate-x-1/2 flex-col items-center gap-[15px]"
            >
              <span className="relative h-[144px] w-[144px]">
                <span className="absolute left-0 top-0 h-[144px] w-[144px] rounded-[20px] bg-white shadow-[-3px_2px_15.9px_rgba(0,0,0,0.25),_0px_4px_4px_rgba(0,0,0,0.25)]" />
                <img
                  src={asset('assets/info.svg')}
                  alt="Informasi"
                  className="absolute left-[27px] top-[24px] h-[96px] w-[96px] drop-shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
                />
              </span>
              <span className="text-center text-[16px] font-medium leading-[16px] tracking-[0.4px] text-black">
                Informasi
              </span>
            </button>
          </>
        )}

        {screen === 'loginPedagang' && (
          <>
            <img
              src={asset('assets/logo-ups.svg')}
              alt="Logo UPS"
              className="absolute left-1/2 top-[58px] h-[94px] w-[94px] -translate-x-1/2 scale-x-[-1]"
            />

            <div className="absolute left-1/2 top-[164px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[24px] font-bold leading-[26px] tracking-[0.4px] text-[#13B0F9]">
              UPS
            </div>
            <div className="absolute left-1/2 top-[191px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[18px] font-normal leading-[18px] tracking-[0.4px] text-[#13B0F9]">
              UMKM GPS
            </div>

            <div className="absolute left-1/2 top-[240px] w-[132px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-semibold leading-[24px] text-black">
              Login Pedagang
            </div>
            <div className="absolute left-1/2 top-[273px] w-[215px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-light leading-[24px] text-black">
              Biarkan Pembeli Melihatmu
            </div>

            <div className="absolute left-[31px] top-[331px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-start gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="text"
                  placeholder="Username"
                  value={loginPedagangForm.username}
                  onChange={(event) =>
                    setLoginPedagangForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Username"
                />
              </div>
            </div>

            <div className="absolute left-[31px] top-[401px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-start gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPedagangForm.password}
                  onChange={(event) =>
                    setLoginPedagangForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Password"
                />
              </div>
            </div>

            <button
              type="button"
              className="absolute left-[70px] top-[549px] flex h-[55px] w-[249px] items-center justify-center rounded-[15px] bg-[#13B0F9]"
                onClick={() => {
                  const username = loginPedagangForm.username.trim().toLowerCase()
                  const password = loginPedagangForm.password.trim()
                  if (!username || !password) {
                    openModal('Login Gagal', 'Username dan password wajib diisi.')
                    return
                  }
                  if (username !== 'fajri' || password !== '123456') {
                    openModal('Login Gagal', 'Username atau password salah. Coba: fajri / 123456')
                    return
                  }
                  setAuthRole('pedagang')
                  goTo('berandaPdg')
                }}
            >
              <span className="font-['Poppins'] text-[18px] font-bold uppercase leading-[16px] text-white">
                Login
              </span>
            </button>

            <button
              type="button"
              className="absolute left-[91px] top-[697px] w-[74px] text-center font-['Poppins'] text-[14px] font-light uppercase leading-[16px] text-black"
              onClick={() => goTo('register')}
            >
              Buat Akun
            </button>
            <button
              type="button"
              className="absolute left-[221px] top-[697px] w-[72px] text-center font-['Poppins'] text-[14px] font-light uppercase leading-[16px] text-black"
              onClick={() => goTo('lupaAkun')}
            >
              Lupa Akun
            </button>
          </>
        )}

        {screen === 'loginPembeli' && (
          <>
            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[31px] top-[58px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <img
              src={asset('assets/logo-ups.svg')}
              alt="Logo UPS"
              className="absolute left-1/2 top-[58px] h-[94px] w-[94px] -translate-x-1/2 scale-x-[-1]"
            />

            <div className="absolute left-1/2 top-[164px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[24px] font-bold leading-[26px] tracking-[0.4px] text-[#13B0F9]">
              UPS
            </div>
            <div className="absolute left-1/2 top-[191px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[18px] font-normal leading-[18px] tracking-[0.4px] text-[#13B0F9]">
              UMKM GPS
            </div>

            <div className="absolute left-1/2 top-[240px] w-[114px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-semibold leading-[24px] text-black">
              Login Pembeli
            </div>
            <div className="absolute left-1/2 top-[273px] w-[264px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-light leading-[24px] text-black">
              Temukan Pedagang Di Sekitarmu
            </div>

            <div className="absolute left-[31px] top-[331px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-start gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="text"
                  placeholder="Username"
                  value={loginPembeliForm.username}
                  onChange={(event) =>
                    setLoginPembeliForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Username"
                />
              </div>
            </div>

            <div className="absolute left-[31px] top-[401px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-start gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPembeliForm.password}
                  onChange={(event) =>
                    setLoginPembeliForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Password"
                />
              </div>
            </div>

            <button
              type="button"
              className="absolute left-[70px] top-[549px] flex h-[55px] w-[249px] items-center justify-center rounded-[15px] bg-[#13B0F9]"
                onClick={() => {
                  const username = loginPembeliForm.username.trim().toLowerCase()
                  const password = loginPembeliForm.password.trim()
                  if (!username || !password) {
                    openModal('Login Gagal', 'Username dan password wajib diisi.')
                    return
                  }
                  if (username !== 'abyan' || password !== '123456') {
                    openModal('Login Gagal', 'Username atau password salah. Coba: abyan / 123456')
                    return
                  }
                  setAuthRole('pembeli')
                  goTo('berandaPembeli')
                }}
            >
              <span className="font-['Poppins'] text-[18px] font-bold uppercase leading-[16px] text-white">
                Login
              </span>
            </button>

            <button
              type="button"
              className="absolute left-[91px] top-[697px] w-[74px] text-center font-['Poppins'] text-[14px] font-light uppercase leading-[16px] text-black"
              onClick={() => goTo('register')}
            >
              Buat Akun
            </button>
            <button
              type="button"
              className="absolute left-[221px] top-[697px] w-[72px] text-center font-['Poppins'] text-[14px] font-light uppercase leading-[16px] text-black"
              onClick={() => goTo('lupaAkun')}
            >
              Lupa Akun
            </button>
          </>
        )}

        {screen === 'informasi' && (
          <>
            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[56px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[48px] w-[76px] -translate-x-1/2 text-center font-['Poppins'] text-[23px] font-bold leading-[16px] tracking-[0.4px] text-[#13B0F9]">
              UPS
              <span className="block text-[12px] font-normal leading-[12px] tracking-[0.4px] text-[#13B0F9]">
                UMKM GPS
              </span>
            </div>

            <img
              src={asset('assets/logo-ups.svg')}
              alt="Logo UPS"
              className="absolute left-[330px] top-[44px] h-[42px] w-[42px] scale-x-[-1]"
            />

            <div className="absolute left-0 top-[135px] h-[803px] w-[390px] overflow-hidden rounded-t-[17px] shadow-[0px_6px_23.5px_16px_rgba(0,0,0,0.08)]">
              <img
                src={asset('assets/background-frame-informasi.png')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute left-[140px] top-[158px] w-[110.73px] text-center font-['Poppins'] text-[16px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Informasi
            </div>

            <div className="absolute left-[29px] top-[201px] h-[188px] w-[332px] rounded-[24px] bg-white shadow-[0px_2px_21.6px_2px_rgba(0,0,0,0.11)]">
              <p className="absolute left-[12px] top-[15px] w-[308px] text-center font-['Inter'] text-[14px] leading-[20px] text-black">
                Tentang{' '}
                <span className="font-semibold text-[#13B0F9]">
                  UPS (UMKM GPS)
                </span>{' '}
                UPS adalah aplikasi yang membantu menghubungkan pedagang{' '}
                <span className="font-semibold text-[#13B0F9]">UMKM</span>{' '}
                dengan pembeli melalui{' '}
                <span className="font-semibold text-[#13B0F9]">GPS</span>.
                Aplikasi ini memungkinkan pembeli melihat lokasi pedagang yang
                sedang berjualan secara langsung di peta.
              </p>
            </div>

            <div className="absolute left-[29px] top-[412px] h-[267px] w-[332px] rounded-[24px] bg-white shadow-[0px_2px_21.6px_2px_rgba(0,0,0,0.11)]">
              <img
                src={asset('assets/mingcute-map-line.svg')}
                alt=""
                className="absolute left-1/2 top-[18px] h-[26px] w-[26px] -translate-x-1/2"
              />
              <p className="absolute left-[22px] top-[44px] w-[287px] text-center font-['Poppins'] text-[14px] leading-[20px] text-black">
                <span className="font-semibold text-[#13B0F9]">Pedagang</span>{' '}
                dapat menyalakan{' '}
                <span className="font-semibold text-[#13B0F9]">GPS</span> saat
                mulai berjualan agar lokasi mereka muncul di{' '}
                <span className="font-semibold text-[#13B0F9]">
                  peta aplikasi
                </span>
                . Dengan begitu, pembeli dapat dengan mudah menemukan dagangan
                mereka. <span className="font-semibold text-[#13B0F9]">
                  Pedagang
                </span>{' '}
                juga dapat menampilkan profil, foto dagangan,{' '}
                <span className="font-semibold text-[#13B0F9]">
                  serta menerima rating dan ulasan
                </span>{' '}
                dari pelanggan.
              </p>
            </div>

            <div className="absolute left-[29px] top-[702px] h-[187px] w-[332px] rounded-[24px] bg-white shadow-[0px_2px_21.6px_2px_rgba(0,0,0,0.11)]">
              <img
                src={asset('assets/solar-dollar-linear.svg')}
                alt=""
                className="absolute left-1/2 top-[14px] h-[26px] w-[26px] -translate-x-1/2"
              />
              <p className="absolute left-[12px] top-[27px] w-[308px] text-center font-['Poppins'] text-[14px] leading-[20px] text-black">
                <span className="font-semibold text-[#13B0F9]">Pembeli</span>{' '}
                dapat melihat{' '}
                <span className="font-semibold text-[#13B0F9]">pedagang</span>{' '}
                yang sedang berjualan di sekitar lokasi, melihat profil dan
                ulasan pedagang, serta mendapatkan{' '}
                <span className="font-semibold text-[#13B0F9]">notifikasi</span>{' '}
                ketika pedagang favorit berada dekat dengan lokasi mereka.
              </p>
            </div>
          </>
        )}

        {screen === 'register' && (
          <>
            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[31px] top-[58px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <img
              src={asset('assets/logo-ups.svg')}
              alt="Logo UPS"
              className="absolute left-1/2 top-[58px] h-[94px] w-[94px] -translate-x-1/2 scale-x-[-1]"
            />

            <div className="absolute left-1/2 top-[164px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[24px] font-bold leading-[26px] tracking-[0.4px] text-[#13B0F9]">
              UPS
            </div>
            <div className="absolute left-1/2 top-[191px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[18px] font-normal leading-[18px] tracking-[0.4px] text-[#13B0F9]">
              UMKM GPS
            </div>

            <div className="absolute left-1/2 top-[257px] w-[137px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-medium leading-[24px] text-black">
              REGISTRASI AKUN
            </div>

            <div className="absolute left-[42px] top-[330px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-center gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="text"
                  placeholder="Nama Pengguna"
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Nama Pengguna"
                />
              </div>
            </div>

            <div className="absolute left-[42px] top-[394px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-center gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="email"
                  placeholder="Email Pengguna"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Email Pengguna"
                />
              </div>
            </div>

            <div className="absolute left-[42px] top-[458px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-center gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="password"
                  placeholder="Password Pengguna"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Password Pengguna"
                />
              </div>
            </div>

            <button
              type="button"
              className="absolute left-1/2 top-[549px] flex h-[55px] w-[249px] -translate-x-1/2 items-center justify-center rounded-[15px] bg-[#13B0F9]"
              onClick={() => {
                if (!registerForm.name || !registerForm.email || !registerForm.password) {
                  openModal('Registrasi Gagal', 'Semua field registrasi wajib diisi.')
                  return
                }
                goTo('otp')
              }}
            >
              <span className="font-['Poppins'] text-[18px] font-bold uppercase leading-[16px] text-white">
                Daftar
              </span>
            </button>

            <button
              type="button"
              className="absolute left-1/2 top-[700px] w-[134px] -translate-x-1/2 text-center font-['Poppins'] text-[14px] font-light uppercase leading-[16px] text-black"
              onClick={() => goTo('loginPedagang')}
            >
              Sudah punya akun
            </button>
          </>
        )}

        {screen === 'otp' && (
          <>
            <img
              src={asset('assets/logo-ups.svg')}
              alt="Logo UPS"
              className="absolute left-1/2 top-[58px] h-[94px] w-[94px] -translate-x-1/2 scale-x-[-1]"
            />

            <div className="absolute left-1/2 top-[164px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[24px] font-bold leading-[26px] tracking-[0.4px] text-[#13B0F9]">
              UPS
            </div>
            <div className="absolute left-1/2 top-[191px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[18px] font-normal leading-[18px] tracking-[0.4px] text-[#13B0F9]">
              UMKM GPS
            </div>

            <div className="absolute left-1/2 top-[257px] w-[137px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-medium leading-[24px] text-black">
              REGISTRASI AKUN
            </div>

            <div className="absolute left-[32px] top-[329px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-center gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="text"
                  placeholder="Masukkan Kode OTP"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Masukkan Kode OTP"
                />
              </div>
            </div>

            <button
              type="button"
              className="absolute left-[48px] top-[394px] text-[14px] font-semibold uppercase leading-[16px] text-black font-['Poppins']"
              onClick={() => setOtpCountdown(12)}
            >
              Kirim Ulang OTP
            </button>
            <div className="absolute left-[312px] top-[394px] text-[14px] font-light uppercase leading-[16px] text-black font-['Poppins']">
              00:{String(otpCountdown).padStart(2, '0')}
            </div>

            <button
              type="button"
              className="absolute left-[70px] top-[549px] flex h-[55px] w-[249px] items-center justify-center rounded-[15px] bg-[#13B0F9]"
              onClick={() => {
                if (otpCode.trim().length === 0) {
                  openModal('OTP Salah', 'Masukkan kode OTP.')
                  return
                }
                goTo('loginPedagang')
              }}
            >
              <span className="font-['Poppins'] text-[18px] font-bold uppercase leading-[16px] text-white">
                Buat Akun
              </span>
            </button>

            <button
              type="button"
              className="absolute left-1/2 top-[700px] w-[134px] -translate-x-1/2 text-center font-['Poppins'] text-[14px] font-light uppercase leading-[16px] text-black"
              onClick={() => goTo('loginPedagang')}
            >
              Sudah punya akun
            </button>
          </>
        )}

        {screen === 'lupaAkun' && (
          <>
            <img
              src={asset('assets/logo-ups.svg')}
              alt="Logo UPS"
              className="absolute left-1/2 top-[58px] h-[94px] w-[94px] -translate-x-1/2 scale-x-[-1]"
            />

            <div className="absolute left-1/2 top-[164px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[24px] font-bold leading-[26px] tracking-[0.4px] text-[#13B0F9]">
              UPS
            </div>
            <div className="absolute left-1/2 top-[191px] w-[97px] -translate-x-1/2 text-center font-['Poppins'] text-[18px] font-normal leading-[18px] tracking-[0.4px] text-[#13B0F9]">
              UMKM GPS
            </div>

            <div className="absolute left-1/2 top-[257px] w-[87px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-medium leading-[24px] text-black">
              LUPA AKUN
            </div>

            <div className="absolute left-[32px] top-[330px] h-[48px] w-[328px] rounded-[48px] border-2 border-[#1A1A1A] bg-white">
              <div className="flex h-full w-full items-center gap-[12px] px-[16px] py-[12px]">
                
                <input
                  type="text"
                  placeholder="Masukkan No.Telp/Email"
                  value={lupaAkunValue}
                  onChange={(event) => setLupaAkunValue(event.target.value)}
                  className="h-[24px] w-full bg-transparent font-['Balsamiq_Sans'] text-[16px] leading-[24px] text-[#1A1A1A] outline-none"
                  aria-label="Masukkan No.Telp/Email"
                />
              </div>
            </div>

            <button
              type="button"
              className="absolute left-1/2 top-[549px] flex h-[55px] w-[249px] -translate-x-1/2 items-center justify-center rounded-[15px] bg-[#13B0F9]"
              onClick={() => {
                if (!lupaAkunValue.trim()) {
                  openModal('Gagal', 'Masukkan nomor telepon atau email.')
                  return
                }
                openModal(
                  'Berhasil',
                  'Instruksi pemulihan akun sudah dikirim.',
                  'info',
                )
              }}
            >
              <span className="font-['Poppins'] text-[18px] font-bold uppercase leading-[16px] text-white">
                Next
              </span>
            </button>
          </>
        )}

        {screen === 'berandaPdg' && (
          <>
            <div className="absolute left-1/2 top-[-58px] h-[151px] w-[390px] -translate-x-1/2 rounded-[35px] bg-[#13B0F9] shadow-[0px_4px_23.4px_rgba(0,0,0,0.14)]" />

            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[54px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[50px] -translate-x-1/2 text-center font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
              Beranda
            </div>

            <div className="absolute left-[24px] top-[143px] h-[75px] w-[75px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute left-[121px] top-[143px] font-['Poppins'] text-[18px] font-semibold leading-[25px] tracking-[-0.02em] text-black">
              Hi, Fajri!
            </div>
            <div className="absolute left-[121px] top-[168px] font-['Poppins'] text-[14px] font-normal leading-[20px] tracking-[-0.02em] text-black">
              Nasgor Goreng
            </div>

            <button
              type="button"
              aria-label="Setting"
              className="absolute left-[338px] top-[144px] h-[24px] w-[24px]"
              onClick={() => goTo('settingPembeli')}
            >
              <img src={asset('assets/icon setting.svg')} alt="" className="h-full w-full" />
            </button>

            <div className="absolute left-[119px] top-[194px] flex">
              {Array.from({ length: 4 }).map((_, i) => (
                <svg
                  key={`star-${i}`}
                  viewBox="0 0 24 24"
                  className="h-[24px] w-[24px]"
                  aria-hidden="true"
                >
                  <path
                    d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                    fill="#FFCD29"
                  />
                </svg>
              ))}
              <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                <path
                  d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                  fill="none"
                  stroke="#FFCD29"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div className="absolute left-[295px] top-[198px] font-['Poppins'] text-[12px] font-semibold leading-[17px] tracking-[-0.02em] text-[#13B0F9]">
              <button type="button" onClick={() => goTo('ulasanPdg')}>
                Cek Ulasan
              </button>
            </div>

            <div className="absolute left-[24px] top-[240px] h-[24px] w-[24px]">
              <img src={asset('assets/icon location.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[61px] top-[244px] font-['Poppins'] text-[12px] font-semibold uppercase leading-[16px] text-black">
              Kranji MRT Station
            </div>

            <div className="absolute left-[24px] top-[271px] h-[24px] w-[24px]">
              <img src={asset('assets/icon time.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[61px] top-[275px] font-['Poppins'] text-[12px] font-semibold uppercase leading-[16px] text-black">
              16:00 - 00:00
            </div>

            <div className="absolute left-[2px] top-[327px] h-[509px] w-[390px] rounded-[38px] bg-white shadow-[0px_4px_34px_rgba(0,0,0,0.14)]">
              <div className="absolute left-[24px] top-[29px] font-['Poppins'] text-[16px] font-medium leading-[22px] tracking-[-0.02em] text-black">
                List Barang
              </div>
              <button
                type="button"
                className="absolute left-[248px] top-[26px] h-[28px] w-[118px] rounded-[15px] bg-[#13B0F9] text-[10px] font-semibold uppercase leading-[16px] text-white font-['Poppins']"
                onClick={() => goTo('tambahProduk')}
              >
                Tambah Produk
              </button>

              {[
                { name: 'Nasi Goreng Biasa', price: 'Rp 15.000', top: 64 },
                { name: 'Nasi Goreng Gila', price: 'Rp 20.000', top: 167 },
                { name: 'Nasi Gila', price: 'Rp 10.000', top: 270 },
                { name: 'Capcay', price: 'Rp 13.000', top: 378 },
              ].map((item) => (
                <div
                  key={item.name}
                  className="absolute left-0 h-[103px] w-[389px] rounded-[15px] bg-white"
                  style={{ top: item.top }}
                >
                  <div className="absolute left-[24px] top-[16px] h-[71.97px] w-[71.97px] overflow-hidden rounded-[8px] bg-[#F7F7F7]">
                    <img
                      src={asset('assets/foto dagangan.svg')}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute left-[117px] top-[22px] w-[183.93px] font-['Poppins'] text-[14px] font-semibold leading-[16px] tracking-[0.4px] text-black">
                    {item.name}
                  </div>
                  <div className="absolute left-[117px] top-[40px] w-[183.93px] font-['Poppins'] text-[10px] font-normal leading-[16px] tracking-[0.4px] text-black">
                    Harga : {item.price}
                  </div>
                  <div className="absolute left-[116px] top-[65px] h-[23px] w-[95.14px] rounded-[15px] bg-[rgba(19,176,249,0.75)]">
                    <span className="absolute left-[5px] top-[4px] w-[85.62px] text-center font-['Poppins'] text-[10px] font-medium leading-[5px] tracking-[0.4px] text-black">
                      Tersedia : 50
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute left-0 top-[627px] h-[115px] w-[390px] bg-gradient-to-b from-transparent to-white" />
            <div className="absolute left-0 top-[741px] h-[382px] w-[391px] bg-white" />

            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              className="absolute left-1/2 top-[717px] h-[28px] w-[113px] -translate-x-1/2 rounded-[25px] bg-[#13B0F9]"
            >
              <div className="absolute left-[11px] top-[6px] text-[14px] font-semibold leading-[16px] text-white font-['Poppins']">
                Expand
              </div>
              <div className="absolute left-[77px] top-[2px] h-[24px] w-[12px] rotate-90">
                <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                  <path d="M8 10l4 4 4-4" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            <div className="absolute left-[24px] top-[794px] font-['Poppins'] text-[16px] font-normal uppercase leading-[16px] text-black">
              Aktifkan GPS
            </div>

            <button
              type="button"
              aria-label="Toggle GPS"
              onClick={() => setGpsEnabled((prev) => !prev)}
              className={`absolute left-[308px] top-[789px] h-[23px] w-[47px] rounded-[12px] transition ${
                gpsEnabled ? 'bg-[#13B0F9]' : 'bg-[#929292]'
              }`}
            >
              <span
                className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition ${
                  gpsEnabled ? 'left-[26px]' : 'left-[5px]'
                }`}
              />
            </button>

            <div className="absolute left-1/2 top-[831px] h-[170px] w-[333px] -translate-x-[calc(50%+4.5px)] overflow-hidden rounded-[12px] bg-[#EDEDED]">
              <MapContainer
                key={mapCenter.join(',')}
                center={mapCenter}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom
                dragging
                doubleClickZoom
                zoomControl
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {pedagangMarkers.map((marker) => (
                  <Marker key={marker.name} position={marker.position} icon={pedagangIcon}>
                    <Popup>{marker.name}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {showMapModal && (
              <div className="absolute inset-0 z-40 bg-black/40">
                <div className="absolute left-1/2 top-[90px] h-[600px] w-[360px] -translate-x-1/2 overflow-hidden rounded-[16px] bg-white">
                  <button
                    type="button"
                    aria-label="Tutup Peta"
                    onClick={() => setShowMapModal(false)}
                    className="absolute right-[12px] top-[12px] h-[24px] w-[24px] z-10"
                  >
                    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                      <path
                        d="M6 6 18 18M18 6 6 18"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <MapContainer
                    center={mapCenter}
                    zoom={15}
                    className="h-full w-full"
                    scrollWheelZoom
                    dragging
                    doubleClickZoom
                    zoomControl
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {pedagangMarkers.map((marker) => (
                      <Marker key={`modal-${marker.name}`} position={marker.position} icon={pedagangIcon}>
                        <Popup>{marker.name}</Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}
          </>
        )}

        {screen === 'ulasanPdg' && (
          <>
            <div className="absolute left-1/2 top-[-58px] h-[151px] w-[390px] -translate-x-1/2 rounded-[35px] bg-[#13B0F9] shadow-[0px_4px_23.4px_rgba(0,0,0,0.14)]" />

            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[54px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[50px] -translate-x-1/2 text-center font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
              Ulasan
            </div>

            <div className="absolute left-[24px] top-[121px] h-[116px] w-[116px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute left-[168px] top-[121px] font-['Poppins'] text-[16px] font-semibold leading-[22px] tracking-[-0.02em] text-black">
              Nasgor Goreng
            </div>

            <div className="absolute left-[165px] top-[147px] h-[16px] w-[16px]">
              <img src={asset('assets/icon location.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[189px] top-[147px] font-['Poppins'] text-[12px] font-medium uppercase leading-[16px] text-black">
              Kranji MRT Station
            </div>

            <div className="absolute left-[165px] top-[167px] h-[16px] w-[16px]">
              <img src={asset('assets/icon time.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[189px] top-[167px] font-['Poppins'] text-[14px] font-medium uppercase leading-[16px] text-black">
              16:00 - 00:00
            </div>

            <div className="absolute left-[168px] top-[197px] font-['Poppins'] text-[12px] font-medium capitalize leading-[16px] text-black">
              Rating :
            </div>
            <div className="absolute left-[165px] top-[213px] flex">
              {Array.from({ length: 4 }).map((_, i) => (
                <svg
                  key={`rate-star-${i}`}
                  viewBox="0 0 24 24"
                  className="h-[24px] w-[24px]"
                  aria-hidden="true"
                >
                  <path
                    d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                    fill="#FFCD29"
                  />
                </svg>
              ))}
              <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                <path
                  d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                  fill="none"
                  stroke="#FFCD29"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="absolute left-[290px] top-[218px] font-['Poppins'] text-[12px] font-light capitalize leading-[16px] text-black">
              (3,5)
            </div>

            <div className="absolute left-0 top-[261px] h-[1020px] w-[390px] rounded-[17px] bg-[#13B0F9] shadow-[0px_6px_15.6px_13px_rgba(0,0,0,0.25)]" />

            <div className="absolute left-1/2 top-[282px] h-[46px] w-[348px] -translate-x-1/2 rounded-[4px] border border-[#B3B3B3] bg-white">
              <div className="flex h-full w-full items-center gap-[12px] px-[12px]">
                <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                  <path
                    d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5 9.1 3.4 3.4-1.4 1.4-3.4-3.4"
                    fill="#666666"
                  />
                </svg>
                <input
                  type="text"
                  value={ulasanSearch}
                  onChange={(event) => setUlasanSearch(event.target.value)}
                  placeholder="Search"
                  className="flex-1 bg-transparent font-['Inter'] text-[16px] leading-[24px] text-[#666666] outline-none placeholder:text-[#666666]"
                />
                <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                  <path
                    d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-1 15.9V21h2v-2.1a6 6 0 0 0 5-5.9h-2a4 4 0 0 1-8 0H6a6 6 0 0 0 5 5.9Z"
                    fill="#666666"
                  />
                </svg>
              </div>
            </div>

            {filteredUlasan.map((item, index) => {
              const cardTop = ulasanSearch.trim() ? 356 + index * 156.95 : item.top
              return (
              <div
                key={item.name}
                className="absolute left-[21px] h-[146.95px] w-[348.26px]"
                style={{ top: cardTop }}
              >
                <div className="absolute left-0 top-0 h-[97.47px] w-[348.26px] rounded-[16px] bg-white shadow-[0px_4px_12.8px_-2px_rgba(0,0,0,0.25)]" />
                <div className="absolute left-0 top-[77px] h-[69px] w-[348px] rounded-b-[16px] bg-white" />

                <div
                  className="absolute h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]"
                  style={{ left: item.pos.avatarLeft, top: item.pos.avatarTop }}
                >
                  <img src={item.img} alt="" className="h-full w-full object-cover" />
                </div>

                <div
                  className="absolute font-['Inter'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black"
                  style={{ left: item.pos.nameLeft, top: item.pos.nameTop }}
                >
                  {item.name}
                </div>
                <div
                  className="absolute font-['Inter'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black"
                  style={{ left: item.pos.textLeft, top: item.pos.textTop }}
                >
                  {item.text}
                </div>

                <div
                  className="absolute flex"
                  style={{ left: item.pos.starsLeft, top: item.pos.starsTop }}
                >
                  {Array.from({ length: item.full }).map((_, i) => (
                    <svg
                      key={`${item.name}-star-${i}`}
                      viewBox="0 0 24 24"
                      className="h-[24px] w-[24px]"
                      aria-hidden="true"
                    >
                      <path
                        d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                        fill="#FFCD29"
                      />
                    </svg>
                  ))}
                  {Array.from({ length: 5 - item.full }).map((_, i) => (
                    <svg
                      key={`${item.name}-star-o-${i}`}
                      viewBox="0 0 24 24"
                      className="h-[24px] w-[24px]"
                      aria-hidden="true"
                    >
                      <path
                        d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                        fill="none"
                        stroke="#FFCD29"
                        strokeWidth="1.5"
                      />
                    </svg>
                  ))}
                </div>

                <div
                  className="absolute h-[24px] w-[24px] -rotate-180"
                  style={{ left: item.pos.replyIconLeft, top: item.pos.replyIconTop }}
                >
                  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                    <path
                      d="M18 7H9a5 5 0 0 0-5 5v5h4l3 3v-8a2 2 0 0 1 2-2h5"
                      fill="none"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div
                  className="absolute font-['Inter'] text-[14px] font-semibold leading-[16px] tracking-[0.4px] text-[rgba(0,0,0,0.5)]"
                  style={{ left: item.pos.replyTextLeft, top: item.pos.replyTextTop }}
                >
                  <button type="button" onClick={() => goTo('chatUlasanPdg')}>
                    {item.reply}
                  </button>
                </div>
              </div>
              )
            })}
          </>
        )}

        {screen === 'tambahProduk' && (
          <div className="absolute left-0 top-0 h-[612px] w-[390px] rounded-[16px] bg-white overflow-hidden">
            <button
              type="button"
              aria-label="Tutup"
              onClick={goBack}
              className="absolute left-[24px] top-[18px] h-[24px] w-[24px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M6 6 18 18M18 6 6 18"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="absolute left-[131px] top-[22px] w-[129px] text-center font-['Poppins'] text-[16px] font-medium leading-[16px] text-black">
              Tambah Produk
            </div>

            <button
              type="button"
              onClick={() => uploadUlasanRef.current?.click()}
              className="absolute left-1/2 top-[61px] h-[191px] w-[342px] -translate-x-1/2 rounded-[15px] border border-[#B7B7B7] bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
              aria-label="Pilih file atau foto"
            />
            <input ref={uploadUlasanRef} type="file" accept="image/*" className="hidden" />
            <img
              src={asset('assets/icon file.svg')}
              alt=""
              className="absolute left-[133px] top-[121px] h-[48px] w-[48px]"
            />
            <img
              src={asset('assets/icon slash.svg')}
              alt=""
              className="absolute left-[184px] top-[136px] h-[16px] w-[14px]"
            />
            <img
              src={asset('assets/icon camera.svg')}
              alt=""
              className="absolute left-[209px] top-[121px] h-[48px] w-[48px]"
            />
            <div className="absolute left-1/2 top-[176px] w-[104px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-normal leading-[16px] text-[rgba(0,0,0,0.55)]">
              Pilih File/Foto
            </div>

            <div className="absolute left-[36px] top-[273px] font-['Poppins'] text-[12px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Nama Dagangan
            </div>
            <div className="absolute left-[36px] top-[344px] font-['Poppins'] text-[12px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Harga Jual (Rp)
            </div>
            <div className="absolute left-[36px] top-[419px] font-['Poppins'] text-[12px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Stock (Optional)
            </div>

            <input
              type="text"
              value={produkForm.nama}
              onChange={(event) =>
                setProdukForm((prev) => ({ ...prev, nama: event.target.value }))
              }
              className="absolute left-1/2 top-[293px] h-[40px] w-[342px] -translate-x-1/2 rounded-[15px] border border-[#B7B7B7] bg-white px-[16px] text-[14px] font-['Poppins'] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] outline-none"
              aria-label="Nama Dagangan"
            />
            <input
              type="text"
              value={produkForm.harga}
              onChange={(event) =>
                setProdukForm((prev) => ({ ...prev, harga: event.target.value }))
              }
              className="absolute left-1/2 top-[365px] h-[40px] w-[342px] -translate-x-1/2 rounded-[15px] border border-[#B7B7B7] bg-white px-[16px] text-[14px] font-['Poppins'] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] outline-none"
              aria-label="Harga Jual"
            />
            <input
              type="text"
              value={produkForm.stok}
              onChange={(event) =>
                setProdukForm((prev) => ({ ...prev, stok: event.target.value }))
              }
              className="absolute left-1/2 top-[439px] h-[40px] w-[342px] -translate-x-1/2 rounded-[15px] border border-[#B7B7B7] bg-white px-[16px] text-[14px] font-['Poppins'] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] outline-none"
              aria-label="Stock"
            />

            <button
              type="button"
              className="absolute left-[24px] top-[528px] h-[55px] w-[341px] rounded-[15px] bg-[#13B0F9]"
              onClick={() => {
                if (!produkForm.nama || !produkForm.harga) {
                  openModal('Gagal Simpan', 'Nama dagangan dan harga wajib diisi.')
                  return
                }
                setShowPopupDone(true)
              }}
            >
              <span className="font-['Poppins'] text-[18px] font-bold uppercase leading-[16px] text-white">
                Simpan
              </span>
            </button>
          </div>
        )}

        {screen === 'tambahProduk' && showPopupDone && (
          <div className="absolute left-0 top-0 h-[612px] w-[390px]">
            <div className="absolute left-1/2 top-[78px] h-[360px] w-[390px] -translate-x-1/2 rounded-[16px] bg-white overflow-hidden">
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setShowPopupDone(false)}
                className="absolute right-[14px] top-[10px] h-[20px] w-[20px]"
              >
                <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                  <path
                    d="M6 6 18 18M18 6 6 18"
                    stroke="#000000"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <img
                src={asset('assets/icon check.svg')}
                alt=""
                className="absolute left-1/2 top-[44px] h-[136px] w-[136px] -translate-x-1/2"
              />

              <div className="absolute left-1/2 top-[225px] w-[281px] -translate-x-1/2 text-center font-['Poppins'] text-[18px] font-bold leading-[16px] text-[#13B0F9]">
                Barang Berhasil Ditambahkan
              </div>
              <div className="absolute left-1/2 top-[266px] w-[311px] -translate-x-1/2 text-center font-['Poppins'] text-[14px] font-light leading-[16px] text-black">
                Barang Berhasil Ditambahkan Ke List Barang Daganganmu!
              </div>
            </div>
          </div>
        )}

        {screen === 'settingPdg' && (
          <div className="absolute left-1/2 top-0 h-[410px] w-[372px] -translate-x-1/2 rounded-[16px] bg-white">
            <div className="absolute left-[24px] top-[31px] h-[75px] w-[75px] overflow-hidden rounded-full">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute left-[25px] top-[25px] h-[24px] w-[24px]">
                <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="#ffffff" />
                </svg>
              </div>
            </div>

            <div className="absolute left-[119px] top-[31px] w-[139px]">
              <div className="h-[27px] font-['Poppins'] text-[18px] font-bold leading-[16px] tracking-[0.4px] text-black">
                Fajri
              </div>
              <div className="mt-[6px] h-[12px] font-['Poppins'] text-[14px] font-medium leading-[16px] tracking-[0.4px] text-black">
                Nasgor Goreng
              </div>
              <div className="relative mt-[6px] h-[24px] w-[120px]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <svg
                    key={`set-star-${i}`}
                    viewBox="0 0 24 24"
                    className="absolute h-[24px] w-[24px]"
                    style={{ left: i * 24, top: 0 }}
                    aria-hidden="true"
                  >
                    <path
                      d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                      fill="#FFCD29"
                    />
                  </svg>
                ))}
                <svg
                  viewBox="0 0 24 24"
                  className="absolute h-[24px] w-[24px]"
                  style={{ left: 96, top: 0 }}
                  aria-hidden="true"
                >
                  <path
                    d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                    fill="none"
                    stroke="#FFCD29"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>

            <div className="absolute left-[331px] top-[37px] h-[16px] w-[16px]">
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="#13B0F9" />
              </svg>
            </div>
            <div className="absolute left-[331px] top-[62px] h-[16px] w-[16px]">
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="#13B0F9" />
              </svg>
            </div>

            <div className="absolute left-[24px] top-[150px] h-[20px] w-[89px] text-center font-['Inter'] text-[14px] font-semibold leading-[20px] tracking-[-0.02em] text-black">
              Data Member
            </div>
            <div className="absolute left-[107px] top-[151px] w-[240px] text-right font-['Poppins'] text-[8px] font-normal leading-[16px] tracking-[0.4px] text-black">
              Menjadi Pedagang Sejak Jan 2026
            </div>

            <div className="absolute left-[24px] top-[184px] h-[194px] w-[323px] rounded-[16px] border border-black bg-white shadow-[0px_0px_27.4px_-9px_rgba(0,0,0,0.25)]">
              <div className="absolute left-[15px] top-[11px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-black font-['Poppins']">
                Nomor Telepon
              </div>
              <div className="absolute left-[15px] top-[28px] text-[16px] font-semibold leading-[20px] text-[#1A1A1A] font-['Poppins']">
                086874673457
              </div>
              <div className="absolute left-[260px] top-[31px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-[#13B0F9] font-['Poppins']">
                Ganti
              </div>

              <div className="absolute left-[15px] top-[53px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-black font-['Poppins']">
                Alamat
              </div>
              <div className="absolute left-[15px] top-[70px] text-[16px] font-semibold leading-[20px] text-[#1A1A1A] font-['Poppins']">
                Kranji MRT Station
              </div>
              <div className="absolute left-[260px] top-[72px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-[#13B0F9] font-['Poppins']">
                Ganti
              </div>

              <div className="absolute left-[15px] top-[105px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-black font-['Poppins']">
                Jam Buka
              </div>
              <div className="absolute left-[15px] top-[122px] text-[16px] font-semibold leading-[20px] text-[#1A1A1A] font-['Poppins']">
                16:00 - 00:00
              </div>
              <div className="absolute left-[260px] top-[124px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-[#13B0F9] font-['Poppins']">
                Ganti
              </div>
            </div>
          </div>
        )}

        {screen === 'settingPembeli' && (
          <div className="absolute left-1/2 top-0 h-[269px] w-[372px] -translate-x-1/2 rounded-[16px] bg-white">
            <div className="absolute left-[24px] top-[31px] h-[75px] w-[75px] overflow-hidden rounded-full">
              <img
                src={asset('assets/foto profil abyan.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute left-[25px] top-[25px] h-[24px] w-[24px]">
                <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                  <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="#ffffff" />
                </svg>
              </div>
            </div>

            <div className="absolute left-[119px] top-[31px] h-[27px] font-['Poppins'] text-[18px] font-bold leading-[16px] tracking-[0.4px] text-black">
              Abyan
            </div>

            <div className="absolute left-[331px] top-[37px] h-[16px] w-[16px]">
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path d="M4 20h4l10-10-4-4L4 16v4Z" fill="#13B0F9" />
              </svg>
            </div>

            <div className="absolute left-[24px] top-[118px] h-[20px] w-[89px] text-center font-['Inter'] text-[14px] font-semibold leading-[20px] tracking-[-0.02em] text-black">
              Data Member
            </div>
            <div className="absolute left-[105px] top-[121px] w-[240px] text-right font-['Poppins'] text-[8px] font-normal leading-[16px] tracking-[0.4px] text-black">
              Menjadi Pembeli Sejak Nov 2025
            </div>

            <div className="absolute left-[24px] top-[147px] h-[108px] w-[323px] rounded-[16px] border border-black bg-white shadow-[0px_0px_27.4px_-9px_rgba(0,0,0,0.25)]">
              <div className="absolute left-[15px] top-[6px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-black font-['Poppins']">
                Nomor Telepon
              </div>
              <div className="absolute left-[15px] top-[27px] text-[16px] font-semibold leading-[20px] text-[#1A1A1A] font-['Poppins']">
                081283676721
              </div>
              <div className="absolute left-[255px] top-[27px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-[#13B0F9] font-['Poppins']">
                Ganti
              </div>

              <div className="absolute left-[15px] top-[55px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-black font-['Poppins']">
                Alamat
              </div>
              <div className="absolute left-[15px] top-[70px] text-[16px] font-semibold leading-[20px] text-[#1A1A1A] font-['Poppins']">
                Delta Pekayon
              </div>
              <div className="absolute left-[255px] top-[70px] text-[10px] font-medium leading-[16px] tracking-[0.4px] text-[#13B0F9] font-['Poppins']">
                Ganti
              </div>
            </div>
          </div>
        )}

        {screen === 'aturNotifikasi' && (
          <div className="absolute left-1/2 top-[80px] h-[269px] w-[365px] -translate-x-1/2 rounded-[16px] bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              aria-label="Tutup"
              onClick={goBack}
              className="absolute left-[16px] top-[14px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path d="M6 6 18 18M18 6 6 18" stroke="#000000" strokeWidth="1.5" />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[22px] -translate-x-1/2 font-['Inter'] text-[16px] font-semibold leading-[16px] tracking-[0.4px] text-[#13B0F9]">
              Atur Notifikasi
            </div>

            <div className="absolute left-[11px] top-[60px] h-[47px] w-[345px] border-b border-[rgba(0,0,0,0.5)]">
              <img
                src={asset('assets/icon notifikasi.svg')}
                alt=""
                className="absolute left-[6px] top-[9px] h-[24px] w-[24px]"
              />
              <div className="absolute left-[56px] top-[4px] h-[31px] w-[218px] font-['Poppins'] text-[14px] font-normal leading-[16px] tracking-[0.4px] text-black flex items-center">
                Notifikasi pedagang lewat
              </div>
              <button
                type="button"
                onClick={() => setNotifLewat((prev) => !prev)}
                className={`absolute left-[293px] top-[9px] h-[22px] w-[45px] rounded-[12px] ${
                  notifLewat ? 'bg-[#13B0F9]' : 'bg-[#929292]'
                }`}
              >
                <span
                  className={`absolute top-[3px] h-[16.88px] w-[16.88px] rounded-full bg-white ${
                    notifLewat ? 'left-[25px]' : 'left-[4px]'
                  }`}
                />
              </button>
            </div>

            <div className="absolute left-[10px] top-[108px] h-[56px] w-[345px] border-b border-[rgba(0,0,0,0.5)]">
              <img
                src={asset('assets/icon pin.svg')}
                alt=""
                className="absolute left-[7px] top-[15px] h-[24px] w-[24px]"
              />
              <div className="absolute left-[63px] top-[12px] w-[200px] font-['Poppins'] text-[14px] font-normal leading-[16px] tracking-[0.4px] text-black">
                Beritahu hanya untuk yang ditandai saja
              </div>
              <button
                type="button"
                onClick={() => setNotifDitandai((prev) => !prev)}
                className={`absolute left-[294px] top-[17px] h-[22px] w-[45px] rounded-[12px] ${
                  notifDitandai ? 'bg-[#13B0F9]' : 'bg-[#929292]'
                }`}
              >
                <span
                  className={`absolute top-[3px] h-[16.88px] w-[16.88px] rounded-full bg-white ${
                    notifDitandai ? 'left-[25px]' : 'left-[4px]'
                  }`}
                />
              </button>
            </div>

            <div className="absolute left-[10px] top-[165px] h-[82px] w-[345px] border-b border-[rgba(0,0,0,0.5)]">
              <img
                src={asset('assets/icon pemberitahuan ada pedagang.svg')}
                alt=""
                className="absolute left-[7px] top-[29px] h-[24px] w-[24px]"
              />
              <div className="absolute left-[63px] top-[19px] w-[200px] font-['Poppins'] text-[14px] font-normal leading-[16px] tracking-[0.4px] text-black">
                Beritahu jika pedagang yang ditandai menyalakan GPS nya
              </div>
              <button
                type="button"
                onClick={() => setNotifGps((prev) => !prev)}
                className={`absolute left-[294px] top-[30px] h-[22px] w-[45px] rounded-[12px] ${
                  notifGps ? 'bg-[#13B0F9]' : 'bg-[#929292]'
                }`}
              >
                <span
                  className={`absolute top-[3px] h-[16.88px] w-[16.88px] rounded-full bg-white ${
                    notifGps ? 'left-[25px]' : 'left-[4px]'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {screen === 'chatUlasanPdg' && (
          <div className="absolute left-0 top-0 w-[390px] rounded-[16px] bg-white" style={{ height: `${deviceHeight}px` }}>
            <button
              type="button"
              aria-label="Tutup"
              onClick={goBack}
              className="absolute left-[24px] top-[18px] h-[24px] w-[24px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M6 6 18 18M18 6 6 18"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[25px] w-[64px] -translate-x-1/2 text-center font-['Inter'] text-[16px] font-semibold leading-[16px] tracking-[0.4px] text-[#13B0F9]">
              Balasan
            </div>

            <div className="absolute left-[25px] top-[81px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil dadang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[97px] top-[81px] font-['Poppins'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Dadang
            </div>
            <div className="absolute left-[97px] top-[105.2px] w-[269px] font-['Poppins'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
              Enak Nasi Goreng nya hatur nuhun kang!
            </div>

            <div className="absolute left-[24px] top-[134px] h-[82px] w-[0px] border-l-[2px] border-[#13B0F9]" />

            <div className="absolute left-[24px] top-[171px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[98px] top-[171px] font-['Poppins'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Fajri <span className="text-[14px] font-normal">(penjual)</span>
            </div>
            <div className="absolute left-[98px] top-[195.2px] w-[268px] font-['Poppins'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
              Terimakasih! Silahkan Datang Kembali!
            </div>

            <div className="absolute left-[24px] bottom-[86px] h-[54.34px] w-[343px] rounded-[15px] border border-[#B7B7B7] bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
              <input
                type="text"
                placeholder="Balas Ulasan..."
                className="absolute left-[15px] top-[14px] h-[24px] w-[250px] bg-transparent text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black font-['Inter'] outline-none"
                aria-label="Balas Ulasan"
              />
              <button
                type="button"
                aria-label="Tambah Foto"
                onClick={() => goTo('fotoUlasanPdg')}
                className="absolute right-[11px] top-[11px] h-[32px] w-[32px]"
              >
                <img src={asset('assets/Camera.svg')} alt="" className="h-full w-full" />
              </button>
            </div>
          </div>
        )}

        {screen === 'chatUlasanPembeli' && (
          <div className="absolute left-0 top-0 w-[390px] rounded-[16px] bg-white" style={{ height: `${deviceHeight}px` }}>
            <button
              type="button"
              aria-label="Tutup"
              onClick={goBack}
              className="absolute left-[24px] top-[18px] h-[24px] w-[24px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M6 6 18 18M18 6 6 18"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[25px] w-[64px] -translate-x-1/2 text-center font-['Inter'] text-[16px] font-semibold leading-[16px] tracking-[0.4px] text-[#13B0F9]">
              Balasan
            </div>

            <div className="absolute left-[25px] top-[81px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil dadang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[97px] top-[81px] font-['Poppins'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Dadang
            </div>
            <div className="absolute left-[97px] top-[105.2px] w-[269px] font-['Poppins'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
              Enak Nasi Goreng nya hatur nuhun kang!
            </div>

            <div className="absolute left-[24px] top-[134px] h-[82px] w-[0px] border-l-[2px] border-[#13B0F9]" />

            <div className="absolute left-[24px] top-[171px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[98px] top-[171px] font-['Poppins'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Fajri <span className="text-[14px] font-normal">(penjual)</span>
            </div>
            <div className="absolute left-[98px] top-[195.2px] w-[268px] font-['Poppins'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
              Terimakasih! Silahkan Datang Kembali!
            </div>

            <div className="absolute left-[24px] bottom-[86px] h-[54.34px] w-[343px] rounded-[15px] border border-[#B7B7B7] bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
              <input
                type="text"
                placeholder="Balas Ulasan..."
                className="absolute left-[15px] top-[14px] h-[24px] w-[250px] bg-transparent text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black font-['Inter'] outline-none"
                aria-label="Balas Ulasan"
              />
              <button
                type="button"
                aria-label="Tambah Foto"
                onClick={() => goTo('fotoUlasanPdg')}
                className="absolute right-[11px] top-[11px] h-[32px] w-[32px]"
              >
                <img src={asset('assets/Camera.svg')} alt="" className="h-full w-full" />
              </button>
            </div>
          </div>
        )}

        {screen === 'tambahUlasanPembeli' && (
          <div className="absolute left-0 top-0 w-[390px] rounded-[16px] bg-white" style={{ height: `${deviceHeight}px` }}>
            <button
              type="button"
              aria-label="Tutup"
              onClick={goBack}
              className="absolute left-[24px] top-[18px] h-[24px] w-[24px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path d="M6 6 18 18M18 6 6 18" stroke="#000000" strokeWidth="1.5" />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[25px] w-[64px] -translate-x-1/2 text-center font-['Inter'] text-[16px] font-semibold leading-[16px] tracking-[0.4px] text-[#13B0F9]">
              Balasan
            </div>

            <div className="absolute left-[25px] top-[81px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img src={asset('assets/foto profil abyan.svg')} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="absolute left-[97px] top-[81px] font-['Poppins'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
              Abyan
            </div>
            <div className="absolute left-[97px] top-[105.2px] w-[269px] font-['Poppins'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
              WOI ENAK BANGET GILA, NASI GORENG GILA NYA PINDAH KEGILAANNYA KE GUA.
            </div>

            <div className="absolute left-[24px] bottom-[86px] h-[54.34px] w-[343px] rounded-[15px] border border-[#B7B7B7] bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
              <input
                type="text"
                placeholder="Ketik Ulasan..."
                className="absolute left-[15px] top-[14px] h-[24px] w-[250px] bg-transparent text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black font-['Inter'] outline-none"
                aria-label="Ketik Ulasan"
              />
              <button type="button" aria-label="Tambah Foto" className="absolute right-[11px] top-[11px] h-[32px] w-[32px]">
                <img src={asset('assets/Camera.svg')} alt="" className="h-full w-full" />
              </button>
            </div>
          </div>
        )}

        {screen === 'fotoUlasanPdg' && (
          <div className="absolute left-0 top-0 h-[281px] w-[390px] rounded-[16px] bg-white">
            <button
              type="button"
              aria-label="Tutup"
              onClick={goBack}
              className="absolute left-[24px] top-[18px] h-[14px] w-[14px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M6 6 18 18M18 6 6 18"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => uploadProdukRef.current?.click()}
              className="absolute left-1/2 top-[61px] h-[191px] w-[342px] -translate-x-1/2 rounded-[15px] border border-[#B7B7B7] bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)]"
              aria-label="Pilih file atau foto"
            />
            <input ref={uploadProdukRef} type="file" accept="image/*" className="hidden" />
            <img
              src={asset('assets/icon file.svg')}
              alt=""
              className="absolute left-[133px] top-[121px] h-[48px] w-[48px]"
            />
            <img
              src={asset('assets/icon slash.svg')}
              alt=""
              className="absolute left-[184px] top-[136px] h-[16px] w-[14px]"
            />
            <img
              src={asset('assets/icon camera.svg')}
              alt=""
              className="absolute left-[209px] top-[121px] h-[48px] w-[48px]"
            />
            <div className="absolute left-1/2 top-[176px] w-[104px] -translate-x-1/2 text-center font-['Poppins'] text-[16px] font-normal leading-[16px] text-[rgba(0,0,0,0.55)]">
              Pilih File/Foto
            </div>
          </div>
        )}

        {screen === 'berandaPembeli' && (
          <>
            <div className="absolute left-1/2 top-[-58px] h-[151px] w-[390px] -translate-x-1/2 rounded-[35px] bg-[#13B0F9] shadow-[0px_4px_23.4px_rgba(0,0,0,0.14)]" />

            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[54px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[50px] -translate-x-1/2 text-center font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
              Beranda
            </div>

            <div className="absolute left-[24px] top-[143px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil abyan.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[110px] top-[143px] font-['Poppins'] text-[18px] font-semibold leading-[25px] tracking-[-0.02em] text-black">
              Hi, Abyan!
            </div>
            <div className="absolute left-[109px] top-[168px] font-['Poppins'] text-[14px] font-normal leading-[20px] tracking-[-0.02em] text-black">
              Member sejak Nov 2025
            </div>

            <button
              type="button"
              aria-label="Setting"
              className="absolute left-[338px] top-[144px] h-[24px] w-[24px]"
              onClick={() => goTo('settingPembeli')}
            >
              <img src={asset('assets/icon setting.svg')} alt="" className="h-full w-full" />
            </button>

            <div className="absolute left-[24px] top-[235px] h-[16px] w-[16px]">
              <img src={asset('assets/icon telpon.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[61px] top-[235px] font-['Poppins'] text-[12px] font-semibold leading-[16px] text-black">
              081283676721
            </div>
            <button
              type="button"
              onClick={() => goTo('aturNotifikasi')}
              className="absolute left-[270px] top-[235px] font-['Poppins'] text-[12px] font-semibold leading-[16px] text-[#13B0F9]"
            >
              Atur Notifikasi
            </button>

            <div className="absolute left-[29px] top-[315px] font-['Poppins'] text-[16px] font-normal leading-[16px] text-black">
              UMKM GPS MAPS
            </div>
            <button
              type="button"
              onClick={() => goTo('ulasanPembeli')}
              className="absolute left-[274px] top-[314px] font-['Poppins'] text-[12px] font-semibold leading-[17px] tracking-[-0.02em] text-[#13B0F9]"
            >
              Histori Ulasan
            </button>
            <div className="absolute left-1/2 top-[352px] h-[170px] w-[333px] -translate-x-1/2 overflow-hidden rounded-[12px] bg-[#EDEDED]">
              <MapContainer
                key={mapCenter.join(',')}
                center={mapCenter}
                zoom={13}
                className="h-full w-full"
                scrollWheelZoom
                dragging
                doubleClickZoom
                zoomControl
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {pedagangMarkers.map((marker) => (
                  <Marker key={marker.name} position={marker.position} icon={pedagangIcon}>
                    <Popup>{marker.name}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="absolute left-0 top-[543px] h-[509px] w-[390px] rounded-[38px] bg-white shadow-[0px_4px_34px_rgba(0,0,0,0.14)]">
              <div className="absolute left-[24px] top-[24px] font-['Poppins'] text-[16px] font-medium leading-[22px] tracking-[-0.02em] text-black">
                Cari UMKM
              </div>
            <button
              type="button"
              onClick={() => goTo('favoritUmkm')}
              className="absolute left-[253px] top-[24px] h-[28px] w-[118px] rounded-[15px] bg-[#13B0F9] text-[12px] font-semibold uppercase leading-[16px] text-white font-['Poppins']"
            >
              Favorit
            </button>

              <div className="absolute left-[15px] top-[62px] h-[48px] w-[357px] rounded-[4px] border border-[#B3B3B3] bg-white">
                <div className="flex h-full w-full items-center gap-[12px] px-[12px]">
                  <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                    <path
                      d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5 9.1 3.4 3.4-1.4 1.4-3.4-3.4"
                      fill="#666666"
                    />
                  </svg>
                  <input
                    type="text"
                    value={umkmSearch}
                    onChange={(event) => setUmkmSearch(event.target.value)}
                    placeholder="Search"
                    className="flex-1 bg-transparent font-['Inter'] text-[16px] leading-[24px] text-[#666666] outline-none placeholder:text-[#666666]"
                  />
                  <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                    <path
                      d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-1 15.9V21h2v-2.1a6 6 0 0 0 5-5.9h-2a4 4 0 0 1-8 0H6a6 6 0 0 0 5 5.9Z"
                      fill="#666666"
                    />
                  </svg>
                </div>
              </div>

              {filteredUmkm.map((item, idx) => (
                <button
                  key={`${item.name}-${idx}`}
                  type="button"
                  onClick={() => goTo('profilPedagangPembeli')}
                  className="absolute left-[-7px] h-[103px] w-[389px] rounded-[15px] bg-white text-left"
                  style={{ top: umkmSearch.trim() ? 110 + idx * 103 : item.top }}
                >
                  <div className="absolute left-[17px] top-[16px] h-[70px] w-[70px] rounded-[15px] bg-[#D9D9D9]">
                    <img
                      src={asset('assets/profil umkm.svg')}
                      alt=""
                      className="absolute left-[10px] top-[12px] h-[50px] w-[50px] rounded-full"
                    />
                  </div>
                  <div className="absolute left-[110px] top-[22px] w-[183.93px] font-['Poppins'] text-[14px] font-semibold leading-[16px] tracking-[0.4px] text-black">
                    {item.name}
                  </div>
                  <div className="absolute left-[110px] top-[40px] w-[183.93px] font-['Poppins'] text-[10px] font-normal leading-[16px] tracking-[0.4px] text-black">
                    {item.biz}
                  </div>
                  <div className="absolute left-[109px] top-[65px] h-[23px] w-[95.14px] rounded-[15px] bg-[rgba(19,176,249,0.75)]">
                    <span className="absolute left-[5px] top-[4px] w-[85.62px] text-center font-['Poppins'] text-[10px] font-medium leading-[5px] tracking-[0.4px] text-black">
                      GPS : {item.gps}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {screen === 'ulasanPembeli' && (
          <>
            <div className="absolute left-1/2 top-[-58px] h-[151px] w-[390px] -translate-x-1/2 rounded-[35px] bg-[#13B0F9] shadow-[0px_4px_23.4px_rgba(0,0,0,0.14)]" />

            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[54px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[50px] -translate-x-1/2 text-center font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
              Histori Ulasan
            </div>

            <div className="absolute left-[19px] top-[103px] h-[116px] w-[116px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil abyan.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[168px] top-[121px] font-['Poppins'] text-[16px] font-semibold leading-[22px] tracking-[-0.02em] text-black">
              Hi, Abyan!
            </div>
            <div className="absolute left-[164px] top-[146px] font-['Poppins'] text-[14px] font-normal leading-[20px] tracking-[-0.02em] text-black">
              Member sejak Nov 2025
            </div>
            <div className="absolute left-[164px] top-[178px] h-[17px] w-[17px]">
              <img src={asset('assets/icon telpon.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[188px] top-[175px] font-['Poppins'] text-[12px] font-semibold leading-[16px] text-black">
              081283676721
            </div>

            <div className="absolute left-0 top-[261px] h-[719px] w-[390px] rounded-t-[17px] bg-[#13B0F9] shadow-[0px_6px_15.6px_13px_rgba(0,0,0,0.25)]">
              <div className="absolute left-1/2 top-[21px] h-[46px] w-[348px] -translate-x-1/2 rounded-[4px] border border-[#B3B3B3] bg-white">
                <div className="flex h-full w-full items-center gap-[12px] px-[12px]">
                  <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                    <path
                      d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5 9.1 3.4 3.4-1.4 1.4-3.4-3.4"
                      fill="#666666"
                    />
                  </svg>
                  <input
                    type="text"
                    value={ulasanPembeliSearch}
                    onChange={(event) => setUlasanPembeliSearch(event.target.value)}
                    placeholder="Search"
                    className="flex-1 bg-transparent font-['Inter'] text-[16px] leading-[24px] text-[#666666] outline-none placeholder:text-[#666666]"
                  />
                  <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                    <path
                      d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-1 15.9V21h2v-2.1a6 6 0 0 0 5-5.9h-2a4 4 0 0 1-8 0H6a6 6 0 0 0 5 5.9Z"
                      fill="#666666"
                    />
                  </svg>
                </div>
              </div>

              {filteredUlasanPembeli.map((item, idx) => (
                <div key={`${item.product}-${idx}`}>
                  <div
                    className="absolute left-[21px] h-[97.47px] w-[348.26px] rounded-[16px] bg-white shadow-[0px_4px_12.8px_-2px_rgba(0,0,0,0.25)]"
                    style={{ top: item.top - 261 }}
                  >
                    <div className="absolute left-[16px] top-[16px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
                      <img
                        src={asset('assets/foto profil abyan.svg')}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="absolute left-[90px] top-[16px] font-['Poppins'] text-[14px] font-semibold leading-[16px] tracking-[0.2px] text-black">
                      {item.name}{' '}
                      <span className="font-normal text-[13px]">- {item.product}</span>
                    </div>
                    <div className="absolute left-[90px] top-[36px] font-['Poppins'] text-[13px] font-normal leading-[16px] tracking-[0.2px] text-black">
                      {item.text}
                    </div>
                    <div className="absolute left-[90px] top-[56px] h-[24px] w-[120px]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={`p-star-${idx}-${i}`}
                          viewBox="0 0 24 24"
                          className="absolute h-[24px] w-[24px]"
                          style={{ left: i * 24, top: 0 }}
                          aria-hidden="true"
                        >
                          <path
                            d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                            fill={i < item.stars ? '#FFCD29' : 'none'}
                            stroke={i < item.stars ? 'none' : '#FFCD29'}
                            strokeWidth={i < item.stars ? 0 : 1.5}
                          />
                        </svg>
                      ))}
                    </div>
                  </div>

                  {item.reply && (
                    <div
                      className="absolute left-[36px] z-10 flex items-center gap-[8px] pointer-events-auto"
                      style={{ top: item.replyTop - 261 }}
                    >
                      <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                        <path
                          d="M9 7 5 11l4 4"
                          fill="none"
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M19 17v-3a4 4 0 0 0-4-4H5"
                          fill="none"
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <button
                        type="button"
                        onClick={() => goTo('chatUlasanPembeli')}
                        className="font-['Poppins'] text-[14px] font-semibold leading-[16px] tracking-[0.2px] text-[rgba(0,0,0,0.5)]"
                      >
                        {item.reply}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {screen === 'favoritUmkm' && (
          <>
            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[23px] top-[50px] h-[16px] w-[16px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[49px] -translate-x-1/2 text-center font-['Inter'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-black">
              UMKM Favorit
            </div>

            <div className="absolute left-0 top-[113px] h-[805px] w-[412px] rounded-[17px] bg-[#EEEEEE] shadow-[0px_6px_15.6px_13px_rgba(0,0,0,0.25)]">
              <div className="absolute left-[22px] top-[14px] h-[48px] w-[357px] rounded-[4px] border border-[#B3B3B3] bg-white">
                <div className="flex h-full w-full items-center gap-[12px] px-[12px]">
                  <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                    <path
                      d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5 9.1 3.4 3.4-1.4 1.4-3.4-3.4"
                      fill="#666666"
                    />
                  </svg>
                  <input
                    type="text"
                    value={favoritSearch}
                    onChange={(event) => setFavoritSearch(event.target.value)}
                    placeholder="Search"
                    className="flex-1 bg-transparent font-['Inter'] text-[16px] leading-[24px] text-[#666666] outline-none placeholder:text-[#666666]"
                  />
                  <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                    <path
                      d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-1 15.9V21h2v-2.1a6 6 0 0 0 5-5.9h-2a4 4 0 0 1-8 0H6a6 6 0 0 0 5 5.9Z"
                      fill="#666666"
                    />
                  </svg>
                </div>
              </div>

              {filteredFavorit.map((item, idx) => {
                const top = 95 + idx * 136
                const showChevron = idx > 0
                return (
                  <button
                    key={`${item.name}-${idx}`}
                    type="button"
                    onClick={() => goTo('profilPedagangPembeli')}
                    className="absolute left-[22px] h-[103px] w-[368px] rounded-[15px] bg-white text-left"
                    style={{ top }}
                  >
                    <div className="absolute left-[7px] top-[19px] h-[70px] w-[70px] rounded-[15px] bg-[#D9D9D9]">
                      <img
                        src={asset('assets/profil umkm.svg')}
                        alt=""
                        className="absolute left-[10px] top-[10px] h-[50px] w-[50px] rounded-full"
                      />
                    </div>
                    <div className="absolute left-[97px] top-[33px] font-['Inter'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
                      {item.name}
                    </div>
                    <div className="absolute left-[97px] top-[56px] font-['Inter'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
                      {item.place}
                    </div>
                    {showChevron && (
                      <div className="absolute right-[20px] top-[44px] h-[16px] w-[14px]">
                        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                          <path
                            d="M9 5 16 12 9 19"
                            fill="none"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {screen === 'profilPedagangPembeli' && (
          <>
            <div className="absolute left-1/2 top-[-58px] h-[151px] w-[390px] -translate-x-1/2 rounded-[35px] bg-[#13B0F9] shadow-[0px_4px_23.4px_rgba(0,0,0,0.14)]" />

            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[54px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[50px] -translate-x-1/2 text-center font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
              Profil Pedagang
            </div>

            <div className="absolute left-[24px] top-[143px] h-[75px] w-[75px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[115px] top-[143px] font-['Poppins'] text-[18px] font-semibold leading-[25px] tracking-[-0.02em] text-black">
              Nasgor Goreng
            </div>
            <div className="absolute left-[111px] top-[172px] h-[24px] w-[120px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <svg
                  key={`pp-star-${i}`}
                  viewBox="0 0 24 24"
                  className="absolute h-[24px] w-[24px]"
                  style={{ left: i * 24, top: 0 }}
                  aria-hidden="true"
                >
                  <path
                    d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                    fill="#FFCD29"
                  />
                </svg>
              ))}
              <svg
                viewBox="0 0 24 24"
                className="absolute h-[24px] w-[24px]"
                style={{ left: 96, top: 0 }}
                aria-hidden="true"
              >
                <path
                  d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                  fill="none"
                  stroke="#FFCD29"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="absolute left-[236px] top-[177px] font-['Poppins'] text-[12px] font-light leading-[16px] text-black">
              (3,5)
            </div>
            <button
              type="button"
              onClick={() => goTo('profilUmkmPembeli')}
              className="absolute left-[295px] top-[198px] font-['Poppins'] text-[12px] font-semibold leading-[17px] tracking-[-0.02em] text-[#13B0F9]"
            >
              Cek Ulasan
            </button>

            <div className="absolute left-[24px] top-[240px] h-[24px] w-[24px]">
              <img src={asset('assets/icon location.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[61px] top-[244px] font-['Poppins'] text-[12px] font-semibold leading-[16px] uppercase text-black">
              Kranji MRT Station
            </div>

            <div className="absolute left-[24px] top-[271px] h-[24px] w-[24px]">
              <img src={asset('assets/icon time.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[61px] top-[275px] font-['Poppins'] text-[12px] font-semibold leading-[16px] uppercase text-black">
              16:00 - 00:00
            </div>

            <div className="absolute left-[263px] top-[278px] font-['Poppins'] text-[12px] font-normal leading-[16px] uppercase text-black">
              Tandai Pedagang
            </div>
            <button
              type="button"
              onClick={() => setTandaiPedagang((prev) => !prev)}
              className={`absolute left-[223px] top-[270px] h-[23px] w-[40px] rounded-full transition ${
                tandaiPedagang ? 'bg-[#13B0F9]' : 'bg-[#929292]'
              }`}
              aria-pressed={tandaiPedagang}
            >
              <span
                className={`absolute top-[2.5px] h-[18px] w-[18px] rounded-full bg-white transition ${
                  tandaiPedagang ? 'left-[19px]' : 'left-[3px]'
                }`}
              />
            </button>

            <div className="absolute left-0 top-[327px] h-[509px] w-[390px] rounded-[38px] bg-white shadow-[0px_4px_34px_rgba(0,0,0,0.14)]">
              <div className="absolute left-[24px] top-[24px] font-['Poppins'] text-[16px] font-medium leading-[22px] tracking-[-0.02em] text-black">
                List Dagangan
              </div>

              {[
                { name: 'Nasi Goreng Biasa', price: 'Rp 15.000', top: 64 },
                { name: 'Nasi Goreng Gila', price: 'Rp 20.000', top: 167 },
                { name: 'Nasi Gila', price: 'Rp 10.000', top: 270 },
                { name: 'Capcay', price: 'Rp 15.000', top: 373 },
              ].map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="absolute left-0 h-[103px] w-[389px] rounded-[15px] bg-white"
                  style={{ top: item.top }}
                >
                  <div className="absolute left-[24px] top-[16px] h-[71.97px] w-[71.97px] overflow-hidden rounded-[8px] bg-[#F7F7F7]">
                    <img
                      src={asset('assets/foto dagangan.svg')}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute left-[117px] top-[22px] w-[183.93px] font-['Poppins'] text-[14px] font-semibold leading-[16px] tracking-[0.4px] text-black">
                    {item.name}
                  </div>
                  <div className="absolute left-[117px] top-[40px] w-[183.93px] font-['Poppins'] text-[10px] font-normal leading-[16px] tracking-[0.4px] text-black">
                    Harga : {item.price}
                  </div>
                  <div className="absolute left-[116px] top-[65px] h-[23px] w-[95.14px] rounded-[15px] bg-[rgba(19,176,249,0.75)]">
                    <span className="absolute left-[5px] top-[4px] w-[85.62px] text-center font-['Poppins'] text-[10px] font-medium leading-[5px] tracking-[0.4px] text-black">
                      Tersedia : 50
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {screen === 'profilUmkmPembeli' && (
          <>
            <div className="absolute left-1/2 top-[-58px] h-[151px] w-[390px] -translate-x-1/2 rounded-[35px] bg-[#13B0F9] shadow-[0px_4px_23.4px_rgba(0,0,0,0.14)]" />

            <button
              type="button"
              aria-label="Kembali"
              onClick={goBack}
              className="absolute left-[27px] top-[54px] h-[20px] w-[20px]"
            >
              <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="absolute left-1/2 top-[50px] -translate-x-1/2 text-center font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
              Profil UMKM
            </div>

            <div className="absolute left-[24px] top-[121px] h-[116px] w-[116px] overflow-hidden rounded-full bg-[#D9D9D9]">
              <img
                src={asset('assets/foto profil pedagang.svg')}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute left-[168px] top-[121px] font-['Poppins'] text-[16px] font-semibold leading-[22px] tracking-[-0.02em] text-black">
              Nasgor Goreng
            </div>
            <div className="absolute left-[165px] top-[147px] h-[16px] w-[16px]">
              <img src={asset('assets/icon location.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[189px] top-[147px] font-['Poppins'] text-[12px] font-medium leading-[16px] uppercase text-black">
              Kranji MRT Station
            </div>
            <div className="absolute left-[165px] top-[167px] h-[16px] w-[16px]">
              <img src={asset('assets/icon time.svg')} alt="" className="h-full w-full" />
            </div>
            <div className="absolute left-[189px] top-[167px] font-['Poppins'] text-[14px] font-medium leading-[16px] uppercase text-black">
              16:00 - 00:00
            </div>
            <div className="absolute left-[168px] top-[197px] font-['Poppins'] text-[12px] font-medium leading-[16px] text-black">
              Rating :
            </div>
            <div className="absolute left-[165px] top-[213px] h-[24px] w-[120px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <svg
                  key={`umkm-star-${i}`}
                  viewBox="0 0 24 24"
                  className="absolute h-[24px] w-[24px]"
                  style={{ left: i * 24, top: 0 }}
                  aria-hidden="true"
                >
                  <path
                    d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                    fill="#FFCD29"
                  />
                </svg>
              ))}
              <svg
                viewBox="0 0 24 24"
                className="absolute h-[24px] w-[24px]"
                style={{ left: 96, top: 0 }}
                aria-hidden="true"
              >
                <path
                  d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                  fill="none"
                  stroke="#FFCD29"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="absolute left-[290px] top-[218px] font-['Poppins'] text-[12px] font-light leading-[16px] text-black">
              (3,5)
            </div>

            <div className="absolute left-0 top-[304px] h-[977px] w-[390px] rounded-[17px] bg-[#13B0F9] shadow-[0px_6px_15.6px_13px_rgba(0,0,0,0.25)]">
              <div className="absolute left-[24px] top-[24px] font-['Poppins'] text-[17px] font-semibold leading-[24px] tracking-[-0.02em] text-white">
                Ulasan
              </div>
              <button
                type="button"
                onClick={() => goTo('tambahUlasanPembeli')}
                className="absolute left-[251px] top-[31px] h-[28px] w-[118px] rounded-[15px] bg-white text-[10px] font-semibold uppercase leading-[16px] text-[#13B0F9] font-['Poppins']"
              >
                Tambah Ulasan
              </button>

              {[
                {
                  top: 80,
                  name: 'Dadang',
                  text: 'Enak Nasi Goreng nya ha..',
                  img: asset('assets/foto profil dadang.svg'),
                  reply: 'Lihat Balasan +1',
                  stars: 4,
                  replyTop: 195,
                },
                {
                  top: 236,
                  name: 'Abyan',
                  text: 'WOI ENAK BANGET GILA..',
                  img: asset('assets/foto profil abyan.svg'),
                  reply: 'Balas',
                  stars: 5,
                  replyTop: 352,
                },
                {
                  top: 393,
                  name: 'Valiant',
                  text: 'The Cracker Stale When I..',
                  img: asset('assets/foto profil valiant.svg'),
                  reply: 'Balas',
                  stars: 2,
                  replyTop: 509,
                },
                {
                  top: 550,
                  name: 'Hansen',
                  text: 'Kok Saya Mesen Jam 23..',
                  img: asset('assets/foto profil hansen.svg'),
                  reply: 'Balas',
                  stars: 4,
                  replyTop: 666,
                },
                {
                  top: 707,
                  name: 'Fariz',
                  text: 'Makanannya Enak Tapi A..',
                  img: asset('assets/foto profil fariz.svg'),
                  reply: 'Balas',
                  stars: 4,
                  replyTop: 823,
                },
              ].map((item, idx) => (
                <div key={`${item.name}-${idx}`}>
                  <div
                    className="absolute left-[21px] h-[97.47px] w-[348.26px] rounded-[16px] bg-white shadow-[0px_4px_12.8px_-2px_rgba(0,0,0,0.25)]"
                    style={{ top: item.top }}
                  >
                    <div className="absolute left-[16px] top-[16px] h-[61px] w-[61px] overflow-hidden rounded-full bg-[#D9D9D9]">
                      <img src={item.img} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="absolute left-[90px] top-[16px] font-['Inter'] text-[18px] font-semibold leading-[16px] tracking-[0.4px] text-black">
                      {item.name}
                    </div>
                    <div className="absolute left-[90px] top-[37px] font-['Inter'] text-[13px] font-normal leading-[16px] tracking-[0.4px] text-black">
                      {item.text}
                    </div>
                    <div className="absolute left-[90px] top-[56px] h-[24px] w-[120px]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={`umkm-review-${idx}-${i}`}
                          viewBox="0 0 24 24"
                          className="absolute h-[24px] w-[24px]"
                          style={{ left: i * 24, top: 0 }}
                          aria-hidden="true"
                        >
                          <path
                            d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9L12 3Z"
                            fill={i < item.stars ? '#FFCD29' : 'none'}
                            stroke={i < item.stars ? 'none' : '#FFCD29'}
                            strokeWidth={i < item.stars ? 0 : 1.5}
                          />
                        </svg>
                      ))}
                    </div>
                  </div>

                  <div
                    className="absolute left-[36px] z-10 flex items-center gap-[8px] pointer-events-auto"
                    style={{ top: item.replyTop }}
                  >
                    <svg viewBox="0 0 24 24" className="h-[24px] w-[24px]" aria-hidden="true">
                      <path
                        d="M9 7 5 11l4 4"
                        fill="none"
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19 17v-3a4 4 0 0 0-4-4H5"
                        fill="none"
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <button
                      type="button"
                      onClick={() => goTo('chatUlasanPembeli')}
                      className="font-['Inter'] text-[14px] font-semibold leading-[16px] tracking-[0.4px] text-[rgba(0,0,0,0.5)]"
                    >
                      {item.reply}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
            </div>
          </div>

          <nav className="absolute bottom-0 left-0 right-0 h-[70px] border-t border-[#e5e5e5] bg-white">
            <div
              className={`flex h-full items-center ${
                showProfileNav ? 'justify-around' : 'justify-between px-[70px]'
              }`}
            >
              <button
                type="button"
                onClick={goBack}
                disabled={!canGoBack}
                className={`flex flex-col items-center gap-[4px] text-[10px] font-medium ${
                  canGoBack ? 'text-[#7a7a7a]' : 'text-[#c7c7c7]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
                  <path
                    d="M14.5 5.5 8 12l6.5 6.5"
                    fill="none"
                    stroke={canGoBack ? '#7a7a7a' : '#c7c7c7'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Kembali
              </button>
              <button
                type="button"
                onClick={() => goTo('home')}
                className={`flex flex-col items-center gap-[4px] text-[10px] font-medium ${
                  isHomeActive ? 'text-[#13B0F9]' : 'text-[#7a7a7a]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
                  <path
                    d="M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm2 4h6v2H9V8Zm0 4h6v2H9v-2Z"
                    fill={isHomeActive ? '#13B0F9' : '#7a7a7a'}
                  />
                </svg>
                Home
              </button>
              {showProfileNav && (
                <button
                  type="button"
                  onClick={() => goTo(profileTarget)}
                  className={`flex flex-col items-center gap-[4px] text-[10px] font-medium ${
                    isProfileActive ? 'text-[#13B0F9]' : 'text-[#7a7a7a]'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" fill={isProfileActive ? '#13B0F9' : '#7a7a7a'} />
                    <path d="M4 20a8 8 0 0 1 16 0" fill={isProfileActive ? '#13B0F9' : '#7a7a7a'} />
                  </svg>
                  Profil
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  </div>
  )
}

export default App
